# ClawBytes

Every week, the agents, models, tools and open-source repos worth your time: what shipped, what matters, and where it's all going. Live feeds are one place to follow along.

The name lives in [`src/config/brand.ts`](src/config/brand.ts). The git repo is `clawbytes-site` (formerly `ai-wire`). Ingest env vars stay `AI_WIRE_*`.

| Section | Why it is here | Live feed |
|---|---|---|
| Tools | Agents and dev tools worth using, the releases that change the work, and status-page incidents worth watching. | https://t.me/clawbytes |
| Models | New models worth building on, in every modality. | https://t.me/ModelBytes |
| Repos | Open-source repos worth knowing, by the problem they take on. | https://t.me/interestingrepos |
| Releases | Private Release Bot. Items show on Tools. No public join link. | — |

## Architecture

Bots push. The site does not call them. Postgres is a projection: drop it, replay the pushes, and the pages come back.

```
Telegram bots (after a successful post)
  clawbytes · modelbytes · interesting-repos · release-bot
        │  POST /api/ingest/items   (bearer AI_WIRE_INGEST_TOKEN)
        ▼
Next.js on Railway
  /api/ingest/*  idempotent upserts
  pages, search, RSS  read Postgres
        │
        ▼
Railway Postgres
        ▲
        │  npm run metrics
Railway cron (separate service, not the website)
```

A weekly script reads that registry, ranks the week, and writes a **draft** issue plus a markdown file and an email-ready HTML file. It does not publish and it does not send mail. Publishing is a separate command.

A second Railway service runs the metrics cron against the same database. It counts public Telegram subscribers, scores what each bot posted, and checks that the bots and `/api/health` are still alive. It does not serve pages.

Stack: Next.js (App Router, TypeScript), Postgres, Drizzle migrations, Zod on the ingest boundary. No tracking scripts. Pages are server-rendered.

## Pages

| Route | What it shows |
|---|---|
| `/` | Latest items, the latest published issue, and links to the live feeds |
| `/models` | `kind=model`, filter by modality and org, newest first |
| `/tools` | Agents, dev tools, releases, and status-page incidents, grouped by org |
| `/repos` | `kind=repo`, grouped by theme (`lane`) |
| `/archive` | The full log, newest first |
| `/items/[id]` | One item: source link and the posts it appeared in |
| `/search` | Title, summary, org, lane, canonical key |
| `/issues`, `/issues/[slug]` | Published issues of ClawBytes Weekly. Drafts stay off the site |
| `/stats` | Subscriber counts for the three public Telegram feeds |
| `/feed.xml` | RSS of items |
| `/issues/feed.xml` | RSS of published issues |
| `/api/health` | Readiness. Railway uses this |
| `/api/metrics` | Bearer token. Subscribers, yield, and health. Not linked from the site |

Sample rows are marked `[sample]` and `sample=true`. They show outside production so you can click around. In production they stay hidden unless `SEED=1`.

## Local development

```bash
npm install
cp .env.example .env
npm test          # in-memory Postgres, no DATABASE_URL
npm run dev       # needs DATABASE_URL; without it, pages show their empty states
```

`npm test` migrates a fresh PGlite database per suite. `npm run typecheck`, `npm run lint`, and `npm run build` are the other checks. CI runs all four.

With a database:

```bash
npm run db:migrate
SEED=1 npm run seed
```

The seed is sample data (example.com links, titles prefixed `[sample]`). It will not overwrite a real row, and it refuses to run when `NODE_ENV=production` unless `SEED=1`.

## Environment

Set these on the Railway web service:

| Variable | Required on the site | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres. On Railway, reference the Postgres service variable. |
| `AI_WIRE_INGEST_TOKEN` | yes | Bearer token for `/api/ingest/*` and `GET /api/metrics`. `openssl rand -hex 32` |
| `SITE_URL` | yes | Public origin, no trailing slash. RSS, canonical links, and the metrics cron's health check. |
| `SEED` | no | `1` shows sample rows in production. Leave unset. |

Set these where you run the draft script (laptop or a one-off shell), not required for the site to serve pages:

| Variable | Purpose |
|---|---|
| `OLLAMA_HOST` | OpenAI-compatible origin. Use `https://ollama.com`. |
| `OLLAMA_API_KEY` | Bearer token for that endpoint. |
| `OLLAMA_MODEL` | Default `kimi-k3`. |
| `OLLAMA_FALLBACK_MODELS` | Comma-separated, tried in order. Example: `glm-5.3,deepseek-v4.1-flash`. |

