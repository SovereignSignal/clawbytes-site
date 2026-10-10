export type RankAppearance = {
  sourceBot: string;
  channelPostUrl?: string | null;
  postedAt?: Date | null;
};

/** Fields the ranker and the draft generator are allowed to use. */
export type RankableItem = {
  canonicalKey: string;
  kind: string;
  title: string;
  url: string;
  summary: string | null;
  publishedAt: Date | null;
  lane: string | null;
  org: string | null;
  score: number | null;
  modality: string | null;
  appearances: RankAppearance[];
};

export type PublicSectionId = 'tools' | 'models' | 'repos';

/**
 * Cross-wire confirmation outranks a single wire. Within the same number of
 * bots, a higher score wins, then more appearances, then a newer date.
 */
export function compareRank(a: RankableItem, b: RankableItem): number {
  const botDelta = distinctBots(b) - distinctBots(a);
  if (botDelta !== 0) return botDelta;
  const scoreDelta = (b.score ?? 0) - (a.score ?? 0);
  if (scoreDelta !== 0) return scoreDelta;
  const appearanceDelta = b.appearances.length - a.appearances.length;
  if (appearanceDelta !== 0) return appearanceDelta;
  const timeDelta = (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
  if (timeDelta !== 0) return timeDelta;
  return a.canonicalKey.localeCompare(b.canonicalKey);
}

export function rankItems(items: RankableItem[]): RankableItem[] {
  return [...items].sort(compareRank);
}

export function distinctBots(item: RankableItem): number {
  return new Set(item.appearances.map((appearance) => appearance.sourceBot)).size;
}

export function sectionIdsFor(item: Pick<RankableItem, 'kind' | 'appearances'>): PublicSectionId[] {
  const bots = new Set(item.appearances.map((appearance) => appearance.sourceBot));
  const ids = new Set<PublicSectionId>();
  if (bots.has('clawbytes') || bots.has('release-bot') || item.kind === 'tool_release') ids.add('tools');
  if (item.kind === 'news' && (bots.size === 0 || bots.has('clawbytes'))) ids.add('tools');
  if (bots.has('modelbytes') || item.kind === 'model') ids.add('models');
  if (bots.has('interesting-repos') || item.kind === 'repo') ids.add('repos');
  return (['tools', 'models', 'repos'] as const).filter((id) => ids.has(id));
}
