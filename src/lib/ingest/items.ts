import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '@/db/client';
import { appearances, items } from '@/db/schema';

export const SOURCE_BOTS = ['clawbytes', 'modelbytes', 'interesting-repos', 'release-bot'] as const;
export const KINDS = ['model', 'tool_release', 'repo', 'news', 'status', 'paper'] as const;
export const MODALITIES = ['text', 'image', 'video', 'audio', 'multimodal'] as const;
export const CHANNELS = ['clawbytes', 'ModelBytes', 'interestingrepos', 'release-alerts'] as const;

const KEY_PREFIX: Record<(typeof KINDS)[number], string> = {
  model: 'model:',
  tool_release: 'release:',
  repo: 'repo:',
  news: 'url:',
  status: 'url:',
  paper: 'url:',
};

/** ISO 8601 timestamp, or YYYY-MM-DD taken as 00:00 UTC. Returns the value to store. */
export function wireTimestamp(value: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return null;
    if (date.toISOString().slice(0, 10) !== value) return null;
    return date.toISOString();
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return value;
}

const isoTimestamp = z.string().transform((value, ctx) => {
  const parsed = wireTimestamp(value);
  if (!parsed) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'must be an ISO 8601 timestamp or YYYY-MM-DD',
    });
    return z.NEVER;
  }
  return parsed;
});

function httpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const itemSchema = z
  .object({
    source_bot: z.enum(SOURCE_BOTS),
    kind: z.enum(KINDS),
    canonical_key: z
      .string()
      .min(3)
      .max(300)
      .regex(
        /^[A-Za-z0-9][A-Za-z0-9:/._~@?#[\]!$&'()*+,;=%_+-]*$/,
        'must use letters, numbers, and URL characters',
      ),
    title: z.string().trim().min(1).max(300),
    url: z.string().refine(httpUrl, 'must be an http(s) URL'),
    summary: z.string().trim().max(600).nullish(),
    published_at: isoTimestamp.nullish(),
    posted_at: isoTimestamp.nullish(),
    channel: z.enum(CHANNELS).nullish(),
    channel_post_url: z.string().refine(httpUrl, 'must be an http(s) URL').nullish(),
    lane: z.string().trim().min(1).max(80).nullish(),
    org: z.string().trim().min(1).max(120).nullish(),
    tags: z.array(z.string().trim().min(1).max(48)).max(24).nullish(),
    score: z.number().finite().min(-1e9).max(1e9).nullish(),
    modality: z.enum(MODALITIES).nullish(),
    extra: z.record(z.string(), z.unknown()).nullish(),
  })
  .strict()
  .superRefine((item, ctx) => {
    const prefix = KEY_PREFIX[item.kind];
    if (!item.canonical_key.startsWith(prefix)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['canonical_key'],
        message: `must start with ${prefix} for kind ${item.kind}`,
      });
    }
    if (item.extra && JSON.stringify(item.extra).length > 8000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['extra'],
        message: 'must be at most 8000 characters',
      });
    }
  });

export type ItemInput = z.infer<typeof itemSchema>;

export type IngestError = {
  index: number | null;
  canonical_key?: string;
  messages: string[];
};

function messagesOf(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

export function parseItemBatch(
  body: unknown,
): { ok: true; items: ItemInput[]; errors: IngestError[] } | { ok: false; errors: IngestError[] } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: [{ index: null, messages: ['body must be a JSON object'] }] };
  }
  const record = body as Record<string, unknown>;
  let rawItems: unknown[];
  if ('items' in record) {
    if (!Array.isArray(record.items)) {
      return { ok: false, errors: [{ index: null, messages: ['items must be an array'] }] };
    }
    if (record.items.length > 100) {
      return { ok: false, errors: [{ index: null, messages: ['batch exceeds 100 items'] }] };
    }
    rawItems = record.items;
  } else {
    rawItems = [body];
  }

  const itemsOut: ItemInput[] = [];
  const errors: IngestError[] = [];
  rawItems.forEach((raw, index) => {
    const parsed = itemSchema.safeParse(raw);
    if (!parsed.success) {
      const key =
        raw && typeof raw === 'object' && 'canonical_key' in raw && typeof raw.canonical_key === 'string'
          ? raw.canonical_key
          : undefined;
      errors.push({ index, canonical_key: key, messages: messagesOf(parsed.error) });
      return;
    }
    itemsOut.push(normalizeItem(parsed.data));
  });
  if (errors.length && itemsOut.length === 0) return { ok: false, errors };
  return { ok: true, items: itemsOut, errors };
}

