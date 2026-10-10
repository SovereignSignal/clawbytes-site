import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '@/db/client';
import { issues } from '@/db/schema';

const isoTimestamp = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    return false;
  }
  return !Number.isNaN(Date.parse(value));
}, 'must be an ISO 8601 timestamp');

export const issueSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase slug'),
    title: z.string().trim().min(1).max(200),
    theme_line: z.string().trim().min(1).max(200),
    published_at: isoTimestamp,
    body_markdown: z.string().min(1).max(100_000),
    body_html: z.string().max(200_000).nullish(),
    status: z.enum(['draft', 'published']),
  })
  .strict();

export type IssueInput = z.infer<typeof issueSchema>;

export type IssueIngestError = {
  index: number | null;
  slug?: string;
  messages: string[];
};

function messagesOf(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

export function parseIssueBatch(
  body: unknown,
): { ok: true; issues: IssueInput[] } | { ok: false; errors: IssueIngestError[] } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: [{ index: null, messages: ['body must be a JSON object'] }] };
  }
  const record = body as Record<string, unknown>;
  let raw: unknown[];
  if ('issues' in record) {
    if (!Array.isArray(record.issues)) {
      return { ok: false, errors: [{ index: null, messages: ['issues must be an array'] }] };
    }
    if (record.issues.length > 20) {
      return { ok: false, errors: [{ index: null, messages: ['batch exceeds 20 issues'] }] };
    }
    raw = record.issues;
  } else {
    raw = [body];
  }

  const parsedIssues: IssueInput[] = [];
  const errors: IssueIngestError[] = [];
  raw.forEach((entry, index) => {
    const parsed = issueSchema.safeParse(entry);
    if (!parsed.success) {
      const slug =
        entry && typeof entry === 'object' && 'slug' in entry && typeof entry.slug === 'string'
          ? entry.slug
          : undefined;
      errors.push({ index, slug, messages: messagesOf(parsed.error) });
      return;
    }
    parsedIssues.push(parsed.data);
  });
  if (errors.length) return { ok: false, errors };
  return { ok: true, issues: parsedIssues };
}

export class PublishedIssueError extends Error {
  constructor(slug: string) {
    super(`published issues cannot be reverted to draft: ${slug}`);
    this.name = 'PublishedIssueError';
  }
}

/**
 * Upsert by slug. Identical payloads do not write.
 * A published issue cannot be moved back to draft through ingest.
 */
export async function applyIssueBatch(
  db: Db,
  batch: IssueInput[],
  options?: { sample?: boolean },
): Promise<{ created: number; upserted: number; keys: string[] }> {
  const sample = options?.sample ?? false;
  const conflicts: IssueIngestError[] = [];
  for (const [index, issue] of batch.entries()) {
    const existing = await db.select().from(issues).where(eq(issues.slug, issue.slug)).limit(1);
    const row = existing[0];
    if (row?.status === 'published' && issue.status === 'draft') {
      conflicts.push({
        index,
        slug: issue.slug,
        messages: ['published issues cannot be reverted to draft'],
      });
    }
    if (sample && row && !row.sample) {
      conflicts.push({
        index,
        slug: issue.slug,
        messages: ['sample data cannot overwrite a real issue'],
      });
    }
  }
  if (conflicts.length) {
    const error = new Error('issue batch rejected');
    (error as Error & { ingestErrors: IssueIngestError[] }).ingestErrors = conflicts;
    throw error;
  }

  return db.transaction(async (tx) => {
    let created = 0;
    let upserted = 0;
    const keys: string[] = [];
    const seen = new Set<string>();
    for (const issue of batch) {
      const outcome = await applyOne(tx, issue, sample);
      if (outcome === 'skipped') continue;
      if (outcome === 'created') created += 1;
      else upserted += 1;
      if (!seen.has(issue.slug)) {
        seen.add(issue.slug);
        keys.push(issue.slug);
      }
    }
    return { created, upserted, keys };
  });
}

async function applyOne(
  tx: Parameters<Parameters<Db['transaction']>[0]>[0],
  issue: IssueInput,
  sample: boolean,
): Promise<'created' | 'upserted' | 'skipped'> {
  const existing = await tx.select().from(issues).where(eq(issues.slug, issue.slug)).limit(1);
  const row = existing[0];
  const now = new Date();
  const publishedAt = new Date(issue.published_at);

  if (!row) {
    await tx.insert(issues).values({
      slug: issue.slug,
      title: issue.title,
      themeLine: issue.theme_line,
      publishedAt,
      bodyMarkdown: issue.body_markdown,
      bodyHtml: issue.body_html ?? null,
      status: issue.status,
      sample,
      createdAt: now,
      updatedAt: now,
    });
    return 'created';
  }

  if (sample && !row.sample) return 'skipped';

  const bodyHtml = issue.body_html === undefined ? row.bodyHtml : issue.body_html;
  const nextSample = sample ? true : false;
  const unchanged =
    row.title === issue.title &&
    row.themeLine === issue.theme_line &&
    row.publishedAt.getTime() === publishedAt.getTime() &&
    row.bodyMarkdown === issue.body_markdown &&
    (row.bodyHtml ?? null) === (bodyHtml ?? null) &&
    row.status === issue.status &&
    row.sample === nextSample;

  if (unchanged) return 'upserted';

  await tx
    .update(issues)
    .set({
      title: issue.title,
      themeLine: issue.theme_line,
      publishedAt,
      bodyMarkdown: issue.body_markdown,
      bodyHtml,
      status: issue.status,
      sample: nextSample,
      updatedAt: now,
    })
    .where(eq(issues.slug, issue.slug));
  return 'upserted';
}

export function ingestErrorsOf(error: unknown): IssueIngestError[] | null {
  if (error && typeof error === 'object' && 'ingestErrors' in error) {
    return (error as { ingestErrors: IssueIngestError[] }).ingestErrors;
  }
  return null;
}
