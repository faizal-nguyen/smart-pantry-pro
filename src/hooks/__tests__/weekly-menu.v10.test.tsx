import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useWeeklyMenu } from '../useWeeklyMenu';
import { fetchUnifiedRecipe } from '@/lib/recipeSource';
import { commandForIntent } from '@/services/stockCommands';

const mockCalls: Array<[string, ...unknown[]]> = [];
let mockPlans: unknown[] = [];
jest.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  mockCalls.push(['from', table]);
  const query: Record<string, unknown> = {};
  for (const name of ['select', 'eq', 'order', 'limit']) query[name] = (...args: unknown[]) => { mockCalls.push([name, ...args]); return query; };
  query.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: mockPlans, error: null }).then(resolve);
  return query;
} } }));
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthSessionOptional: () => ({ user: { id: 'owner' } }) }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/lib/agentEvents', () => ({ useAgentDbInvalidation: jest.fn() }));
jest.mock('@/lib/recipeSource', () => ({ fetchUnifiedRecipe: jest.fn() }));
jest.mock('@/services/stockCommands', () => ({ pendingIntent: jest.fn(async () => null), commandForIntent: jest.fn(), executeStockCommand: jest.fn(), finishIntent: jest.fn() }));

const wrapper = ({ children }: { children: ReactNode }) =>
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>{children}</QueryClientProvider>;
const entry = { id: 'meal', day_of_week: 1, meal_type: 'lunch', recipe_id: null, recipe_reference: { id: 'recipe', source: 'recipes' },
  recipe_name: 'Curry', servings: 4, prep_time: 10, cook_time: 30 };
beforeEach(() => { mockCalls.length = 0; jest.clearAllMocks(); });

// E0: one week held 5 plans; the commands write to the oldest (private.menu_plan_id).
test('the week shows its oldest plan, with each meal’s version and cooking', async () => {
  mockPlans = [{ id: 'oldest', meal_plan_entries: [{ ...entry, version: 2, cooked_command_id: 'command-1' }] }];
  const { result } = renderHook(() => useWeeklyMenu('2026-11-30'), { wrapper });
  await waitFor(() => expect(result.current.data).toBeDefined());
  expect(mockCalls).toEqual(expect.arrayContaining([
    ['order', 'created_at', { ascending: true, nullsFirst: false }], ['order', 'id', { ascending: true }], ['limit', 1]]));
  expect(mockCalls.find(([name]) => name === 'select')?.[1]).toContain('version, cooked_command_id');
  expect(result.current.data).toMatchObject({ meal_plan_id: 'oldest', entries: [{ id: 'meal', version: 2, cooked_command_id: 'command-1' }] });
});

test('a meal read before the migration counts as version 0, not cooked', async () => {
  mockPlans = [{ id: 'plan', meal_plan_entries: [entry] }];
  const { result } = renderHook(() => useWeeklyMenu('2026-11-30'), { wrapper });
  await waitFor(() => expect(result.current.data).toBeDefined());
  expect(result.current.data?.entries[0]).toMatchObject({ version: 0, cooked_command_id: null });
});

test('an empty week has no plan', async () => {
  mockPlans = [];
  const { result } = renderHook(() => useWeeklyMenu('2026-11-30'), { wrapper });
  await waitFor(() => expect(result.current.data).toEqual({ meal_plan_id: null, week_start_date: '2026-11-30', entries: [] }));
});

test('a recipe without base portions is not planned, with a message instead of a schema error', async () => {
  mockPlans = [];
  jest.mocked(fetchUnifiedRecipe).mockResolvedValue({ id: 'recipe', source: 'recipes', servings: null } as never);
  const { result } = renderHook(() => useWeeklyMenu('2026-11-30'), { wrapper });
  await act(async () => {
    await expect(result.current.addEntry.mutateAsync({ recipe_id: 'recipe', day_of_week: 0, meal_type: 'dinner' }))
      .rejects.toThrow('Renseigne les portions de cette recette avant de la planifier.');
  });
  expect(commandForIntent).not.toHaveBeenCalled();
});
