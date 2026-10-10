import Link from 'next/link';
import { botName, formatScore, formatWhen, kindLabel } from '@/lib/format';
import type { ItemView } from '@/lib/queries';

export function ItemList({ items, empty = 'Nothing here yet.' }: { items: ItemView[]; empty?: string }) {
  if (!items.length) return <p className="empty">{empty}</p>;
  return (
    <ol className="item-list">
      {items.map((item) => {
        const when = formatWhen(item.publishedAt ?? item.createdAt);
        const lanes = [
          ...new Set(
            item.appearances
              .map((appearance) => appearance.lane)
              .filter((lane): lane is string => Boolean(lane)),
          ),
        ];
        const shownLanes = lanes.length ? lanes : item.lane ? [item.lane] : [];
        const bots = [...new Set(item.appearances.map((appearance) => appearance.sourceBot))];
        const posts = item.appearances.filter((appearance) => appearance.channelPostUrl);
        const score = formatScore(item.score);
        return (
          <li key={item.id} className="item">
            <div className="item-meta">
              <span>{kindLabel(item.kind)}</span>
              {shownLanes.map((lane) => (
                <span key={lane}>{lane}</span>
              ))}
              {item.org ? <span>{item.org}</span> : null}
              {item.modality ? <span>{item.modality}</span> : null}
              {when ? <span>{when}</span> : null}
              {score ? <span>score {score}</span> : null}
              {bots.length > 1 ? <span className="chip">On {bots.length} wires</span> : null}
              {item.sample ? <span className="chip">Sample</span> : null}
            </div>
            <h3>
              <a href={item.url} rel="noreferrer">{item.title}</a>
            </h3>
            {item.summary ? <p className="summary">{item.summary}</p> : null}
            <div className="item-links">
              <a href={item.url} rel="noreferrer">Source</a>
              <Link href={`/items/${item.id}`}>Registry</Link>
              {posts.map((appearance) => (
                <a key={`${appearance.sourceBot}-${appearance.channelPostUrl}`} href={appearance.channelPostUrl ?? '#'} rel="noreferrer">
                  {botName(appearance.sourceBot)} post
                </a>
              ))}
              {bots.filter((bot) => !posts.some((appearance) => appearance.sourceBot === bot)).map((bot) => (
                <span key={bot}>{botName(bot)}</span>
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
