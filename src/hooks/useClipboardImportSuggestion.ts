/**
 * Clipboard suggestion hook (PRP-220.18).
 *
 * Reads the user's clipboard *only after explicit consent* (a one-time
 * banner stored in localStorage as `clipboardImportConsent=1`). When
 * consent is granted and the clipboard contains a URL whose host
 * matches `isRecipeLikely`, the hook surfaces it so the inbox can show
 * a "Import this URL?" banner.
 *
 * Privacy notes:
 *   - Never reads the clipboard without consent.
 *   - Never logs or surfaces the clipboard text — only the URL.
 *   - All errors are swallowed (denied permission, browser without
 *     `navigator.clipboard`, etc.) so we never throw inside the inbox.
 */
import { useCallback, useEffect, useState } from 'react';

import { extractFirstUrl, isRecipeLikely } from '@/services/recipe-import/helpers/url';

export const CLIPBOARD_CONSENT_KEY = 'clipboardImportConsent';

export type ClipboardConsent = 'granted' | 'dismissed' | 'unknown';

function readConsent(): ClipboardConsent {
  if (typeof window === 'undefined') return 'unknown';
  try {
    const v = window.localStorage.getItem(CLIPBOARD_CONSENT_KEY);
    if (v === '1' || v === 'granted') return 'granted';
    if (v === 'dismissed') return 'dismissed';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function writeConsent(value: 'granted' | 'dismissed'): void {
  try {
    window.localStorage.setItem(CLIPBOARD_CONSENT_KEY, value);
  } catch {
    // Swallow storage errors (private mode, quota, etc.) — the worst
    // case is we re-ask next time.
  }
}

export interface UseClipboardImportSuggestionResult {
  /** A recipe-like URL detected in the clipboard, or null. */
  suggestedUrl: string | null;
  /** Current consent state. */
  consent: ClipboardConsent;
  /** Grant consent and run an immediate clipboard scan. */
  grant: () => Promise<void>;
  /** Permanently dismiss the prompt (no auto-scan in future sessions). */
  dismiss: () => void;
  /** Force a manual re-scan (e.g. after the user pastes externally). */
  rescan: () => Promise<void>;
  /** Hide the current suggestion without dropping consent. */
  clearSuggestion: () => void;
}

export function useClipboardImportSuggestion(): UseClipboardImportSuggestionResult {
  const [consent, setConsent] = useState<ClipboardConsent>(() => readConsent());
  const [suggestedUrl, setSuggestedUrl] = useState<string | null>(null);

  const scan = useCallback(async (): Promise<void> => {
    if (typeof navigator === 'undefined') return;
    const clip = navigator.clipboard;
    if (!clip || typeof clip.readText !== 'function') return;

    try {
      // Permissions API is best-effort — Safari / Firefox don't
      // implement clipboard-read. We attempt the read regardless and
      // catch the rejection.
      if (typeof navigator.permissions?.query === 'function') {
        try {
          const permission = await navigator.permissions.query({
            name: 'clipboard-read' as PermissionName,
          });
          if (permission.state === 'denied') return;
        } catch {
          // Permission descriptor unsupported — fall through.
        }
      }
      const text = await clip.readText();
      const url = extractFirstUrl(text);
      if (url && isRecipeLikely(url)) {
        setSuggestedUrl(url);
      } else {
        setSuggestedUrl(null);
      }
    } catch {
      // User denied / focus lost / etc. — silent.
    }
  }, []);

  // Auto-scan once when consent is already granted on mount.
  useEffect(() => {
    if (consent === 'granted') {
      void scan();
    }
  }, [consent, scan]);

  const grant = useCallback(async () => {
    writeConsent('granted');
    setConsent('granted');
    await scan();
  }, [scan]);

  const dismiss = useCallback(() => {
    writeConsent('dismissed');
    setConsent('dismissed');
    setSuggestedUrl(null);
  }, []);

  const clearSuggestion = useCallback(() => {
    setSuggestedUrl(null);
  }, []);

  return {
    suggestedUrl,
    consent,
    grant,
    dismiss,
    rescan: scan,
    clearSuggestion,
  };
}
