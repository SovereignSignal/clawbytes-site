import { ItemList } from '@/components/ItemList';
import { PageHeader } from '@/components/PageHeader';
import { Pager } from '@/components/Pager';
import { publicBlurb } from '@/config/brand';
import { MODALITIES } from '@/lib/ingest/items';
import { listModelFacets, listModels, pageNumber } from '@/lib/queries';
import { safeQuery } from '@/lib/safe';
import { includeSampleData } from '@/lib/samples';

export const dynamic = 'force-dynamic';

const modelsBlurb = publicBlurb('models');

export const metadata = { title: 'Models', description: modelsBlurb };

export default async function ModelsPage({
  searchParams,
}: {
  searchParams: Promise<{ modality?: string; org?: string; lane?: string; page?: string }>;
}) {
  const params = await searchParams;
  const modality = MODALITIES.find((entry) => entry === params.modality);
  const org = params.org?.trim() ?? '';
  const lane = params.lane?.trim() || undefined;
  const page = pageNumber(params.page);
  const samples = includeSampleData();
  const [result, facets] = await Promise.all([
    safeQuery(() => listModels(samples, { modality, org, lane, page }), { items: [], hasMore: false }),
    safeQuery(() => listModelFacets(samples), { orgs: [], modalities: [], lanes: [] }),
  ]);

  return (
    <main>
      <PageHeader
        section="01"
        kicker="Build on"
        title="Models"
        dek={modelsBlurb}
      />
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
        <label>
          Lane
          <select name="lane" defaultValue={lane ?? ''}>
            <option value="">All</option>
            {(lane && !facets.lanes.includes(lane) ? [...facets.lanes, lane] : facets.lanes).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <button type="submit">Filter</button>
      </form>
      <ItemList items={result.items} empty="No models to show." />
      <Pager page={page} hasMore={result.hasMore} path="/models" params={{ modality, org, lane }} />
    </main>
  );
}
