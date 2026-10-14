import { asc } from 'drizzle-orm';
import { getDb, type Db } from '@/db/client';
import { telegramSubscriberDaily } from '@/db/schema';
import { telegramChannels } from '@/lib/metrics/telegram';
import { asCount, asDate, asDay } from '@/lib/metrics/time';

export type SubscriberPoint = {
  day: string;
  memberCount: number;
  scrapedAt: Date;
};

export type SubscriberSeries = {
  channel: string;
  label: string;
  url: string;
  handle: string;
  points: SubscriberPoint[];
};

/** Public series: subscriber counts only, one list per tracked channel. */
export async function listSubscriberSeries(db: Db = getDb()): Promise<SubscriberSeries[]> {
  const rows = await db.select().from(telegramSubscriberDaily).orderBy(asc(telegramSubscriberDaily.day));
  const byChannel = new Map<string, SubscriberPoint[]>();
  for (const row of rows) {
    const scrapedAt = asDate(row.scrapedAt);
    if (!scrapedAt) continue;
    const points = byChannel.get(row.channel) ?? [];
    points.push({ day: asDay(row.day), memberCount: asCount(row.memberCount), scrapedAt });
    byChannel.set(row.channel, points);
  }
  return telegramChannels().map((channel) => ({
    channel: channel.slug,
    label: channel.label,
    url: channel.url,
    handle: channel.handle,
    points: byChannel.get(channel.slug) ?? [],
  }));
}
