import Link from 'next/link';
import { ChannelStrip } from '@/components/ChannelStrip';
import { Crab } from '@/components/Crab';
import { Empty } from '@/components/Empty';
import { Hero } from '@/components/Hero';
import { ItemList } from '@/components/ItemList';
import { PixelDivider } from '@/components/PixelDivider';
import { SectionTag } from '@/components/SectionTag';
import { brand } from '@/config/brand';
import { formatWhen } from '@/lib/format';
import { latestPublishedIssue, listLatest } from '@/lib/queries';
import { safeQuery } from '@/lib/safe';
import { includeSampleData } from '@/lib/samples';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const samples = includeSampleData();
  const [latest, issue] = await Promise.all([
    safeQuery(() => listLatest(samples), []),
    safeQuery(() => latestPublishedIssue(samples), null),
  ]);

  return (
    <main>
      <Hero />
      <PixelDivider />
      <SectionTag section="01" label="Follow" meta="Live" />
      <h2 className="section-title">
        <Crab /> Follow the live feeds
      </h2>
      <ChannelStrip />
      {issue ? (
        <Link className="issue-card" href={`/issues/${issue.slug}`}>
          <p className="kicker">{brand.newsletterName} · {formatWhen(issue.publishedAt)}</p>
          <strong>{issue.title}</strong>
          <p className="summary">{issue.themeLine}</p>
        </Link>
      ) : (
        <Empty>No issue of {brand.newsletterName} yet.</Empty>
      )}
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
