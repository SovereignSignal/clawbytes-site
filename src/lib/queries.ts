import { and, desc, eq, gte, ilike, inArray, isNull, lt, or, sql, type SQL } from 'drizzle-orm';
import { getDb, type Db } from '@/db/client';
import { appearances, issues, items, type AppearanceRow, type IssueRow, type ItemRow } from '@/db/schema';
import type { RankableItem } from '@/lib/newsletter/rank';
import { inWindow, type WeekWindow } from '@/lib/newsletter/week';

export type AppearanceView = {
  sourceBot: string;
  channel: string | null;
  channelPostUrl: string | null;
  postedAt: Date | null;
  lane: string | null;
};

export type ItemView = {
  id: string;
  canonicalKey: string;
  kind: string;
  title: string;
  url: string;
  summary: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  lane: string | null;
  org: string | null;
  tags: string[];
  score: number | null;
  modality: string | null;
  sample: boolean;
  appearances: AppearanceView[];
};

export type IssueView = {
  slug: string;
  title: string;
  themeLine: string;
  publishedAt: Date;
  bodyMarkdown: string;
  status: string;
  sample: boolean;
};

const PAGE_SIZE = 40;

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function blank(value: string | null): string | null {
  return value ? value : null;
}

function toAppearance(row: AppearanceRow): AppearanceView {
  return {
    sourceBot: row.sourceBot,
    channel: blank(row.channel),
    channelPostUrl: blank(row.channelPostUrl),
    postedAt: asDate(row.postedAt),
    lane: row.lane,
  };
}

function toItem(row: ItemRow, apps: AppearanceView[]): ItemView {
  return {
    id: row.id,
    canonicalKey: row.canonicalKey,
    kind: row.kind,
    title: row.title,
    url: row.url,
    summary: row.summary,
    publishedAt: asDate(row.publishedAt),
    createdAt: asDate(row.createdAt) ?? new Date(0),
    lane: row.lane,
    org: row.org,
    tags: row.tags ?? [],
    score: row.score,
    modality: row.modality,
    sample: row.sample,
    appearances: apps,
  };
}

function toIssue(row: IssueRow): IssueView {
  return {
    slug: row.slug,
    title: row.title,
    themeLine: row.themeLine,
    publishedAt: asDate(row.publishedAt) ?? new Date(0),
    bodyMarkdown: row.bodyMarkdown,
    status: row.status,
    sample: row.sample,
  };
}

function db(): Db {
  return getDb();
}

function sampleFilter(samples: boolean): SQL | undefined {
  return samples ? undefined : eq(items.sample, false);
}

function issueSampleFilter(samples: boolean): SQL | undefined {
  return samples ? undefined : eq(issues.sample, false);
}

async function withAppearances(rows: ItemRow[]): Promise<ItemView[]> {
  if (!rows.length) return [];
  const apps = await db()
    .select()
    .from(appearances)
    .where(inArray(appearances.itemId, rows.map((row) => row.id)));
  const byItem = new Map<string, AppearanceView[]>();
  for (const appearance of apps) {
    const list = byItem.get(appearance.itemId) ?? [];
    list.push(toAppearance(appearance));
    byItem.set(appearance.itemId, list);
  }
  return rows.map((row) => toItem(row, byItem.get(row.id) ?? []));
}

function andWhere(...parts: Array<SQL | undefined>): SQL | undefined {
  const present = parts.filter((part): part is SQL => part !== undefined);
  if (!present.length) return undefined;
  if (present.length === 1) return present[0];
  return and(...present);
}

export async function listLatest(samples: boolean, limit = 25): Promise<ItemView[]> {
  const rows = await db()
    .select()
    .from(items)
    .where(sampleFilter(samples))
    .orderBy(sql`coalesce(${items.publishedAt}, ${items.createdAt}) desc`)
    .limit(limit);
  return withAppearances(rows);
}

export async function listArchive(samples: boolean, page: number): Promise<{ items: ItemView[]; hasMore: boolean }> {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const rows = await db()
    .select()
    .from(items)
    .where(sampleFilter(samples))
    .orderBy(sql`coalesce(${items.publishedAt}, ${items.createdAt}) desc`)
    .limit(PAGE_SIZE + 1)
    .offset((safePage - 1) * PAGE_SIZE);
  const hasMore = rows.length > PAGE_SIZE;
  return { items: await withAppearances(rows.slice(0, PAGE_SIZE)), hasMore };
}

export async function listModels(
  samples: boolean,
  filters: { modality?: string; org?: string },
): Promise<ItemView[]> {
  const org = filters.org?.trim();
  const rows = await db()
    .select()
    .from(items)
    .where(
      andWhere(
        sampleFilter(samples),
        eq(items.kind, 'model'),
        filters.modality ? eq(items.modality, filters.modality) : undefined,
        org ? ilike(items.org, `%${escapeLike(org)}%`) : undefined,
      ),
    )
    .orderBy(sql`${items.publishedAt} desc nulls last`, desc(items.createdAt))
    .limit(200);
  return withAppearances(rows);
}

export async function listModelFacets(samples: boolean): Promise<{ orgs: string[]; modalities: string[] }> {
  const rows = await db()
    .select({ org: items.org, modality: items.modality })
    .from(items)
    .where(andWhere(sampleFilter(samples), eq(items.kind, 'model')));
  const orgs = [...new Set(rows.map((row) => row.org).filter((org): org is string => Boolean(org)))].sort((a, b) =>
    a.localeCompare(b),
  );
  const modalities = [...new Set(rows.map((row) => row.modality).filter((value): value is string => Boolean(value)))];
  return { orgs, modalities };
}

