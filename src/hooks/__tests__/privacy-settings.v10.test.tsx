import { act, renderHook, waitFor } from '@testing-library/react';
import { usePrivacySettings } from '../usePrivacySettings';
import { patchPrivacySettings } from '@/services/privacyApi';

/** Every former side effect would fire with these values: analytics and battery saver on, history off. */
const mockStored = { hasConsent: true, allowAnalytics: true, saveHistory: false, assistantMemoryEnabled: false,
  allowImageProcessing: true, shareAnonymizedData: true, batterySaver: true, dataRetention: 'standard' };
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthSessionOptional: () => ({ user: { id: 'A' } }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock('@/services/privacyApi', () => ({
  getPrivacySettings: jest.fn(async () => ({ settings: { ...mockStored } })),
  patchPrivacySettings: jest.fn(),
  postPrivacyExport: jest.fn(),
  postPrivacyDeleteRequest: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  document.documentElement.className = '';
  delete (window as { analyticsEnabled?: boolean }).analyticsEnabled;
});

test('the settings are read and kept without writing anything outside the hook', async () => {
  const { result } = renderHook(() => usePrivacySettings());
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.settings).toEqual(mockStored);
  expect('analyticsEnabled' in window).toBe(false);
  expect(document.documentElement.classList.contains('battery-saver')).toBe(false);
  expect(sessionStorage.length).toBe(0);
});

/** A server answer the test settles by hand, to observe the state while the update is pending. */
function pendingAnswer() {
  let settle!: { resolve: (value: unknown) => void; reject: (error: Error) => void };
  const promise = new Promise((resolve, reject) => { settle = { resolve, reject }; });
  (patchPrivacySettings as jest.Mock).mockReturnValueOnce(promise);
  return settle;
}

async function loadedHook() {
  const hook = renderHook(() => usePrivacySettings());
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

test('an update shows at once, then rolls back when the server refuses it', async () => {
  const answer = pendingAnswer();
  const { result } = await loadedHook();
  let saved: Promise<boolean> | undefined;
  act(() => { saved = result.current.updateSettings({ saveHistory: true }); });
  expect(result.current.settings.saveHistory).toBe(true);
  expect(result.current.isUpdating).toBe(true);
  await act(async () => { answer.reject(new Error('Réseau indisponible')); await saved; });
  await expect(saved).resolves.toBe(false);
  expect(result.current.settings.saveHistory).toBe(false);
  expect(result.current.isUpdating).toBe(false);
  expect(patchPrivacySettings).toHaveBeenCalledWith({ saveHistory: true }, 'A');
});

test('an accepted update keeps what the server confirms, not what was sent', async () => {
  const answer = pendingAnswer();
  const { result } = await loadedHook();
  let saved: Promise<boolean> | undefined;
  act(() => { saved = result.current.updateSettings({ saveHistory: true }); });
  expect(result.current.settings.saveHistory).toBe(true);
  await act(async () => { answer.resolve({ settings: { ...mockStored, saveHistory: false, dataRetention: 'minimal' } }); await saved; });
  await expect(saved).resolves.toBe(true);
  expect(result.current.settings).toEqual({ ...mockStored, saveHistory: false, dataRetention: 'minimal' });
});
