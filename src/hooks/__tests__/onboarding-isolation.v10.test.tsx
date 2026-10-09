import { act, renderHook } from '@testing-library/react';
import { useOnboarding } from '../useOnboarding';
let mockOwner = 'A';
jest.mock('../useAuthenticatedUser', () => ({ useAuthSessionOptional: () => ({ user: { id: mockOwner }, isLoading: false }) }));
jest.mock('../usePersonalization', () => ({ usePersonalization: () => ({ savePersonalizationData: jest.fn() }) }));
beforeEach(() => { localStorage.clear(); mockOwner = 'A'; });
test('onboarding answers belong to the signed-in account and old unowned answers stay dormant', () => {
  localStorage.setItem('smart-pantry-onboarding',JSON.stringify({ answers: [{ value: 'unowned private answer' }] }));
  const { result,rerender } = renderHook(() => useOnboarding());
  expect(result.current.state.answers).toHaveLength(0);
  act(() => result.current.startOnboarding());
  act(() => result.current.nextStep('A private answer'));
  expect(localStorage.getItem('v10-draft:A:onboarding')).toContain('A private answer');
  mockOwner = 'B'; rerender();
  expect(result.current.state.answers).toHaveLength(0);
  expect(result.current.state.isCompleted).toBe(false);
  expect(localStorage.getItem('smart-pantry-onboarding')).toContain('unowned private answer');
});
test('a refused storage write does not falsely advance the onboarding state', () => {
  const { result } = renderHook(() => useOnboarding());
  const write = jest.spyOn(Storage.prototype,'setItem').mockImplementation(() => { throw new Error('Quota'); });
  expect(() => result.current.startOnboarding()).toThrow('Quota');
  expect(result.current.state.hasStarted).toBe(false);
  write.mockRestore();
});
