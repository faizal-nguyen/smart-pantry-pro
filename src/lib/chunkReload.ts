const STORAGE_KEY = 'chunk-reload-at';
const RELOAD_INTERVAL_MS = 10_000;

/**
 * A tab opened before a deploy still requests the previous build's chunks,
 * which the new deployment no longer serves: reloading loads the current
 * build. Returns false if a reload already happened in the last 10 s, so a
 * chunk missing for good shows the error screen instead of a reload loop.
 */
export function claimChunkReload(storage: Pick<Storage, 'getItem' | 'setItem'>, now = Date.now()): boolean {
  if (now - Number(storage.getItem(STORAGE_KEY) ?? 0) < RELOAD_INTERVAL_MS) return false;
  storage.setItem(STORAGE_KEY, String(now));
  return true;
}
