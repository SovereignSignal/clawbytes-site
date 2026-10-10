import { Crab } from '@/components/Crab';
import { IconClaw, IconRadar, IconTech } from '@/components/PixelIcons';
import { publicWires } from '@/config/brand';

const icons = {
  tools: IconTech,
  models: IconClaw,
  repos: IconRadar,
} as const;

export function ChannelStrip() {
  return (
    <div className="channels">
      {publicWires().map((wire) => {
        const Icon = icons[wire.id];
        return (
          <a key={wire.id} className="channel" href={wire.joinUrl}>
            <span className="channel-top">
              <Icon size={28} />
              <strong>
                <Crab /> {wire.label}
              </strong>
            </span>
            <span>{wire.blurb}</span>
            <span className="handle">
              <Crab /> Join {wire.handle}
            </span>
          </a>
        );
      })}
    </div>
  );
}
