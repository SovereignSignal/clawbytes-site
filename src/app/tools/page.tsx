import { ItemList } from '@/components/ItemList';
import { brand } from '@/config/brand';
import { groupByOrg } from '@/lib/group';
import { listTools } from '@/lib/queries';
import { safeQuery } from '@/lib/safe';
import { includeSampleData } from '@/lib/samples';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Tools' };

export default async function ToolsPage() {
  const rows = await safeQuery(() => listTools(includeSampleData()), []);
  const groups = groupByOrg(rows);
  return (
    <main>
      <h1>Tools</h1>
      <p className="dek">
        Releases and {brand.wires.find((wire) => wire.id === 'tools')?.channelLabel} news, grouped by tool or org.
        Lanes: Ship, Watch, Read, Community.
      </p>
      {groups.length === 0 ? <p className="empty">No tool items yet.</p> : null}
      {groups.map((group) => (
        <section key={group.key} className="group">
          <h2>{group.key}</h2>
          <ItemList items={group.items} />
        </section>
      ))}
    </main>
  );
}
