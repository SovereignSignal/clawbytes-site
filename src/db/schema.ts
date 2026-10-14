import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const items = pgTable(
  'items',
  {
    id: uuid('id').primaryKey(),
    canonicalKey: text('canonical_key').notNull(),
    kind: text('kind').notNull(),
    title: text('title').notNull(),
    url: text('url').notNull(),
    summary: text('summary'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    lane: text('lane'),
    org: text('org'),
    tags: text('tags').array().notNull(),
    score: doublePrecision('score'),
    modality: text('modality'),
    extra: jsonb('extra').notNull(),
    sample: boolean('sample').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('items_canonical_key_uq').on(table.canonicalKey),
    index('items_kind_published_idx').on(table.kind, table.publishedAt),
    index('items_sample_idx').on(table.sample),
  ],
);

export const appearances = pgTable(
  'appearances',
  {
    id: uuid('id').primaryKey(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    sourceBot: text('source_bot').notNull(),
    channel: text('channel').notNull().default(''),
    channelPostUrl: text('channel_post_url').notNull().default(''),
    postedAt: timestamp('posted_at', { withTimezone: true }),
    lane: text('lane'),
  },
  (table) => [
    uniqueIndex('appearances_identity_uq').on(
      table.itemId,
      table.sourceBot,
      table.channel,
      table.channelPostUrl,
    ),
    index('appearances_item_idx').on(table.itemId),
    index('appearances_posted_idx').on(table.postedAt),
  ],
);

export const issues = pgTable('issues', {
  slug: text('slug').primaryKey(),
  title: text('title').notNull(),
  themeLine: text('theme_line').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
  bodyMarkdown: text('body_markdown').notNull(),
  bodyHtml: text('body_html'),
  status: text('status').notNull(),
  sample: boolean('sample').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

/** One public t.me subscriber/member count per channel per UTC day. */
export const telegramSubscriberDaily = pgTable(
  'telegram_subscriber_daily',
  {
    channel: text('channel').notNull(),
    day: date('day', { mode: 'string' }).notNull(),
    memberCount: integer('member_count').notNull(),
    scrapedAt: timestamp('scraped_at', { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.channel, table.day] })],
);

/** Posted appearances for one UTC day, grouped by source bot, channel, and lane. */
export const sourceYieldDaily = pgTable(
  'source_yield_daily',
  {
    day: date('day', { mode: 'string' }).notNull(),
    sourceBot: text('source_bot').notNull(),
    channel: text('channel').notNull(),
    lane: text('lane').notNull(),
    postedCount: integer('posted_count').notNull(),
  },
  (table) => [primaryKey({ columns: [table.day, table.sourceBot, table.channel, table.lane] })],
);

/** Latest staleness reading per source bot. The cron replaces the row each run. */
export const botHealth = pgTable('bot_health', {
  sourceBot: text('source_bot').primaryKey(),
  lastIngestAt: timestamp('last_ingest_at', { withTimezone: true }),
  stale: boolean('stale').notNull(),
  staleAfterHours: integer('stale_after_hours').notNull(),
  checkedAt: timestamp('checked_at', { withTimezone: true }).notNull(),
  detail: text('detail'),
});

/** Latest GET /api/health result. One row, id `site`. */
export const siteHealth = pgTable('site_health', {
  id: text('id').primaryKey(),
  ok: boolean('ok').notNull(),
  statusCode: integer('status_code'),
  ready: boolean('ready'),
  database: text('database'),
  checkedAt: timestamp('checked_at', { withTimezone: true }).notNull(),
  detail: text('detail'),
});

export type ItemRow = typeof items.$inferSelect;
export type AppearanceRow = typeof appearances.$inferSelect;
export type IssueRow = typeof issues.$inferSelect;
export type TelegramSubscriberRow = typeof telegramSubscriberDaily.$inferSelect;
export type SourceYieldRow = typeof sourceYieldDaily.$inferSelect;
export type BotHealthRow = typeof botHealth.$inferSelect;
export type SiteHealthRow = typeof siteHealth.$inferSelect;
