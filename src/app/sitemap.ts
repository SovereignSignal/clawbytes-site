import type { MetadataRoute } from 'next';
import { listArchive, listPublishedIssues } from '@/lib/queries';
import { safeQuery } from '@/lib/safe';
import { includeSampleData } from '@/lib/samples';
import { siteUrl } from '@/lib/site-url';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const samples = includeSampleData();
  const [archive, issues] = await Promise.all([
    safeQuery(() => listArchive(samples, 1), { items: [], hasMore: false }),
    safeQuery(() => listPublishedIssues(samples), []),
  ]);
  const staticPaths = ['', '/tools', '/models', '/repos', '/archive', '/issues', '/search'];
  return [
    ...staticPaths.map((path) => ({ url: `${base}${path || '/'}` })),
    ...issues.map((issue) => ({ url: `${base}/issues/${issue.slug}` })),
    ...archive.items.map((item) => ({ url: `${base}/items/${item.id}` })),
  ];
}
