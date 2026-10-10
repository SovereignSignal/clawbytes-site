import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DELETE, POST } from '@/app/api/ingest/items/route';
import type { Db } from '@/db/client';
import { appearances, items } from '@/db/schema';
import { applyItemBatch, parseItemBatch } from '@/lib/ingest/items';
import { createTestDb } from './helpers/db';
import { item } from './helpers/item';

const token = 'test-token';

async function post(body: unknown, authorization = `Bearer ${token}`): Promise<Response> {
  return POST(
    new Request('http://localhost/api/ingest/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization },
      body: JSON.stringify(body),
    }),
  );
}

async function del(body: unknown, authorization = `Bearer ${token}`, search = ''): Promise<Response> {
  return DELETE(
    new Request(`http://localhost/api/ingest/items${search}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json', authorization },
      body: JSON.stringify(body),
    }),
  );
}

describe('item ingest', () => {
  let db: Db;

  beforeAll(async () => {
    process.env.AI_WIRE_INGEST_TOKEN = token;
    db = await createTestDb();
  });

  beforeEach(async () => {
    await db.delete(appearances);
    await db.delete(items);
  });

  it('rejects a missing token', async () => {
    const response = await post(item(), '');
    expect(response.status).toBe(401);
    expect(await db.select().from(items)).toHaveLength(0);
  });

  it('writes the valid items when one item in the batch is invalid', async () => {
    const response = await post({
      items: [
        item({ published_at: '2026-08-01', posted_at: '2026-08-02' }),
        item({
          canonical_key: 'MODEL:bad',
          title: '',
          summary: 'x'.repeat(601),
          kind: 'repo',
        }),
      ],
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      created: number;
      keys: string[];
      errors: Array<{ index: number; messages: string[] }>;
    };
    expect(body.created).toBe(1);
    expect(body.keys).toEqual(['model:anthropic/claude-haiku-5.5']);
    expect(body.errors.map((error) => error.index)).toEqual([1]);
    expect(body.errors[0]?.messages.join(' ')).toMatch(/canonical_key/);
    expect(body.errors[0]?.messages.join(' ')).toMatch(/title/);
    expect(body.errors[0]?.messages.join(' ')).toMatch(/summary/);
    const rows = await db.select().from(items);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.publishedAt?.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    const apps = await db.select().from(appearances);
    expect(apps[0]?.postedAt?.toISOString()).toBe('2026-08-02T00:00:00.000Z');
  });

  it('writes nothing when every item is invalid', async () => {
    const response = await post({ items: [item({ title: '', published_at: '2026-02-31' })] });
    expect(response.status).toBe(400);
    expect(await db.select().from(items)).toHaveLength(0);
  });

  it('stores url keys that differ by query, fragment, or tilde as different items', async () => {
    const plain = 'https://example.com/~notes/story';
    const keys = [`url:${plain}`, `url:${plain}?utm=1`, `url:${plain}#section`];
    const response = await post({
      items: keys.map((canonical_key, index) =>
        item({
          kind: 'news',
          canonical_key,
          url: canonical_key.slice(4),
          title: `Story ${index}`,
          modality: null,
          published_at: '2026-04-02',
          posted_at: '2026-04-03',
        }),
      ),
    });
    expect(response.status).toBe(200);
    const rows = await db.select().from(items);
    expect(rows.map((row) => row.canonicalKey).sort()).toEqual([...keys].sort());
    expect(rows.map((row) => row.url).sort()).toEqual([plain, `${plain}?utm=1`, `${plain}#section`].sort());
    expect(new Set(rows.map((row) => row.publishedAt?.toISOString()))).toEqual(new Set(['2026-04-02T00:00:00.000Z']));
  });

  it('rejects a batch over 100', async () => {
    const parsed = parseItemBatch({ items: Array.from({ length: 101 }, () => item()) });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.errors[0]?.messages[0]).toMatch(/100/);
  });

  it('creates, then treats an identical payload as a no-op', async () => {
    const first = await post(item());
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({
      upserted: 0,
      created: 1,
      keys: ['model:anthropic/claude-haiku-5.5'],
    });

    await db
      .update(items)
      .set({ updatedAt: new Date('2020-01-01T00:00:00.000Z') })
      .where(eq(items.canonicalKey, 'model:anthropic/claude-haiku-5.5'));

    const second = await post(item());
    expect(await second.json()).toEqual({
      upserted: 1,
      created: 0,
      keys: ['model:anthropic/claude-haiku-5.5'],
    });
    const rows = await db.select().from(items);
    const apps = await db.select().from(appearances);
    expect(rows).toHaveLength(1);
    expect(apps).toHaveLength(1);
    expect(rows[0]?.updatedAt.toISOString()).toBe('2020-01-01T00:00:00.000Z');
  });

  it('merges a second bot into appearances', async () => {
    const response = await post({
      items: [
        item(),
        item({
          source_bot: 'clawbytes',
          channel: 'clawbytes',
          channel_post_url: 'https://t.me/clawbytes/979',
          posted_at: '2026-10-06T17:00:00.000Z',
          lane: 'Ship',
        }),
      ],
    });
    expect(await response.json()).toMatchObject({ created: 1, upserted: 1, keys: ['model:anthropic/claude-haiku-5.5'] });
    const apps = await db.select().from(appearances);
    expect(apps.map((appearance) => appearance.sourceBot).sort()).toEqual(['clawbytes', 'modelbytes']);
    const rows = await db.select().from(items);
    expect(rows[0]?.lane).toBe('Tier 1');
    expect(apps.find((appearance) => appearance.sourceBot === 'clawbytes')?.lane).toBe('Ship');
    expect(apps.find((appearance) => appearance.sourceBot === 'modelbytes')?.lane).toBe('Tier 1');
  });

  it('keeps an omitted summary and replaces one that is sent', async () => {
    await applyItemBatch(db, [item({ summary: 'first' })]);
    await applyItemBatch(db, [item({ summary: undefined })]);
    let rows = await db.select().from(items);
    expect(rows[0]?.summary).toBe('first');
    await applyItemBatch(db, [item({ summary: 'second' })]);
    rows = await db.select().from(items);
    expect(rows[0]?.summary).toBe('second');
  });

  it('does not let sample data overwrite a real item', async () => {
    await applyItemBatch(db, [item({ title: 'Real' })]);
    const result = await applyItemBatch(db, [item({ title: 'Sample' })], { sample: true });
    expect(result).toEqual({ created: 0, upserted: 0, keys: [] });
    const rows = await db.select().from(items);
    expect(rows[0]?.title).toBe('Real');
    expect(rows[0]?.sample).toBe(false);
  });

  it('rejects a delete without the bearer token', async () => {
    await applyItemBatch(db, [item({ canonical_key: 'model:acme/keep', url: 'https://example.com/keep', channel_post_url: 'https://t.me/ModelBytes/2' })]);
    const body = { canonical_keys: ['model:acme/keep'] };
    expect((await del(body, '')).status).toBe(401);
    expect(await (await del(body, 'Bearer nope')).json()).toEqual({ error: 'unauthorized' });
    const previous = process.env.AI_WIRE_INGEST_TOKEN;
    delete process.env.AI_WIRE_INGEST_TOKEN;
    try {
      expect((await del(body)).status).toBe(401);
    } finally {
      process.env.AI_WIRE_INGEST_TOKEN = previous;
    }
    expect(await db.select().from(items)).toHaveLength(1);
    expect(await db.select().from(appearances)).toHaveLength(1);
  });

  it('dry-runs a delete and reports keys that are not stored', async () => {
    await applyItemBatch(db, [
      item({
        canonical_key: 'model:acme/drop',
        url: 'https://example.com/drop',
        title: 'Drop',
        channel_post_url: 'https://t.me/ModelBytes/3',
      }),
    ]);
    const response = await del(
      { canonical_keys: ['url:https://example.com/missing', 'model:acme/drop', 'url:https://example.com/missing'] },
      `Bearer ${token}`,
      '?dry_run=1',
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      deleted: ['model:acme/drop'],
      not_found: ['url:https://example.com/missing'],
      dry_run: true,
    });
    expect(await db.select().from(items)).toHaveLength(1);
    expect(await db.select().from(appearances)).toHaveLength(1);
  });

  it('deletes an item and its appearances, and leaves other keys', async () => {
    await applyItemBatch(db, [
      item({
        canonical_key: 'model:acme/keep',
        url: 'https://example.com/keep',
        title: 'Keep',
        channel_post_url: 'https://t.me/ModelBytes/4',
      }),
      item({
        canonical_key: 'model:acme/drop',
        url: 'https://example.com/drop',
        title: 'Drop',
        channel_post_url: 'https://t.me/ModelBytes/5',
      }),
      item({
        canonical_key: 'model:acme/drop',
        url: 'https://example.com/drop',
        title: 'Drop',
        source_bot: 'clawbytes',
        channel: 'clawbytes',
        channel_post_url: 'https://t.me/clawbytes/5',
        lane: 'Ship',
      }),
    ]);
    const response = await del({
      canonical_keys: ['missing-a', 'model:acme/drop', 'missing-b', 'model:acme/drop'],
    });
    expect(await response.json()).toEqual({
      deleted: ['model:acme/drop'],
      not_found: ['missing-a', 'missing-b'],
      dry_run: false,
    });
    const rows = await db.select().from(items);
    expect(rows.map((row) => row.canonicalKey)).toEqual(['model:acme/keep']);
    const apps = await db.select().from(appearances);
    expect(apps).toHaveLength(1);
    expect(apps[0]?.sourceBot).toBe('modelbytes');

    const again = await del({ canonical_keys: ['model:acme/drop'] });
    expect(await again.json()).toEqual({
      deleted: [],
      not_found: ['model:acme/drop'],
      dry_run: false,
    });
    expect(await db.select().from(items)).toHaveLength(1);
  });

  it('does not delete a key that differs only by case', async () => {
    await applyItemBatch(db, [
      item({
        source_bot: 'clawbytes',
        kind: 'news',
        canonical_key: 'url:https://simonwillison.net/2026/Oct/6/le-chonk/',
        url: 'https://simonwillison.net/2026/Oct/6/le-chonk/',
        title: 'Real',
        channel: 'clawbytes',
        channel_post_url: 'https://t.me/clawbytes/6',
        modality: null,
      }),
    ]);
    const response = await del({
      canonical_keys: ['url:https://simonwillison.net/2026/oct/6/le-chonk'],
    });
    expect(await response.json()).toEqual({
      deleted: [],
      not_found: ['url:https://simonwillison.net/2026/oct/6/le-chonk'],
      dry_run: false,
    });
    expect(await db.select().from(items)).toHaveLength(1);
  });

  it('rejects a delete body that is not a list of keys', async () => {
    await applyItemBatch(db, [item()]);
    const response = await del({ canonical_keys: [1] });
    expect(response.status).toBe(400);
    expect(await db.select().from(items)).toHaveLength(1);
    const tooMany = await del({
      canonical_keys: Array.from({ length: 101 }, (_, index) => `url:https://example.com/${index}`),
    });
    expect(tooMany.status).toBe(400);
    expect(await db.select().from(items)).toHaveLength(1);
  });
});