function normalizeItem(item: ItemInput): ItemInput {
  const tags = item.tags ? [...new Set(item.tags)] : item.tags;
  const summary = item.summary?.trim() ? item.summary.trim() : null;
  // The key and URL are stored as sent. Query and fragment distinguish stories.
  return { ...item, canonical_key: item.canonical_key, url: item.url, tags, summary };
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((entry) => stable(entry)).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function sameTime(left: Date | null | undefined, right: Date | null | undefined): boolean {
  return (left?.getTime() ?? null) === (right?.getTime() ?? null);
}

type StoredFields = {
  kind: string;
  title: string;
  url: string;
  summary: string | null;
  publishedAt: Date | null;
  lane: string | null;
  org: string | null;
  tags: string[];
  score: number | null;
  modality: string | null;
  extra: Record<string, unknown>;
  sample: boolean;
};

/**
 * The item lane stays with the bot that set it. A second bot keeps its own
 * lane on the appearance and does not replace the item lane.
 */
function resolvedItemLane(
  rowLane: string | null,
  incoming: string | null | undefined,
  previousAppearanceLane: string | null | undefined,
  isNewAppearance: boolean,
): string | null {
  if (!incoming) return rowLane;
  if (!rowLane || isNewAppearance) return rowLane ?? incoming;
  if ((previousAppearanceLane ?? null) === rowLane) return incoming;
  return rowLane;
}

function nextFields(row: StoredFields, item: ItemInput, sample: boolean): StoredFields {
  return {
    kind: item.kind,
    title: item.title,
    url: item.url,
    summary: item.summary ?? row.summary,
    publishedAt: item.published_at ? new Date(item.published_at) : row.publishedAt,
    lane: item.lane ?? row.lane,
    org: item.org ?? row.org,
    tags: item.tags ?? row.tags,
    score: item.score == null ? row.score : item.score,
    modality: item.modality ?? row.modality,
    extra: item.extra ? { ...asObject(row.extra), ...item.extra } : asObject(row.extra),
    sample,
  };
}

function fieldsEqual(row: StoredFields, next: StoredFields): boolean {
  return (
    row.kind === next.kind &&
    row.title === next.title &&
    row.url === next.url &&
    row.summary === next.summary &&
    sameTime(row.publishedAt, next.publishedAt) &&
    row.lane === next.lane &&
    row.org === next.org &&
    stable(row.tags) === stable(next.tags) &&
    row.score === next.score &&
    row.modality === next.modality &&
    stable(row.extra) === stable(next.extra) &&
    row.sample === next.sample
  );
}

export type ApplyCounts = { created: number; upserted: number; keys: string[] };

/**
 * Idempotent upsert on canonical_key. A second identical payload does not
 * write. A different bot adds an appearance on the same row.
 * Sample writes never overwrite a real row.
 */
export async function applyItemBatch(
  db: Db,
  batch: ItemInput[],
  options?: { sample?: boolean },
): Promise<ApplyCounts> {
  const sample = options?.sample ?? false;
  return db.transaction(async (tx) => {
    let created = 0;
    let upserted = 0;
    const keys: string[] = [];
    const seen = new Set<string>();

    for (const item of batch) {
      const outcome = await applyOne(tx, item, sample);
      if (outcome === 'skipped') continue;
      if (outcome === 'created') created += 1;
      else upserted += 1;
      if (!seen.has(item.canonical_key)) {
        seen.add(item.canonical_key);
        keys.push(item.canonical_key);
      }
    }
    return { created, upserted, keys };
  });
}

type ApplyOne = 'created' | 'upserted' | 'skipped';

async function applyOne(
  tx: Parameters<Parameters<Db['transaction']>[0]>[0],
  item: ItemInput,
  sample: boolean,
): Promise<ApplyOne> {
  const existing = await tx.select().from(items).where(eq(items.canonicalKey, item.canonical_key)).limit(1);
  const row = existing[0];
  const channel = item.channel ?? '';
  const channelPostUrl = item.channel_post_url ?? '';
  const postedAt = item.posted_at ? new Date(item.posted_at) : null;

  if (!row) {
    const id = crypto.randomUUID();
    const now = new Date();
    await tx.insert(items).values({
      id,
      canonicalKey: item.canonical_key,
      kind: item.kind,
      title: item.title,
      url: item.url,
      summary: item.summary ?? null,
      publishedAt: item.published_at ? new Date(item.published_at) : null,
      lane: item.lane ?? null,
      org: item.org ?? null,
      tags: item.tags ?? [],
      score: item.score ?? null,
      modality: item.modality ?? null,
      extra: item.extra ?? {},
      sample,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(appearances).values({
      id: crypto.randomUUID(),
      itemId: id,
      sourceBot: item.source_bot,
      channel,
      channelPostUrl,
      postedAt,
      lane: item.lane ?? null,
    });
    return 'created';
  }

  if (sample && !row.sample) return 'skipped';

  const current: StoredFields = {
    kind: row.kind,
    title: row.title,
    url: row.url,
    summary: row.summary,
    publishedAt: row.publishedAt,
    lane: row.lane,
    org: row.org,
    tags: row.tags,
    score: row.score,
    modality: row.modality,
    extra: asObject(row.extra),
    sample: row.sample,
  };
  const apps = await tx.select().from(appearances).where(eq(appearances.itemId, row.id));
  const match = apps.find(
    (appearance) =>
      appearance.sourceBot === item.source_bot &&
      appearance.channel === channel &&
      appearance.channelPostUrl === channelPostUrl,
  );
  const merged = {
    ...nextFields(current, item, sample ? true : false),
    lane: resolvedItemLane(row.lane, item.lane, match?.lane, !match),
  };

  let appearanceChanged = false;
  if (!match) {
    await tx.insert(appearances).values({
      id: crypto.randomUUID(),
      itemId: row.id,
      sourceBot: item.source_bot,
      channel,
      channelPostUrl,
      postedAt,
      lane: item.lane ?? null,
    });
    appearanceChanged = true;
  } else {
    const nextLane = item.lane == null ? match.lane : item.lane;
    const laneChanged = (match.lane ?? null) !== (nextLane ?? null);
    const timeChanged = !sameTime(match.postedAt, postedAt);
    if (laneChanged || timeChanged) {
      await tx
        .update(appearances)
        .set({ postedAt, lane: nextLane ?? null })
        .where(and(eq(appearances.id, match.id)));
      appearanceChanged = true;
    }
  }

  if (!fieldsEqual(current, merged) || appearanceChanged) {
    await tx
      .update(items)
      .set({ ...merged, updatedAt: new Date() })
      .where(eq(items.id, row.id));
  }
  return 'upserted';
}
