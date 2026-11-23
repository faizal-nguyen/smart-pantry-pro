import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EditShoppingItemDialog from '../EditShoppingItemDialog';
import type { ShoppingItem } from '@/hooks/useShoppingList';

jest.mock('@/hooks/useInventory', () => ({ useInventory: () => ({ products: [], loadProducts: jest.fn() }) }));
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthenticatedUser: () => ({ id: '00000000-0000-4000-8000-000000000001' }) }));

const row = (unit: string): ShoppingItem => ({ id: 'row', product_id: 'p', quantity: 1, unit, is_purchased: false, priority: 1,
  created_at: '', updated_at: '', product: { id: 'p', name: 'Lait', category: 'Autres', unit_type: 'l' } });

beforeEach(() => localStorage.clear());

describe('editing a shopping row', () => {
  test('a unit of the row outside the shared list is kept as is', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    render(<EditShoppingItemDialog item={row('unité(s)')} open onOpenChange={jest.fn()} onSave={onSave} />);
    expect(screen.getByRole('combobox', { name: 'Unité' })).toHaveValue('unité(s)');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('row', expect.objectContaining({ unit: 'unité(s)' })));
  });

  test('the unit is picked from the shared list', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    render(<EditShoppingItemDialog item={row('l')} open onOpenChange={jest.fn()} onSave={onSave} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Unité' }), { target: { value: 'cl' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('row', expect.objectContaining({ unit: 'cl' })));
  });
});
