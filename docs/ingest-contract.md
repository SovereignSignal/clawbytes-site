# Ingest contract

Bots push here. The site never calls the bots. The database can be rebuilt by replaying pushes.

Auth for every ingest route: `Authorization: Bearer {AI_WIRE_INGEST_TOKEN}`.

A bad token is `401 {"error":"unauthorized"}`. A body that is not a batch, or a batch where every item fails validation, is `400 {"errors":[...]}` and nothing is written. A batch with at least one valid item is `200 {"upserted":n,"created":n,"keys":[...]}`. When some items fail, that 200 body also includes `errors` and the valid items are still written.

`created` counts new rows. `upserted` counts rows that already existed (including an identical replay, which does not change the row). `keys` lists the accepted canonical keys or slugs once, in first-seen order.

## POST /api/ingest/items

Body is one item object, or `{"items":[ ... ]}` with at most 100 items.

```json
{
  "source_bot": "clawbytes",
  "kind": "news",
  "canonical_key": "url:https://example.com/post",
  "title": "Example",
  "url": "https://example.com/post",
  "summary": "Plain text, optional, at most 600 characters.",
  "published_at": "2026-10-06T15:00:00Z",
  "posted_at": "2026-10-06T16:00:00Z",
  "channel": "clawbytes",
  "channel_post_url": "https://t.me/clawbytes/979",
  "lane": "Ship",
  "org": "Anthropic",
  "tags": ["agents"],
  "score": 10,
  "modality": "text",
  "extra": {}
}
```

Required: `source_bot`, `kind`, `canonical_key`, `title`, `url`.

- `source_bot`: `clawbytes` | `modelbytes` | `interesting-repos` | `release-bot`
- `kind`: `model` | `tool_release` | `repo` | `news` | `status` | `paper`
- `canonical_key`: stable, stored exactly as sent. The server does not strip a query string, fragment, or `~`. Two keys that differ only there stay two items.
  - model: `model:<org>/<model-name>`
  - release: `release:<owner>/<repo>@<tag>`
  - repo: `repo:<owner>/<repo>`
  - news, status, paper: `url:` plus the URL, including query and fragment when they are part of the story
- `channel`: `clawbytes` | `ModelBytes` | `interestingrepos` | `release-alerts`
- `modality`: `text` | `image` | `video` | `audio` | `multimodal`
- `summary`: plain text, 600 characters max
- timestamps: ISO 8601, or a calendar date `YYYY-MM-DD` which is stored as 00:00 UTC

Upsert is on `canonical_key`. A second bot posting the same key adds an appearance (`source_bot`, `channel`, `channel_post_url`, `posted_at`, `lane`) and does not create a second item. Each appearance keeps the lane that bot sent. The item's own lane stays with the first bot that set it, so a cross-post does not replace a model tier with a tools lane. Omitted optional fields keep the stored value. Sending the same payload twice changes nothing.

Each error looks like `{"index":0,"canonical_key":"...","messages":["..."]}`. `index` is null when the body itself is wrong.

## DELETE /api/ingest/items

Removes registry items by canonical key. Same bearer token. A bad token is `401 {"error":"unauthorized"}` and nothing is deleted. The route is not linked from the site.

```json
{"canonical_keys": ["url:https://example.com/post"]}
```

`canonical_keys` is an array of at most 100 strings. Each entry is 1 to 300 characters and is matched exactly against the stored key. Case, query, fragment, and a trailing slash all count. Duplicate keys are reported once, in first-seen order.

`200 {"deleted":["..."],"not_found":["..."],"dry_run":false}`. `deleted` lists keys that were removed. `not_found` lists keys that were not in the registry. Deleting an item also deletes its appearances.

`?dry_run=1` (or `dry_run=true`) returns the same shape with `"dry_run": true` and does not write. Keys that would be removed are still listed under `deleted`.

A body that is not JSON, or a `canonical_keys` value that is not an array of strings, is `400 {"errors":[...]}` and nothing is written.

## POST /api/ingest/issues

Body is one issue, or `{"issues":[ ... ]}` with at most 20.

Required: `slug`, `title`, `theme_line`, `published_at`, `body_markdown`, `status` (`draft` or `published`). Optional `body_html` is email-ready HTML; omit it to keep the stored HTML.

Upsert is on `slug`. A published issue cannot be moved back to `draft` through this endpoint.

The weekly draft script does not use this endpoint. It writes `status: draft` directly, and it refuses to overwrite a published issue. Publishing is `npm run newsletter:publish`.

## What the bots do

On each bot, keep a flag `AI_WIRE_ENABLED` (default off) plus `AI_WIRE_URL` and `AI_WIRE_INGEST_TOKEN`. Push only after the Telegram post succeeds. Fire-and-forget, 5 second timeout, one retry. Never fail the Telegram post because the push failed. Log `ai_wire push ok n=` or `ai_wire push failed:`.
