import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/db/client';
import { appearances, issues, items } from '@/db/schema';
import { applyIssueBatch } from '@/lib/ingest/issues';
import { applyItemBatch } from '@/lib/ingest/items';
import { saveDraftIssue } from '@/lib/newsletter/store';
import { buildItemFeed } from '@/lib/rss';
import { eventAt, itemInWeek, listLatest, listModels, listPublishedIssues, listRepos, listTools, loadWeekItems, searchItems } from '@/lib/queries';
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
    expect((await searchItems(true, 'haiku')).items).toHaveLength(1);
    expect((await searchItems(true, 'missing-term')).items).toHaveLength(0);
  });

  it('sorts and publishes the real event time, not the ingest time', async () => {
    await applyItemBatch(db, [
      item({
        title: 'Published',
        canonical_key: 'model:a/published',
        url: 'https://example.com/published',
        published_at: '2026-01-15T00:00:00.000Z',
        posted_at: '2026-09-01T00:00:00.000Z',
      }),
      item({
        title: 'Posted',
        canonical_key: 'model:a/posted',
        url: 'https://example.com/posted',
        published_at: null,
        posted_at: '2026-06-01T00:00:00.000Z',
      }),
      item({
        title: 'Created',
        canonical_key: 'model:a/created',
        url: 'https://example.com/created',
        published_at: null,
        posted_at: null,
      }),
    ]);
    await db
      .update(items)
      .set({ createdAt: new Date('2026-12-01T00:00:00.000Z') })
      .where(eq(items.canonicalKey, 'model:a/created'));

    const rows = await listLatest(true);
    expect(rows.map((row) => row.title)).toEqual(['Created', 'Posted', 'Published']);
    const published = rows.find((row) => row.title === 'Published');
    const posted = rows.find((row) => row.title === 'Posted');
    const created = rows.find((row) => row.title === 'Created');
    expect(eventAt(published!).toISOString()).toBe('2026-01-15T00:00:00.000Z');
    expect(eventAt(posted!).toISOString()).toBe('2026-06-01T00:00:00.000Z');
    expect(eventAt(created!).toISOString()).toBe('2026-12-01T00:00:00.000Z');
    const feed = buildItemFeed([published!]);
    expect(feed).toContain(new Date('2026-01-15T00:00:00.000Z').toUTCString());
    expect(feed).not.toContain(published!.createdAt.toUTCString());
  });

  it('pages tools, models, repos, and search, and filters each by lane', async () => {
    await applyItemBatch(db, [
      item({
        source_bot: 'release-bot',
        kind: 'tool_release',
        canonical_key: 'release:acme/ship@1',
        url: 'https://example.com/ship',
        title: 'Ship tool',
        channel: 'release-alerts',
        channel_post_url: 'https://t.me/releasealerts/1',
        lane: 'Ship',
        modality: null,
        published_at: '2026-03-01T00:00:00.000Z',
      }),
      item({
        source_bot: 'release-bot',
        kind: 'tool_release',
        canonical_key: 'release:acme/watch@1',
        url: 'https://example.com/watch',
        title: 'Watch tool',
        channel: 'release-alerts',
        channel_post_url: 'https://t.me/releasealerts/2',
        lane: 'Watch',
        modality: null,
        published_at: '2026-03-02T00:00:00.000Z',
      }),
      item({
        kind: 'model',
        canonical_key: 'model:acme/one',
        url: 'https://example.com/m1',
        title: 'Model one',
        lane: 'Tier 1',
        published_at: '2026-05-01T00:00:00.000Z',
      }),
      item({
        kind: 'model',
        canonical_key: 'model:acme/two',
        url: 'https://example.com/m2',
        title: 'Model two',
        lane: 'Tier 2',
        published_at: '2026-05-02T00:00:00.000Z',
      }),
      item({
        canonical_key: 'model:acme/cross',
        url: 'https://example.com/cross',
        title: 'Cross posted',
        lane: 'Tier 1',
        published_at: '2026-05-03T00:00:00.000Z',
      }),
      item({
        canonical_key: 'model:acme/cross',
        url: 'https://example.com/cross',
        title: 'Cross posted',
        source_bot: 'clawbytes',
        channel: 'clawbytes',
        channel_post_url: 'https://t.me/clawbytes/9',
        lane: 'Ship',
        published_at: '2026-05-03T00:00:00.000Z',
      }),
      item({
        source_bot: 'interesting-repos',
        kind: 'repo',
        canonical_key: 'repo:acme/agents',
        url: 'https://example.com/agents',
        title: 'Agents repo',
        channel: 'interestingrepos',
        channel_post_url: 'https://t.me/interestingrepos/1',
        lane: 'agents',
        modality: null,
        published_at: '2026-07-01T00:00:00.000Z',
      }),
      item({
        source_bot: 'interesting-repos',
        kind: 'repo',
        canonical_key: 'repo:acme/evals',
        url: 'https://example.com/evals',
        title: 'Evals repo',
        channel: 'interestingrepos',
        channel_post_url: 'https://t.me/interestingrepos/2',
        lane: 'evals',
        modality: null,
        published_at: '2026-07-02T00:00:00.000Z',
      }),
    ]);

    const tools = await listTools(true, { lane: 'Ship', pageSize: 10 });
    expect(tools.items.map((row) => row.title)).toEqual(['Ship tool']);
    const toolPage = await listTools(true, { page: 1, pageSize: 1 });
    expect(toolPage.items[0]?.title).toBe('Watch tool');
    expect(toolPage.hasMore).toBe(true);
    expect((await listTools(true, { page: 2, pageSize: 1 })).items[0]?.title).toBe('Ship tool');

    const models = await listModels(true, { lane: 'Tier 2' });
    expect(models.items.map((row) => row.title)).toEqual(['Model two']);
    const crossed = await listModels(true, { lane: 'Ship' });
    expect(crossed.items.map((row) => row.canonicalKey)).toEqual(['model:acme/cross']);
    const modelPage = await listModels(true, { page: 1, pageSize: 1 });
    expect(modelPage.hasMore).toBe(true);
    expect(modelPage.items[0]?.title).toBe('Cross posted');
    expect((await listModels(true, { page: 2, pageSize: 1 })).items[0]?.title).toBe('Model two');

    expect((await listRepos(true, { lane: 'agents' })).items.map((row) => row.title)).toEqual(['Agents repo']);
    expect((await listRepos(true, { page: 2, pageSize: 1 })).items[0]?.title).toBe('Agents repo');

    expect((await searchItems(true, 'repo', { lane: 'evals' })).items.map((row) => row.title)).toEqual(['Evals repo']);
    const searchPage = await searchItems(true, 'tool', { page: 2, pageSize: 1 });
    expect(searchPage.items[0]?.title).toBe('Ship tool');
    expect(searchPage.hasMore).toBe(false);
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
