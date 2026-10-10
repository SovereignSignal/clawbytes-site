import Link from 'next/link';
import { Crab } from '@/components/Crab';
import { Empty } from '@/components/Empty';
import { ItemList } from '@/components/ItemList';
import { PageHeader } from '@/components/PageHeader';
import { Pager } from '@/components/Pager';
import { brand } from '@/config/brand';
import { groupByOrg } from '@/lib/group';
import { listingHref } from '@/lib/listing';
import { listTools, pageNumber } from '@/lib/queries';
import { safeQuery } from '@/lib/safe';
import { includeSampleData } from '@/lib/samples';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Tools' };

const lanes = ['Ship', 'Watch', 'Read', 'Community'];

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ lane?: string; page?: string }>;
}) {
  const params = await searchParams;
  const lane = params.lane?.trim() || undefined;
  const page = pageNumber(params.page);
  const result = await safeQuery(() => listTools(includeSampleData(), { lane, page }), {
    items: [],
    hasMore: false,
  });
  const groups = groupByOrg(result.items);
  const channel = brand.wires.find((wire) => wire.id === 'tools')?.channelLabel;
  const preserved = { lane };
  return (
    <main>
      <PageHeader
        section="01"
        kicker={channel ?? 'Tools'}
        title="Tools"
        dek={`Releases and ${channel ?? 'tools'} news, grouped by tool or org.`}
      />
      <div className="theme-row">
        <Link href="/tools" aria-current={lane ? undefined : 'page'}>All lanes</Link>
        {lanes.map((name) => (
          <Link key={name} href={listingHref('/tools', { lane: name }, 1)} aria-current={lane === name ? 'page' : undefined}>
            {name === 'Ship' ? <Crab /> : null}
            {name}
          </Link>
        ))}
      </div>
      {groups.length === 0 ? <Empty>No tool items yet.</Empty> : null}
      {groups.map((group) => (
        <section key={group.key} className="group">
          <h2>{group.key}</h2>
          <ItemList items={group.items} />
        </section>
      ))}
      <Pager page={page} hasMore={result.hasMore} path="/tools" params={preserved} />
    </main>
  );
}
