import { brand } from '@/config/brand';

export default function NotFound() {
  return (
    <main>
      <h1>Not found</h1>
      <p className="dek">That page is not on {brand.name}.</p>
    </main>
  );
}
