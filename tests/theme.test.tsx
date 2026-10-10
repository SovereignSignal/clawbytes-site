import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ThemeToggle } from '@/components/ThemeToggle';
import { THEME_STORAGE_KEY, themeBootScript, themeChoiceFromStorage } from '@/lib/theme';

function boot(stored: string | null): Set<string> {
  const classes = new Set<string>(['font']);
  runInNewContext(themeBootScript, {
    localStorage: { getItem: () => stored },
    document: {
      documentElement: {
        classList: {
          remove(...names: string[]) {
            for (const name of names) classes.delete(name);
          },
          add(name: string) {
            classes.add(name);
          },
        },
      },
    },
  });
  return classes;
}

function customProps(source: string, selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`${escaped}\\s*\\{([^}]+)\\}`).exec(source);
  const props: Record<string, string> = {};
  for (const entry of match?.[1].matchAll(/--([a-z0-9-]+):\s*([^;]+);/g) ?? []) {
    props[entry[1]] = entry[2].trim();
  }
  return props;
}

describe('theme', () => {
  it('follows the system unless light or dark was stored', () => {
    expect(themeChoiceFromStorage(null)).toBe('system');
    expect(themeChoiceFromStorage('system')).toBe('system');
    expect(themeChoiceFromStorage('nope')).toBe('system');
    expect(boot(null).has('light')).toBe(false);
    expect(boot(null).has('dark')).toBe(false);
    expect(boot('system').has('dark')).toBe(false);
    expect([...boot('light')]).toContain('light');
    expect([...boot('dark')]).toContain('dark');
    expect(boot('light').has('dark')).toBe(false);
    expect(themeBootScript).toContain(THEME_STORAGE_KEY);
  });

  it('offers System, Light, and Dark, with System pressed by default', () => {
    const html = renderToStaticMarkup(<ThemeToggle />);
    expect(html).toContain('Color theme');
    expect(html).toContain('System');
    expect(html).toContain('Light');
    expect(html).toContain('Dark');
    expect(html).toContain('aria-pressed="true"');
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-pressed="true"[^>]*>System/);
  });

  it('uses the same light palette for the OS and the Light override', () => {
    const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
    expect(css).toContain('prefers-color-scheme: light');
    const forced = customProps(css, '.light');
    const system = customProps(css, ':root:not(.dark):not(.light)');
    expect(system).toEqual(forced);
    expect(forced.background).toBe('42 40% 97%');
    expect(forced.primary).toBe('4 72% 42%');
  });
});
