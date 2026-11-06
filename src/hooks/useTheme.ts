import { useCallback, useEffect, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';
let fallbackTheme: Theme | undefined;
const THEME_EVENT = 'smart-pantry-theme-change';
function readTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { if (fallbackTheme) return fallbackTheme; }
  // Kitchen OS starts in the approved light theme until a person chooses otherwise.
  return 'light';
}
function subscribe(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => { if (event.key === 'theme' || event.key === null) listener(); };
  window.addEventListener(THEME_EVENT, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(THEME_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}
function setSharedTheme(theme: Theme) {
  fallbackTheme = theme;
  try { localStorage.setItem('theme', theme); } catch { /* Private browsing can restrict storage. */ }
  window.dispatchEvent(new Event(THEME_EVENT));
}

/** Every shell, Material theme and notification host observes the same preference. */
export const useTheme = () => {
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'light' as Theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1a1a1a' : '#f8f5ef');
  }, [theme]);
  const toggleTheme = useCallback(() => setSharedTheme(readTheme() === 'dark' ? 'light' : 'dark'), []);
  return { theme, setTheme: setSharedTheme, toggleTheme };
};
