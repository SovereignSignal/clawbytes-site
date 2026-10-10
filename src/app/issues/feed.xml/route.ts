import { buildIssueFeed } from '@/lib/rss';
import { listPublishedIssues } from '@/lib/queries';
import { safeQuery } from '@/lib/safe';
import { includeSampleData } from '@/lib/samples';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const rows = await safeQuery(() => listPublishedIssues(includeSampleData()), []);
  return new Response(buildIssueFeed(rows), {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=300' },
  });
}
