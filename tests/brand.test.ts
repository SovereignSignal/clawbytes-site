import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { brand } from '@/config/brand';

const SECTION = 'https://sovereignsignal.substack.com/s/clawbytes';
const DIGEST_LINE =
  'Twice a week, the agents, models, tools and open-source repos worth your time: what shipped, what matters, and where it\'s all going.';

describe('brand digest', () => {
  afterEach(() => {
    delete process.env.SUBSTACK_DIGEST_URL;
  });

  it('keeps the digest name in one constant and the line Sov liked', () => {
    expect(brand.newsletterName).toBe('ClawBytes on Sovereign Signal');
    expect(brand.tagline).toBe('Where AI is heading.');
    expect(brand.description).toBe(DIGEST_LINE);
    expect(brand.about).toBe(DIGEST_LINE);
    expect(brand.newsletterBlurb).toBe(DIGEST_LINE);
    expect(brand.description).not.toMatch(/Every week/i);
    expect(`${brand.description} ${brand.about} ${brand.newsletterBlurb}`.toLowerCase()).not.toContain('curated tier');
    expect(`${brand.description} ${brand.about} ${brand.newsletterBlurb}`.toLowerCase()).not.toContain('opinionated signal');

    const source = readFileSync(new URL('../src/config/brand.ts', import.meta.url), 'utf8');
    expect(source.split(brand.newsletterName).length - 1).toBe(1);
  });

  it('defaults the section URL and reads SUBSTACK_DIGEST_URL', () => {
    expect(brand.substackUrl).toBe(SECTION);
    process.env.SUBSTACK_DIGEST_URL = `${SECTION}/`;
    expect(brand.substackUrl).toBe(SECTION);
    process.env.SUBSTACK_DIGEST_URL = '  https://example.com/s/other  ';
    expect(brand.substackUrl).toBe('https://example.com/s/other');
    process.env.SUBSTACK_DIGEST_URL = '   ';
    expect(brand.substackUrl).toBe(SECTION);
  });

  it('points the retired draft and publish commands at Substack', () => {
    const env = { ...process.env };
    delete env.SUBSTACK_DIGEST_URL;
    for (const script of ['scripts/newsletter-draft.ts', 'scripts/newsletter-publish.ts']) {
      const result = spawnSync('./node_modules/.bin/tsx', [script], {
        encoding: 'utf8',
        cwd: process.cwd(),
        env,
      });
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain(brand.newsletterName);
      expect(result.stdout).toContain(SECTION);
    }
  });
});
