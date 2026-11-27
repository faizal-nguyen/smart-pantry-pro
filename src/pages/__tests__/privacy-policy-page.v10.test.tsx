import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PrivacyPolicyPage from '../PrivacyPolicyPage';
import Auth from '../Auth';
import privacyPolicy from '@/content/privacyPolicy';

jest.mock('@/integrations/supabase/client', () => ({ supabase: { auth: {} } }));
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthSessionOptional: () => ({ user: null }) }));

test('the policy page renders the repository file, without a session', () => {
  render(<MemoryRouter initialEntries={['/confidentialite']}><PrivacyPolicyPage /></MemoryRouter>);
  const title = privacyPolicy.split('\n').find(line => line.startsWith('# '))!.slice(2).trim();
  expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(3);
  expect(document.title).toBe('Politique de confidentialité — Kitchen OS');
  expect(screen.getByRole('link', { name: /Retour/ })).toHaveAttribute('href', '/');
});

test('the sign-in screen points to the policy and no longer cites terms that do not exist', () => {
  render(<MemoryRouter initialEntries={['/auth']}><Auth /></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'politique de confidentialité' })).toHaveAttribute('href', '/confidentialite');
  expect(screen.queryByText(/conditions d.utilisation/)).not.toBeInTheDocument();
});
