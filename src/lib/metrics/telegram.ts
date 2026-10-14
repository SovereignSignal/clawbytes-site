import { publicWires } from '@/config/brand';

export type TelegramChannel = {
  slug: string;
  url: string;
  label: string;
  handle: string;
};

/**
 * Public channels only. Slugs are the t.me path and match the
 * `telegram_subscriber_daily` check constraint.
 */
export function telegramChannels(): TelegramChannel[] {
  return publicWires().map((wire) => {
    const url = wire.joinUrl;
    const slug = new URL(url).pathname.replace(/^\//, '');
    return { slug, url, label: wire.channelLabel, handle: wire.handle ?? `t.me/${slug}` };
  });
}

const EXTRA = /<div\s+class="[^"]*\btgme_page_extra\b[^"]*"[^>]*>([^<]*)<\/div>/i;
const COUNT = /^(\d[\d\s]*)\s+(?:subscribers|members)\b/i;
const PG_INT_MAX = 2_147_483_647;

function decodeCountText(value: string): string {
  return value
    .replace(/&nbsp;|&#160;|&#xa0;|&#8239;|&#x202f;/gi, ' ')
    .replace(/[\u00a0\u202f]/g, ' ')
    .trim();
}

/** The subscriber or member count in a public t.me page, or null when it is not there. */
export function parseTelegramMemberCount(html: string): number | null {
  const block = EXTRA.exec(html);
  if (!block?.[1]) return null;
  const match = COUNT.exec(decodeCountText(block[1]));
  if (!match?.[1]) return null;
  const count = Number(match[1].replace(/\s+/g, ''));
  if (!Number.isSafeInteger(count) || count < 0 || count > PG_INT_MAX) return null;
  return count;
}

export type ScrapeResult = { ok: true; count: number } | { ok: false; detail: string };

const MAX_HTML = 2_000_000;

export async function scrapeMemberCount(fetchImpl: typeof fetch, url: string): Promise<ScrapeResult> {
  try {
    const response = await fetchImpl(url, {
      headers: {
        accept: 'text/html',
        'user-agent': 'ClawBytesMetrics/1.0',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return { ok: false, detail: `HTTP ${response.status}` };
    }
    const html = await response.text();
    if (html.length > MAX_HTML) return { ok: false, detail: 'page too large' };
    const count = parseTelegramMemberCount(html);
    if (count === null) return { ok: false, detail: 'member count missing' };
    return { ok: true, count };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'fetch failed';
    return { ok: false, detail: message.length > 300 ? `${message.slice(0, 300)}…` : message };
  }
}
