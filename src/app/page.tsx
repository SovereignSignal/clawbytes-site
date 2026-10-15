import type { Metadata } from 'next';
import { ChannelStrip } from '@/components/ChannelStrip';
import { Crab } from '@/components/Crab';
import { DigestSubscribe } from '@/components/DigestSubscribe';
import { Hero } from '@/components/Hero';
import { ItemList } from '@/components/ItemList';
import { PixelDivider } from '@/components/PixelDivider';
import { SectionTag } from '@/components/SectionTag';
import { pageMetadata } from '@/lib/page-meta';
import { listLatest } from '@/lib/queries';
import { safeQuery } from '@/lib/safe';
import { includeSampleData } from '@/lib/samples';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata('/');

export default async function HomePage() {
  const samples = includeSampleData();
  const latest = await safeQuery(() => listLatest(samples), []);

  return (
    <main>
      <Hero />
      <PixelDivider />
      <SectionTag section="01" label="Follow" meta="Live" />
      <h2 className="section-title">
        <Crab /> Follow the live feeds
      </h2>
      <ChannelStrip />
      <DigestSubscribe />
      <section id="latest">
        <SectionTag section="02" label="Now" meta="Newest" />
        <h2 className="section-title">
          <Crab /> Latest
        </h2>
        <ItemList
          items={latest}
          empty="Nothing logged yet. Agents, models, tools, and repos show up here when they matter."
        />
      </section>
    </main>
  );
}
