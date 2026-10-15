import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ItemList } from '@/components/ItemList';
import { SectionTag } from '@/components/SectionTag';
import { pageMetadata } from '@/lib/page-meta';
import { getItem } from '@/lib/queries';
import { includeSampleData } from '@/lib/samples';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const canonical = `/items/${id}`;
  const item = await getItem(id, includeSampleData()).catch(() => null);
  if (!item) return pageMetadata(canonical, { title: 'Item' });
  return pageMetadata(canonical, { title: item.title, description: item.summary ?? item.title });
}

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getItem(id, includeSampleData()).catch(() => null);
  if (!item) notFound();
  return (
    <main>
      <SectionTag section="01" label="Entry" meta="Item" />
      <p className="kicker"><Link href="/archive">Archive</Link></p>
      <ItemList items={[item]} titleAs="h1" />
    </main>
  );
}
