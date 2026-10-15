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
              {brand.about} {brand.byline}.
            </p>
            <p className="footer-subscribe">
              <a className="button" href={brand.substackUrl} target="_blank" rel="noopener noreferrer">
                Subscribe
              </a>
            </p>
          </div>
          <nav aria-label="Footer" className="footer-links">
            {wires.map((wire) => (
              <a key={wire.id} href={wire.joinUrl}>
                <Crab /> {wire.label} feed
              </a>
            ))}
            <a href="/feed.xml">
              <Crab /> Items RSS
            </a>
            <a href="/stats">
              <Crab /> Subscriber counts
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
