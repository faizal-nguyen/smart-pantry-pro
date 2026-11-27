import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DataPrivacySection from '../DataPrivacySection';
import { ApiError } from '@/lib/apiError';
import { toast } from 'sonner';

const mockGetRequest = jest.fn();
const mockPostRequest = jest.fn();
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthSessionOptional: () => ({ user: { id: 'A' } }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock('@/services/privacyApi', () => ({
  getPrivacySettings: jest.fn(async () => ({ settings: { hasConsent: true, allowAnalytics: false, saveHistory: true, assistantMemoryEnabled: false,
    allowImageProcessing: true, shareAnonymizedData: false, batterySaver: false, dataRetention: 'standard' } })),
  patchPrivacySettings: jest.fn(),
  postPrivacyExport: jest.fn(),
  getPrivacyDeleteRequest: (owner: string) => mockGetRequest(owner),
  postPrivacyDeleteRequest: (owner: string) => mockPostRequest(owner),
}));

const filesPending = { id: 'request-1', status: 'processing', requestedAt: '2026-11-22T10:00:00Z', completedAt: null, filesPending: true };
beforeEach(() => { jest.clearAllMocks(); });

test('rows erased with photos left reads as an open request, and the photos can be erased again', async () => {
  mockGetRequest.mockResolvedValueOnce({ request: filesPending })
    .mockResolvedValueOnce({ request: { ...filesPending, filesPending: false } });
  mockPostRequest.mockResolvedValueOnce({ id: 'request-1', status: 'processing', requestedAt: filesPending.requestedAt, alreadyPending: true });
  render(<MemoryRouter><DataPrivacySection /></MemoryRouter>);
  expect(await screen.findByText(/certaines photos n’ont pas pu l’être/)).toBeInTheDocument();
  expect(screen.queryByText(/Suppression terminée/)).not.toBeInTheDocument();
  expect(mockGetRequest).toHaveBeenCalledWith('A');
  fireEvent.click(screen.getByRole('button', { name: 'Réessayer d’effacer mes photos' }));
  await waitFor(() => expect(mockPostRequest).toHaveBeenCalledWith('A'));
  await waitFor(() => expect(mockGetRequest).toHaveBeenCalledTimes(2));
  expect(toast.success).toHaveBeenCalledWith('Photos effacées : la demande sera terminée dans l’heure.');
});

test('a failed photo removal says the request is recorded, not refused, and rereads its state', async () => {
  mockGetRequest.mockResolvedValue({ request: filesPending });
  mockPostRequest.mockRejectedValueOnce(new ApiError('Demande enregistrée, mais tes photos n’ont pas pu être effacées : réessaie dans un instant.',
    { status: 502, code: 'PRIVACY_FILES_DELETE_FAILED' }));
  render(<MemoryRouter><DataPrivacySection /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Réessayer d’effacer mes photos' }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Demande enregistrée, mais tes photos n’ont pas pu être effacées : réessaie dans un instant.'));
  await waitFor(() => expect(mockGetRequest).toHaveBeenCalledTimes(2));
});

test('pending, completed and failed requests each read as such', async () => {
  mockGetRequest.mockResolvedValueOnce({ request: { ...filesPending, status: 'pending', filesPending: false } });
  const { unmount } = render(<MemoryRouter><DataPrivacySection /></MemoryRouter>);
  expect(await screen.findByText(/Demande enregistrée, traitée dans l’heure/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Réessayer d’effacer mes photos' })).not.toBeInTheDocument();
  unmount();
  mockGetRequest.mockResolvedValueOnce({ request: { ...filesPending, status: 'completed', completedAt: '2026-11-22T11:17:00Z', filesPending: false } });
  const second = render(<MemoryRouter><DataPrivacySection /></MemoryRouter>);
  expect(await screen.findByText(/Suppression terminée le/)).toBeInTheDocument();
  second.unmount();
  mockGetRequest.mockResolvedValueOnce({ request: { ...filesPending, status: 'failed', filesPending: false } });
  render(<MemoryRouter><DataPrivacySection /></MemoryRouter>);
  expect(await screen.findByText(/La suppression n’a pas pu aboutir/)).toBeInTheDocument();
});