If the host, key, or model is missing, or a model returns empty text, the script walks the fallback list and then writes a deterministic draft from the same facts. Empty `content` from a reasoning model counts as a miss. The call asks for a large `max_tokens` (8192).

## Deploy on Railway

Do this by hand. Nothing in this repo deploys itself.

1. New Railway project. Add a Postgres service.
2. New service from this GitHub repo. Railway reads `railway.json`: Railpack build, `npm run start`, healthcheck `GET /api/health`.
3. Set `DATABASE_URL` to the Postgres service reference, plus `AI_WIRE_INGEST_TOKEN` and `SITE_URL`.
4. `npm run start` migrates before `next start`, so a boot applies `drizzle/`.
5. CI (`.github/workflows/ci.yml`) runs lint, typecheck, test, and build. Merge to `main` only when it is green. Point Railway at `main` if you want merges to deploy.
6. The metrics cron is a second service. Setup is in [Health and metrics](#health-and-metrics). Leave this web service on `railway.json`.

`GET /api/health` returns `{ok, ready, service, database}` and 503 when Postgres is unreachable.

## Health and metrics

`npm run metrics` migrates, then runs one pass and exits. There is no LLM in it. Railway cron runs it on its own service. A healthy pass logs nothing and does not call the webhook. The migrate step still prints `Database migrations complete`.

Each pass:

1. Scrapes the public page `https://t.me/<name>` for `clawbytes`, `ModelBytes`, and `interestingrepos`, and upserts one subscriber row per channel for the current UTC day. The number is the subscribers or members figure in that page.
2. Recounts non-sample appearances with a `posted_at` on the current UTC day and the previous one, grouped by `source_bot`, `channel`, and `lane`. That is the yield scorecard. A bot with no posts that day gets a row with an empty channel, an empty lane, and `posted_count` 0. Older days stay as they were.
3. For each source bot, reads the latest non-sample `posted_at` (or the item `updated_at` when `posted_at` is missing). That is the last ingest time: bots push right after the Telegram post, and the registry does not store a separate receive time. The bot is stale when that time is missing or at least N hours ago. It also `GET`s `$SITE_URL/api/health` and stores that result.
4. If a scrape failed, a bot is stale, or the site check failed, it logs one `[ai-wire] health alert:` line and, when `HEALTH_ALERT_WEBHOOK_URL` is set, `POST`s a short JSON body. The process still exits 0 after a delivered alert. It exits 1 when the run throws, or when the webhook is set and does not accept the POST, so Railway can retry.

Sample rows do not count as posts and do not clear a stale bot.

Default stale windows:

| Bot | Default | Why |
|---|---|---|
| `clawbytes` | 18h | Several posts a day. 18h allows a quiet night. |
| `interesting-repos` | 18h | Same. |
| `modelbytes` | 36h | About one post a day, plus half a day of slack. |
| `release-bot` | 168h | Can be quiet for days. Seven days. |

The first runs alert for any bot that has never pushed inside its window. That includes Release Bot until it has a recent appearance.

`GET /api/metrics` uses the same bearer token as ingest and returns subscribers, yield, bot health, and the site check. `/stats` is public and shows subscriber counts only.

```bash
curl -sS "$SITE_URL/api/metrics" -H "authorization: Bearer $AI_WIRE_INGEST_TOKEN"
```

Webhook body, only on failure:

```json
{"service":"ai-wire","ok":false,"checked_at":"2026-10-14T16:00:00.000Z","alerts":[{"type":"stale","source_bot":"clawbytes","last_ingest_at":null,"stale_after_hours":18}]}
```

### Railway cron service

Do this after the web service is up. Nothing in the repo creates the service.

1. In the same Railway project, add a new service from this GitHub repo. It is a second service. Do not replace the website.
2. Before the first deploy, or immediately after if it already started, set the service config file to `railway.metrics.json` (Settings → Config-as-code). Then redeploy. That file is what makes this service a cron instead of another copy of the site.
3. Do not attach a public domain.
4. Set variables on this service:
   - `DATABASE_URL`: reference the same Postgres variable the web service uses.
   - `SITE_URL`: the public origin of the web service, no trailing slash. The job calls `$SITE_URL/api/health`.
   - `HEALTH_ALERT_WEBHOOK_URL`: leave unset until you want a POST when something is wrong.
5. Leave `AI_WIRE_INGEST_TOKEN` on the web service. The cron does not use it. The assistant that calls `GET /api/metrics` does.
6. Leave the web service on `railway.json` (`npm run start`, healthcheck `/api/health`). Do not put a cron schedule on it.

`railway.metrics.json` sets:

| Setting | Value |
|---|---|
| Start command | `npm run metrics` |
| Cron schedule | `0 8,12,16,20 * * *` |
| Healthcheck | none |
| Restart | on failure, up to 3 times |

The schedule is 08:00, 12:00, 16:00, and 20:00 UTC every day. Subscriber and yield rows are one per UTC day, so later runs that day refresh today's row and yesterday's. Health runs every time. A weekdays-only schedule (`0 8,12,16,20 * * 1-5`) skips Saturday and Sunday subscriber points.

Optional stale-window overrides, set on the cron service. Unset uses the defaults above. A blank value, zero, or anything other than a whole number from 1 to 100000 is ignored.

| Variable | Default |
|---|---|
| `HEALTH_STALE_HOURS_CLAWBYTES` | `18` |
| `HEALTH_STALE_HOURS_MODELBYTES` | `36` |
| `HEALTH_STALE_HOURS_INTERESTING_REPOS` | `18` |
| `HEALTH_STALE_HOURS_RELEASE_BOT` | `168` |

## How bots push

Contract: [`docs/ingest-contract.md`](docs/ingest-contract.md).

```bash
curl -sS -X POST "$AI_WIRE_URL/api/ingest/items" \
  -H "authorization: Bearer $AI_WIRE_INGEST_TOKEN" \
  -H "content-type: application/json" \
  -d '{"source_bot":"clawbytes","kind":"news","canonical_key":"url:https://example.com/post","title":"Example","url":"https://example.com/post","posted_at":"2026-10-06T16:00:00Z","channel":"clawbytes","channel_post_url":"https://t.me/clawbytes/979","lane":"Ship"}'
```

On each bot: `AI_WIRE_ENABLED` (default off), `AI_WIRE_URL`, `AI_WIRE_INGEST_TOKEN`. Push only after the Telegram post succeeds. Timeout 5 seconds, one retry, never fail the post. Log `ai_wire push ok n=` or `ai_wire push failed:`.

The same `canonical_key` from two bots becomes one item with two appearances. Each appearance keeps that bot's lane, and the second bot does not replace the item lane. The same payload twice does not change the row.

Removing rows is `DELETE /api/ingest/items` with the same bearer token and `{"canonical_keys":["..."]}`. `?dry_run=1` returns `deleted` and `not_found` and does not write. The route is not linked from the site.

Newsletter issues can also be pushed to `POST /api/ingest/issues` (upsert on `slug`, status `draft` or `published`). A published issue cannot be moved back to draft through that endpoint. The weekly script does not use it.

## Weekly letter

The week is the Monday–Sunday UTC week that contains the date you pass.

```bash
npm run newsletter:draft -- --week 2026-10-05
```

That reads registry items whose `published_at` or a Telegram `posted_at` falls in the week (sample rows excluded). Ranking is: more distinct bots, then higher `score`, then more appearances, then newer `published_at`.

The model only writes sentences. Code picks the items, the counts, and every link. A sentence is kept only when every link in it is one of that item's URLs and every number already appears in the fact sheet. Each lead sentence has to contain the item's title. If the prose fails, the next model is tried, then a template that only restates those facts.

Outputs:

- a `draft` row in `issues` (slug `week-YYYY-MM-DD`)
- `exports/week-YYYY-MM-DD.md`
- `exports/week-YYYY-MM-DD.html` (paste this into whatever sends the letter)
- `exports/week-YYYY-MM-DD.meta.txt` (which model, or `template`)

The script refuses to overwrite an issue that is already published. It does not send email.

Add `--include-samples` to draft from seed data locally.

Publish, when the draft is the one you want:

```bash
npm run newsletter:publish -- --slug week-2026-10-05
```

That flips `status` to `published`. The page is `/issues/week-2026-10-05`. Still no email.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js. `start` migrates, then serves. |
| `npm test` | Vitest. Ingest validation, upsert, merge, ranker, link checks. |
| `npm run lint` / `typecheck` | ESLint and `tsc --noEmit`. |
| `npm run db:migrate` | Apply `drizzle/`. |
| `npm run seed` | Sample items and one sample issue. |
| `npm run newsletter:draft` | Draft for `--week YYYY-MM-DD`. |
| `npm run newsletter:publish` | Publish `--slug`. |
| `npm run metrics` | Cron pass: migrate, then subscribers, yield, and health. |

## License

MIT. See [LICENSE](LICENSE).
