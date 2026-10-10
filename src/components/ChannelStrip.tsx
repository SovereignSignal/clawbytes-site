import { publicWires } from '@/config/brand';

export function ChannelStrip() {
  return (
    <div className="channels">
      {publicWires().map((wire) => (
        <a key={wire.id} className="channel" href={wire.joinUrl}>
          <strong>{wire.label}</strong>
          <span>{wire.blurb}</span>
          <span className="handle">Join {wire.handle}</span>
        </a>
      ))}
    </div>
  );
}
