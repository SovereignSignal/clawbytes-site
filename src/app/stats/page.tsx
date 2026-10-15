import { Empty } from '@/components/Empty';
import { PageHeader } from '@/components/PageHeader';
import { SubscriberStats } from '@/components/SubscriberStats';
import { listSubscriberSeries } from '@/lib/metrics/subscribers';
import { pageMetadata } from '@/lib/page-meta';
import { safeQuery } from '@/lib/safe';

export const dynamic = 'force-dynamic';

export const metadata = pageMetadata('/stats', {
  title: 'Subscribers',
  description: 'Daily subscriber counts for the public ClawBytes Telegram feeds.',
});

export default async function StatsPage() {
  const series = await safeQuery(() => listSubscriberSeries(), null);
  return (
    <main>
      <PageHeader
        section="01"
        kicker="Feeds"
        title="Subscribers"
        dek="How many people follow the public Telegram feeds, counted once a day from each public t.me page."
      />
      {series ? (
        <SubscriberStats series={series} />
      ) : (
        <Empty>Subscriber counts are not available right now.</Empty>
      )}
    </main>
  );
}
