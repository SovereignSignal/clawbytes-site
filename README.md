# ClawBytes

Every week, the agents, models, tools and open-source repos worth your time: what shipped, what matters, and where it's all going. Live feeds are one place to follow along.

The name lives in [`src/config/brand.ts`](src/config/brand.ts). The git repo stays `ai-wire`. Ingest env vars stay `AI_WIRE_*`.

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
```

A weekly script reads that registry, ranks the week, and writes a **draft** issue plus a markdown file and an email-ready HTML file. It does not publish and it does not send mail. Publishing is a separate command.

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
| `/feed.xml` | RSS of items |
| `/issues/feed.xml` | RSS of published issues |
| `/api/health` | Readiness. Railway uses this |

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
| `AI_WIRE_INGEST_TOKEN` | yes | Bearer token for `/api/ingest/*`. `openssl rand -hex 32` |
| `SITE_URL` | yes | Public origin, no trailing slash. RSS and canonical links. |
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

`GET /api/health` returns `{ok, ready, service, database}` and 503 when Postgres is unreachable.

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
