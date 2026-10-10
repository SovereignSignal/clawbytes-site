import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Hero } from '@/components/Hero';
import { CRAB_ART, CRAB_HEIGHT, CRAB_WIDTH, PixelCrab } from '@/components/PixelCrab';
import { brand } from '@/config/brand';

describe('pixel crab', () => {
  it('is one symmetric sprite with claws, eye stalks, a body, and legs', () => {
    expect(CRAB_ART).toHaveLength(CRAB_HEIGHT);
    for (const row of CRAB_ART) {
      expect(row).toHaveLength(CRAB_WIDTH);
      expect([...row].reverse().join('')).toBe(row);
    }
    const flat = CRAB_ART.join('');
    expect(flat).toContain('E');
    expect(flat).toContain('D');
    expect(flat).toContain('R');
    const eyes = CRAB_ART.findIndex((row) => row.includes('E'));
    const body = CRAB_ART.findIndex((row) => row.includes('RRRR'));
    const legs = CRAB_ART.findLastIndex((row) => row.includes('R.R'));
    expect(eyes).toBeGreaterThan(0);
    expect(body).toBeGreaterThan(eyes);
    expect(legs).toBeGreaterThan(body);
  });

  it('draws that sprite for the logo and the shore, and keeps the emoji', () => {
    const logo = renderToStaticMarkup(<PixelCrab size={40} />);
    const hero = renderToStaticMarkup(<Hero />);
    expect(logo).toContain('shape-rendering="crispEdges"');
    expect(logo).toContain('hsl(var(--primary))');
    expect(logo).toContain('hsl(var(--crab-shade))');
    expect(logo).toContain('hsl(var(--crab-eye))');
    expect(hero).toContain('shape-rendering="crispEdges"');
    expect(hero).toContain('hsl(var(--crab-eye))');
    expect(hero.match(/hsl\(var\(--crab-eye\)\)/g)).toHaveLength(logo.match(/hsl\(var\(--crab-eye\)\)/g)?.length ?? 0);
    expect(hero).toContain(brand.mark);
    expect(logo).not.toContain(brand.mark);
  });

  it('uses the same cells in the favicon', () => {
    const svg = readFileSync(join(process.cwd(), 'src/app/icon.svg'), 'utf8');
    expect(svg).toContain('shape-rendering="crispEdges"');
    CRAB_ART.forEach((row, y) => {
      [...row].forEach((cell, x) => {
        if (cell === '.') return;
        expect(svg).toContain(`<rect x="${x}" y="${y}" width="1" height="1"`);
      });
    });
  });
});
