import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRecipeEvaluation } from '../useRecipeEvaluation';
import { postRecipeEvaluation } from '@/services/recommendationsApi';
import type { RecipeEvaluation } from '@smart/shared';
let mockOwner = '00000000-0000-4000-8000-000000000001', mockVersion = 1;
const ID = '10000000-0000-4000-8000-000000000001';
const mockProfileReload = jest.fn(async () => undefined);
const mockCallbacks: Record<string, () => void> = {};
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthSessionOptional: () => ({ user: { id: mockOwner } }) }));
jest.mock('@/hooks/useNutritionProfile', () => ({ useNutritionProfile: () => ({ data: { profile: { version: mockVersion } }, refetch: mockProfileReload, isLoading: false }) }));
jest.mock('@/hooks/usePersonalization', () => ({ usePersonalization: () => ({ personalizationData: { dietaryPreferences: [] } }) }));
jest.mock('@/services/recommendationsApi', () => ({ postRecipeEvaluation: jest.fn() }));
jest.mock('@/lib/agentEvents', () => ({ useAgentDbInvalidation: () => undefined }));
jest.mock('@/integrations/supabase/client', () => ({ supabase: { channel: () => {
  const channel = { on: (_event: unknown, filter: { table: string }, callback: () => void) => { mockCallbacks[filter.table] = callback; return channel; }, subscribe: () => channel }; return channel;
}, removeChannel: jest.fn() } }));
const reference = { id: ID, source: 'recipes' as const };
const result = (servings: number, version = mockVersion) => ({ reference, servings, profile_version: version } as RecipeEvaluation);
function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}
beforeEach(() => { jest.clearAllMocks(); mockOwner = '00000000-0000-4000-8000-000000000001'; mockVersion = 1; });
test('a late response for old portions cannot overwrite the current portions', async () => {
  let resolveOld!: (value: RecipeEvaluation) => void;
  jest.mocked(postRecipeEvaluation).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; })).mockResolvedValueOnce(result(4));
  const hook = renderHook(({ servings }) => useRecipeEvaluation(reference, servings, 'v1'), { initialProps: { servings: 2 }, wrapper });
  await waitFor(() => expect(postRecipeEvaluation).toHaveBeenCalledTimes(1));
  hook.rerender({ servings: 4 }); await waitFor(() => expect(hook.result.current.data?.servings).toBe(4));
  await act(async () => { resolveOld(result(2)); });
  expect(hook.result.current.data?.servings).toBe(4);
});
test('account changes discard a pending response; stock and recipe notifications refresh authoritative evidence', async () => {
  let resolveOld!: (value: RecipeEvaluation) => void;
  jest.mocked(postRecipeEvaluation).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; })).mockImplementation(async input => result(input.servings));
  const hook = renderHook(() => useRecipeEvaluation(reference, 2, 'v1'), { wrapper });
  await waitFor(() => expect(postRecipeEvaluation).toHaveBeenCalledTimes(1));
  mockOwner = '00000000-0000-4000-8000-000000000002'; hook.rerender();
  await waitFor(() => expect(postRecipeEvaluation).toHaveBeenCalledTimes(2));
  await act(async () => { resolveOld(result(99)); });
  await waitFor(() => expect(hook.result.current.data?.servings).toBe(2));
  await act(async () => mockCallbacks.inventory()); await waitFor(() => expect(postRecipeEvaluation).toHaveBeenCalledTimes(3));
  await act(async () => mockCallbacks.recipe_ingredients()); await waitFor(() => expect(postRecipeEvaluation).toHaveBeenCalledTimes(4));
  expect(jest.mocked(postRecipeEvaluation).mock.calls[3][1]).toBe(mockOwner);
});
test('a profile version mismatch masks evidence and reloads the profile', async () => {
  jest.mocked(postRecipeEvaluation).mockResolvedValue(result(2, 2));
  const hook = renderHook(() => useRecipeEvaluation(reference, 2, 'v1'), { wrapper });
  await waitFor(() => expect(hook.result.current.error).toBeTruthy());
  expect(hook.result.current.data).toBeUndefined(); expect(mockProfileReload).toHaveBeenCalled();
});
