export const THEME_STORAGE_KEY = 'clawbytes-theme';
export const THEME_LIGHT = '#faf9f4';
export const THEME_DARK = '#121b2b';

export type ThemeChoice = 'system' | 'light' | 'dark';

export function themeChoiceFromStorage(stored: string | null): ThemeChoice {
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

/** Runs before paint. System leaves the class off so CSS follows the OS. */
export const themeBootScript = `(function(){try{var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var r=document.documentElement;r.classList.remove("light","dark");if(s==="light"||s==="dark")r.classList.add(s);}catch(e){}})();`;