export async function listTools(samples: boolean): Promise<ItemView[]> {
  const clawbytesNews = inArray(
    items.id,
    db()
      .select({ itemId: appearances.itemId })
      .from(appearances)
      .where(eq(appearances.sourceBot, 'clawbytes')),
  );
  const rows = await db()
    .select()
    .from(items)
    .where(
      andWhere(
        sampleFilter(samples),
        or(eq(items.kind, 'tool_release'), and(eq(items.kind, 'news'), clawbytesNews)),
      ),
    )
    .orderBy(sql`${items.publishedAt} desc nulls last`, desc(items.createdAt))
    .limit(200);
  return withAppearances(rows);
}

export async function listRepos(samples: boolean, theme?: string): Promise<ItemView[]> {
  const rows = await db()
    .select()
    .from(items)
    .where(
      andWhere(
        sampleFilter(samples),
        eq(items.kind, 'repo'),
        theme ? eq(items.lane, theme) : undefined,
      ),
    )
    .orderBy(sql`${items.publishedAt} desc nulls last`, desc(items.createdAt))
    .limit(200);
  return withAppearances(rows);
}

export async function listRepoThemes(samples: boolean): Promise<string[]> {
  const rows = await db()
    .select({ lane: items.lane })
    .from(items)
    .where(andWhere(sampleFilter(samples), eq(items.kind, 'repo')));
  return [...new Set(rows.map((row) => row.lane).filter((lane): lane is string => Boolean(lane)))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export async function searchItems(samples: boolean, query: string): Promise<ItemView[]> {
  const q = query.trim().slice(0, 200);
  if (!q) return [];
  const pattern = `%${escapeLike(q)}%`;
  const rows = await db()
    .select()
    .from(items)
    .where(
      andWhere(
        sampleFilter(samples),
        or(
          ilike(items.title, pattern),
          ilike(items.summary, pattern),
          ilike(items.org, pattern),
          ilike(items.lane, pattern),
          ilike(items.canonicalKey, pattern),
        ),
      ),
    )
    .orderBy(sql`coalesce(${items.publishedAt}, ${items.createdAt}) desc`)
    .limit(50);
  return withAppearances(rows);
}

export async function getItem(id: string, samples: boolean): Promise<ItemView | null> {
  const rows = await db().select().from(items).where(eq(items.id, id)).limit(1);
  const row = rows[0];
  if (!row || (!samples && row.sample)) return null;
  const [item] = await withAppearances([row]);
  return item ?? null;
}

export async function listPublishedIssues(samples: boolean): Promise<IssueView[]> {
  const rows = await db()
    .select()
    .from(issues)
    .where(andWhere(issueSampleFilter(samples), eq(issues.status, 'published')))
    .orderBy(desc(issues.publishedAt));
  return rows.map(toIssue);
}

export async function getPublishedIssue(slug: string, samples: boolean): Promise<IssueView | null> {
  const rows = await db().select().from(issues).where(eq(issues.slug, slug)).limit(1);
  const row = rows[0];
  if (!row || row.status !== 'published') return null;
  if (!samples && row.sample) return null;
  return toIssue(row);
}

export async function latestPublishedIssue(samples: boolean): Promise<IssueView | null> {
  const rows = await listPublishedIssues(samples);
  return rows[0] ?? null;
}

export function toRankable(item: ItemView): RankableItem {
  return {
    canonicalKey: item.canonicalKey,
    kind: item.kind,
    title: item.title,
    url: item.url,
    summary: item.summary,
    publishedAt: item.publishedAt,
    lane: item.lane,
    org: item.org,
    score: item.score,
    modality: item.modality,
    appearances: item.appearances.map((appearance) => ({
      sourceBot: appearance.sourceBot,
      channelPostUrl: appearance.channelPostUrl,
      postedAt: appearance.postedAt,
    })),
  };
}

/** Items whose event time falls in the week. Sample rows are excluded unless asked. */
export async function loadWeekItems(window: WeekWindow, includeSamples: boolean): Promise<RankableItem[]> {
  const postedIds = db()
    .select({ itemId: appearances.itemId })
    .from(appearances)
    .where(and(gte(appearances.postedAt, window.start), lt(appearances.postedAt, window.end)));
  const rows = await db()
    .select()
    .from(items)
    .where(
      andWhere(
        includeSamples ? undefined : eq(items.sample, false),
        or(
          and(gte(items.publishedAt, window.start), lt(items.publishedAt, window.end)),
          and(isNull(items.publishedAt), gte(items.createdAt, window.start), lt(items.createdAt, window.end)),
          inArray(items.id, postedIds),
        ),
      ),
    );
  const hydrated = await withAppearances(rows);
  return hydrated.filter((item) => itemInWeek(item, window)).map(toRankable);
}

export function itemInWeek(item: ItemView, window: WeekWindow): boolean {
  if (inWindow(item.publishedAt, window)) return true;
  if (item.appearances.some((appearance) => inWindow(appearance.postedAt, window))) return true;
  const undated = !item.publishedAt && item.appearances.every((appearance) => !appearance.postedAt);
  return undated && inWindow(item.createdAt, window);
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export const archivePageSize = PAGE_SIZE;
