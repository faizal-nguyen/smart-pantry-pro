import { act, renderHook } from '@testing-library/react';
import { usePersonalization } from '../usePersonalization';
let mockOwner: string | null = 'A';
jest.mock('../useAuthenticatedUser', () => ({ useAuthSessionOptional: () => ({ user: mockOwner ? { id: mockOwner } : null, isLoading: false }) }));
beforeEach(() => { localStorage.clear(); mockOwner = 'A'; });
test('preferences update all observers, survive reload and are never inherited by B', () => {
  localStorage.setItem('smart-pantry-personalization',JSON.stringify({ householdSize: 'unowned private data' }));
  const { result,rerender,unmount } = renderHook(() => [usePersonalization(),usePersonalization()]);
  expect(result.current[0].personalizationData).toBeNull();
  expect(result.current[0].hasUnassignedLegacyPreferences).toBe(true);
  act(() => result.current[0].updatePersonalizationData({ householdSize: 'Solo',dietaryPreferences: ['vegan'] }));
  expect(result.current[1].personalizationData?.dietaryPreferences).toEqual(['vegan']);
  mockOwner = 'B'; rerender();
  expect(result.current[0].personalizationData).toBeNull();
  act(() => result.current[0].updatePersonalizationData({ householdSize: '2 personnes' }));
  expect(localStorage.getItem('v10-personalization:A:cooking')).toContain('vegan');
  expect(localStorage.getItem('v10-personalization:B:cooking')).not.toContain('vegan');
  mockOwner = 'A'; unmount();
  const reconnected = renderHook(() => usePersonalization());
  expect(reconnected.result.current.personalizationData?.dietaryPreferences).toEqual(['vegan']);
  expect(localStorage.getItem('smart-pantry-personalization')).toContain('unowned private data');
});
test('storage refusal never announces a preference update or erases existing data', () => {
  const { result } = renderHook(() => usePersonalization());
  const write = jest.spyOn(Storage.prototype,'setItem').mockImplementation(() => { throw new Error('Quota'); });
  expect(() => result.current.updatePersonalizationData({ householdSize: 'Solo' })).toThrow('saisie est conservée');
  expect(result.current.personalizationData).toBeNull();
  write.mockRestore();
});
