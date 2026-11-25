import { useCallback, useEffect, useRef, useState } from 'react';
import { menuSlotKey, RecipeReferenceSchema, WeekProposalSchema, type RecipeReference, type WeekProposal } from '@smart/shared';
import { fetchWeekProposal } from '@/services/weekProposal';
import {
  DEFAULT_PROPOSAL_SETTINGS, initialRequest, isFilled, mergeReasons, refreshRequest, replaceRequest, setAside,
  type ProposalSettings, type ProposalSlot,
} from '@/lib/weekProposal';

interface Saved { settings: ProposalSettings; proposal: WeekProposal | null; cleared: string[]; avoid: RecipeReference[] }

const storageKey = (owner: string, week: string) => `v11-week-proposal:${owner}:${week}`;
const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
const byMoment = (a: { date: string; meal_type: string }, b: { date: string; meal_type: string }) =>
  a.date.localeCompare(b.date) || MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type);

const isSettings = (value: unknown): value is ProposalSettings => {
  const settings = value as Partial<ProposalSettings> | null;
  return !!settings && Array.isArray(settings.meals) && settings.meals.every(meal => meal === 'lunch' || meal === 'dinner')
    && (settings.servings === null || Number.isInteger(settings.servings)) && (settings.timeLimitMinutes === null || Number.isInteger(settings.timeLimitMinutes))
    && typeof settings.excluded === 'string';
};

/**
 * Back from a recipe, or after a reload: the proposal of this account and week, while it is valid.
 * Whatever was kept is checked again (an older version, a broken write): anything else is ignored.
 */
function restore(owner: string, week: string): Saved | null {
  try {
    const raw = sessionStorage.getItem(storageKey(owner, week));
    const saved = raw ? JSON.parse(raw) as Partial<Saved> : null;
    const proposal = WeekProposalSchema.safeParse(saved?.proposal);
    if (!saved || !proposal.success || proposal.data.week_start !== week || !(Date.parse(proposal.data.expires_at) > Date.now())) return null;
    if (!isSettings(saved.settings) || !Array.isArray(saved.cleared) || !saved.cleared.every(key => typeof key === 'string')) return null;
    const avoid = Array.isArray(saved.avoid) ? saved.avoid.filter(recipe => RecipeReferenceSchema.safeParse(recipe).success) : [];
    return { settings: saved.settings, proposal: proposal.data, cleared: saved.cleared, avoid };
  } catch { return null; }
}

/**
 * A partial answer (one slot asked again, or every choice kept) names only those slots: the others
 * of the screen (left empty, or empty with their cause) are carried over, unless taken since.
 */
function carryOver(previous: WeekProposal | null, next: WeekProposal, taken: string[] = []): WeekProposal {
  if (!previous) return next;
  const named = new Set(next.slots.map(menuSlotKey));
  const kept = previous.slots.filter(slot => !named.has(menuSlotKey(slot)) && !taken.includes(menuSlotKey(slot)));
  return mergeReasons(previous, { ...next, slots: [...next.slots, ...kept].sort(byMoment) });
}

/**
 * V11-01 E4b — « Proposer la semaine »: the settings, the proposal and the choices made on it. One
 * request at a time (a newer one cancels the older); nothing is written until the page validates it.
 */
