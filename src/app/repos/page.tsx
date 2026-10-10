import Link from 'next/link';
import { Empty } from '@/components/Empty';
import { ItemList } from '@/components/ItemList';
import { PageHeader } from '@/components/PageHeader';
import { Pager } from '@/components/Pager';
import { groupByTheme } from '@/lib/group';
import { listingHref } from '@/lib/listing';
import { listRepoThemes, listRepos, pageNumber } from '@/lib/queries';
import { safeQuery } from '@/lib/safe';
import { includeSampleData } from '@/lib/samples';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Repos' };

export default async function ReposPage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string; lane?: string; page?: string }>;
}) {
  const params = await searchParams;
  const lane = params.lane?.trim() || params.theme?.trim() || undefined;
  const page = pageNumber(params.page);
  const samples = includeSampleData();
  const [result, themes] = await Promise.all([
    safeQuery(() => listRepos(samples, { lane, page }), { items: [], hasMore: false }),
    safeQuery(() => listRepoThemes(samples), []),
  ]);
  const groups = groupByTheme(result.items);
  return (
    <main>
      <PageHeader
        section="01"
        kicker="interesting-repos"
        title="Repos"
        dek="Trending GitHub repos from interesting-repos, by theme."
      />
      <div className="theme-row">
        <Link href="/repos" aria-current={lane ? undefined : 'page'}>All themes</Link>
        {themes.map((name) => (
          <Link key={name} href={listingHref('/repos', { lane: name }, 1)} aria-current={lane === name ? 'page' : undefined}>
            {name}
          </Link>
        ))}
      </div>
      {groups.map((group) => (
        <section key={group.key} className="group">
          <h2>{group.key}</h2>
          <ItemList items={group.items} />
        </section>
      ))}
      {groups.length === 0 ? <Empty>No repos match.</Empty> : null}
      <Pager page={page} hasMore={result.hasMore} path="/repos" params={{ lane }} />
    </main>
  );
}
