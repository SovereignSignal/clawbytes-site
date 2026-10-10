import { boolean, doublePrecision, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

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

export type ItemRow = typeof items.$inferSelect;
export type AppearanceRow = typeof appearances.$inferSelect;
export type IssueRow = typeof issues.$inferSelect;
