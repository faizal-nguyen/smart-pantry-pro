import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import type { SocialImport } from '@/services/recipe-import/types';

import { ImportActions } from '../ImportActions';

const baseImport = (overrides: Partial<SocialImport> = {}): SocialImport => ({
  id: 'imp-1',
  user_id: 'user-a',
  platform: 'instagram',
  source_url: 'https://www.instagram.com/reel/abc/',
  canonical_url: 'https://instagram.com/reel/abc',
  source_hash: 'h',
  status: 'captured',
  title: 'Pates carbonara',
  author_name: 'Chef',
  author_handle: 'chef',
  thumbnail_url: null,
  metadata: {},
  error_code: null,
  error_message: null,
  confidence: null,
  recipe_id: null,
  created_at: '2026-05-07T00:00:00.000Z',
  updated_at: '2026-05-07T00:00:00.000Z',
  ...overrides,
});

const wrap = (ui: React.ReactElement) => <MemoryRouter>{ui}</MemoryRouter>;

describe('ImportActions', () => {
  it('shows Extraire on captured status and dispatches the callback', async () => {
    const user = userEvent.setup();
    const onExtract = jest.fn();
    render(wrap(<ImportActions import_={baseImport()} onExtract={onExtract} />));
    await user.click(screen.getByRole('button', { name: /Extraire/ }));
    expect(onExtract).toHaveBeenCalledWith('imp-1');
  });

  it('shows the spinner on extracting status', () => {
    render(wrap(<ImportActions import_={baseImport({ status: 'extracting' })} />));
    expect(screen.getByText(/Extraction en cours/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Extraire/ })).not.toBeInTheDocument();
  });

  it('shows Verify + Save on draft_ready and dispatches both callbacks', async () => {
    const user = userEvent.setup();
    const onVerify = jest.fn();
    const onSave = jest.fn();
    const imp = baseImport({ status: 'draft_ready' });
    render(wrap(<ImportActions import_={imp} onVerify={onVerify} onSave={onSave} />));

    await user.click(screen.getByRole('button', { name: /Vérifier/ }));
    expect(onVerify).toHaveBeenCalledWith(imp);

    await user.click(screen.getByRole('button', { name: /Sauvegarder/ }));
    expect(onSave).toHaveBeenCalledWith(imp);
  });

  it('shows Réessayer on failed status with force=true', async () => {
    const user = userEvent.setup();
    const onExtract = jest.fn();
    render(wrap(<ImportActions import_={baseImport({ status: 'failed' })} onExtract={onExtract} />));
    await user.click(screen.getByRole('button', { name: /Réessayer/ }));
    expect(onExtract).toHaveBeenCalledWith('imp-1', true);
  });

  it('shows the saved-recipe link when status=saved + recipe_id', () => {
    render(
      wrap(
        <ImportActions import_={baseImport({ status: 'saved', recipe_id: 'rec-42' })} />
      )
    );
    expect(screen.getByRole('link', { name: /Voir la recette/ })).toHaveAttribute(
      'href',
      '/recipes/rec-42'
    );
  });

  it('shows Restaurer on archived status', async () => {
    const user = userEvent.setup();
    const onUnarchive = jest.fn();
    render(
      wrap(<ImportActions import_={baseImport({ status: 'archived' })} onUnarchive={onUnarchive} />)
    );
    await user.click(screen.getByRole('button', { name: /Restaurer/ }));
    expect(onUnarchive).toHaveBeenCalledWith('imp-1');
  });

  it('disables every action when busy', async () => {
    const onExtract = jest.fn();
    render(wrap(<ImportActions import_={baseImport()} onExtract={onExtract} disabled />));
    const button = screen.getByRole('button', { name: /Extraire/ });
    expect(button).toBeDisabled();
  });
});
