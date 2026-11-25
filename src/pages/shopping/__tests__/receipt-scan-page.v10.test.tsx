import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import type { ReceiptLine, ReceiptScan } from '@smart/shared';
import ReceiptScanPage from '../ReceiptScanPage';
import ReceiptReview from '@/components/shopping/receipt/ReceiptReview';
import { fetchReceipt, fetchReceiptHistory, pendingReceipt, reconcileReceipt, scanReceipt } from '@/services/receipts';

// V11-01 E5b: « Scanner le ticket »: a photo read, reviewed against the list, applied once, then Courses.
const OWNER = '00000000-0000-4000-8000-000000000001';
const SCAN = '70000000-0000-4000-8000-000000000001';
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthenticatedUser: () => ({ id: OWNER }) }));
jest.mock('@/lib/api', () => ({ ApiError: class extends Error {
  status: number; code?: string;
  constructor(message: string, options: { status: number; code?: string }) { super(message); this.status = options.status; this.code = options.code; }
} }));
jest.mock('@/lib/photoResize', () => ({ RECEIPT_PHOTO_SIDE: 2048, resizePhoto: jest.fn(async () => new Blob(['jpeg'], { type: 'image/jpeg' })) }));
jest.mock('@/services/receipts', () => ({
  scanReceipt: jest.fn(), fetchReceipt: jest.fn(), fetchReceiptHistory: jest.fn(), reconcileReceipt: jest.fn(), resendReceipt: jest.fn(), pendingReceipt: jest.fn(),
}));
const mockRefetch = jest.fn(async () => undefined);
const mockRows = [
  { id: 'milk', product_id: 'p1', quantity: 2, unit: 'pièce', stock_version: 3, is_purchased: false, priority: 1, created_at: '2026-11-20T10:00:00Z', updated_at: '',
    product: { id: 'p1', name: 'Lait', category: 'Épicerie', unit_type: 'pièce' } },
  { id: 'rice', product_id: 'p2', quantity: 1, unit: 'kg', stock_version: 1, is_purchased: false, priority: 1, created_at: '2026-11-21T10:00:00Z', updated_at: '',
    product: { id: 'p2', name: 'Riz', category: 'Épicerie', unit_type: 'kg' } },
];
jest.mock('@/hooks/useShoppingList', () => ({ useShoppingList: () => ({ shoppingList: mockRows, loading: false, error: null, refetch: mockRefetch }) }));
const { ApiError } = jest.requireMock('@/lib/api') as { ApiError: new (message: string, options: { status: number; code?: string }) => Error };

const read = (raw_text: string, name: string, extra: Partial<ReceiptLine> = {}): ReceiptLine => ({
  raw_text, name, quantity: null, unit: null, package: null, unit_price: null, total_price: 1.05, food: true, confidence: 'high', ...extra,
});
const scan = (extra: Partial<ReceiptScan> = {}): ReceiptScan => ({ id: SCAN, state: 'read', store: 'Marché', purchased_on: '2026-11-20', total: 3.15,
  currency: 'EUR', created_at: '2026-11-25T10:00:00Z', applied_at: null, possible_duplicate: null,
  lines: [read('LAIT 1/2 ECR', 'Lait demi-écrémé'), read('CHOCO NOIR', 'Chocolat noir', { total_price: 1.99 }), read('SAC', 'Sac', { food: false, total_price: 0.1 })], ...extra });
const result = { command_id: 'c1', command_type: 'reconcile_receipt', status: 'confirmed', affected_tables: ['shopping_list'],
  shopping_changes: [{ id: 'milk', outcome: 'checked' }, { id: 'n', outcome: 'created', note: 'receipt_added' }] };

function Location() {
  const location = useLocation();
  const type = useNavigationType();
  return <output data-testid="location">{type} {location.pathname}{location.search}|{JSON.stringify(location.state)}</output>;
}
const open = (entry = '/shopping/ticket') => render(<MemoryRouter initialEntries={[entry]}>
  <Routes><Route path="/shopping/ticket" element={<><ReceiptScanPage /><Location /></>} /><Route path="/shopping/list" element={<Location />} /></Routes>
</MemoryRouter>);
const photo = (container: HTMLElement) => fireEvent.change(container.querySelector('input[aria-label="Image du ticket"]')!, {
  target: { files: [new File(['x'], 'ticket.heic', { type: 'image/heic' })] } });

