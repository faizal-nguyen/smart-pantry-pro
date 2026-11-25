import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthenticatedUser } from './useAuthenticatedUser';
import { useAgentDbInvalidation } from '@/lib/agentEvents';
import { deleteWasteEvent, readWasteLog } from '@/services/wasteLog';
import type { WasteEvent } from '@/lib/wasteSummary';

export type WasteLogStatus = 'loading' | 'error' | 'ready';
const WATCHED = ['food_waste_events'] as const;

export interface WasteLogState {
  status: WasteLogStatus;
  /** Empty until a complete read: a loading or failed read never shows as « no loss ». */
  events: WasteEvent[];
  /** Reads the log again; the section stays in its loading state meanwhile. */
  retry: () => Promise<void>;
  /** Deletes one declaration, drops it from the figures and reads the log again; rejects when the deletion fails. */
  remove: (id: string) => Promise<void>;
}

/** The declared losses of the account, kept current when a loss is declared elsewhere in the app. */
export function useWasteLog(): WasteLogState {
  const { id: owner } = useAuthenticatedUser();
  const [state, setState] = useState<{ status: WasteLogStatus; events: WasteEvent[] }>({ status: 'loading', events: [] });
  const latest = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true; // StrictMode mounts twice: the second mount must count
    return () => { mounted.current = false; };
  }, []);

  /** A quiet read keeps the figures on screen until the answer; only its failure changes them. */
  const load = useCallback(async (quiet = false) => {
    const request = ++latest.current;
    if (!quiet) setState({ status: 'loading', events: [] });
    try {
      const events = await readWasteLog(owner);
      if (mounted.current && request === latest.current) setState({ status: 'ready', events });
    } catch {
      if (mounted.current && request === latest.current) setState({ status: 'error', events: [] });
    }
  }, [owner]);

  useEffect(() => { void load(); }, [load]);
  const refresh = useCallback(() => load(true), [load]);
  useAgentDbInvalidation(WATCHED, refresh);

  const retry = useCallback(() => load(), [load]);
  const remove = useCallback(async (id: string) => {
    await deleteWasteEvent(owner, id);
    if (!mounted.current) return;
    setState(current => ({ ...current, events: current.events.filter(event => event.id !== id) }));
    // A fresh read supersedes any read started before the deletion (which could bring the row
    // back, or carry a loss declared meanwhile), and shows the row again if it was not deleted.
    void load(true);
  }, [owner, load]);

  return { ...state, retry, remove };
}
