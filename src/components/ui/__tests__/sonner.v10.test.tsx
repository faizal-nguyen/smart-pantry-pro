import { act, render, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { NAV_CLEARANCE, Toaster } from '@/components/ui/sonner';

const toasterList = () => document.querySelectorAll<HTMLOListElement>('[data-sonner-toaster]');
const toastItems = () => Array.from(document.querySelectorAll('[data-sonner-toast]'));

afterEach(() => {
  act(() => { toast.dismiss(); });
});

describe('Toaster — la seule pile de notifications (V11-06 E2a)', () => {
  it('keeps every notification above the measured bottom navigation, on the bottom side only', async () => {
    render(<Toaster />);
    act(() => { toast('Thème modifié'); });

    await waitFor(() => expect(toastItems()).toHaveLength(1));
    const lists = toasterList();
    expect(lists).toHaveLength(1);
    const style = lists[0].style;
    expect(NAV_CLEARANCE).toBe('calc(var(--mobile-nav-total-height, 0px) + 1rem)');
    expect(style.getPropertyValue('--offset-bottom')).toBe(NAV_CLEARANCE);
    expect(style.getPropertyValue('--mobile-offset-bottom')).toBe(NAV_CLEARANCE);
    expect(style.getPropertyValue('--offset-right')).toBe('32px');
    expect(style.getPropertyValue('--mobile-offset-left')).toBe('16px');
    expect(lists[0].getAttribute('data-y-position')).toBe('bottom');
    expect(lists[0].getAttribute('data-x-position')).toBe('right');
  });

  it('replaces a notification by the next one, like the previous stack', async () => {
    render(<Toaster />);
    act(() => { toast.error('Première'); });
    await waitFor(() => expect(toastItems()).toHaveLength(1));
    act(() => { toast('Seconde'); });
    await waitFor(() => expect(toastItems().some(item => item.textContent?.includes('Seconde'))).toBe(true));

    // Dismissed, not just hidden: closing the new one never brings the older one back.
    await waitFor(() => expect(toastItems().map(item => item.textContent)).toEqual(['Seconde']));
    expect(toastItems()[0]).toHaveAttribute('data-visible', 'true');
  });

  it('renders errors with the destructive tokens and keeps other notifications neutral', async () => {
    render(<Toaster />);
    act(() => { toast.error('Erreur', { description: 'Réessaie plus tard.' }); });

    await waitFor(() => expect(document.querySelector('[data-sonner-toast][data-type="error"]')).not.toBeNull());
    const error = document.querySelector('[data-sonner-toast][data-type="error"]');
    expect(error?.className).toContain('bg-destructive');
    expect(error?.className).toContain('text-destructive-foreground');

    act(() => { toast('Neutre'); });
    await waitFor(() => expect(toastItems().some(item => item.textContent?.includes('Neutre'))).toBe(true));
    const neutral = toastItems().find(item => item.textContent?.includes('Neutre'));
    expect(neutral?.className).not.toContain('bg-destructive');
  });
});
