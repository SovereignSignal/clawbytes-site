import { Crab } from '@/components/Crab';
import { PixelDivider } from '@/components/PixelDivider';
import { brand, publicWires } from '@/config/brand';

export function SiteFooter() {
  const wires = publicWires();
  return (
    <footer className="site-footer">
      <div className="wrap">
        <PixelDivider />
        <div className="footer-grid">
          <div>
            <p className="footer-brand">
              <Crab /> {brand.name}
            </p>
            <p>
              {brand.name} is the curated tier on top of the Telegram wires. {brand.byline}.
            </p>
          </div>
          <nav aria-label="Footer" className="footer-links">
            {wires.map((wire) => (
              <a key={wire.id} href={wire.joinUrl}>
                <Crab /> Join {wire.channelLabel}
              </a>
            ))}
            <a href="/feed.xml">
              <Crab /> Items RSS
            </a>
            <a href="/issues/feed.xml">
              <Crab /> Newsletter RSS
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
