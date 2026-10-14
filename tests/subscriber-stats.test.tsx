import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SubscriberStats } from '@/components/SubscriberStats';
import type { SubscriberSeries } from '@/lib/metrics/subscribers';

function series(partial: Partial<SubscriberSeries> & Pick<SubscriberSeries, 'channel' | 'label'>): SubscriberSeries {
  return {
    url: `https://t.me/${partial.channel}`,
    handle: `t.me/${partial.channel}`,
    points: [],
    ...partial,
  };
}

describe('subscriber stats', () => {
  it('shows growth for the public channels and nothing from the registry', () => {
    const html = renderToStaticMarkup(
      <SubscriberStats
        series={[
          series({
            channel: 'clawbytes',
            label: 'ClawBytes',
            points: [
              { day: '2026-10-13', memberCount: 10, scrapedAt: new Date('2026-10-13T08:00:00.000Z') },
              { day: '2026-10-14', memberCount: 15, scrapedAt: new Date('2026-10-14T08:00:00.000Z') },
            ],
          }),
          series({
            channel: 'ModelBytes',
            label: 'ModelBytes',
            points: [
              { day: '2026-10-13', memberCount: 20, scrapedAt: new Date('2026-10-13T08:00:00.000Z') },
              { day: '2026-10-14', memberCount: 18, scrapedAt: new Date('2026-10-14T08:00:00.000Z') },
            ],
          }),
          series({ channel: 'interestingrepos', label: 'interesting-repos' }),
        ]}
      />,
    );

    expect(html).toContain('ClawBytes');
    expect(html).toContain('15');
    expect(html).toContain('+5 since 13 Oct 2026');
    expect(html).toContain('-2 since 13 Oct 2026');
    expect(html).toContain('No count yet.');
    expect(html).toContain('https://t.me/clawbytes');
    expect(html).toContain('stats-spark');
    expect(html).not.toContain('posted');
    expect(html).not.toContain('release-bot');
    expect(html).not.toContain('stale');
    expect(html).not.toContain('scorecard');
  });
});
