import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import OnboardingPage from '../OnboardingPage';

let mockState = { isCompleted: false, hasStarted: false };
const mockStart = jest.fn();
jest.mock('@/hooks/useOnboarding', () => ({ useOnboarding: () => ({ state: mockState, startOnboarding: mockStart }) }));
jest.mock('@/components/onboarding', () => ({ OnboardingFlow: () => <p>Étapes de l’onboarding</p> }));

const app = () => <MemoryRouter initialEntries={['/onboarding']}><Routes>
  <Route path="/onboarding" element={<OnboardingPage />} />
  <Route path="/" element={<p>Accueil</p>} />
</Routes></MemoryRouter>;

// Audit 2026-11-07 (UX P1 4): a hook after an early return crashed once onboarding completed.
test('finishing onboarding goes to the app without breaking the hooks order', () => {
  const errors = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  const view = render(app());
  expect(screen.getByText('Étapes de l’onboarding')).toBeInTheDocument();
  expect(mockStart).toHaveBeenCalledTimes(1);
  mockState = { isCompleted: true, hasStarted: true };
  view.rerender(app());
  expect(screen.getByText('Accueil')).toBeInTheDocument();
  expect(errors.mock.calls.flat().join(' ')).not.toMatch(/Rendered fewer hooks|Cannot update a component/);
  errors.mockRestore();
});
