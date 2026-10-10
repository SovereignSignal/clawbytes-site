import { ItemList } from '@/components/ItemList';
import { searchItems } from '@/lib/queries';
import { safeQuery } from '@/lib/safe';
import { includeSampleData } from '@/lib/samples';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Search' };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const rows = q ? await safeQuery(() => searchItems(includeSampleData(), q), []) : [];
  return (
    <main>
      <h1>Search</h1>
      <form className="filters" action="/search" method="get" role="search">
        <label>
          Items
          <input name="q" defaultValue={q} placeholder="model, org, repo, lane" />
        </label>
        <button type="submit">Search</button>
      </form>
      {q ? <ItemList items={rows} empty={`No items match “${q}”.`} /> : <p className="empty">Search titles, summaries, orgs, and lanes.</p>}
    </main>
  );
}
