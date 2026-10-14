import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/db/client';
import { appearances, botHealth, items, siteHealth, sourceYieldDaily, telegramSubscriberDaily } from '@/db/schema';
import { applyItemBatch, type ItemInput } from '@/lib/ingest/items';
import { DEFAULT_STALE_HOURS, runMetrics, staleHoursFromEnv } from '@/lib/metrics/job';
import { asDate } from '@/lib/metrics/time';
import { createTestDb } from './helpers/db';
import { item } from './helpers/item';

const NOW = new Date('2026-10-14T16:00:00.000Z');
const HOOK = 'https://alerts.example/hook';
const HOUR = 60 * 60 * 1000;

let db: Db;
let n = 0;

function posted(overrides: Partial<ItemInput> = {}): ItemInput {
  n += 1;
  return item({
    source_bot: 'clawbytes',
    kind: 'news',
    canonical_key: `url:https://example.com/p/${n}`,
    title: `Story ${n}`,
    url: `https://example.com/p/${n}`,
    summary: 'A post.',
    modality: null,
    org: null,
    tags: [],
    score: null,
    channel: 'clawbytes',
    channel_post_url: `https://t.me/clawbytes/${n}`,
    lane: 'Ship',
    posted_at: '2026-10-14T12:00:00.000Z',
    published_at: '2026-10-14T12:00:00.000Z',
    ...overrides,
  });
}

type Call = { url: string; body: string | null };

