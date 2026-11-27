import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DataPrivacySection from '../DataPrivacySection';
import { patchPrivacySettings } from '@/services/privacyApi';

/** Former values of the hidden settings, consent withdrawn: none of them may surface or block. */
const mockStored = { hasConsent: false, allowAnalytics: true, saveHistory: true, assistantMemoryEnabled: false,
  allowImageProcessing: true, shareAnonymizedData: true, batterySaver: true, dataRetention: 'standard' };
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthSessionOptional: () => ({ user: { id: 'A' } }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock('@/services/privacyApi', () => ({
  getPrivacySettings: jest.fn(async () => ({ settings: { ...mockStored } })),
  patchPrivacySettings: jest.fn(async (patch: Record<string, unknown>) => ({ settings: { ...mockStored, ...patch } })),
  postPrivacyExport: jest.fn(),
  getPrivacyDeleteRequest: jest.fn(async () => ({ request: null })),
  postPrivacyDeleteRequest: jest.fn(),
}));

const HISTORY = 'Sauvegarder mes conversations avec l’assistant';
beforeEach(() => { jest.clearAllMocks(); });

async function historySwitch() {
  const control = await screen.findByRole('switch', { name: HISTORY });
  await waitFor(() => expect(control).toBeEnabled());
  return control;
}

test('the conversation history is the only switch, usable whatever the former consent', async () => {
  render(<DataPrivacySection />);
  await historySwitch();
  expect(screen.getAllByRole('switch')).toHaveLength(1);
  for (const hidden of [/Analytics/i, /anonymisées/, /Traitement d’images/, /batterie/i, /Autoriser l’analyse/, /scans/]) {
    expect(screen.queryByText(hidden)).not.toBeInTheDocument();
  }
});

test('what the application records is stated exactly', async () => {
  render(<DataPrivacySection />);
  await historySwitch();
  // Under the card title (h3): a sub-heading, not a sibling of the card titles.
  expect(screen.getByRole('heading', { level: 4, name: 'Mesure d’usage et photos' })).toBeInTheDocument();
  expect(screen.getByText('Aucune mesure d’usage dédiée n’est active. Pour ses suggestions, l’application enregistre les recettes proposées, ouvertes, ajoutées à « À cuisiner bientôt » ou retirées, et préparées, ainsi que tes retours sur une recette.')).toBeInTheDocument();
  expect(screen.getByText('Une photo n’est analysée que lorsque tu l’envoies ; les codes-barres sont lus sur ton appareil.')).toBeInTheDocument();
});

test('switching the history sends that setting alone', async () => {
  render(<DataPrivacySection />);
  fireEvent.click(await historySwitch());
  await waitFor(() => expect(patchPrivacySettings).toHaveBeenCalledWith({ saveHistory: false }, 'A'));
  expect(patchPrivacySettings).toHaveBeenCalledTimes(1);
});

test('turning the history off says what stays: the actions the assistant took', async () => {
  render(<DataPrivacySection />);
  await historySwitch();
  expect(screen.getByText('Conserve tes échanges avec l’assistant, pour la durée choisie ci-dessous. Ce choix est indépendant de la mémoire ; les actions faites par l’assistant restent consignées.')).toBeInTheDocument();
});
