CREATE TABLE "telegram_subscriber_daily" (
  "channel" text NOT NULL,
  "day" date NOT NULL,
  "member_count" integer NOT NULL,
  "scraped_at" timestamp with time zone NOT NULL,
  CONSTRAINT "telegram_subscriber_daily_pk" PRIMARY KEY ("channel", "day"),
  CONSTRAINT "telegram_subscriber_daily_channel_check" CHECK ("channel" IN ('clawbytes', 'ModelBytes', 'interestingrepos')),
  CONSTRAINT "telegram_subscriber_daily_count_check" CHECK ("member_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "source_yield_daily" (
  "day" date NOT NULL,
  "source_bot" text NOT NULL,
  "channel" text NOT NULL,
  "lane" text NOT NULL,
  "posted_count" integer NOT NULL,
  CONSTRAINT "source_yield_daily_pk" PRIMARY KEY ("day", "source_bot", "channel", "lane"),
  CONSTRAINT "source_yield_daily_source_bot_check" CHECK ("source_bot" IN ('clawbytes', 'modelbytes', 'interesting-repos', 'release-bot')),
  CONSTRAINT "source_yield_daily_count_check" CHECK ("posted_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "bot_health" (
  "source_bot" text PRIMARY KEY NOT NULL,
  "last_ingest_at" timestamp with time zone,
  "stale" boolean NOT NULL,
  "stale_after_hours" integer NOT NULL,
  "checked_at" timestamp with time zone NOT NULL,
  "detail" text,
  CONSTRAINT "bot_health_source_bot_check" CHECK ("source_bot" IN ('clawbytes', 'modelbytes', 'interesting-repos', 'release-bot')),
  CONSTRAINT "bot_health_hours_check" CHECK ("stale_after_hours" > 0)
);
--> statement-breakpoint
CREATE TABLE "site_health" (
  "id" text PRIMARY KEY NOT NULL,
  "ok" boolean NOT NULL,
  "status_code" integer,
  "ready" boolean,
  "database" text,
  "checked_at" timestamp with time zone NOT NULL,
  "detail" text,
  CONSTRAINT "site_health_id_check" CHECK ("id" = 'site')
);
