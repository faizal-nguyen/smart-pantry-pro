import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { User } from '@supabase/supabase-js';
import AccountSection from '../AccountSection';

const mockNavigate = jest.fn();
const mockSignOut = jest.fn();
const mockClearPreferences = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
jest.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { signOut: () => mockSignOut() } } }));
jest.mock('@/hooks/usePersonalization', () => ({ usePersonalization: () => ({ clearPersonalizationData: mockClearPreferences }) }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
const user = { id: 'A', email: 'test@example.invalid' } as User;
beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); });
async function confirmLogout() {
  fireEvent.click(screen.getByRole('button',{ name: 'Se déconnecter' }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{ name: 'Se déconnecter' }));
}
test('a returned Supabase refusal stays visible and does not destroy pending work', async () => {
  localStorage.setItem('v10-command:A:transfer','pending');
  mockSignOut.mockResolvedValueOnce({ error: new Error('Refused') });
  render(<AccountSection user={user}/>);
  await confirmLogout();
  expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de se déconnecter');
  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(localStorage.getItem('v10-command:A:transfer')).toBe('pending');
});
test('confirmed logout preserves same-account drafts and uncertain command identities', async () => {
  localStorage.setItem('v10-command:A:transfer','pending');
  localStorage.setItem('v10-draft:A:manual-recipe','draft');
  mockSignOut.mockResolvedValueOnce({ error: null });
  render(<AccountSection user={user}/>);
  await confirmLogout();
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/auth'));
  expect(localStorage.getItem('v10-command:A:transfer')).toBe('pending');
  expect(localStorage.getItem('v10-draft:A:manual-recipe')).toBe('draft');
});
test('reset calls the real personalization API and clears only the current onboarding work', () => {
  localStorage.setItem('v10-draft:A:onboarding','answers'); localStorage.setItem('v10-command:A:transfer','pending');
  render(<AccountSection user={user}/>);
  fireEvent.click(screen.getByRole('button',{ name: "Refaire l'onboarding" }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{ name: 'Réinitialiser' }));
  expect(mockClearPreferences).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem('v10-draft:A:onboarding')).toBeNull();
  expect(localStorage.getItem('v10-command:A:transfer')).toBe('pending');
  expect(mockNavigate).toHaveBeenCalledWith('/onboarding');
});
