import { and, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import type { Db } from '@/db/client';
import { appearances, botHealth, items, siteHealth, sourceYieldDaily, telegramSubscriberDaily } from '@/db/schema';
import { SOURCE_BOTS } from '@/lib/ingest/items';
import { siteUrl } from '@/lib/site-url';
import { scrapeMemberCount, telegramChannels, type TelegramChannel } from '@/lib/metrics/telegram';
import { asDate, ingestIsStale, shiftUtcDay, utcDay, utcDayRange } from '@/lib/metrics/time';

export type SourceBot = (typeof SOURCE_BOTS)[number];

/**
 * Hours with no ingest before a bot is stale.
 * clawbytes and interesting-repos post several times a day; 18h covers a quiet night.
 * ModelBytes posts about once a day, so the window is a day and a half.
 * Release Bot can sit quiet for days.
 */
export const DEFAULT_STALE_HOURS: Record<SourceBot, number> = {
  clawbytes: 18,
  modelbytes: 36,
  'interesting-repos': 18,
  'release-bot': 168,
};

const STALE_ENV: Record<SourceBot, string> = {
  clawbytes: 'HEALTH_STALE_HOURS_CLAWBYTES',
  modelbytes: 'HEALTH_STALE_HOURS_MODELBYTES',
  'interesting-repos': 'HEALTH_STALE_HOURS_INTERESTING_REPOS',
  'release-bot': 'HEALTH_STALE_HOURS_RELEASE_BOT',
};

const MAX_STALE_HOURS = 100_000;

export type StaleHours = Record<SourceBot, number>;

export function staleHoursFromEnv(env: Readonly<Record<string, string | undefined>> = process.env): StaleHours {
  const hours = { ...DEFAULT_STALE_HOURS };
  for (const sourceBot of SOURCE_BOTS) {
    const raw = env[STALE_ENV[sourceBot]];
    if (raw === undefined) continue;
    const trimmed = raw.trim();
    if (!/^[1-9]\d*$/.test(trimmed)) continue;
    const value = Number(trimmed);
    if (value <= MAX_STALE_HOURS) hours[sourceBot] = value;
  }
  return hours;
}

export type AlertItem =
  | { type: 'telegram'; channel: string; detail: string }
  | { type: 'stale'; source_bot: string; last_ingest_at: string | null; stale_after_hours: number }
  | { type: 'site'; status_code: number | null; detail: string | null };

export function formatAlert(alert: AlertItem): string {
  if (alert.type === 'telegram') return `telegram ${alert.channel}: ${alert.detail}`;
  if (alert.type === 'site') {
    const status = alert.status_code === null ? '' : ` (HTTP ${alert.status_code})`;
    const detail = alert.detail ? `: ${alert.detail}` : '';
    return `site health failed${status}${detail}`;
  }
  if (alert.last_ingest_at) {
    return `${alert.source_bot} stale (last ingest ${alert.last_ingest_at}, limit ${alert.stale_after_hours}h)`;
  }
  return `${alert.source_bot} stale (no ingest recorded, limit ${alert.stale_after_hours}h)`;
}

export type RunMetricsOptions = {
  db: Db;
  now?: Date;
  fetch?: typeof fetch;
  channels?: readonly TelegramChannel[];
  healthUrl?: string;
  /** `undefined` reads HEALTH_ALERT_WEBHOOK_URL. `null` or blank skips the POST. */
  webhookUrl?: string | null;
  staleHours?: StaleHours;
  log?: (line: string) => void;
};

export type MetricsRunResult = {
  checkedAt: string;
  alerts: AlertItem[];
  webhookSent: boolean;
  webhookFailed: boolean;
};

type SiteCheck = {
  ok: boolean;
  statusCode: number | null;
  ready: boolean | null;
  database: string | null;
  detail: string | null;
};

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function short(value: string): string {
  return value.length > 300 ? `${value.slice(0, 300)}…` : value;
}

function staleDetail(last: Date | null): string {
  return last ? `last ingest ${last.toISOString()}` : 'no ingest recorded';
}

async function checkSite(fetchImpl: typeof fetch, url: string): Promise<SiteCheck> {
  try {
    const response = await fetchImpl(url, {
      headers: { accept: 'application/json' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    });
    let parsed: unknown = null;
    try {
      parsed = await response.json();
    } catch {
      parsed = null;
    }
    const body =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    const ready = typeof body.ready === 'boolean' ? body.ready : null;
    const database = typeof body.database === 'string' ? body.database : null;
    const ok = response.ok && body.ok === true && body.ready === true;
    let detail: string | null = null;
    if (!ok) {
      if (ready === false) detail = database ? `not ready, database ${database}` : 'not ready';
      else if (database) detail = `database ${database}`;
      else detail = 'unhealthy';
    }
    return { ok, statusCode: response.status, ready, database, detail };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'fetch failed';
    return { ok: false, statusCode: null, ready: null, database: null, detail: short(message) };
  }
}

async function lastIngestByBot(db: Db): Promise<Map<string, Date>> {
  const rows = await db
    .select({
      sourceBot: appearances.sourceBot,
      lastIngestAt: sql<string | Date | null>`max(coalesce(${appearances.postedAt}, ${items.updatedAt}))`,
    })
    .from(appearances)
    .innerJoin(items, eq(items.id, appearances.itemId))
    .where(eq(items.sample, false))
    .groupBy(appearances.sourceBot);
  const map = new Map<string, Date>();
  for (const row of rows) {
    const last = asDate(row.lastIngestAt);
    if (last) map.set(row.sourceBot, last);
  }
  return map;
}

/**
 * Posted counts for the given UTC days. Sample rows are skipped.
 * A bot with no posts that day gets one row: empty channel, empty lane, count 0.
 * Each run replaces those days, including yesterday, so a late push still lands on the right day.
 */
async function recomputeYield(db: Db, days: string[]): Promise<void> {
  const values: Array<{
    day: string;
    sourceBot: string;
    channel: string;
    lane: string;
    postedCount: number;
  }> = [];

  for (const day of days) {
    const { start, end } = utcDayRange(day);
    const posted = await db
      .select({
        sourceBot: appearances.sourceBot,
        channel: appearances.channel,
        lane: appearances.lane,
      })
      .from(appearances)
      .innerJoin(items, eq(items.id, appearances.itemId))
      .where(and(eq(items.sample, false), gte(appearances.postedAt, start), lt(appearances.postedAt, end)));

    const counts = new Map<string, { sourceBot: string; channel: string; lane: string; postedCount: number }>();
    for (const row of posted) {
      const lane = row.lane ?? '';
      const key = `${row.sourceBot}\0${row.channel}\0${lane}`;
      const current = counts.get(key);
      if (current) current.postedCount += 1;
      else counts.set(key, { sourceBot: row.sourceBot, channel: row.channel, lane, postedCount: 1 });
    }
    const seen = new Set([...counts.values()].map((row) => row.sourceBot));
    for (const sourceBot of SOURCE_BOTS) {
      if (!seen.has(sourceBot)) {
        counts.set(`${sourceBot}\0\0`, { sourceBot, channel: '', lane: '', postedCount: 0 });
      }
    }
    for (const row of counts.values()) values.push({ day, ...row });
  }

  await db.transaction(async (tx) => {
    await tx.delete(sourceYieldDaily).where(inArray(sourceYieldDaily.day, days));
    if (values.length) await tx.insert(sourceYieldDaily).values(values);
  });
}

async function deliverAlerts(options: {
  alerts: AlertItem[];
  checkedAt: string;
  webhookUrl: string | null;
  fetchImpl: typeof fetch;
  log: (line: string) => void;
}): Promise<{ sent: boolean; failed: boolean }> {
  if (!options.alerts.length) return { sent: false, failed: false };
  options.log(`[ai-wire] health alert: ${options.alerts.map(formatAlert).join('; ')}`);
  if (!options.webhookUrl) return { sent: false, failed: false };
  try {
    const response = await options.fetchImpl(options.webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        service: 'ai-wire',
        ok: false,
        checked_at: options.checkedAt,
        alerts: options.alerts,
      }),
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    });
    await response.text();
    if (!response.ok) {
      options.log(`[ai-wire] health alert webhook failed: HTTP ${response.status}`);
      return { sent: false, failed: true };
    }
    return { sent: true, failed: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'request failed';
    options.log(`[ai-wire] health alert webhook failed: ${short(message)}`);
    return { sent: false, failed: true };
  }
}

