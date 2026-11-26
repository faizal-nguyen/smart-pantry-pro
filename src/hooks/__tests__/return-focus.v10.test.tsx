import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useReturnFocus } from '@/hooks/useReturnFocus';

/** Opened by state, like the memory correction and the home stock dialog: no DialogTrigger. */
function OpenedByState() {
  const [open, setOpen] = useState(false);
  const returnFocus = useReturnFocus();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Corriger</button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent {...returnFocus}>
          <DialogTitle>Corriger ce souvenir</DialogTitle>
          <DialogDescription>Votre correction.</DialogDescription>
          <textarea aria-label="Votre correction" />
        </DialogContent>
      </Dialog>
    </>
  );
}

describe('useReturnFocus — dialogue ouvert sans déclencheur Radix (V11-06 E2b)', () => {
  it('gives the focus back to the button that opened the dialog', async () => {
    render(<OpenedByState />);
    const trigger = screen.getByRole('button', { name: 'Corriger' });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Corriger ce souvenir' });

    fireEvent.keyDown(dialog, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(trigger).toHaveFocus();
  });

  it('also finds the button when a tap did not focus it, as in Safari', async () => {
    render(<OpenedByState />);
    const trigger = screen.getByRole('button', { name: 'Corriger' });
    expect(document.activeElement).toBe(document.body);
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Corriger ce souvenir' });

    fireEvent.keyDown(dialog, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(trigger).toHaveFocus();
  });
});
