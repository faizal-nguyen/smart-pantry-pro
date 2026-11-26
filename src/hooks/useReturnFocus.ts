import { useEffect, useMemo, useRef, type ComponentPropsWithoutRef } from 'react';
import type { DialogContent } from '@/components/ui/dialog';

type FocusHandlers = Pick<ComponentPropsWithoutRef<typeof DialogContent>, 'onOpenAutoFocus' | 'onCloseAutoFocus'>;

/** A press older than this did not open the dialog. */
const PRESS_WINDOW_MS = 1000;
const PRESSABLE = 'button, a[href], [role="button"]';

/**
 * Radix gives the focus back to the dialog's `DialogTrigger` on close. A dialog opened by state has
 * none, so the focus falls back to the page: spread these handlers on its `DialogContent` to give it
 * back to the element that opened it. That is the focused element (keyboard, or a click in most
 * browsers); Safari does not focus a button on click or tap, so the control last pressed stands in.
 */
export function useReturnFocus(): FocusHandlers {
  const origin = useRef<HTMLElement | null>(null);
  const pressed = useRef<{ element: HTMLElement; at: number } | null>(null);

  useEffect(() => {
    const remember = (event: PointerEvent) => {
      const element = event.target instanceof Element ? event.target.closest<HTMLElement>(PRESSABLE) : null;
      pressed.current = element ? { element, at: Date.now() } : null;
    };
    document.addEventListener('pointerdown', remember, true);
    return () => document.removeEventListener('pointerdown', remember, true);
  }, []);

  return useMemo<FocusHandlers>(() => ({
    onOpenAutoFocus: () => {
      // Called before the dialog moves the focus inside: the active element is still the origin.
      const active = document.activeElement;
      const press = pressed.current;
      const recentPress = press && Date.now() - press.at <= PRESS_WINDOW_MS ? press.element : null;
      origin.current = active instanceof HTMLElement && active !== document.body ? active : recentPress;
    },
    onCloseAutoFocus: event => {
      const element = origin.current;
      origin.current = null;
      if (!element?.isConnected) return;
      event.preventDefault();
      element.focus();
    },
  }), []);
}
