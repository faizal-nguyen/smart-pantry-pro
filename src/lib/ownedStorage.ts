import { useCallback, useSyncExternalStore } from 'react';
const EVENT = 'pantry-routine-storage';
export function readOwnedValue<T>(owner: string, name: string, fallback: T): T {
  const value = localStorage.getItem(`v10-routine:${owner}:${name}`);
  return value ? JSON.parse(value) as T : fallback;
}
export function writeOwnedValue(owner: string, name: string, value: unknown): void {
  const key = `v10-routine:${owner}:${name}`, encoded = JSON.stringify(value);
  try { localStorage.setItem(key,encoded); if (localStorage.getItem(key) !== encoded) throw new Error(); }
  catch { throw new Error('Impossible de conserver cette saisie sur cet appareil. Aucune action n’a été envoyée.'); }
  window.dispatchEvent(new Event(EVENT));
}
export function removeOwnedValue(owner:string,name:string) {
  localStorage.removeItem(`v10-routine:${owner}:${name}`); window.dispatchEvent(new Event(EVENT));
}
function subscribe(listener: () => void) {
  window.addEventListener(EVENT,listener); window.addEventListener('storage',listener);
  return () => { window.removeEventListener(EVENT,listener); window.removeEventListener('storage',listener); };
}
export function useOwnedValue<T>(owner: string, name: string, fallback: T): [T,(value: T) => void,string | null] {
  const key = `v10-routine:${owner}:${name}`;
  const get = useCallback(() => { try { return localStorage.getItem(key); } catch { return '!unavailable'; } },[key]);
  const raw = useSyncExternalStore(subscribe,get,() => null);
  let value = fallback, error: string | null = null;
  try { if (raw) value = JSON.parse(raw) as T; } catch { error = 'La saisie enregistrée est illisible ou inaccessible. Elle reste conservée.'; }
  return [value,useCallback((next: T) => writeOwnedValue(owner,name,next),[owner,name]),error];
}
