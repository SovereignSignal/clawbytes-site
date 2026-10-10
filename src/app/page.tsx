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
      <SectionTag section="01" label="Wires" meta="Telegram" />
      <h2 className="section-title">
        <Crab /> Join a wire
      </h2>
      <ChannelStrip />
      {issue ? (
        <Link className="issue-card" href={`/issues/${issue.slug}`}>
          <p className="kicker">{brand.newsletterName} · {formatWhen(issue.publishedAt)}</p>
          <strong>{issue.title}</strong>
          <p className="summary">{issue.themeLine}</p>
        </Link>
      ) : (
        <Empty>No published newsletter yet.</Empty>
      )}
      <section id="latest">
        <SectionTag section="02" label="Registry" meta="Newest" />
        <h2 className="section-title">
          <Crab /> Latest
        </h2>
        <ItemList items={latest} empty="The registry is empty. Bots push items after they post to Telegram." />
      </section>
    </main>
  );
}
