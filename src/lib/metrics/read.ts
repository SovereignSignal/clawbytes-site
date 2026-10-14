import { asc, eq } from 'drizzle-orm';
import { getDb, type Db } from '@/db/client';
import { botHealth, siteHealth, sourceYieldDaily } from '@/db/schema';
import { SOURCE_BOTS } from '@/lib/ingest/items';
import { listSubscriberSeries } from '@/lib/metrics/subscribers';
import { asCount, asDate, asDay } from '@/lib/metrics/time';

export type YieldRow = {
  day: string;
  source_bot: string;
  channel: string;
  lane: string;
  posted_count: number;
};

export type BotHealthView = {
  source_bot: string;
  last_ingest_at: string | null;
  stale: boolean;
  stale_after_hours: number;
  checked_at: string;
  detail: string | null;
};

export type SiteHealthView = {
  ok: boolean;
  status_code: number | null;
  ready: boolean | null;
  database: string | null;
  checked_at: string;
  detail: string | null;
};

export type MetricsReport = {
  subscribers: Array<{
    channel: string;
    label: string;
    url: string;
    latest: { day: string; member_count: number; scraped_at: string } | null;
    days: Array<{ day: string; member_count: number; scraped_at: string }>;
  }>;
  yield: YieldRow[];
  bots: BotHealthView[];
  site: SiteHealthView | null;
};

function botOrder(sourceBot: string): number {
  const index = SOURCE_BOTS.indexOf(sourceBot as (typeof SOURCE_BOTS)[number]);
  return index === -1 ? SOURCE_BOTS.length : index;
}

export async function readMetrics(db: Db = getDb()): Promise<MetricsReport> {
  const [series, yieldRows, bots, siteRows] = await Promise.all([
    listSubscriberSeries(db),
    db.select().from(sourceYieldDaily).orderBy(asc(sourceYieldDaily.day), asc(sourceYieldDaily.sourceBot)),
    db.select().from(botHealth),
    db.select().from(siteHealth).where(eq(siteHealth.id, 'site')).limit(1),
  ]);

  const site = siteRows[0];
  const siteChecked = site ? asDate(site.checkedAt) : null;

  return {
    subscribers: series.map((entry) => ({
      channel: entry.channel,
      label: entry.label,
      url: entry.url,
      latest: entry.points.length
        ? {
            day: entry.points[entry.points.length - 1].day,
            member_count: entry.points[entry.points.length - 1].memberCount,
            scraped_at: entry.points[entry.points.length - 1].scrapedAt.toISOString(),
          }
        : null,
      days: entry.points.map((point) => ({
        day: point.day,
        member_count: point.memberCount,
        scraped_at: point.scrapedAt.toISOString(),
      })),
    })),
    yield: yieldRows
      .map((row) => ({
        day: asDay(row.day),
        source_bot: row.sourceBot,
        channel: row.channel,
        lane: row.lane,
        posted_count: asCount(row.postedCount),
      }))
      .sort(
        (a, b) =>
          a.day.localeCompare(b.day) ||
          botOrder(a.source_bot) - botOrder(b.source_bot) ||
          a.channel.localeCompare(b.channel) ||
          a.lane.localeCompare(b.lane),
      ),
    bots: bots
      .map((row) => {
        const checked = asDate(row.checkedAt);
        return {
          source_bot: row.sourceBot,
          last_ingest_at: asDate(row.lastIngestAt)?.toISOString() ?? null,
          stale: row.stale,
          stale_after_hours: row.staleAfterHours,
          checked_at: checked ? checked.toISOString() : '',
          detail: row.detail,
        };
      })
      .sort((a, b) => botOrder(a.source_bot) - botOrder(b.source_bot)),
    site:
      site && siteChecked
        ? {
            ok: site.ok,
            status_code: site.statusCode,
            ready: site.ready,
            database: site.database,
            checked_at: siteChecked.toISOString(),
            detail: site.detail,
          }
        : null,
  };
}
