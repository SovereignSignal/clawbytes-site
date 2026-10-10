import { ItemList } from '@/components/ItemList';
import { MODALITIES } from '@/lib/ingest/items';
import { listModelFacets, listModels } from '@/lib/queries';
import { safeQuery } from '@/lib/safe';
import { includeSampleData } from '@/lib/samples';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Models' };

export default async function ModelsPage({
  searchParams,
}: {
  searchParams: Promise<{ modality?: string; org?: string }>;
}) {
  const params = await searchParams;
  const modality = MODALITIES.find((entry) => entry === params.modality);
  const org = params.org?.trim() ?? '';
  const samples = includeSampleData();
  const [rows, facets] = await Promise.all([
    safeQuery(() => listModels(samples, { modality, org }), []),
    safeQuery(() => listModelFacets(samples), { orgs: [], modalities: [] }),
  ]);

  return (
    <main>
      <h1>Models</h1>
      <p className="dek">New models from ModelBytes, every modality, sorted by date.</p>
      <form className="filters" action="/models" method="get">
        <label>
          Modality
          <select name="modality" defaultValue={modality ?? ''}>
            <option value="">All</option>
            {MODALITIES.map((entry) => (
              <option key={entry} value={entry}>{entry}</option>
            ))}
          </select>
        </label>
        <label>
          Org
          <input name="org" defaultValue={org} list="orgs" placeholder="anthropic" />
          <datalist id="orgs">
            {facets.orgs.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>
        <button type="submit">Filter</button>
      </form>
      <ItemList items={rows} empty="No models match." />
    </main>
  );
}
