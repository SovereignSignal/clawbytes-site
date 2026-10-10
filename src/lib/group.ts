import type { ItemView } from '@/lib/queries';

export type ItemGroup = { key: string; items: ItemView[] };

export function groupByOrg(rows: ItemView[]): ItemGroup[] {
  const map = new Map<string, ItemView[]>();
  for (const item of rows) {
    const key = item.org?.trim() || ownerFromKey(item.canonicalKey) || 'Other';
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return [...map.entries()]
    .map(([key, items]) => ({ key, items }))
    .sort((a, b) => b.items.length - a.items.length || a.key.localeCompare(b.key));
}

export function groupByTheme(rows: ItemView[]): ItemGroup[] {
  const map = new Map<string, ItemView[]>();
  for (const item of rows) {
    const key = item.lane?.trim() || 'Unsorted';
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return [...map.entries()]
    .map(([key, items]) => ({ key, items }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function ownerFromKey(key: string): string | null {
  const match = /^(?:release|repo):([^/]+)\//.exec(key);
  return match?.[1] ?? null;
}
