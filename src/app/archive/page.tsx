import Link from 'next/link';
import { ItemList } from '@/components/ItemList';
import { PageHeader } from '@/components/PageHeader';
import { pageMetadata } from '@/lib/page-meta';
import { listArchive } from '@/lib/queries';
import { safeQuery } from '@/lib/safe';
import { includeSampleData } from '@/lib/samples';

export const dynamic = 'force-dynamic';

export const metadata = pageMetadata('/archive', {
  title: 'Archive',
  description: 'The full ClawBytes log, newest first.',
});

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;
  const result = await safeQuery(() => listArchive(includeSampleData(), page), { items: [], hasMore: false });
  return (
    <main>
      <PageHeader section="01" kicker="Log" title="Archive" dek="The full log, newest first." />
      <ItemList items={result.items} empty="Nothing in the log yet." />
      <div className="pager">
        {page > 1 ? <Link href={page === 2 ? '/archive' : `/archive?page=${page - 1}`}>Newer</Link> : <span />}
        {result.hasMore ? <Link href={`/archive?page=${page + 1}`}>Older</Link> : <span />}
      </div>
    </main>
  );
}
