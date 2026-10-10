import Link from 'next/link';
import { ChannelStrip } from '@/components/ChannelStrip';
import { ItemList } from '@/components/ItemList';
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
      <h1>{brand.tagline}</h1>
      <p className="dek">{brand.description}</p>
      <ChannelStrip />
      {issue ? (
        <Link className="issue-card" href={`/issues/${issue.slug}`}>
          <p className="kicker">{brand.newsletterName} · {formatWhen(issue.publishedAt)}</p>
          <strong>{issue.title}</strong>
          <p className="summary">{issue.themeLine}</p>
        </Link>
      ) : (
        <p className="empty">No published newsletter yet.</p>
      )}
      <h2>Latest</h2>
      <ItemList items={latest} empty="The registry is empty. Bots push items after they post to Telegram." />
    </main>
  );
}
