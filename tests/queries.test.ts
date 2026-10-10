import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/db/client';
import { appearances, issues, items } from '@/db/schema';
import { applyIssueBatch } from '@/lib/ingest/issues';
import { applyItemBatch } from '@/lib/ingest/items';
import { saveDraftIssue } from '@/lib/newsletter/store';
import { itemInWeek, listLatest, listPublishedIssues, loadWeekItems, searchItems } from '@/lib/queries';
import { weekWindow } from '@/lib/newsletter/week';
import { createTestDb } from './helpers/db';
import { item } from './helpers/item';

describe('public queries', () => {
  let db: Db;

  beforeAll(async () => {
    db = await createTestDb();
  });

  beforeEach(async () => {
    await db.delete(appearances);
    await db.delete(items);
    await db.delete(issues);
  });

  it('hides sample rows unless samples are requested', async () => {
    await applyItemBatch(db, [item()], { sample: true });
    expect(await listLatest(false)).toHaveLength(0);
    expect(await listLatest(true)).toHaveLength(1);
  });

  it('keeps an item posted this week even when it was published earlier', async () => {
    await applyItemBatch(db, [
      item({ published_at: '2026-09-01T00:00:00.000Z', posted_at: '2026-10-06T12:00:00.000Z' }),
    ]);
    const window = weekWindow('2026-10-05');
    const rows = await loadWeekItems(window, false);
    expect(rows.map((row) => row.canonicalKey)).toEqual(['model:anthropic/claude-haiku-5.5']);
  });

  it('searches title text', async () => {
    await applyItemBatch(db, [item({ title: 'Claude Haiku 5.5' })]);
    expect(await searchItems(true, 'haiku')).toHaveLength(1);
    expect(await searchItems(true, 'missing-term')).toHaveLength(0);
  });

  it('includes an undated item created during the week', () => {
    const window = weekWindow('2026-10-05');
    const inside = itemInWeek(
      {
        id: '1',
        canonicalKey: 'url:https://example.com/a',
        kind: 'news',
        title: 'A',
        url: 'https://example.com/a',
        summary: null,
        publishedAt: null,
        createdAt: new Date('2026-10-06T00:00:00.000Z'),
        lane: null,
        org: null,
        tags: [],
        score: null,
        modality: null,
        sample: false,
        appearances: [],
      },
      window,
    );
    expect(inside).toBe(true);
  });

  it('does not publish a draft through the newsletter save path', async () => {
    await applyIssueBatch(db, [
      {
        slug: 'week-2026-10-05',
        title: 'Draft',
        theme_line: 'Theme',
        published_at: '2026-10-05T00:00:00.000Z',
        body_markdown: 'Body',
        status: 'draft',
      },
    ]);
    expect(await listPublishedIssues(true)).toHaveLength(0);
  });

  it('refuses to overwrite a published issue with a new draft', async () => {
    await applyIssueBatch(db, [
      {
        slug: 'week-2026-10-05',
        title: 'Published',
        theme_line: 'Theme',
        published_at: '2026-10-05T00:00:00.000Z',
        body_markdown: 'Keep me',
        status: 'published',
      },
    ]);
    await expect(
      saveDraftIssue(
        db,
        {
          slug: 'week-2026-10-05',
          title: 'Replacement',
          themeLine: 'Other',
          opening: 'No',
          weekStart: new Date('2026-10-05T00:00:00.000Z'),
          leads: [],
          sections: [],
          source: 'template',
          model: null,
        },
        'Replacement body',
        '<p>Replacement</p>',
      ),
    ).rejects.toThrow(/published/);
    expect((await listPublishedIssues(true))[0]?.title).toBe('Published');
  });
});
