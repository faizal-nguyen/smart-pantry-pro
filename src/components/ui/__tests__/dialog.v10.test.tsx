import { render, screen } from '@testing-library/react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

function Open({ presentation }: { presentation?: 'center' | 'sheet' }) {
  return (
    <Dialog open>
      <DialogContent presentation={presentation}>
        <DialogTitle>Aide pour cette tâche</DialogTitle>
        <DialogDescription>Votre question.</DialogDescription>
      </DialogContent>
    </Dialog>
  );
}

describe('DialogContent — présentation basse (V11-06 E2b)', () => {
  it('marks the bottom presentation, which the stylesheet applies under 900 px', () => {
    render(<Open presentation="sheet" />);
    expect(screen.getByRole('dialog')).toHaveAttribute('data-presentation', 'sheet');
  });

  it('keeps every other dialog centred', () => {
    const { unmount } = render(<Open />);
    expect(screen.getByRole('dialog')).not.toHaveAttribute('data-presentation');
    unmount();
    render(<Open presentation="center" />);
    expect(screen.getByRole('dialog')).not.toHaveAttribute('data-presentation');
  });
});
