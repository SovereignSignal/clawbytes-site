import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, IBM_Plex_Mono, IBM_Plex_Sans, Press_Start_2P } from 'next/font/google';
import { PNWParallaxBg } from '@/components/PNWParallaxBg';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { brand } from '@/config/brand';
import { includeSampleData } from '@/lib/samples';
import { siteUrl } from '@/lib/site-url';
import { themeBootScript } from '@/lib/theme';
import './globals.css';

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const pixel = Press_Start_2P({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-pixel',
  display: 'swap',
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: brand.name, template: `%s · ${brand.name}` },
  description: brand.description,
  openGraph: {
    title: brand.name,
    description: brand.description,
    siteName: brand.name,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: brand.name,
    description: brand.description,
  },
  alternates: {
    types: {
      'application/rss+xml': [
        { url: '/feed.xml', title: brand.name },
        { url: '/issues/feed.xml', title: brand.newsletterName },
      ],
    },
  },
};

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf9f4' },
    { media: '(prefers-color-scheme: dark)', color: '#121b2b' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const samples = includeSampleData();
  const production = process.env.NODE_ENV === 'production';
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${display.variable} ${pixel.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <a className="skip" href="#content">Skip to content</a>
        <PNWParallaxBg />
        <div className="site-shell">
          <SiteHeader />
          {samples ? (
            <p className="wrap banner">
              {production
                ? 'SEED=1 is on, so sample rows are visible.'
                : 'Sample rows are included outside production. They stay hidden in production unless SEED=1.'}
            </p>
          ) : null}
          <div className="wrap" id="content">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
