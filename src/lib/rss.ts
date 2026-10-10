import { brand } from '@/config/brand';
import { xmlEscape } from '@/lib/format';
import type { IssueView, ItemView } from '@/lib/queries';
import { siteUrl } from '@/lib/site-url';

export function buildItemFeed(rows: ItemView[]): string {
  const base = siteUrl();
  const entries = rows
    .map((item) => {
      const link = `${base}/items/${item.id}`;
      const when = (item.publishedAt ?? item.createdAt).toUTCString();
      const description = item.summary ?? item.title;
      return [
        '    <item>',
        `      <title>${xmlEscape(item.title)}</title>`,
        `      <link>${xmlEscape(link)}</link>`,
        `      <guid isPermaLink="true">${xmlEscape(link)}</guid>`,
        `      <pubDate>${when}</pubDate>`,
        `      <category>${xmlEscape(item.kind)}</category>`,
        `      <description>${xmlEscape(`${description}\n\n${item.url}`)}</description>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');
  return channel(brand.name, base, brand.description, entries);
}

export function buildIssueFeed(rows: IssueView[]): string {
  const base = siteUrl();
  const entries = rows
    .map((issue) => {
      const link = `${base}/issues/${issue.slug}`;
      return [
        '    <item>',
        `      <title>${xmlEscape(issue.title)}</title>`,
        `      <link>${xmlEscape(link)}</link>`,
        `      <guid isPermaLink="true">${xmlEscape(link)}</guid>`,
        `      <pubDate>${issue.publishedAt.toUTCString()}</pubDate>`,
        `      <description>${xmlEscape(issue.themeLine)}</description>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');
  return channel(brand.newsletterName, `${base}/issues`, `${brand.newsletterName}. ${brand.description}`, entries);
}

function channel(title: string, link: string, description: string, entries: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    `    <title>${xmlEscape(title)}</title>`,
    `    <link>${xmlEscape(link)}</link>`,
    `    <description>${xmlEscape(description)}</description>`,
    '    <language>en</language>',
    entries,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}
