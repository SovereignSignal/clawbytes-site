import { ItemList } from '@/components/ItemList';
import { PageHeader } from '@/components/PageHeader';
import { Pager } from '@/components/Pager';
import { pageNumber, searchItems } from '@/lib/queries';
import { safeQuery } from '@/lib/safe';
import { includeSampleData } from '@/lib/samples';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Search' };

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
        kicker="Registry"
        title="Search"
        dek="Search titles, summaries, orgs, and lanes."
      />
      <form className="filters" action="/search" method="get" role="search">
        <label>
          Items
          <input name="q" defaultValue={q} placeholder="model, org, repo, lane" />
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
