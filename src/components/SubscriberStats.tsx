import { Crab } from '@/components/Crab';
import { IconClaw, IconRadar, IconTech } from '@/components/PixelIcons';
import { formatWhen } from '@/lib/format';
import type { SubscriberPoint, SubscriberSeries } from '@/lib/metrics/subscribers';

const icons: Record<string, typeof IconTech> = {
  clawbytes: IconTech,
  ModelBytes: IconClaw,
  interestingrepos: IconRadar,
};

const TABLE_DAYS = 30;

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-GB').format(value);
}

function dayLabel(day: string): string {
  return formatWhen(new Date(`${day}T00:00:00.000Z`));
}

function growth(points: SubscriberPoint[]): { text: string; tone: 'up' | 'down' | 'flat' } | null {
  if (points.length < 2) return null;
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return null;
  const delta = last.memberCount - first.memberCount;
  const since = dayLabel(first.day);
  if (delta > 0) return { text: `+${formatCount(delta)} since ${since}`, tone: 'up' };
  if (delta < 0) return { text: `${formatCount(delta)} since ${since}`, tone: 'down' };
  return { text: `Flat since ${since}`, tone: 'flat' };
}

function SubscriberSpark({ points }: { points: SubscriberPoint[] }) {
  const width = 640;
  const height = 88;
  const pad = 8;
  const values = points.map((point) => point.memberCount);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : pad + (index / (values.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (value - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const path = coords.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const last = coords[coords.length - 1];
  return (
    <svg className="stats-spark" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {last ? <circle cx={last[0]} cy={last[1]} r="4.5" fill="currentColor" /> : null}
    </svg>
  );
}

function ChannelCard({ series }: { series: SubscriberSeries }) {
  const Icon = icons[series.channel] ?? IconTech;
  const latest = series.points[series.points.length - 1];
  const change = growth(series.points);
  const recent = series.points.slice(-TABLE_DAYS).reverse();
  return (
    <article className="stats-card">
      <div className="stats-top">
        <Icon size={28} />
        <strong>
          <Crab /> {series.label}
        </strong>
      </div>
      <a className="handle" href={series.url}>
        <Crab /> {series.handle}
      </a>
      {latest ? (
        <>
          <p className="stats-count">{formatCount(latest.memberCount)}</p>
          <p className={change ? `stats-meta stats-${change.tone}` : 'stats-meta'}>
            {change ? change.text : `First count on ${dayLabel(latest.day)}.`}
          </p>
          <SubscriberSpark points={series.points} />
          <table className="stats-table">
            <caption className="stats-caption">
              {series.points.length > TABLE_DAYS
                ? `Latest ${TABLE_DAYS} days. The line is every stored day.`
                : `${series.label} subscriber counts`}
            </caption>
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Subscribers</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((point) => (
                <tr key={point.day}>
                  <td>{dayLabel(point.day)}</td>
                  <td>{formatCount(point.memberCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p className="stats-meta">No count yet.</p>
      )}
    </article>
  );
}

export function SubscriberStats({ series }: { series: SubscriberSeries[] }) {
  return (
    <div className="stats-grid">
      {series.map((entry) => (
        <ChannelCard key={entry.channel} series={entry} />
      ))}
    </div>
  );
}
