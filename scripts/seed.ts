import 'dotenv/config';
import { brand } from '../src/config/brand';
import { closeDb, getDb } from '../src/db/client';
import { applyIssueBatch } from '../src/lib/ingest/issues';
import { applyItemBatch, type ItemInput } from '../src/lib/ingest/items';

if (process.env.NODE_ENV === 'production' && process.env.SEED !== '1') {
  console.error('Refusing to seed production. Set SEED=1 to allow sample rows.');
  process.exit(1);
}

const sampleNote = 'SAMPLE DATA. Not a live item.';

const rows: ItemInput[] = [
  {
    source_bot: 'modelbytes',
    kind: 'model',
    canonical_key: 'model:anthropic/claude-haiku-5.5',
    title: '[sample] Claude Haiku 5.5',
    url: 'https://example.com/sample/claude-haiku-5.5',
    summary: `${sampleNote} Small Claude model used to show the models tracker.`,
    published_at: '2026-10-06T15:00:00.000Z',
    posted_at: '2026-10-06T16:00:00.000Z',
    channel: 'ModelBytes',
    channel_post_url: 'https://t.me/ModelBytes/1001',
    lane: 'Tier 1',
    org: 'Anthropic',
    tags: ['sample', 'claude'],
    score: 90,
    modality: 'text',
    extra: { sample: true },
  },
  {
    source_bot: 'clawbytes',
    kind: 'model',
    canonical_key: 'model:anthropic/claude-haiku-5.5',
    title: '[sample] Claude Haiku 5.5',
    url: 'https://example.com/sample/claude-haiku-5.5',
    summary: `${sampleNote} Also noted alongside the tools.`,
    published_at: '2026-10-06T15:00:00.000Z',
    posted_at: '2026-10-06T17:00:00.000Z',
    channel: 'clawbytes',
    channel_post_url: 'https://t.me/clawbytes/1001',
    lane: 'Ship',
    org: 'Anthropic',
    score: 90,
    modality: 'text',
  },
  {
    source_bot: 'clawbytes',
    kind: 'news',
    canonical_key: 'url:https://example.com/sample/claude-workspace',
    title: '[sample] Claude in Google Workspace',
    url: 'https://example.com/sample/claude-workspace',
    summary: `${sampleNote} Ship-lane news about a tool.`,
    published_at: '2026-10-07T12:00:00.000Z',
    posted_at: '2026-10-07T12:30:00.000Z',
    channel: 'clawbytes',
    channel_post_url: 'https://t.me/clawbytes/1002',
    lane: 'Ship',
    org: 'Anthropic',
    tags: ['sample'],
    score: 40,
  },
  {
    source_bot: 'release-bot',
    kind: 'tool_release',
    canonical_key: 'release:anthropics/claude-code@v2.0.0',
    title: '[sample] Claude Code v2.0.0',
    url: 'https://example.com/sample/claude-code-v2',
    summary: `${sampleNote} Private release-bot item. It shows on Tools and has no public join link.`,
    published_at: '2026-10-08T09:00:00.000Z',
    posted_at: '2026-10-08T09:05:00.000Z',
    channel: 'release-alerts',
    channel_post_url: 'https://t.me/releasealerts/1001',
    org: 'Anthropic',
    tags: ['sample'],
    score: 70,
  },
  {
    source_bot: 'modelbytes',
    kind: 'model',
    canonical_key: 'model:black-forest-labs/flux-2',
    title: '[sample] FLUX.2',
    url: 'https://example.com/sample/flux-2',
    summary: `${sampleNote} Image model so the modality filter has something to show.`,
    published_at: '2026-10-07T08:00:00.000Z',
    posted_at: '2026-10-07T08:10:00.000Z',
    channel: 'ModelBytes',
    channel_post_url: 'https://t.me/ModelBytes/1002',
    lane: 'Tier 2',
    org: 'Black Forest Labs',
    modality: 'image',
    score: 55,
    tags: ['sample'],
  },
  {
    source_bot: 'interesting-repos',
    kind: 'repo',
    canonical_key: 'repo:browser-use/browser-use',
    title: '[sample] browser-use/browser-use',
    url: 'https://example.com/sample/browser-use',
    summary: `${sampleNote} Repo in the agents theme.`,
    published_at: '2026-10-06T11:00:00.000Z',
    posted_at: '2026-10-06T11:05:00.000Z',
    channel: 'interestingrepos',
    channel_post_url: 'https://t.me/interestingrepos/1001',
    lane: 'agents',
    org: 'browser-use',
    score: 80,
    tags: ['sample'],
  },
  {
    source_bot: 'interesting-repos',
    kind: 'repo',
    canonical_key: 'repo:openai/evals',
    title: '[sample] openai/evals',
    url: 'https://example.com/sample/openai-evals',
    summary: `${sampleNote} Repo in the evals theme.`,
    published_at: '2026-10-09T11:00:00.000Z',
    posted_at: '2026-10-09T11:05:00.000Z',
    channel: 'interestingrepos',
    channel_post_url: 'https://t.me/interestingrepos/1002',
    lane: 'evals',
    org: 'OpenAI',
    score: 30,
    tags: ['sample'],
  },
  {
    source_bot: 'clawbytes',
    kind: 'news',
    canonical_key: 'url:https://example.com/sample/sdk-browser',
    title: '[sample] SDK computer and browser control',
    url: 'https://example.com/sample/sdk-browser',
    summary: `${sampleNote} Watch-lane note on a tool worth tracking.`,
    published_at: '2026-10-08T18:00:00.000Z',
    posted_at: '2026-10-08T18:20:00.000Z',
    channel: 'clawbytes',
    channel_post_url: 'https://t.me/clawbytes/1003',
    lane: 'Watch',
    org: 'Anthropic',
    score: 25,
    tags: ['sample'],
  },
];

async function main(): Promise<void> {
const db = getDb();
const itemResult = await applyItemBatch(db, rows, { sample: true });
const issueResult = await applyIssueBatch(
  db,
  [
    {
      slug: 'sample-week-2026-10-05',
      title: `[sample] ${brand.newsletterName}: week of 5 Oct 2026`,
      theme_line: 'Sample: Claude is so back',
      published_at: '2026-10-05T00:00:00.000Z',
      body_markdown: [
        `# [sample] ${brand.newsletterName}: week of 5 Oct 2026`,
        '',
        '*Sample: Claude is so back*',
        '',
        brand.newsletterBlurb,
        '',
        `${sampleNote} This letter exists so the newsletter archive has something to render locally.`,
        '',
        '## The short list',
        '',
        '- [sample] Claude Haiku 5.5. ([source](https://example.com/sample/claude-haiku-5.5))',
        '',
      ].join('\n'),
      status: 'published',
    },
  ],
  { sample: true },
);

console.log(`sample items created=${itemResult.created} upserted=${itemResult.upserted}`);
console.log(`sample issue created=${issueResult.created} upserted=${issueResult.upserted}`);
await closeDb();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
