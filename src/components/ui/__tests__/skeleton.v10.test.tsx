import { render, screen } from '@testing-library/react';
import { LoadingSkeleton } from '@/components/ui/skeleton';

describe('LoadingSkeleton — chargement à la forme du contenu (V11-06 E2b)', () => {
  it('announces the wait in words and draws hidden placeholders in the shape of the content', () => {
    render(<LoadingSkeleton label="Chargement de ton stock…" count={2} className="grid gap-4" itemClassName="h-28" />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Chargement de ton stock…');
    expect(status).toHaveClass('grid', 'gap-4');
    expect(screen.getByText('Chargement de ton stock…')).toHaveClass('sr-only');
    const blocks = status.querySelectorAll('[aria-hidden="true"]');
    expect(blocks).toHaveLength(2);
    blocks.forEach(block => expect(block).toHaveClass('animate-pulse', 'h-28'));
  });

  it('defaults to three rows', () => {
    render(<LoadingSkeleton label="Chargement des conversations…" />);
    expect(screen.getByRole('status').querySelectorAll('[aria-hidden="true"]')).toHaveLength(3);
  });
});
