import { act, renderHook, waitFor } from '@testing-library/react';
import type { WeekProposal } from '@smart/shared';
import { useWeekProposal } from '../useWeekProposal';
import { fetchWeekProposal } from '@/services/weekProposal';

// V11-01 E4b: the state of « Proposer la semaine »: one request at a time, choices kept, nothing written.
jest.mock('@/lib/api', () => ({ ApiError: class extends Error {
  status: number; code?: string;
  constructor(message: string, options: { status: number; code?: string }) { super(message); this.status = options.status; this.code = options.code; }
} }));
jest.mock('@/services/weekProposal', () => ({ fetchWeekProposal: jest.fn() }));
const { ApiError } = jest.requireMock('@/lib/api') as { ApiError: new (message: string, options: { status: number; code?: string }) => Error };

const OWNER = '00000000-0000-4000-8000-000000000001';
const WEEK = '2026-11-30';
const R = (id: string) => ({ id, source: 'recipes_catalog' as const });
const later = new Date(Date.now() + 20 * 60_000).toISOString();
const filled = (date: string, id: string, status: 'proposed' | 'kept' = 'proposed') => ({ date, meal_type: 'dinner' as const, status,
  recipe: { reference: R(id), name: `Recette ${id}`, image_url: null, duration_minutes: 30, servings: 2 }, reasons: [`Pour ${id}`], availability: 'in_stock' as const, missing: [] });
const proposal = (slots: WeekProposal['slots'], expires_at = later): WeekProposal => ({ proposal_id: 'b'.repeat(32), week_start: WEEK,
  calculated_at: new Date().toISOString(), expires_at, menu_version: 'a'.repeat(32), context_revision: 1, profile_version: 3, slots });
const slots = ['2026-12-01', '2026-12-02', '2026-12-03'].map(date => ({ date, meal_type: 'dinner' as const }));
const first = proposal([filled('2026-12-01', 'a'), filled('2026-12-02', 'b'), { date: '2026-12-03', meal_type: 'dinner', status: 'empty', cause: 'POOL_EXHAUSTED' }]);
const keys = (value: WeekProposal | null) => value?.slots.map(slot => slot.status === 'empty' ? `${slot.date}:-` : `${slot.date}:${slot.recipe.reference.id}`);

beforeEach(() => { jest.clearAllMocks(); sessionStorage.clear(); });

test('a proposal is asked for the chosen slots, then kept for this account and week until it expires', async () => {
  jest.mocked(fetchWeekProposal).mockResolvedValueOnce(first);
  const { result, unmount } = renderHook(() => useWeekProposal(OWNER, WEEK));
  await act(async () => { await result.current.propose(slots); });
  expect(fetchWeekProposal).toHaveBeenCalledWith(OWNER, { week_start: WEEK, slots }, expect.any(AbortSignal));
  expect(keys(result.current.proposal)).toEqual(['2026-12-01:a', '2026-12-02:b', '2026-12-03:-']);
  unmount();
  // Back from a recipe: the proposal is still there.
  const again = renderHook(() => useWeekProposal(OWNER, WEEK));
  expect(keys(again.result.current.proposal)).toEqual(['2026-12-01:a', '2026-12-02:b', '2026-12-03:-']);
  again.unmount();
  sessionStorage.setItem(`v11-week-proposal:${OWNER}:${WEEK}`, JSON.stringify({ ...JSON.parse(sessionStorage.getItem(`v11-week-proposal:${OWNER}:${WEEK}`)!),
    proposal: { ...first, expires_at: new Date(Date.now() - 1000).toISOString() } }));
  expect(renderHook(() => useWeekProposal(OWNER, WEEK)).result.current.proposal).toBeNull();
});

test('« Autre recette » asks for that slot only; the other slots stay, left-empty ones too, and the old recipe is set aside', async () => {
  jest.mocked(fetchWeekProposal).mockResolvedValueOnce(first)
    .mockResolvedValueOnce(proposal([filled('2026-12-01', 'a', 'kept'), filled('2026-12-02', 'c')]));
  const { result } = renderHook(() => useWeekProposal(OWNER, WEEK));
  await act(async () => { await result.current.propose(slots); });
  act(() => result.current.clear('2026-12-01:dinner'));
  // A slot left empty is not kept by the server, but stays on screen to be put back.
  jest.mocked(fetchWeekProposal).mockReset();
  jest.mocked(fetchWeekProposal).mockResolvedValueOnce(proposal([filled('2026-12-02', 'c')]));
  await act(async () => { await result.current.replace('2026-12-02:dinner'); });
  expect(fetchWeekProposal).toHaveBeenCalledWith(OWNER, expect.objectContaining({ slots: [{ date: '2026-12-02', meal_type: 'dinner' }], keep: [], avoid: [R('b'), R('a')] }), expect.any(AbortSignal));
  expect(keys(result.current.proposal)).toEqual(['2026-12-01:a', '2026-12-02:c', '2026-12-03:-']);
  expect(result.current.cleared).toEqual(['2026-12-01:dinner']);
  act(() => result.current.restore('2026-12-01:dinner'));
  expect(result.current.cleared).toEqual([]);
  // Only the replaced recipe stays set aside: the one left empty may still come back with « Remettre ».
  expect(result.current.avoid).toEqual([R('b')]);
});

