import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, IBM_Plex_Mono, IBM_Plex_Sans, Press_Start_2P } from 'next/font/google';
import Script from 'next/script';
import { PNWParallaxBg } from '@/components/PNWParallaxBg';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { brand } from '@/config/brand';
import { includeSampleData } from '@/lib/samples';
import { siteUrl } from '@/lib/site-url';
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

const themeBoot = `(function(){try{if(localStorage.getItem('clawbytes-theme')==='light'){document.documentElement.classList.add('light');document.documentElement.classList.remove('dark');}}catch(e){}})();`;

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
  themeColor: '#121b2b',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const samples = includeSampleData();
  const production = process.env.NODE_ENV === 'production';
  return (
    <html
      lang="en"
      className={`dark ${sans.variable} ${mono.variable} ${display.variable} ${pixel.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Script id="clawbytes-theme" strategy="beforeInteractive">
          {themeBoot}
        </Script>
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
