import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import AssistantComposer from '../AssistantComposer';
import { readAssistantAsk, useAskAssistant } from '@/hooks/useAskAssistant';

const mockPost = jest.fn();
jest.mock('@/services/assistantApi', () => ({ postAssistantText: (...args: unknown[]) => mockPost(...args), newClientRequestId: () => 'request', patchAssistantConversation: jest.fn() }));
jest.mock('@/hooks/useDictation', () => ({ ...jest.requireActual('@/hooks/useDictation'),
  useDictation: () => ({ status: 'idle', recordingMs: 0, toggle: jest.fn(), cancel: jest.fn(), error: null }) }));
jest.mock('../AssistantModePicker', () => ({ __esModule: true, default: () => null }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));

beforeEach(() => mockPost.mockReset());
const client = () => new QueryClient();

function Probe() {
  return <p>Question reçue : {readAssistantAsk(useLocation().state) ?? 'aucune'}</p>;
}

function AskButton() {
  const ask = useAskAssistant();
  return <button onClick={() => ask('Aide-moi à planifier mes repas de la semaine.')}>Demander à l’assistant</button>;
}

test('« Demander à l’assistant » opens the assistant with the question instead of sending it unseen', () => {
  render(<MemoryRouter initialEntries={['/kitchen/meal-planning']}><Routes>
    <Route path="/kitchen/meal-planning" element={<AskButton />} />
    <Route path="/assistant" element={<Probe />} />
  </Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Demander à l’assistant' }));
  expect(screen.getByText('Question reçue : Aide-moi à planifier mes repas de la semaine.')).toBeInTheDocument();
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
