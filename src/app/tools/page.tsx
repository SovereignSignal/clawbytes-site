import Link from 'next/link';
import { Crab } from '@/components/Crab';
import { Empty } from '@/components/Empty';
import { ItemList } from '@/components/ItemList';
import { PageHeader } from '@/components/PageHeader';
import { Pager } from '@/components/Pager';
import { publicBlurb } from '@/config/brand';
import { groupByOrg } from '@/lib/group';
import { listingHref } from '@/lib/listing';
import { pageMetadata } from '@/lib/page-meta';
import { listTools, pageNumber } from '@/lib/queries';
import { safeQuery } from '@/lib/safe';
import { includeSampleData } from '@/lib/samples';

export const dynamic = 'force-dynamic';

const toolsBlurb = publicBlurb('tools');

export const metadata = pageMetadata('/tools', { title: 'Tools', description: toolsBlurb });

const lanes = ['Ship', 'Watch', 'Read', 'Community'];

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ lane?: string; kind?: string; page?: string }>;
}) {
  const params = await searchParams;
  const lane = params.lane?.trim() || undefined;
  const kind = params.kind === 'status' ? 'status' : undefined;
  const page = pageNumber(params.page);
  const result = await safeQuery(() => listTools(includeSampleData(), { lane, kind, page }), {
    items: [],
    hasMore: false,
  });
  const groups = groupByOrg(result.items);
  const preserved = { lane, kind };
  return (
    <main>
      <PageHeader
        section="01"
        kicker="Agents"
        title="Tools"
        dek={toolsBlurb}
      />
      <div className="theme-row">
        <Link href="/tools" aria-current={lane || kind ? undefined : 'page'}>All lanes</Link>
        {lanes.map((name) => (
          <Link key={name} href={listingHref('/tools', { lane: name }, 1)} aria-current={!kind && lane === name ? 'page' : undefined}>
            {name === 'Ship' ? <Crab /> : null}
            {name}
          </Link>
        ))}
        <Link href={listingHref('/tools', { kind: 'status' }, 1)} aria-current={kind === 'status' ? 'page' : undefined}>
          Status
        </Link>
      </div>
      {groups.length === 0 ? <Empty>No tools or status incidents yet.</Empty> : null}
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
