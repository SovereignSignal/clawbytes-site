import { brand } from '@/config/brand';

export function DigestSubscribe() {
  return (
    <aside className="digest-cta" aria-label={brand.newsletterName}>
      <p className="kicker">{brand.newsletterName}</p>
      <p className="summary">{brand.newsletterBlurb}</p>
      <a className="button" href={brand.substackUrl} target="_blank" rel="noopener noreferrer">
        Subscribe
      </a>
    </aside>
  );
}
