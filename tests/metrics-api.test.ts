import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/metrics/route';
import StatsPage from '@/app/stats/page';
import type { Db } from '@/db/client';
import {
  appearances,
  botHealth,
  items,
  siteHealth,
  sourceYieldDaily,
  telegramSubscriberDaily,
} from '@/db/schema';
import { runMetrics } from '@/lib/metrics/job';
import { listSubscriberSeries } from '@/lib/metrics/subscribers';
import { createTestDb } from './helpers/db';

const token = 'metrics-token';
const NOW = new Date('2026-10-14T16:00:00.000Z');

function makeFetch(): typeof fetch {
  const counts: Record<string, string> = { clawbytes: '15', ModelBytes: '21', interestingrepos: '40' };
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('://t.me/')) {
      const slug = new URL(url).pathname.replace(/^\//, '');
      return new Response(`<div class="tgme_page_extra">${counts[slug]} subscribers</div>`);
    }
    if (url.endsWith('/api/health')) {
      return Response.json({ ok: true, ready: true, service: 'ai-wire', database: 'reachable' });
    }
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
}

async function get(authorization?: string): Promise<Response> {
  return GET(
    new Request('http://localhost/api/metrics', {
      headers: authorization ? { authorization } : {},
    }),
  );
}

describe('metrics api', () => {
  let db: Db;

  beforeAll(async () => {
    process.env.AI_WIRE_INGEST_TOKEN = token;
    db = await createTestDb();
  });

  beforeEach(async () => {
    await db.delete(sourceYieldDaily);
    await db.delete(telegramSubscriberDaily);
    await db.delete(botHealth);
    await db.delete(siteHealth);
    await db.delete(appearances);
    await db.delete(items);
  });

  it('rejects a missing or wrong token', async () => {
    expect((await get()).status).toBe(401);
    expect(await (await get()).json()).toEqual({ error: 'unauthorized' });
    expect((await get('Bearer nope')).status).toBe(401);
    const previous = process.env.AI_WIRE_INGEST_TOKEN;
    delete process.env.AI_WIRE_INGEST_TOKEN;
    try {
      expect((await get(`Bearer ${token}`)).status).toBe(401);
    } finally {
      process.env.AI_WIRE_INGEST_TOKEN = previous;
    }
  });

  it('returns subscribers, yield, and health for the ingest token', async () => {
    await runMetrics({
      db,
      now: NOW,
      fetch: makeFetch(),
      healthUrl: 'http://site.test/api/health',
      webhookUrl: null,
      log: vi.fn(),
    });
    const response = await get(`Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    const body = (await response.json()) as {
      subscribers: Array<{ channel: string; latest: { day: string; member_count: number } | null }>;
      yield: Array<{ day: string; source_bot: string; posted_count: number }>;
      bots: Array<{ source_bot: string; stale: boolean; stale_after_hours: number }>;
      site: { ok: boolean; status_code: number; database: string } | null;
    };
    expect(body.subscribers.map((entry) => entry.channel)).toEqual([
      'clawbytes',
      'ModelBytes',
      'interestingrepos',
    ]);
    expect(body.subscribers.find((entry) => entry.channel === 'clawbytes')?.latest).toEqual({
      day: '2026-10-14',
      member_count: 15,
      scraped_at: NOW.toISOString(),
    });
    expect(body.yield).toHaveLength(8);
    expect(body.yield.every((row) => row.posted_count === 0)).toBe(true);
    expect(body.bots.map((bot) => bot.source_bot)).toEqual([
      'clawbytes',
      'modelbytes',
      'interesting-repos',
      'release-bot',
    ]);
    expect(body.bots.every((bot) => bot.stale)).toBe(true);
    expect(body.bots.find((bot) => bot.source_bot === 'release-bot')?.stale_after_hours).toBe(168);
    expect(body.site).toMatchObject({ ok: true, status_code: 200, database: 'reachable' });

    const publicSeries = await listSubscriberSeries(db);
    expect(JSON.stringify(publicSeries)).not.toMatch(/posted_count|source_bot|stale|release-bot/);
  });

  it('renders subscriber growth on /stats and leaves the scorecard off the page', async () => {
    await db.insert(telegramSubscriberDaily).values([
      { channel: 'clawbytes', day: '2026-10-13', memberCount: 10, scrapedAt: new Date('2026-10-13T08:00:00.000Z') },
      { channel: 'clawbytes', day: '2026-10-14', memberCount: 15, scrapedAt: new Date('2026-10-14T08:00:00.000Z') },
    ]);
    await db.insert(sourceYieldDaily).values({
      day: '2026-10-14',
      sourceBot: 'release-bot',
      channel: 'release-alerts',
      lane: 'SecretLane',
      postedCount: 4242,
    });
    const html = renderToStaticMarkup(await StatsPage());
    expect(html).toContain('15');
    expect(html).toContain('+5 since 13 Oct 2026');
    expect(html).not.toContain('4242');
    expect(html).not.toContain('SecretLane');
    expect(html).not.toContain('release-bot');
    expect(html).not.toContain('posted');
  });
});
