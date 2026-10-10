import type { ItemInput } from '@/lib/ingest/items';
import type { RankableItem } from '@/lib/newsletter/rank';

export function item(overrides: Partial<ItemInput> = {}): ItemInput {
  return {
    source_bot: 'modelbytes',
    kind: 'model',
    canonical_key: 'model:anthropic/claude-haiku-5.5',
    title: 'Claude Haiku 5.5',
    url: 'https://example.com/haiku',
    summary: 'A small Claude model.',
    published_at: '2026-10-06T15:00:00.000Z',
    posted_at: '2026-10-06T16:00:00.000Z',
    channel: 'ModelBytes',
    channel_post_url: 'https://t.me/ModelBytes/1001',
    lane: 'Tier 1',
    org: 'Anthropic',
    tags: ['claude'],
    score: 10,
    modality: 'text',
    ...overrides,
  };
}

export function rankable(overrides: Partial<RankableItem> = {}): RankableItem {
  return {
    canonicalKey: 'model:anthropic/claude-haiku-5.5',
    kind: 'model',
    title: 'Claude Haiku 5.5',
    url: 'https://example.com/haiku',
    summary: 'A small Claude model.',
    publishedAt: new Date('2026-10-06T15:00:00.000Z'),
    lane: 'Tier 1',
    org: 'Anthropic',
    score: 10,
    modality: 'text',
    appearances: [{ sourceBot: 'modelbytes', channelPostUrl: 'https://t.me/ModelBytes/1001' }],
    ...overrides,
  };
}
