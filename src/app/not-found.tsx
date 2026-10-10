import { PageHeader } from '@/components/PageHeader';
import { brand } from '@/config/brand';

export default function NotFound() {
  return (
    <main>
      <PageHeader section="404" kicker={brand.name} title="Not found" dek={`That page is not on ${brand.name}.`} />
    </main>
  );
}
