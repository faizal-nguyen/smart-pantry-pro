import { render, screen } from '@testing-library/react';

import { StatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
  it.each([
    ['captured', 'À traiter'],
    ['metadata_ready', 'Prêt'],
    ['extracting', 'Extraction…'],
    ['draft_ready', 'Prêt à valider'],
    ['needs_review', 'À vérifier'],
    ['saved', 'Sauvegardée'],
    ['failed', 'Échec'],
    ['archived', 'Archivé'],
  ] as const)('renders the %s label', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByRole('status')).toHaveTextContent(label);
  });
});
