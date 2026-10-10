CREATE TABLE "items" (
  "id" uuid PRIMARY KEY NOT NULL,
  "canonical_key" text NOT NULL,
  "kind" text NOT NULL,
  "title" text NOT NULL,
  "url" text NOT NULL,
  "summary" text,
  "published_at" timestamp with time zone,
  "lane" text,
  "org" text,
  "tags" text[] NOT NULL,
  "score" double precision,
  "modality" text,
  "extra" jsonb NOT NULL,
  "sample" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL,
  CONSTRAINT "items_kind_check" CHECK ("kind" IN ('model', 'tool_release', 'repo', 'news', 'status', 'paper')),
  CONSTRAINT "items_modality_check" CHECK ("modality" IS NULL OR "modality" IN ('text', 'image', 'video', 'audio', 'multimodal'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "items_canonical_key_uq" ON "items" USING btree ("canonical_key");
--> statement-breakpoint
CREATE INDEX "items_kind_published_idx" ON "items" USING btree ("kind", "published_at");
--> statement-breakpoint
CREATE INDEX "items_sample_idx" ON "items" USING btree ("sample");
--> statement-breakpoint
CREATE TABLE "appearances" (
  "id" uuid PRIMARY KEY NOT NULL,
  "item_id" uuid NOT NULL,
  "source_bot" text NOT NULL,
  "channel" text DEFAULT '' NOT NULL,
  "channel_post_url" text DEFAULT '' NOT NULL,
  "posted_at" timestamp with time zone,
  CONSTRAINT "appearances_source_bot_check" CHECK ("source_bot" IN ('clawbytes', 'modelbytes', 'interesting-repos', 'release-bot')),
  CONSTRAINT "appearances_channel_check" CHECK ("channel" IN ('', 'clawbytes', 'ModelBytes', 'interestingrepos', 'release-alerts'))
);
--> statement-breakpoint
ALTER TABLE "appearances" ADD CONSTRAINT "appearances_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "appearances_identity_uq" ON "appearances" USING btree ("item_id", "source_bot", "channel", "channel_post_url");
--> statement-breakpoint
CREATE INDEX "appearances_item_idx" ON "appearances" USING btree ("item_id");
--> statement-breakpoint
CREATE INDEX "appearances_posted_idx" ON "appearances" USING btree ("posted_at");
--> statement-breakpoint
CREATE TABLE "issues" (
  "slug" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "theme_line" text NOT NULL,
  "published_at" timestamp with time zone NOT NULL,
  "body_markdown" text NOT NULL,
  "body_html" text,
  "status" text NOT NULL,
  "sample" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL,
  CONSTRAINT "issues_status_check" CHECK ("status" IN ('draft', 'published'))
);
