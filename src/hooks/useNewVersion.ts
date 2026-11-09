import { useEffect, useRef, useState } from 'react';
import { CURRENT_BUILD, fetchDeployedBuild } from '@/lib/appVersion';

const CHECK_EVERY_MS = 10 * 60_000;
const MIN_GAP_MS = 60_000;

/**
 * True once another build is deployed. An app kept in memory (an iPhone PWA brought back
 * from the background) otherwise keeps running the old build: iPhone 2026-11-08 showed
 * the home page before #95 until the app was killed. Checked at start, when the app comes
 * back to the foreground or online, and every 10 minutes; at most once a minute.
 */
export function useNewVersion({ current = CURRENT_BUILD, fetchBuild = fetchDeployedBuild }:
  { current?: string; fetchBuild?: () => Promise<string | null> } = {}): boolean {
  const [available, setAvailable] = useState(false);
  const lastCheck = useRef(0);
  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    const check = async () => {
      const now = Date.now();
      if (lastCheck.current && now - lastCheck.current < MIN_GAP_MS) return;
      lastCheck.current = now;
      const deployed = await fetchBuild();
      if (!cancelled && deployed && deployed !== current) setAvailable(true);
    };
    const onReturn = () => { if (document.visibilityState !== 'hidden') void check(); };
    void check();
    const timer = window.setInterval(() => void check(), CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('online', onReturn);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('online', onReturn);
    };
  }, [current, fetchBuild]);
  return available;
}
