import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SOURCE_BOTS } from '@/lib/ingest/items';
import { parseTelegramMemberCount, telegramChannels } from '@/lib/metrics/telegram';
import { ingestIsStale } from '@/lib/metrics/time';

describe('telegram member count', () => {
  it('reads the public t.me subscriber and member figures', () => {
    expect(parseTelegramMemberCount('<div class="tgme_page_extra">15 subscribers</div>')).toBe(15);
    expect(parseTelegramMemberCount('<div class="tgme_page_extra">10 396 897 subscribers</div>')).toBe(10396897);
    expect(parseTelegramMemberCount('<div class="tgme_page_extra">1 234 members, 56 online</div>')).toBe(1234);
    expect(parseTelegramMemberCount('<div class="tgme_page_extra">0 subscribers</div>')).toBe(0);
    expect(
      parseTelegramMemberCount('<div class="tgme_page_extra">10&nbsp;396 subscribers</div>'),
    ).toBe(10396);
    expect(
      parseTelegramMemberCount(`<div class="tgme_page_extra">10\u00a0396\u202f897 subscribers</div>`),
    ).toBe(10396897);
    expect(
      parseTelegramMemberCount('<div class="tgme_page_extra extra">15 Subscribers</div>'),
    ).toBe(15);
  });

  it('returns null when the count is missing', () => {
    expect(parseTelegramMemberCount('<div class="tgme_page_extra">join</div>')).toBeNull();
    expect(parseTelegramMemberCount('<html>15 subscribers</html>')).toBeNull();
    expect(parseTelegramMemberCount('')).toBeNull();
  });

  it('tracks the three public channels named in the migration', () => {
    const sql = readFileSync('drizzle/0002_metrics.sql', 'utf8');
    expect(telegramChannels().map((channel) => channel.slug)).toEqual([
      'clawbytes',
      'ModelBytes',
      'interestingrepos',
    ]);
    for (const channel of telegramChannels()) {
      expect(channel.url).toBe(`https://t.me/${channel.slug}`);
      expect(sql).toContain(`'${channel.slug}'`);
    }
    for (const sourceBot of SOURCE_BOTS) {
      expect(sql).toContain(`'${sourceBot}'`);
    }
  });
});

describe('stale window', () => {
  const now = new Date('2026-10-14T16:00:00.000Z');

  it('flags a missing ingest and a gap of at least N hours', () => {
    expect(ingestIsStale(null, now, 18)).toBe(true);
    expect(ingestIsStale(new Date(now.getTime() - 18 * 60 * 60 * 1000), now, 18)).toBe(true);
    expect(ingestIsStale(new Date(now.getTime() - 18 * 60 * 60 * 1000 + 1), now, 18)).toBe(false);
  });
});