beforeEach(() => {
  jest.clearAllMocks(); sessionStorage.clear();
  jest.mocked(fetchReceiptHistory).mockResolvedValue([]);
  jest.mocked(pendingReceipt).mockResolvedValue(null);
});

test('the start offers the photo and the recent receipts; one read but not applied can be taken up again', async () => {
  jest.mocked(fetchReceiptHistory).mockResolvedValueOnce([
    { id: SCAN, state: 'read', store: 'Marché', purchased_on: '2026-11-20', total: 3.15, currency: 'EUR', line_count: 3, created_at: '2026-11-25T10:00:00Z', applied_at: null },
    { id: '70000000-0000-4000-8000-000000000002', state: 'applied', store: null, purchased_on: null, total: null, currency: null, line_count: 1,
      created_at: '2026-11-18T10:00:00Z', applied_at: '2026-11-18T11:00:00Z' },
  ]);
  open();
  expect(screen.getByRole('button', { name: 'Prendre une photo' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Choisir une image' })).toBeInTheDocument();
  const history = await screen.findByRole('region', { name: 'Tickets récents' });
  expect(within(history).getByRole('link', { name: 'Reprendre le ticket 20 novembre · Marché' })).toHaveAttribute('href', `/shopping/ticket?scan=${SCAN}`);
  expect(within(history).getByText('Rapproché le 18 novembre')).toBeInTheDocument();
});

test('a photo is read, then reviewed in groups; each line to check says why', async () => {
  jest.mocked(scanReceipt).mockResolvedValueOnce(scan());
  const { container } = open();
  photo(container);
  await screen.findByRole('heading', { name: 'Cochés sur ta liste (1)' });
  expect(scanReceipt).toHaveBeenCalledWith(OWNER, expect.any(Blob), expect.any(AbortSignal));
  expect(screen.getByTestId('location')).toHaveTextContent(`/shopping/ticket?scan=${SCAN}`);
  expect(screen.getByRole('heading', { name: 'Ajoutés comme achetés (1)' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Écartés (1)' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Restent à acheter (1)' })).toBeInTheDocument();
  expect(screen.getByText('À vérifier : quantité de ta liste.')).toBeInTheDocument();
  expect(screen.getByText('À vérifier : 1 pièce supposée.')).toBeInTheDocument();
  expect(screen.getByLabelText('Quantité de Lait demi-écrémé')).toHaveValue('2');
  expect(screen.getByText('Marché · 20 novembre · 3,15 €')).toBeInTheDocument();
});

test('a line edited or set aside is sent as edited; the receipt is applied once, then Courses opens with its notice', async () => {
  jest.mocked(scanReceipt).mockResolvedValueOnce(scan());
  jest.mocked(reconcileReceipt).mockResolvedValueOnce(result as never);
  const { container } = open();
  photo(container);
  await screen.findByRole('heading', { name: 'Cochés sur ta liste (1)' });
  fireEvent.change(screen.getByLabelText('Quantité de Chocolat noir'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Rapprocher Lait demi-écrémé de'), { target: { value: 'list:rice' } });
  expect(screen.getByLabelText('Quantité de Lait demi-écrémé')).toHaveValue('1');
  expect(screen.getByLabelText('Unité de Lait demi-écrémé')).toHaveValue('kg');
  fireEvent.click(screen.getByRole('button', { name: 'Rapprocher 2 achats de ma liste' }));
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/shopping/list|'));
  expect(reconcileReceipt).toHaveBeenCalledWith(SCAN, [
    expect.objectContaining({ line_index: 0, quantity: 1, unit: 'kg', target: { shopping_id: 'rice', expected_version: 1 } }),
    expect.objectContaining({ line_index: 1, name: 'Chocolat noir', quantity: 2, unit: 'pièce', total_price: 1.99, target: null }),
  ]);
  expect(screen.getByTestId('location')).toHaveTextContent('"message":"Ticket rapproché : 1 achat coché, 1 ajouté."');
  expect(screen.getByTestId('location')).toHaveTextContent('"commandId":"c1"');
  // Review of E5b: the review is replaced in the history, so a way back never shows a receipt applied.
  expect(screen.getByTestId('location')).toHaveTextContent(/^REPLACE \/shopping\/list/);
});

test('a review left during its sending never takes the user back to Courses', async () => {
  let finish: (value: unknown) => void = () => undefined;
  const onApplied = jest.fn();
  const review = { lines: [], groups: { checked: [], partial: [], added: [], skipped: [], remaining: [], bought: new Map() }, editLine: jest.fn(), setTarget: jest.fn(),
    duplicateConfirmed: false, confirmDuplicate: jest.fn(), sending: false, outcome: null, error: null, clearError: jest.fn(),
    send: jest.fn(() => new Promise(resolve => { finish = resolve; })) };
  const view = render(<MemoryRouter><ReceiptReview scan={scan()} rows={[]} review={{ ...review, lines: [{ index: 0, name: 'Lait', quantity: '1', unit: 'pièce', price: '',
    unitPrice: null, target: { kind: 'new' }, quantitySource: 'assumed', match: null, nameEdited: false, quantityEdited: false, priceEdited: false, targetChosen: false }] } as never} onApplied={onApplied} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Rapprocher 1 achat de ma liste' }));
  view.unmount();
  await act(async () => { finish(result); });
  expect(onApplied).not.toHaveBeenCalled();
});

test('a reading that fails says what to do; a reading can be cancelled', async () => {
  jest.mocked(scanReceipt).mockRejectedValueOnce(new ApiError('Ce ticket est trop long pour être lu en une photo : coche tes achats à la main cette fois.', { status: 422, code: 'RECEIPT_TOO_LONG' }));
  const { container } = open();
  photo(container);
  expect(await screen.findByRole('alert')).toHaveTextContent('Ce ticket est trop long pour être lu en une photo');
  expect(screen.getByRole('link', { name: 'Cocher mes achats à la main' })).toHaveAttribute('href', '/shopping/list');
  let signal: AbortSignal | undefined;
  jest.mocked(scanReceipt).mockImplementationOnce((_owner, _photo, given) => { signal = given; return new Promise(() => undefined); });
  photo(container);
  await screen.findByText('Lecture du ticket… cela peut prendre une trentaine de secondes.');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Annuler la lecture' })); });
  expect(signal?.aborted).toBe(true);
  expect(screen.getByRole('button', { name: 'Prendre une photo' })).toBeInTheDocument();
});

test('a receipt taken up again is read by its id; a possible duplicate waits for the user’s word', async () => {
  jest.mocked(fetchReceipt).mockResolvedValueOnce(scan({ possible_duplicate: { id: '70000000-0000-4000-8000-000000000002', applied_at: '2026-11-20T18:00:00Z' } }));
  jest.mocked(reconcileReceipt).mockResolvedValueOnce(result as never);
  open(`/shopping/ticket?scan=${SCAN}`);
  expect(await screen.findByText(/a déjà été rapproché le 20 novembre/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Rapprocher 2 achats de ma liste' }));
  expect(await screen.findByText('Confirme d’abord que c’est un autre ticket.')).toBeInTheDocument();
  expect(reconcileReceipt).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('checkbox', { name: 'C’est un autre ticket' }));
  fireEvent.click(screen.getByRole('button', { name: 'Rapprocher 2 achats de ma liste' }));
  await waitFor(() => expect(reconcileReceipt).toHaveBeenCalled());
});

test('a receipt applied already, or gone, is said with a way out', async () => {
  jest.mocked(fetchReceipt).mockResolvedValueOnce(scan({ state: 'applied', applied_at: '2026-11-21T09:00:00Z' }));
  const first = open(`/shopping/ticket?scan=${SCAN}`);
  expect(await screen.findByText('Ce ticket a déjà été rapproché de ta liste le 21 novembre.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Voir mes courses' })).toHaveAttribute('href', '/shopping/list');
  first.unmount();
  jest.mocked(fetchReceipt).mockRejectedValueOnce(new ApiError('Introuvable', { status: 404, code: 'RECEIPT_NOT_FOUND' }));
  open(`/shopping/ticket?scan=${SCAN}`);
  expect(await screen.findByRole('alert')).toHaveTextContent('Ce ticket n’est plus disponible : scanne-le à nouveau.');
  expect(screen.getByRole('link', { name: 'Scanner un ticket' })).toHaveAttribute('href', '/shopping/ticket');
});
