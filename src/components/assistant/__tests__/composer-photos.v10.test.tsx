import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AssistantComposer from '../AssistantComposer';
import { groceriesNote } from '@/lib/groceriesNote';

const mockText = jest.fn(), mockRecognize = jest.fn();
jest.mock('@/services/assistantApi', () => ({
  postAssistantText: (...args: unknown[]) => mockText(...args),
  postGroceryPhotos: (...args: unknown[]) => mockRecognize(...args),
  postKeptGroceries: jest.fn(), postAssistantUndo: jest.fn(),
  newClientRequestId: () => '99999999-9999-4999-8999-999999999999', patchAssistantConversation: jest.fn(),
}));
jest.mock('@/lib/photoResize', () => ({ KEPT_PHOTO_SIDE: 1024, resizePhoto: jest.fn(async () => new Blob(['jpeg'], { type: 'image/jpeg' })) }));
jest.mock('@/lib/agentEvents', () => ({ dispatchAgentDbChanged: jest.fn() }));
jest.mock('../AssistantModePicker', () => ({ __esModule: true, default: () => null }));
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('@/hooks/useDictation', () => ({ ...jest.requireActual('@/hooks/useDictation'),
  useDictation: () => ({ status: 'idle', recordingMs: 0, toggle: jest.fn(), cancel: jest.fn(), error: null }) }));

const kewpie = { name: 'Mayonnaise', quantity: 310, unit: 'ml', brand: 'Kewpie', expiry_date: null, photo: 1, barcode: null, confidence: 'high' as const };
const otafuku = { name: 'Yakisoba Sauce', quantity: 500, unit: 'g', brand: 'Otafuku', expiry_date: '2027-03-01', photo: 2, barcode: null, confidence: 'high' as const };
const file = (name: string) => new File(['x'], name, { type: 'image/jpeg' });
const onResponse = jest.fn();

function composer() {
  render(<QueryClientProvider client={new QueryClient()}><AssistantComposer expectedUserId="owner-a" onResponse={onResponse} /></QueryClientProvider>);
}
async function join(...names: string[]) {
  fireEvent.change(screen.getByLabelText('Photos à joindre'), { target: { files: names.map(file) } });
  await screen.findByRole('list', { name: 'Photos jointes' });
  await waitFor(() => expect(within(screen.getByRole('list', { name: 'Photos jointes' })).getAllByRole('img')).toHaveLength(Math.min(names.length, 4)));
}
const ask = (question: string) => {
  fireEvent.change(screen.getByRole('textbox', { name: "Message à envoyer à l'assistant" }), { target: { value: question } });
  fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
};

beforeAll(() => {
  Object.assign(URL, { createObjectURL: jest.fn(() => `blob:photo-${Math.random()}`), revokeObjectURL: jest.fn() });
});
beforeEach(() => {
  jest.clearAllMocks();
  mockRecognize.mockResolvedValue({ items: [kewpie, otafuku] });
  mockText.mockResolvedValue({ message: 'Des idées…', actions_executed: [], memory_results: [] });
});

test('a question about joined photos goes to the assistant with what the photos show; adding stays a choice', async () => {
  composer();
  await join('kewpie.jpg', 'otafuku.jpg');
  ask('Je fais quoi avec ça ?');
  await waitFor(() => expect(onResponse).toHaveBeenCalled());
  expect(mockRecognize).toHaveBeenCalledWith(expect.objectContaining({ photos: [expect.any(Blob), expect.any(Blob)], expectedUserId: 'owner-a' }));
  const sent = mockText.mock.calls[0][0].text as string;
  expect(sent).toBe(`Je fais quoi avec ça ?\n\n${groceriesNote([kewpie, otafuku])}`);
  expect(sent).toContain('📷 Sur mes photos (pas encore dans mon stock) : Mayonnaise Kewpie (310 ml) ; Yakisoba Sauce Otafuku (500 g, date limite 2027-03-01).');
  expect(screen.queryByRole('list', { name: 'Photos jointes' })).not.toBeInTheDocument();
  const card = screen.getByRole('region', { name: 'Produits vus sur tes photos' });
  expect(card).toHaveTextContent('Mayonnaise Kewpie, Yakisoba Sauce Otafuku');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(within(card).getByRole('button', { name: 'Ajouter au stock' }));
  expect(await screen.findByLabelText('Nom du produit 1')).toHaveValue('Mayonnaise');
  expect(screen.getByLabelText('Marque du produit 2')).toHaveValue('Otafuku');
});

test('photos sent without a question open the list to review; the assistant is not asked', async () => {
  composer();
  await join('kewpie.jpg');
  fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
  expect(await screen.findByRole('dialog', { name: 'Mes courses en photo' })).toBeInTheDocument();
  expect(mockText).not.toHaveBeenCalled();
});

test('a joined photo can be removed, and 4 photos is the most per message', async () => {
  composer();
  await join('1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg');
  expect(screen.getByRole('alert')).toHaveTextContent('4 photos au plus par message.');
  expect(screen.getByRole('button', { name: 'Joindre des photos' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Retirer la photo 2' }));
  expect(within(screen.getByRole('list', { name: 'Photos jointes' })).getAllByRole('img')).toHaveLength(3);
  expect(screen.getByRole('button', { name: 'Joindre des photos' })).toBeEnabled();
});

test('photos showing no groceries keep the photos and the question, and ask nothing', async () => {
  mockRecognize.mockResolvedValue({ items: [] });
  composer();
  await join('table.jpg');
  ask('C’est quoi ?');
  expect(await screen.findByRole('alert')).toHaveTextContent('Aucune course reconnue sur ces photos.');
  expect(mockText).not.toHaveBeenCalled();
  expect(screen.getByRole('list', { name: 'Photos jointes' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: "Message à envoyer à l'assistant" })).toHaveValue('C’est quoi ?');
});

test('a failed reply keeps everything; resending does not read the photos again', async () => {
  mockText.mockRejectedValueOnce(new Error('Réponse non confirmée.'));
  composer();
  await join('kewpie.jpg');
  ask('Ça se garde au frigo ?');
  expect(await screen.findByRole('alert')).toHaveTextContent('Réponse non confirmée.');
  expect(screen.getByRole('list', { name: 'Photos jointes' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
  await waitFor(() => expect(onResponse).toHaveBeenCalled());
  expect(mockRecognize).toHaveBeenCalledTimes(1);
  expect(mockText).toHaveBeenCalledTimes(2);
  expect(mockText.mock.calls[1][0].clientRequestId).toBe(mockText.mock.calls[0][0].clientRequestId);
});
