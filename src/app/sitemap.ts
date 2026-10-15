import type { MetadataRoute } from 'next';
import { listArchive } from '@/lib/queries';
import { safeQuery } from '@/lib/safe';
import { includeSampleData } from '@/lib/samples';
import { siteUrl } from '@/lib/site-url';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const samples = includeSampleData();
  const archive = await safeQuery(() => listArchive(samples, 1), { items: [], hasMore: false });
  const staticPaths = ['', '/tools', '/models', '/repos', '/archive', '/search', '/stats'];
  return [
    ...staticPaths.map((path) => ({ url: `${base}${path || '/'}` })),
    ...archive.items.map((item) => ({ url: `${base}/items/${item.id}` })),
  ];
}
