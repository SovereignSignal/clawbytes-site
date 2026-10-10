import { buildItemFeed } from '@/lib/rss';
import { listLatest } from '@/lib/queries';
import { safeQuery } from '@/lib/safe';
import { includeSampleData } from '@/lib/samples';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const rows = await safeQuery(() => listLatest(includeSampleData(), 100), []);
  return new Response(buildItemFeed(rows), {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=300' },
  });
}
