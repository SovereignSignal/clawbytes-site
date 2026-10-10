import { formatWhen } from '@/lib/format';
import { distinctBots, type PublicSectionId, type RankableItem } from './rank';

export function dominantValue(items: RankableItem[], field: 'org' | 'lane'): { value: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = item[field];
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let best: { value: string; count: number } | null = null;
  for (const [value, count] of counts) {
    if (!best || count > best.count) best = { value, count };
  }
  if (!best || best.count < 2) return null;
  return best;
}

export function templateThemeLine(leads: RankableItem[]): string {
  const org = dominantValue(leads, 'org');
  if (org && (org.count >= 3 || org.count >= Math.ceil(leads.length * 0.34))) {
    return `${org.value} set the direction`;
  }
  const lane = dominantValue(leads, 'lane');
  if (lane && (lane.count >= 3 || lane.count >= Math.ceil(leads.length * 0.34))) {
    return `${lane.value} set the direction`;
  }
  return 'Where this week pointed';
}

export function templateOpening(items: RankableItem[], leads: RankableItem[], weekStart: Date): string {
  const multi = items.filter((item) => distinctBots(item) >= 2).length;
  const when = formatWhen(weekStart);
  const org = dominantValue(leads, 'org');
  const lead = leads[0];
  const itemWord = items.length === 1 ? 'item' : 'items';
  const base = `The week of ${when} turned up ${items.length} ${itemWord} worth knowing. ${multi} showed up in more than one place.`;
  if (!lead) return `${base} Nothing clustered strongly enough to name a tighter theme.`;
  if (org) {
    return `${base} ${org.value} is on ${org.count} of the lead items, starting with ${lead.title}.`;
  }
  return `${base} The lead item is ${lead.title}.`;
}

export function templateSentence(item: RankableItem): string {
  if (item.summary) return `${item.title}. ${item.summary}`;
  return `${item.title}.`;
}

export function templateSectionNote(id: PublicSectionId, count: number): string {
  const label = id === 'tools' ? 'Tools' : id === 'models' ? 'Models' : 'Repos';
  if (count === 0) return `${label} was quiet this week.`;
  if (count === 1) return `${label} had one thing worth knowing this week.`;
  return `${label} had ${count} things worth knowing this week.`;
}
