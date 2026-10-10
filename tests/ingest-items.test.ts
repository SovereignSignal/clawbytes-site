import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { POST } from '@/app/api/ingest/items/route';
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

  it('lists validation errors per item and writes nothing', async () => {
    const response = await post({
      items: [
        item(),
        item({
          canonical_key: 'MODEL:bad',
          title: '',
          summary: 'x'.repeat(601),
          kind: 'repo',
        }),
      ],
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { errors: Array<{ index: number; messages: string[] }> };
    expect(body.errors.map((error) => error.index)).toEqual([1]);
    expect(body.errors[0]?.messages.join(' ')).toMatch(/canonical_key/);
    expect(body.errors[0]?.messages.join(' ')).toMatch(/title/);
    expect(body.errors[0]?.messages.join(' ')).toMatch(/summary/);
    expect(await db.select().from(items)).toHaveLength(0);
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
});