export function useWeekProposal(owner: string, week: string) {
  const [saved] = useState(() => restore(owner, week));
  const [settings, setSettings] = useState<ProposalSettings>(saved?.settings ?? DEFAULT_PROPOSAL_SETTINGS);
  const [proposal, setProposal] = useState<WeekProposal | null>(saved?.proposal ?? null);
  const [cleared, setCleared] = useState<string[]>(saved?.cleared ?? []);
  const [avoid, setAvoid] = useState<RecipeReference[]>(saved?.avoid ?? []);
  const [loading, setLoading] = useState(false);
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** The refusal's code (MENU_CHANGED: the page rereads the menu). */
  const [errorCode, setErrorCode] = useState<string | null>(null);
  /** A word that is not an error (« Autre recette » found nothing). */
  const [info, setInfo] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const current = useRef<WeekProposal | null>(proposal);
  current.current = proposal;

  useEffect(() => {
    try {
      if (proposal) sessionStorage.setItem(storageKey(owner, week), JSON.stringify({ settings, proposal, cleared, avoid } satisfies Saved));
    } catch { /* A private window keeps the proposal for this visit only. */ }
  }, [owner, week, settings, proposal, cleared, avoid]);
  useEffect(() => () => controller.current?.abort(), []);

  /** Sends one request; an older one still running is cancelled and its answer never shown. */
  const request = useCallback(async (send: (signal: AbortSignal) => Promise<WeekProposal>, apply: (next: WeekProposal) => void, slot: string | null) => {
    controller.current?.abort();
    const mine = new AbortController();
    controller.current = mine;
    setLoading(true); setBusySlot(slot); setError(null); setErrorCode(null); setInfo(null);
    try {
      const next = await send(mine.signal);
      if (!mine.signal.aborted) apply(next);
    } catch (failure) {
      if (mine.signal.aborted) return;
      setError(failure instanceof Error ? failure.message : 'La proposition n’a pas pu être calculée. Réessaie.');
      const code = (failure as { code?: unknown } | null)?.code;
      setErrorCode(typeof code === 'string' ? code : null);
    } finally {
      if (controller.current === mine) { setLoading(false); setBusySlot(null); controller.current = null; }
    }
  }, []);

  const propose = useCallback((slots: ProposalSlot[]) => request(
    signal => fetchWeekProposal(owner, initialRequest(week, slots, settings), signal),
    next => { setProposal(next); setCleared([]); setAvoid([]); }, null), [request, owner, week, settings]);

  /** « Autre recette » : that slot again, the others kept, the recipe it had set aside. */
  const replace = useCallback((slotKey: string) => {
    const shown = current.current;
    if (!shown) return Promise.resolve();
    const next = replaceRequest(week, settings, shown, slotKey, cleared.filter(key => key !== slotKey), avoid);
    const before = shown.slots.find(item => menuSlotKey(item) === slotKey);
    return request(signal => fetchWeekProposal(owner, next, signal), answer => {
      const asked = answer.slots.find(item => menuSlotKey(item) === slotKey);
      // Nothing else for that slot: its recipe stays, rather than an empty slot nothing can bring back.
      if (before && isFilled(before) && asked?.status === 'empty') {
        setProposal(carryOver(shown, { ...answer, slots: answer.slots.map(item => menuSlotKey(item) === slotKey ? before : item) }));
        setInfo(`Pas d’autre recette pour ce créneau : « ${before.recipe.name} » reste proposée.`);
        return;
      }
      setProposal(carryOver(shown, answer));
      setCleared(keys => keys.filter(key => key !== slotKey));
      setAvoid(previous => setAside(previous, ...(before && isFilled(before) ? [before.recipe.reference] : [])));
    }, slotKey);
  }, [request, owner, week, settings, cleared, avoid]);

  const clear = useCallback((slotKey: string) => setCleared(keys => keys.includes(slotKey) ? keys : [...keys, slotKey]), []);
  const restoreSlot = useCallback((slotKey: string) => setCleared(keys => keys.filter(key => key !== slotKey)), []);

  /** Expired or refused: every choice kept, the slots taken since dropped; nothing left to keep says so. */
  const refresh = useCallback((taken: string[]) => {
    const shown = current.current;
    if (!shown) return Promise.resolve();
    const next = refreshRequest(week, settings, shown, cleared, avoid, taken);
    if (!next) {
      setProposal(null); setCleared([]);
      setError('Plus aucun choix à garder : propose à nouveau la semaine.');
      return Promise.resolve();
    }
    return request(signal => fetchWeekProposal(owner, next, signal), answer => {
      setProposal(carryOver(shown, answer, taken));
      setCleared(keys => keys.filter(key => !taken.includes(key)));
    }, null);
  }, [request, owner, week, settings, cleared, avoid]);

  /** After validation (or to start over): nothing kept for this week. */
  const reset = useCallback(() => {
    controller.current?.abort();
    setProposal(null); setCleared([]); setAvoid([]); setError(null); setErrorCode(null); setInfo(null);
    try { sessionStorage.removeItem(storageKey(owner, week)); } catch { /* Nothing was kept. */ }
  }, [owner, week]);

  return { settings, setSettings, proposal, cleared, avoid, loading, busySlot, error, errorCode, info, propose, replace, clear, restore: restoreSlot, refresh, reset };
}
