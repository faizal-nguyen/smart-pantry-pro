import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import AssistantComposer from '../AssistantComposer';
import TodayAntiWastePanel from '@/components/kitchen/TodayAntiWastePanel';
import { readAssistantAsk } from '@/hooks/useAskAssistant';

const mockPost = jest.fn();
jest.mock('@/services/assistantApi', () => ({ postAssistantText: (...args: unknown[]) => mockPost(...args), newClientRequestId: () => 'request', patchAssistantConversation: jest.fn() }));
jest.mock('@/hooks/useDictation', () => ({ ...jest.requireActual('@/hooks/useDictation'),
  useDictation: () => ({ status: 'idle', recordingMs: 0, toggle: jest.fn(), cancel: jest.fn(), error: null }) }));
jest.mock('../AssistantModePicker', () => ({ __esModule: true, default: () => null }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/hooks/useTodayAntiWaste', () => ({ useTodayAntiWaste: () => ({ isLoading: false, isError: false, refetch: jest.fn(),
  items: [{ id: 'i1', product_name: 'Yaourt', days_to_expiry: 1, quantity: 1 }, { id: 'i2', product_name: 'Épinards', days_to_expiry: 2, quantity: 1 }] }) }));

beforeEach(() => mockPost.mockReset());
const client = () => new QueryClient();

function Probe() {
  return <p>Question reçue : {readAssistantAsk(useLocation().state) ?? 'aucune'}</p>;
}

test('« Voir recettes » on Aujourd’hui opens the assistant with the question instead of sending it unseen', () => {
  render(<MemoryRouter initialEntries={['/today']}><Routes>
    <Route path="/today" element={<TodayAntiWastePanel />} />
    <Route path="/assistant" element={<Probe />} />
  </Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Voir recettes' }));
  expect(screen.getByText(/Question reçue : J’ai besoin d’utiliser bientôt : Yaourt, Épinards/)).toBeInTheDocument();
  expect(mockPost).not.toHaveBeenCalled();
});

test('the composer sends a question brought by a button once, for the signed-in account', async () => {
  mockPost.mockResolvedValue({ message: 'Voici des idées.' });
  const taken = jest.fn(), onResponse = jest.fn();
  const view = render(<QueryClientProvider client={client()}>
    <AssistantComposer expectedUserId="owner-a" initialRequest="Que cuisiner ce soir ?" onInitialRequestTaken={taken} onResponse={onResponse} />
  </QueryClientProvider>);
  await waitFor(() => expect(onResponse).toHaveBeenCalledWith({ message: 'Voici des idées.' }));
  expect(mockPost).toHaveBeenCalledTimes(1);
  expect(mockPost.mock.calls[0][0]).toMatchObject({ text: 'Que cuisiner ce soir ?', expectedUserId: 'owner-a' });
  expect(taken).toHaveBeenCalledTimes(1);
  view.rerender(<QueryClientProvider client={client()}>
    <AssistantComposer expectedUserId="owner-a" initialRequest="Que cuisiner ce soir ?" onInitialRequestTaken={taken} onResponse={onResponse} />
  </QueryClientProvider>);
  expect(mockPost).toHaveBeenCalledTimes(1);
});

test('a question brought by a button waits for the account to be known', () => {
  render(<QueryClientProvider client={client()}><AssistantComposer initialRequest="Que cuisiner ce soir ?" /></QueryClientProvider>);
  expect(mockPost).not.toHaveBeenCalled();
});
