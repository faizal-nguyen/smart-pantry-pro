import { act, renderHook, waitFor } from '@testing-library/react';

import {
  CLIPBOARD_CONSENT_KEY,
  useClipboardImportSuggestion,
} from '../useClipboardImportSuggestion';

function setClipboard(text: string | (() => Promise<string>)) {
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      readText: typeof text === 'function' ? text : jest.fn(() => Promise.resolve(text)),
    },
    configurable: true,
  });
}

beforeEach(() => {
  window.localStorage.clear();
  delete (navigator as any).clipboard;
  delete (navigator as any).permissions;
});

describe('useClipboardImportSuggestion (PRP-220.18)', () => {
  it('starts in "unknown" consent state with no suggestion', () => {
    const { result } = renderHook(() => useClipboardImportSuggestion());
    expect(result.current.consent).toBe('unknown');
    expect(result.current.suggestedUrl).toBeNull();
  });

  it('loads existing "granted" consent from localStorage', async () => {
    window.localStorage.setItem(CLIPBOARD_CONSENT_KEY, 'granted');
    setClipboard('Check this https://www.instagram.com/reel/abc/ out');
    const { result } = renderHook(() => useClipboardImportSuggestion());
    await waitFor(() =>
      expect(result.current.suggestedUrl).toBe('https://www.instagram.com/reel/abc/')
    );
  });

  it('persists consent on grant() and runs an immediate clipboard scan', async () => {
    setClipboard('https://www.tiktok.com/@chef/video/1');
    const { result } = renderHook(() => useClipboardImportSuggestion());
    await act(() => result.current.grant());
    expect(window.localStorage.getItem(CLIPBOARD_CONSENT_KEY)).toBe('granted');
    expect(result.current.consent).toBe('granted');
    expect(result.current.suggestedUrl).toBe('https://www.tiktok.com/@chef/video/1');
  });

  it('ignores non-recipe URLs', async () => {
    setClipboard('https://example.com/random');
    const { result } = renderHook(() => useClipboardImportSuggestion());
    await act(() => result.current.grant());
    expect(result.current.suggestedUrl).toBeNull();
  });

  it('dismiss() persists "dismissed" and clears any active suggestion', async () => {
    setClipboard('https://www.instagram.com/reel/abc/');
    const { result } = renderHook(() => useClipboardImportSuggestion());
    await act(() => result.current.grant());
    expect(result.current.suggestedUrl).not.toBeNull();
    act(() => result.current.dismiss());
    expect(window.localStorage.getItem(CLIPBOARD_CONSENT_KEY)).toBe('dismissed');
    expect(result.current.consent).toBe('dismissed');
    expect(result.current.suggestedUrl).toBeNull();
  });

  it('swallows clipboard read errors silently', async () => {
    setClipboard(() => Promise.reject(new Error('NotAllowedError')));
    const { result } = renderHook(() => useClipboardImportSuggestion());
    await act(() => result.current.grant());
    // Consent still goes through, but no suggestion surfaces.
    expect(result.current.consent).toBe('granted');
    expect(result.current.suggestedUrl).toBeNull();
  });

  it('skips the scan when navigator.clipboard.readText is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {},
      configurable: true,
    });
    const { result } = renderHook(() => useClipboardImportSuggestion());
    await act(() => result.current.grant());
    expect(result.current.suggestedUrl).toBeNull();
  });
});
