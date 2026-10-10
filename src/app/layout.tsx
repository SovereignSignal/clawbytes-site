import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { brand, publicWires } from '@/config/brand';
import { Mark } from '@/components/Mark';
import { includeSampleData } from '@/lib/samples';
import { siteUrl } from '@/lib/site-url';
import './globals.css';

export const dynamic = 'force-dynamic';

const nav = [
  { href: '/', label: 'Latest' },
  { href: '/tools', label: 'Tools' },
  { href: '/models', label: 'Models' },
  { href: '/repos', label: 'Repos' },
  { href: '/issues', label: 'Newsletter' },
  { href: '/archive', label: 'Archive' },
  { href: '/search', label: 'Search' },
];

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: brand.name, template: `%s · ${brand.name}` },
  description: brand.description,
  alternates: {
    types: {
      'application/rss+xml': [
        { url: '/feed.xml', title: brand.name },
        { url: '/issues/feed.xml', title: brand.newsletterName },
      ],
    },
  },
};

export const viewport: Viewport = { colorScheme: 'light dark' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const samples = includeSampleData();
  const production = process.env.NODE_ENV === 'production';
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#content">Skip to content</a>
        <header className="site-header">
          <div className="wrap masthead">
            <Link href="/" className="wordmark" aria-label={`${brand.name} home`}>
              <Mark />
              <span>{brand.name}</span>
            </Link>
            <p className="byline">{brand.byline}</p>
          </div>
          <nav className="wrap nav" aria-label="Primary">
            {nav.map((item) => (
              <Link key={item.href} href={item.href}>{item.label}</Link>
            ))}
          </nav>
        </header>
        {samples ? (
          <p className="wrap banner">
            {production
              ? 'SEED=1 is on, so sample rows are visible.'
              : 'Sample rows are included outside production. They stay hidden in production unless SEED=1.'}
          </p>
        ) : null}
        <div className="wrap" id="content">{children}</div>
        <footer className="site-footer">
          <div className="wrap">
            <p>{brand.name} is the curated tier on top of the Telegram wires. {brand.byline}.</p>
            <p className="footer-links">
              {publicWires().map((wire, index) => (
                <span key={wire.id}>
                  {index > 0 ? ' · ' : null}
                  <a href={wire.joinUrl}>{wire.channelLabel}</a>
                </span>
              ))}
              {' · '}
              <a href="/feed.xml">Items RSS</a>
              {' · '}
              <a href="/issues/feed.xml">Newsletter RSS</a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
