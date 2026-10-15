import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DigestSubscribe } from '@/components/DigestSubscribe';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { metadata as layoutMetadata } from '@/app/layout';
import { metadata as homeMetadata } from '@/app/page';
import { metadata as toolsMetadata } from '@/app/tools/page';
import sitemap from '@/app/sitemap';
import { brand } from '@/config/brand';
import { siteUrl } from '@/lib/site-url';

vi.mock('next/font/google', () => ({
  IBM_Plex_Sans: () => ({ variable: '--font-sans' }),
  IBM_Plex_Mono: () => ({ variable: '--font-mono' }),
  Bricolage_Grotesque: () => ({ variable: '--font-display' }),
  Press_Start_2P: () => ({ variable: '--font-pixel' }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

const SECTION = 'https://sovereignsignal.substack.com/s/clawbytes';

describe('subscribe links', () => {
  it('points the home card and the footer at the section', () => {
    const card = renderToStaticMarkup(<DigestSubscribe />);
    expect(card).toContain(brand.newsletterName);
    expect(card).toContain('Twice a week');
    expect(card).toContain(`href="${SECTION}"`);
    expect(card).toContain('target="_blank"');
    expect(card).toContain('Subscribe');
    expect(card).not.toContain('No issue');

    const footer = renderToStaticMarkup(<SiteFooter />);
    expect(footer).toContain(`href="${SECTION}"`);
    expect(footer).toContain('Subscribe');
    expect(footer).toContain('/feed.xml');
    expect(footer).not.toContain('/issues/feed.xml');
  });

  it('opens Newsletter in a new tab', () => {
    const header = renderToStaticMarkup(
      <SiteHeader name={brand.name} byline={brand.byline} newsletterUrl={brand.substackUrl} />,
    );
    expect(header).toContain(`href="${SECTION}"`);
    expect(header).toContain('target="_blank"');
    expect(header).toContain('Newsletter');
    expect(header).not.toContain('href="/issues"');
  });
});

describe('canonical metadata', () => {
  it('sets metadataBase from SITE_URL and a canonical path on pages', () => {
    expect(layoutMetadata.metadataBase).toBeInstanceOf(URL);
    expect(String(layoutMetadata.metadataBase)).toBe(`${siteUrl()}/`);
    expect(JSON.stringify(layoutMetadata.alternates)).toContain('/feed.xml');
    expect(JSON.stringify(layoutMetadata.alternates)).not.toContain('/issues/feed.xml');
    expect(homeMetadata.alternates?.canonical).toBe('/');
    expect(toolsMetadata.alternates?.canonical).toBe('/tools');
  });

  it('leaves issue pages out of the sitemap', async () => {
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls.some((url) => url.includes('/issues'))).toBe(false);
    expect(urls).toContain(`${siteUrl()}/`);
    expect(urls).toContain(`${siteUrl()}/tools`);
  });
});