function makeFetch(options?: {
  counts?: Record<string, string>;
  fail?: string;
  healthStatus?: number;
  webhookStatus?: number;
  webhookError?: boolean;
  calls?: Call[];
}): typeof fetch {
  const counts = options?.counts ?? { clawbytes: '15', ModelBytes: '21', interestingrepos: '40' };
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = typeof init?.body === 'string' ? init.body : null;
    options?.calls?.push({ url, body });
    if (url.includes('://t.me/')) {
      const slug = new URL(url).pathname.replace(/^\//, '');
      if (slug === options?.fail) return new Response('<html><div class="tgme_page_extra">join</div></html>');
      return new Response(`<html><div class="tgme_page_extra">${counts[slug]} subscribers</div></html>`);
    }
    if (url.endsWith('/api/health')) {
      const status = options?.healthStatus ?? 200;
      return Response.json(
        {
          ok: status === 200,
          ready: status === 200,
          service: 'ai-wire',
          database: status === 200 ? 'reachable' : 'unreachable',
        },
        { status },
      );
    }
    if (url === HOOK) {
      if (options?.webhookError) throw new Error('connect refused');
      return new Response(null, { status: options?.webhookStatus ?? 204 });
    }
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
}

async function clear(): Promise<void> {
  await db.delete(sourceYieldDaily);
  await db.delete(telegramSubscriberDaily);
  await db.delete(botHealth);
  await db.delete(siteHealth);
  await db.delete(appearances);
  await db.delete(items);
}

describe('metrics job', () => {
  beforeAll(async () => {
    db = await createTestDb();
  });

  beforeEach(async () => {
    await clear();
  });

  it('reads per-bot stale hours from the environment', () => {
    expect(staleHoursFromEnv({})).toEqual(DEFAULT_STALE_HOURS);
    expect(staleHoursFromEnv({ HEALTH_STALE_HOURS_RELEASE_BOT: '48' })['release-bot']).toBe(48);
    expect(staleHoursFromEnv({ HEALTH_STALE_HOURS_CLAWBYTES: '0' }).clawbytes).toBe(18);
    expect(staleHoursFromEnv({ HEALTH_STALE_HOURS_CLAWBYTES: 'nope' }).clawbytes).toBe(18);
    expect(staleHoursFromEnv({ HEALTH_STALE_HOURS_CLAWBYTES: '12.5' }).clawbytes).toBe(18);
    expect(staleHoursFromEnv({ HEALTH_STALE_HOURS_MODELBYTES: '100001' }).modelbytes).toBe(36);
    expect(staleHoursFromEnv({ HEALTH_STALE_HOURS_MODELBYTES: '36' }).modelbytes).toBe(36);
  });

  it('stores subscribers and the yield scorecard, and stays quiet when every check passes', async () => {
    await applyItemBatch(db, [
      posted({ posted_at: '2026-10-14T10:00:00.000Z', lane: 'Ship' }),
      posted({ posted_at: '2026-10-14T11:00:00.000Z', lane: 'Ship' }),
      posted({ posted_at: '2026-10-14T09:00:00.000Z', lane: null }),
      posted({ posted_at: '2026-10-12T12:00:00.000Z', lane: 'Old' }),
      posted({
        source_bot: 'modelbytes',
        channel: 'ModelBytes',
        channel_post_url: 'https://t.me/ModelBytes/1',
        posted_at: '2026-10-13T12:00:00.000Z',
        lane: 'Tier 1',
      }),
      posted({
        source_bot: 'interesting-repos',
        channel: 'interestingrepos',
        channel_post_url: 'https://t.me/interestingrepos/1',
        posted_at: '2026-10-14T04:00:00.000Z',
        lane: 'Agents',
      }),
      posted({
        source_bot: 'release-bot',
        channel: 'release-alerts',
        channel_post_url: 'https://t.me/release/1',
        posted_at: '2026-10-12T12:00:00.000Z',
        lane: 'Release',
      }),
    ]);
    await applyItemBatch(
      db,
      [posted({ posted_at: '2026-10-14T15:00:00.000Z', lane: 'Ship' })],
      { sample: true },
    );

    const calls: Call[] = [];
    const log = vi.fn();
    const result = await runMetrics({
      db,
      now: NOW,
      fetch: makeFetch({ calls }),
      healthUrl: 'http://site.test/api/health',
      webhookUrl: HOOK,
      log,
    });

    expect(result.alerts).toEqual([]);
    expect(result.webhookSent).toBe(false);
    expect(result.webhookFailed).toBe(false);
    expect(log).not.toHaveBeenCalled();
    expect(calls.map((call) => call.url).some((url) => url === HOOK)).toBe(false);

    const subscribers = await db.select().from(telegramSubscriberDaily);
    expect(subscribers).toHaveLength(3);
    expect(subscribers.find((row) => row.channel === 'clawbytes')).toMatchObject({
      day: '2026-10-14',
      memberCount: 15,
    });
    expect(subscribers.find((row) => row.channel === 'ModelBytes')?.memberCount).toBe(21);
    expect(subscribers.find((row) => row.channel === 'interestingrepos')?.memberCount).toBe(40);

    const scorecard = await db.select().from(sourceYieldDaily);
    const row = (day: string, sourceBot: string, channel: string, lane: string) =>
      scorecard.find(
        (entry) =>
          String(entry.day).slice(0, 10) === day &&
          entry.sourceBot === sourceBot &&
          entry.channel === channel &&
          entry.lane === lane,
      );
    expect(row('2026-10-14', 'clawbytes', 'clawbytes', 'Ship')?.postedCount).toBe(2);
    expect(row('2026-10-14', 'clawbytes', 'clawbytes', '')?.postedCount).toBe(1);
    expect(row('2026-10-14', 'interesting-repos', 'interestingrepos', 'Agents')?.postedCount).toBe(1);
    expect(row('2026-10-14', 'modelbytes', '', '')?.postedCount).toBe(0);
    expect(row('2026-10-14', 'release-bot', '', '')?.postedCount).toBe(0);
    expect(row('2026-10-13', 'modelbytes', 'ModelBytes', 'Tier 1')?.postedCount).toBe(1);
    expect(row('2026-10-13', 'clawbytes', '', '')?.postedCount).toBe(0);
    expect(scorecard.some((entry) => String(entry.day).startsWith('2026-10-12'))).toBe(false);
    expect(scorecard.some((entry) => entry.lane === 'Old' || entry.lane === 'Release')).toBe(false);

    const bots = await db.select().from(botHealth);
    expect(bots).toHaveLength(4);
    expect(bots.every((bot) => bot.stale === false)).toBe(true);
    const site = await db.select().from(siteHealth);
    expect(site[0]).toMatchObject({ id: 'site', ok: true, statusCode: 200, ready: true, database: 'reachable' });
  });

  it('refreshes today and replaces a scorecard that dropped to zero', async () => {
    await applyItemBatch(db, [posted({ posted_at: '2026-10-14T10:00:00.000Z', lane: 'Ship' })]);
    await runMetrics({
      db,
      now: NOW,
      fetch: makeFetch({ counts: { clawbytes: '15', ModelBytes: '21', interestingrepos: '40' } }),
      healthUrl: 'http://site.test/api/health',
      webhookUrl: null,
      log: vi.fn(),
    });
    await db.delete(appearances);
    await db.delete(items);
    await runMetrics({
      db,
      now: new Date(NOW.getTime() + 60_000),
      fetch: makeFetch({ counts: { clawbytes: '18', ModelBytes: '21', interestingrepos: '40' } }),
      healthUrl: 'http://site.test/api/health',
      webhookUrl: null,
      log: vi.fn(),
    });

    const subscribers = await db.select().from(telegramSubscriberDaily).where(eq(telegramSubscriberDaily.channel, 'clawbytes'));
    expect(subscribers).toHaveLength(1);
    expect(subscribers[0]?.memberCount).toBe(18);
    const scorecard = await db.select().from(sourceYieldDaily);
    expect(scorecard.some((entry) => entry.lane === 'Ship')).toBe(false);
    expect(scorecard.find((entry) => entry.sourceBot === 'clawbytes' && String(entry.day).slice(0, 10) === '2026-10-14')?.postedCount).toBe(0);
  });

  it('keeps the previous subscriber count when a scrape fails', async () => {
    await runMetrics({
      db,
      now: NOW,
      fetch: makeFetch(),
      healthUrl: 'http://site.test/api/health',
      webhookUrl: null,
      log: vi.fn(),
    });
    await db.delete(botHealth);
    await applyItemBatch(db, [
      posted({ posted_at: '2026-10-14T15:00:00.000Z' }),
      posted({
        source_bot: 'modelbytes',
        channel: 'ModelBytes',
        channel_post_url: 'https://t.me/ModelBytes/9',
        posted_at: '2026-10-14T15:00:00.000Z',
      }),
      posted({
        source_bot: 'interesting-repos',
        channel: 'interestingrepos',
        channel_post_url: 'https://t.me/interestingrepos/9',
        posted_at: '2026-10-14T15:00:00.000Z',
      }),
      posted({
        source_bot: 'release-bot',
        channel: 'release-alerts',
        channel_post_url: 'https://t.me/release/9',
        posted_at: '2026-10-14T15:00:00.000Z',
      }),
    ]);
    const log = vi.fn();
    const result = await runMetrics({
      db,
      now: new Date(NOW.getTime() + 60_000),
      fetch: makeFetch({ fail: 'ModelBytes' }),
      healthUrl: 'http://site.test/api/health',
      webhookUrl: null,
      log,
    });

    const modelbytes = await db
      .select()
      .from(telegramSubscriberDaily)
      .where(eq(telegramSubscriberDaily.channel, 'ModelBytes'));
    expect(modelbytes[0]?.memberCount).toBe(21);
    expect(result.alerts).toEqual([
      { type: 'telegram', channel: 'ModelBytes', detail: 'member count missing' },
    ]);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]?.[0]).toContain('telegram ModelBytes: member count missing');
  });

  it('does not treat another bot updating a shared item as a fresh ingest', async () => {
    const shared = 'url:https://example.com/shared';
    await applyItemBatch(db, [
      posted({
        canonical_key: shared,
        url: 'https://example.com/shared',
        source_bot: 'clawbytes',
        channel: 'clawbytes',
        posted_at: '2026-10-01T12:00:00.000Z',
      }),
    ]);
    await applyItemBatch(db, [
      posted({
        canonical_key: shared,
        url: 'https://example.com/shared',
        title: 'Updated title',
        source_bot: 'modelbytes',
        channel: 'ModelBytes',
        channel_post_url: 'https://t.me/ModelBytes/3',
        posted_at: '2026-10-14T15:00:00.000Z',
      }),
    ]);
    await runMetrics({
      db,
      now: NOW,
      fetch: makeFetch(),
      healthUrl: 'http://site.test/api/health',
      webhookUrl: null,
      log: vi.fn(),
    });
    const bots = await db.select().from(botHealth);
    const clawbytes = bots.find((bot) => bot.sourceBot === 'clawbytes');
    const modelbytes = bots.find((bot) => bot.sourceBot === 'modelbytes');
    expect(asDate(clawbytes?.lastIngestAt)?.toISOString()).toBe('2026-10-01T12:00:00.000Z');
    expect(clawbytes?.stale).toBe(true);
    expect(asDate(modelbytes?.lastIngestAt)?.toISOString()).toBe('2026-10-14T15:00:00.000Z');
    expect(modelbytes?.stale).toBe(false);
  });

  it('flags the exact stale boundary and a lenient release bot', async () => {
    await applyItemBatch(db, [
      posted({ posted_at: new Date(NOW.getTime() - 18 * HOUR).toISOString() }),
      posted({
        source_bot: 'release-bot',
        channel: 'release-alerts',
        channel_post_url: 'https://t.me/release/4',
        posted_at: new Date(NOW.getTime() - 168 * HOUR + 1).toISOString(),
      }),
    ]);
    await runMetrics({
      db,
      now: NOW,
      fetch: makeFetch(),
      healthUrl: 'http://site.test/api/health',
      webhookUrl: null,
      log: vi.fn(),
    });
    let bots = await db.select().from(botHealth);
    expect(bots.find((bot) => bot.sourceBot === 'clawbytes')?.stale).toBe(true);
    expect(bots.find((bot) => bot.sourceBot === 'release-bot')?.stale).toBe(false);
    expect(bots.find((bot) => bot.sourceBot === 'release-bot')?.staleAfterHours).toBe(168);

    await clear();
    await applyItemBatch(db, [
      posted({ posted_at: new Date(NOW.getTime() - 18 * HOUR + 1).toISOString() }),
      posted({
        source_bot: 'release-bot',
        channel: 'release-alerts',
        channel_post_url: 'https://t.me/release/5',
        posted_at: new Date(NOW.getTime() - 168 * HOUR).toISOString(),
      }),
    ]);
    await runMetrics({
      db,
      now: NOW,
      fetch: makeFetch(),
      healthUrl: 'http://site.test/api/health',
      webhookUrl: null,
      staleHours: { ...DEFAULT_STALE_HOURS, 'release-bot': 48 },
      log: vi.fn(),
    });
    bots = await db.select().from(botHealth);
    expect(bots.find((bot) => bot.sourceBot === 'clawbytes')?.stale).toBe(false);
    expect(bots.find((bot) => bot.sourceBot === 'release-bot')?.stale).toBe(true);
    expect(bots.find((bot) => bot.sourceBot === 'release-bot')?.staleAfterHours).toBe(48);
  });

  it('posts one JSON alert when checks fail and exits dirty if the webhook does not accept it', async () => {
    const calls: Call[] = [];
    const log = vi.fn();
    const result = await runMetrics({
      db,
      now: NOW,
      fetch: makeFetch({ fail: 'clawbytes', healthStatus: 503, calls }),
      healthUrl: 'http://site.test/api/health',
      webhookUrl: HOOK,
      log,
    });

    expect(result.webhookSent).toBe(true);
    expect(result.webhookFailed).toBe(false);
    expect(result.alerts.map((alert) => alert.type)).toEqual([
      'telegram',
      'stale',
      'stale',
      'stale',
      'stale',
      'site',
    ]);
    expect(log).toHaveBeenCalledTimes(1);
    const line = String(log.mock.calls[0]?.[0]);
    expect(line).toContain('[ai-wire] health alert:');
    expect(line).toContain('telegram clawbytes: member count missing');
    expect(line).toContain('clawbytes stale (no ingest recorded, limit 18h)');
    expect(line).toContain('release-bot stale (no ingest recorded, limit 168h)');
    expect(line).toContain('site health failed (HTTP 503): not ready, database unreachable');
    const postedBody = calls.find((call) => call.url === HOOK)?.body;
    expect(JSON.parse(postedBody ?? '')).toEqual({
      service: 'ai-wire',
      ok: false,
      checked_at: NOW.toISOString(),
      alerts: result.alerts,
    });

    const failedLog = vi.fn();
    const failed = await runMetrics({
      db,
      now: NOW,
      fetch: makeFetch({ fail: 'clawbytes', healthStatus: 503, webhookStatus: 500 }),
      healthUrl: 'http://site.test/api/health',
      webhookUrl: HOOK,
      log: failedLog,
    });
    expect(failed.webhookSent).toBe(false);
    expect(failed.webhookFailed).toBe(true);
    expect(String(failedLog.mock.calls[1]?.[0])).toContain('health alert webhook failed: HTTP 500');

    const thrownLog = vi.fn();
    const thrown = await runMetrics({
      db,
      now: NOW,
      fetch: makeFetch({ webhookError: true }),
      healthUrl: 'http://site.test/api/health',
      webhookUrl: HOOK,
      log: thrownLog,
    });
    expect(thrown.webhookFailed).toBe(true);
    expect(String(thrownLog.mock.calls.at(-1)?.[0])).toContain('health alert webhook failed: connect refused');
  });
});