test('one request at a time: a newer one cancels the older, whose answer is never shown', async () => {
  let release: (value: WeekProposal) => void = () => undefined;
  jest.mocked(fetchWeekProposal).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }))
    .mockResolvedValueOnce(proposal([filled('2026-12-01', 'z')]));
  const { result } = renderHook(() => useWeekProposal(OWNER, WEEK));
  let older: Promise<void> = Promise.resolve();
  act(() => { older = result.current.propose(slots); });
  const signal = jest.mocked(fetchWeekProposal).mock.calls[0][2]!;
  await act(async () => { await result.current.propose([slots[0]]); });
  expect(signal.aborted).toBe(true);
  await act(async () => { release(first); await older; });
  expect(keys(result.current.proposal)).toEqual(['2026-12-01:z']);
});

test('a refusal or a limit reached is said, and the proposal shown stays', async () => {
  jest.mocked(fetchWeekProposal).mockResolvedValueOnce(first).mockRejectedValueOnce(new ApiError('Trop de demandes d’un coup. Réessaie dans une minute.', { status: 429 }));
  const { result } = renderHook(() => useWeekProposal(OWNER, WEEK));
  await act(async () => { await result.current.propose(slots); });
  await act(async () => { await result.current.replace('2026-12-01:dinner'); });
  expect(result.current.error).toBe('Trop de demandes d’un coup. Réessaie dans une minute.');
  expect(keys(result.current.proposal)).toEqual(['2026-12-01:a', '2026-12-02:b', '2026-12-03:-']);
  expect(result.current.busySlot).toBeNull();
});

test('recomputing keeps every choice, drops the slots taken since, and keeps the reasons', async () => {
  jest.mocked(fetchWeekProposal).mockResolvedValueOnce(first)
    .mockResolvedValueOnce(proposal([{ ...filled('2026-12-02', 'b', 'kept'), reasons: [] }]));
  const { result } = renderHook(() => useWeekProposal(OWNER, WEEK));
  await act(async () => { await result.current.propose(slots); });
  await act(async () => { await result.current.refresh(['2026-12-01:dinner']); });
  expect(fetchWeekProposal).toHaveBeenLastCalledWith(OWNER, expect.objectContaining({ slots: [], keep: [expect.objectContaining({ date: '2026-12-02' })] }), expect.any(AbortSignal));
  expect(keys(result.current.proposal)).toEqual(['2026-12-02:b', '2026-12-03:-']);
  await waitFor(() => expect(result.current.proposal?.slots[0]).toMatchObject({ reasons: ['Pour b'] }));
  act(() => result.current.reset());
  expect(result.current.proposal).toBeNull();
  expect(sessionStorage.getItem(`v11-week-proposal:${OWNER}:${WEEK}`)).toBeNull();
});

// Review of E4b.
test('a kept proposal of another shape (an older version, a broken write) is ignored, never a crash', () => {
  for (const broken of ['{', JSON.stringify({ proposal: { expires_at: later } }), JSON.stringify({ settings: {}, proposal: first, cleared: 'x', avoid: [] })]) {
    sessionStorage.setItem(`v11-week-proposal:${OWNER}:${WEEK}`, broken);
    expect(renderHook(() => useWeekProposal(OWNER, WEEK)).result.current.proposal).toBeNull();
  }
});

test('« Autre recette » that finds nothing keeps the recipe there, and says so', async () => {
  jest.mocked(fetchWeekProposal).mockResolvedValueOnce(first)
    .mockResolvedValueOnce(proposal([{ date: '2026-12-01', meal_type: 'dinner', status: 'empty', cause: 'POOL_EXHAUSTED' }]));
  const { result } = renderHook(() => useWeekProposal(OWNER, WEEK));
  await act(async () => { await result.current.propose(slots); });
  await act(async () => { await result.current.replace('2026-12-01:dinner'); });
  expect(keys(result.current.proposal)).toEqual(['2026-12-01:a', '2026-12-02:b', '2026-12-03:-']);
  expect(result.current.avoid).toEqual([]);
  expect(result.current.info).toBe('Pas d’autre recette pour ce créneau : « Recette a » reste proposée.');
});

test('a refusal keeps its code, for the page to reread the menu', async () => {
  jest.mocked(fetchWeekProposal).mockRejectedValueOnce(new ApiError('Ce repas a changé dans le menu entre-temps.', { status: 409, code: 'MENU_CHANGED' }));
  const { result } = renderHook(() => useWeekProposal(OWNER, WEEK));
  await act(async () => { await result.current.propose(slots); });
  expect([result.current.error, result.current.errorCode]).toEqual(['Ce repas a changé dans le menu entre-temps.', 'MENU_CHANGED']);
});
