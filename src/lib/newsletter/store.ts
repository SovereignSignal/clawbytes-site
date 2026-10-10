import { eq } from 'drizzle-orm';
import type { Db } from '@/db/client';
import { issues } from '@/db/schema';
import { applyIssueBatch } from '@/lib/ingest/issues';
import type { NewsletterDraft } from '@/lib/newsletter/render';

/** Writes a draft. Refuses to overwrite an issue that is already published. */
export async function saveDraftIssue(
  db: Db,
  draft: NewsletterDraft,
  markdown: string,
  html: string,
): Promise<void> {
  const existing = await db.select().from(issues).where(eq(issues.slug, draft.slug)).limit(1);
  if (existing[0]?.status === 'published') {
    throw new Error(`Refusing to overwrite published issue ${draft.slug}. Publishing is a separate command.`);
  }
  await applyIssueBatch(db, [
    {
      slug: draft.slug,
      title: draft.title,
      theme_line: draft.themeLine,
      published_at: draft.weekStart.toISOString(),
      body_markdown: markdown,
      body_html: html,
      status: 'draft',
    },
  ]);
}

export async function publishIssue(db: Db, slug: string): Promise<'published' | 'already'> {
  const existing = await db.select().from(issues).where(eq(issues.slug, slug)).limit(1);
  const row = existing[0];
  if (!row) throw new Error(`No issue with slug ${slug}`);
  if (row.status === 'published') return 'already';
  await db.update(issues).set({ status: 'published', updatedAt: new Date() }).where(eq(issues.slug, slug));
  return 'published';
}
