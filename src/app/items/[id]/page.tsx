import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ItemList } from '@/components/ItemList';
import { getItem } from '@/lib/queries';
import { includeSampleData } from '@/lib/samples';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = await getItem(id, includeSampleData()).catch(() => null);
  if (!item) return { title: 'Item' };
  return { title: item.title, description: item.summary ?? item.title };
}

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getItem(id, includeSampleData()).catch(() => null);
  if (!item) notFound();
  return (
    <main>
      <p className="kicker"><Link href="/archive">Archive</Link></p>
      <ItemList items={[item]} />
    </main>
  );
}
