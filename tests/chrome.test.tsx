import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ChannelStrip } from '@/components/ChannelStrip';
import { Hero } from '@/components/Hero';
import { ItemList } from '@/components/ItemList';
import { brand } from '@/config/brand';
import { parallaxShift } from '@/lib/motion';
import type { ItemView } from '@/lib/queries';

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
const parallax = readFileSync(join(process.cwd(), 'src/components/PNWParallaxBg.tsx'), 'utf8');

function block(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`${escaped}\\s*\\{([^}]+)\\}`).exec(css);
  return match?.[1] ?? '';
}

function hsl(source: string, name: string): [number, number, number] {
  const match = new RegExp(`--${name}:\\s*([0-9.]+)\\s+([0-9.]+)%\\s+([0-9.]+)%`).exec(source);
  if (!match) throw new Error(`missing --${name}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function channel(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((value) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function rgb(h: number, s: number, l: number): [number, number, number] {
  const sat = s / 100;
  const lit = l / 100;
  const a = sat * Math.min(lit, 1 - lit);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return lit - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const left = channel(rgb(...a));
  const right = channel(rgb(...b));
  const [hi, lo] = left > right ? [left, right] : [right, left];
  return (hi + 0.05) / (lo + 0.05);
}

const sample: ItemView = {
  id: 'item-1',
  canonicalKey: 'model:example/demo',
  kind: 'model',
  title: 'Demo model',
  url: 'https://example.com/demo',
  summary: 'A row with no crab.',
  publishedAt: new Date('2026-10-06T00:00:00.000Z'),
  createdAt: new Date('2026-10-06T00:00:00.000Z'),
  lane: 'Tier 1',
  org: 'Example',
  tags: [],
  score: 10,
  modality: 'text',
  sample: true,
  appearances: [],
};

describe('claw palette', () => {
  const dark = block(':root,\n.dark');
  const light = block('.light');

  it('keeps the consulting-site navy, claw red, forest, and sand', () => {
    expect(hsl(dark, 'background')).toEqual([218, 42, 12]);
    expect(hsl(dark, 'foreground')).toEqual([40, 33, 96]);
    expect(hsl(dark, 'primary')).toEqual([4, 63, 54]);
    expect(hsl(dark, 'secondary')).toEqual([150, 33, 27]);
    expect(hsl(dark, 'accent')).toEqual([36, 60, 88]);
    expect(hsl(light, 'background')).toEqual([42, 40, 97]);
    expect(hsl(light, 'primary')).toEqual([4, 72, 42]);
    expect(hsl(light, 'secondary')).toEqual([150, 40, 32]);
  });

  it('keeps body text, links, buttons, and field borders readable', () => {
    for (const source of [dark, light]) {
      expect(contrast(hsl(source, 'foreground'), hsl(source, 'background'))).toBeGreaterThanOrEqual(7);
      expect(contrast(hsl(source, 'muted-foreground'), hsl(source, 'background'))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(hsl(source, 'link'), hsl(source, 'background'))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(hsl(source, 'primary-foreground'), hsl(source, 'button'))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(hsl(source, 'input'), hsl(source, 'background'))).toBeGreaterThanOrEqual(3);
      expect(contrast(hsl(source, 'accent-foreground'), hsl(source, 'accent'))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('stops the shore from drifting when motion is reduced', () => {
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(parallax).toContain('prefers-reduced-motion');
    expect(parallaxShift(400, true)).toBe(0);
    expect(parallaxShift(400, false)).toBeCloseTo(48);
    expect(parallaxShift(5000, false)).toBeCloseTo(144);
  });
});

describe('crab personality', () => {
  it('puts the mark on the hero and wire cards, not on item rows', () => {
    const hero = renderToStaticMarkup(<Hero />);
    expect(hero).toContain(brand.name);
    expect(hero).toContain(brand.mark);
    expect(hero).toContain(brand.tagline);
    expect(hero).toContain('Twice a week');
    expect(hero).toContain('TWICE');
    expect(hero).not.toContain('Every week');
    expect(hero).not.toContain('WEEKLY');

    const cards = renderToStaticMarkup(<ChannelStrip />);
    expect(cards).toContain(brand.mark);
    expect(cards).toContain('Models');
    expect(cards).toContain('Open feed');
    expect(cards).not.toContain('Join t.me/ModelBytes');
    expect(cards).toContain('Repos');

    const row = renderToStaticMarkup(<ItemList items={[sample]} />);
    expect(row).toContain('Demo model');
    expect(row).not.toContain(brand.mark);

    const incident = renderToStaticMarkup(
      <ItemList items={[{ ...sample, kind: 'status', title: 'API incident', sample: false, lane: 'Watch' }]} />,
    );
    expect(incident).toContain('<span class="chip">Status</span>');
    expect(incident).toContain('API incident');

    const empty = renderToStaticMarkup(<ItemList items={[]} empty="Nothing here yet." />);
    expect(empty).toContain(brand.mark);
    expect(empty).toContain('Nothing here yet.');
  });
});
