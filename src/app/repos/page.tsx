import Link from 'next/link';
import { ItemList } from '@/components/ItemList';
import { groupByTheme } from '@/lib/group';
import { listRepoThemes, listRepos } from '@/lib/queries';
import { safeQuery } from '@/lib/safe';
import { includeSampleData } from '@/lib/samples';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Repos' };

export default async function ReposPage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>;
}) {
  const params = await searchParams;
  const theme = params.theme?.trim() || undefined;
  const samples = includeSampleData();
  const [rows, themes] = await Promise.all([
    safeQuery(() => listRepos(samples, theme), []),
    safeQuery(() => listRepoThemes(samples), []),
  ]);
  const groups = groupByTheme(rows);
  return (
    <main>
      <h1>Repos</h1>
      <p className="dek">Trending GitHub repos from interesting-repos, by theme.</p>
      <div className="theme-row">
        <Link href="/repos" aria-current={theme ? undefined : 'page'}>All themes</Link>
        {themes.map((name) => (
          <Link key={name} href={`/repos?theme=${encodeURIComponent(name)}`} aria-current={theme === name ? 'page' : undefined}>
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
      {groups.length === 0 ? <p className="empty">No repos match.</p> : null}
    </main>
  );
}
