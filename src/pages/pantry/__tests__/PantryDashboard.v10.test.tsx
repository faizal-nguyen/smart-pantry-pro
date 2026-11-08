import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PantryDashboard from '../PantryDashboard';
import { Toaster } from '@/components/ui/toaster';
import { AGENT_DB_CHANGED_EVENT } from '@/lib/agentEvents';

const PRODUCT_ID = '10000000-0000-4000-8000-000000000001';
const INVENTORY_ID = '20000000-0000-4000-8000-000000000001';
const mockAddToInventory = jest.fn();
const mockDeleteEq = jest.fn();
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthenticatedUser: () => ({ id: 'user-1' }) }));
jest.mock('@/hooks/useFamilyMode', () => ({ useAgeAdaptiveUI: () => ({ adaptiveInterface: { simplifiedNavigation: false }, isChildMode: false }) }));
jest.mock('@/hooks/useInventory', () => ({
  useInventory: () => ({ inventory: [], products: [], addToInventory: mockAddToInventory, loadProducts: jest.fn() }),
}));
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => table === 'products'
      ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: '10000000-0000-4000-8000-000000000001' }, error: null }) }) }) }
      : { delete: () => ({ eq: mockDeleteEq }) },
  },
}));
const mockUndoStockCommand = jest.fn();
jest.mock('@/services/stockCommands', () => ({ undoStockCommand: (id: string) => mockUndoStockCommand(id) }));

const quickAdd = async () => {
  render(<MemoryRouter><PantryDashboard /><Toaster /></MemoryRouter>);
  fireEvent.change(screen.getByPlaceholderText('ex: Tomates'), { target: { value: 'Tomates' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
  return screen.findByRole('button', { name: 'Annuler' });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAddToInventory.mockResolvedValue({ id: INVENTORY_ID, product: { name: 'Tomates' } });
  mockDeleteEq.mockResolvedValue({ error: null });
});

test('a successful quick add shows its toast with a working undo', async () => {
  const changed = jest.fn();
  window.addEventListener(AGENT_DB_CHANGED_EVENT, changed);
  fireEvent.click(await quickAdd());
  expect(mockAddToInventory).toHaveBeenCalledWith(expect.objectContaining({ product_id: PRODUCT_ID, quantity: 1 }));
  await screen.findByText('Ajout annulé');
  expect(mockDeleteEq).toHaveBeenCalledWith('id', INVENTORY_ID);
  expect(changed).toHaveBeenCalled();
  window.removeEventListener(AGENT_DB_CHANGED_EVENT, changed);
});

test('a failed undo says the product stayed in the inventory', async () => {
  mockDeleteEq.mockResolvedValue({ error: { message: 'RLS' } });
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  fireEvent.click(await quickAdd());
  await waitFor(() => expect(screen.getByText('Annulation impossible')).toBeInTheDocument());
});

test('undoing an add that topped up a lot undoes its stock command, never deletes the lot', async () => {
  mockAddToInventory.mockResolvedValue({ id: INVENTORY_ID, quantity: 3, unit: 'unité', product: { name: 'Tomates' }, top_up_command_id: 'command-1' });
  mockUndoStockCommand.mockResolvedValue({ status: 'confirmed' });
  const undo = await quickAdd();
  expect(screen.getByText('Tomates : 3 unité au total dans ce lot.')).toBeInTheDocument();
  fireEvent.click(undo);
  await screen.findByText('Ajout annulé');
  expect(mockUndoStockCommand).toHaveBeenCalledWith('command-1');
  expect(mockDeleteEq).not.toHaveBeenCalled();
});

test('the lot keeps the unit picked in the quick add, not the unit of the existing product', async () => {
  render(<MemoryRouter><PantryDashboard /><Toaster /></MemoryRouter>);
  fireEvent.change(screen.getByPlaceholderText('ex: Tomates'), { target: { value: 'Farine' } });
  fireEvent.change(screen.getByDisplayValue('unité'), { target: { value: 'g' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
  await screen.findByRole('button', { name: 'Annuler' });
  expect(mockAddToInventory).toHaveBeenCalledWith(expect.objectContaining({ product_id: PRODUCT_ID, unit: 'g' }));
});