export async function runMetrics(options: RunMetricsOptions): Promise<MetricsRunResult> {
  const now = options.now ?? new Date();
  const checkedAt = now.toISOString();
  const fetchImpl = options.fetch ?? fetch;
  const channels = options.channels ?? telegramChannels();
  const healthUrl = options.healthUrl ?? `${siteUrl()}/api/health`;
  const webhookUrl =
    options.webhookUrl === undefined
      ? blankToNull(process.env.HEALTH_ALERT_WEBHOOK_URL)
      : blankToNull(options.webhookUrl);
  const staleHours = options.staleHours ?? staleHoursFromEnv();
  const log = options.log ?? ((line: string) => console.error(line));
  const db = options.db;
  const alerts: AlertItem[] = [];
  const day = utcDay(now);

  for (const channel of channels) {
    const scraped = await scrapeMemberCount(fetchImpl, channel.url);
    if (!scraped.ok) {
      alerts.push({ type: 'telegram', channel: channel.slug, detail: scraped.detail });
      continue;
    }
    await db
      .insert(telegramSubscriberDaily)
      .values({ channel: channel.slug, day, memberCount: scraped.count, scrapedAt: now })
      .onConflictDoUpdate({
        target: [telegramSubscriberDaily.channel, telegramSubscriberDaily.day],
        set: { memberCount: scraped.count, scrapedAt: now },
      });
  }

  await recomputeYield(db, [shiftUtcDay(day, -1), day]);

  const lastIngest = await lastIngestByBot(db);
  for (const sourceBot of SOURCE_BOTS) {
    const last = lastIngest.get(sourceBot) ?? null;
    const hours = staleHours[sourceBot];
    const stale = ingestIsStale(last, now, hours);
    await db
      .insert(botHealth)
      .values({
        sourceBot,
        lastIngestAt: last,
        stale,
        staleAfterHours: hours,
        checkedAt: now,
        detail: stale ? staleDetail(last) : null,
      })
      .onConflictDoUpdate({
        target: botHealth.sourceBot,
        set: {
          lastIngestAt: last,
          stale,
          staleAfterHours: hours,
          checkedAt: now,
          detail: stale ? staleDetail(last) : null,
        },
      });
    if (stale) {
      alerts.push({
        type: 'stale',
        source_bot: sourceBot,
        last_ingest_at: last ? last.toISOString() : null,
        stale_after_hours: hours,
      });
    }
  }

  const site = await checkSite(fetchImpl, healthUrl);
  await db
    .insert(siteHealth)
    .values({
      id: 'site',
      ok: site.ok,
      statusCode: site.statusCode,
      ready: site.ready,
      database: site.database,
      checkedAt: now,
      detail: site.detail,
    })
    .onConflictDoUpdate({
      target: siteHealth.id,
      set: {
        ok: site.ok,
        statusCode: site.statusCode,
        ready: site.ready,
        database: site.database,
        checkedAt: now,
        detail: site.detail,
      },
    });
  if (!site.ok) {
    alerts.push({ type: 'site', status_code: site.statusCode, detail: site.detail });
  }

  const delivery = await deliverAlerts({ alerts, checkedAt, webhookUrl, fetchImpl, log });
  return { checkedAt, alerts, webhookSent: delivery.sent, webhookFailed: delivery.failed };
}
