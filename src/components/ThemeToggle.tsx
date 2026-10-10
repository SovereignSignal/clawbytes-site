'use client';

import { useEffect } from 'react';

const STORAGE_KEY = 'clawbytes-theme';
const DARK = '#121b2b';
const LIGHT = '#faf9f4';

function applyTheme(light: boolean) {
  document.documentElement.classList.toggle('light', light);
  document.documentElement.classList.toggle('dark', !light);
  const color = light ? LIGHT : DARK;
  document.querySelectorAll('meta[name="theme-color"]').forEach((node) => {
    node.setAttribute('content', color);
  });
}

export function ThemeToggle() {
  useEffect(() => {
    applyTheme(document.documentElement.classList.contains('light'));
  }, []);

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="Toggle color theme"
      onClick={() => {
        const next = !document.documentElement.classList.contains('light');
        applyTheme(next);
        try {
          localStorage.setItem(STORAGE_KEY, next ? 'light' : 'dark');
        } catch {
          /* Private mode can block storage. The class still updates. */
        }
      }}
    >
      <span className="theme-icon theme-icon-sun" aria-hidden="true">
        <SunIcon />
      </span>
      <span className="theme-icon theme-icon-moon" aria-hidden="true">
        <MoonIcon />
      </span>
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.2 3.2l1.3 1.3M11.5 11.5l1.3 1.3M12.8 3.2l-1.3 1.3M4.5 11.5l-1.3 1.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M9.2 1.6a5.6 5.6 0 1 0 5.2 7.6A4.6 4.6 0 0 1 9.2 1.6Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
