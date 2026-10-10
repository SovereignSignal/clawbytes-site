'use client';

import { useLayoutEffect, useState } from 'react';
import { THEME_DARK, THEME_LIGHT, THEME_STORAGE_KEY, themeChoiceFromStorage, type ThemeChoice } from '@/lib/theme';

const CHOICES: Array<{ id: ThemeChoice; label: string }> = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

function readStored(): string | null {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(choice: ThemeChoice) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    /* Private mode can block storage. The class still updates. */
  }
}

function paintThemeColor(choice: ThemeChoice) {
  document.querySelectorAll('meta[name="theme-color"]').forEach((node) => {
    const media = node.getAttribute('media') ?? '';
    const content =
      choice === 'light' ? THEME_LIGHT : choice === 'dark' ? THEME_DARK : media.includes('light') ? THEME_LIGHT : THEME_DARK;
    node.setAttribute('content', content);
  });
}

export function applyThemeChoice(choice: ThemeChoice) {
  document.documentElement.classList.toggle('light', choice === 'light');
  document.documentElement.classList.toggle('dark', choice === 'dark');
  paintThemeColor(choice);
}

export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>('system');

  useLayoutEffect(() => {
    const sync = () => {
      const next = themeChoiceFromStorage(readStored());
      setChoice(next);
      applyThemeChoice(next);
    };
    sync();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onMedia = () => {
      if (themeChoiceFromStorage(readStored()) === 'system') applyThemeChoice('system');
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) sync();
    };
    media.addEventListener('change', onMedia);
    window.addEventListener('storage', onStorage);
    return () => {
      media.removeEventListener('change', onMedia);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return (
    <div className="theme-switch" role="group" aria-label="Color theme">
      {CHOICES.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className="theme-choice"
          aria-pressed={choice === entry.id}
          onClick={() => {
            setChoice(entry.id);
            applyThemeChoice(entry.id);
            writeStored(entry.id);
          }}
        >
          {entry.label}
        </button>
      ))}
    </div>
  );
}
