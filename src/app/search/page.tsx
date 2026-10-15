import { ItemList } from '@/components/ItemList';
import { PageHeader } from '@/components/PageHeader';
import { Pager } from '@/components/Pager';
import { pageMetadata } from '@/lib/page-meta';
import { pageNumber, searchItems } from '@/lib/queries';
import { safeQuery } from '@/lib/safe';
import { includeSampleData } from '@/lib/samples';

export const dynamic = 'force-dynamic';

export const metadata = pageMetadata('/search', {
  title: 'Search',
  description: 'Find an agent, model, tool, repo, or status incident on ClawBytes.',
});

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; lane?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const lane = params.lane?.trim() || undefined;
  const page = pageNumber(params.page);
  const result = q || lane
    ? await safeQuery(() => searchItems(includeSampleData(), q, { lane, page }), { items: [], hasMore: false })
    : { items: [], hasMore: false };
  return (
    <main>
      <PageHeader
        section="01"
        kicker="Find"
        title="Search"
        dek="Find an agent, model, tool, repo, or status incident."
      />
      <form className="filters" action="/search" method="get" role="search">
        <label>
          Items
          <input name="q" defaultValue={q} placeholder="agent, model, tool, repo" />
        </label>
        <label>
          Lane
          <input name="lane" defaultValue={lane ?? ''} placeholder="Ship" />
        </label>
        <button type="submit">Search</button>
      </form>
      {q || lane ? <ItemList items={result.items} empty={`No items match “${q || lane}”.`} /> : null}
      <Pager page={page} hasMore={result.hasMore} path="/search" params={{ q, lane }} />
    </main>
  );
}
