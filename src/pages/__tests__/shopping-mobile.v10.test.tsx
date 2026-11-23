import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SmartShoppingList from '../SmartShoppingList';
const owner='00000000-0000-4000-8000-000000000001';
const mockAdd=jest.fn(),mockToggle=jest.fn(),mockUndo=jest.fn();
let mockPending=false,mockChange:{ commandId:string;message:string }|null=null;
jest.mock('@/hooks/useAuthenticatedUser',()=>({ useAuthenticatedUser:()=>({ id:owner }) }));
jest.mock('@/hooks/useShoppingList',()=>({ useShoppingList:()=>({ shoppingList:[{ id:'line',product:{ name:'Farine' },quantity:1,unit:'kg',is_purchased:false }],addToShoppingList:mockAdd,togglePurchased:mockToggle,getPurchasedCount:()=>0,pendingTransfer:mockPending,refetch:jest.fn(),
  lastShoppingChange:mockChange,undoLastShoppingChange:mockUndo }) }));
jest.mock('@/components/shopping/ShoppingStorageReview',()=>({ __esModule:true,default:()=>null }));
jest.mock('@/components/shopping/EditShoppingItemDialog',()=>({ __esModule:true,default:()=>null }));
beforeEach(()=>{ localStorage.clear();jest.clearAllMocks();mockPending=false;mockChange=null; });
test('the last confirmed list change is announced with its undo',async()=>{
  mockChange={ commandId:'c1',message:'Lait : 1 l ajouté, 2 l au total.' };
  mockUndo.mockResolvedValue(undefined);
  render(<MemoryRouter><SmartShoppingList /></MemoryRouter>);
  expect(screen.getByText('Lait : 1 l ajouté, 2 l au total.').closest('[role="status"]')).not.toBeNull();
  fireEvent.click(screen.getByRole('button',{ name:'Annuler : Lait : 1 l ajouté, 2 l au total.' }));
  expect(mockUndo).toHaveBeenCalledTimes(1);
  expect(await screen.findByText('Action annulée.')).toBeInTheDocument();
});
test('adding is progressive, an error preserves the draft, and closing restores access to the list',async()=>{
  mockAdd.mockRejectedValueOnce(new Error('Ajout non confirmé.'));
  render(<MemoryRouter><SmartShoppingList /></MemoryRouter>);
  expect(screen.getByRole('checkbox',{ name:'Marquer acheté : Farine' })).toBeVisible();
  expect(screen.queryByRole('textbox',{ name:'Ajouter un produit' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{ name:'Ajouter' }));
  fireEvent.change(screen.getByRole('textbox',{ name:'Ajouter un produit' }),{ target:{ value:'Riz' } });
  fireEvent.click(screen.getByRole('button',{ name:'Préciser la quantité' }));
  fireEvent.change(screen.getByRole('textbox',{ name:'Quantité' }),{ target:{ value:'2' } });
  fireEvent.change(screen.getByRole('combobox',{ name:'Unité' }),{ target:{ value:'kg' } });
  fireEvent.click(screen.getByRole('button',{ name:'Ajouter aux courses' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Ajout non confirmé.');
  fireEvent.click(screen.getByRole('button',{ name:'Fermer' }));
  fireEvent.click(screen.getByRole('button',{ name:'Ajouter' }));
  expect(screen.getByRole('textbox',{ name:'Ajouter un produit' })).toHaveValue('Riz');
  expect(screen.getByRole('textbox',{ name:'Quantité' })).toHaveValue('2');
  expect(screen.getByRole('combobox',{ name:'Unité' })).toHaveValue('kg');
  expect(mockAdd).toHaveBeenCalledTimes(1);
});
async function openAdd(name:string) {
  fireEvent.click(screen.getByRole('button',{ name:'Ajouter' }));
  fireEvent.change(screen.getByRole('textbox',{ name:'Ajouter un produit' }),{ target:{ value:name } });
  fireEvent.click(screen.getByRole('button',{ name:'Préciser la quantité' }));
}
test('the unit of the row already on the list is proposed so the add tops it up; an explicit choice wins',async()=>{
  mockAdd.mockResolvedValue(undefined);
  render(<MemoryRouter><SmartShoppingList /></MemoryRouter>);
  await openAdd(' farine ');
  expect(screen.getByRole('combobox',{ name:'Unité' })).toHaveValue('kg');
  expect(screen.getByText('Unité de la ligne déjà prévue : la quantité s’y ajoutera.')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox',{ name:'Quantité' }),{ target:{ value:'0,5' } });
  fireEvent.click(screen.getByRole('button',{ name:'Ajouter aux courses' }));
  await waitFor(()=>expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ productName:'farine',quantity:.5,unit:'kg' })));
  await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await openAdd('Farine');
  fireEvent.change(screen.getByRole('combobox',{ name:'Unité' }),{ target:{ value:'paquet' } });
  expect(screen.queryByText('Unité de la ligne déjà prévue : la quantité s’y ajoutera.')).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox',{ name:'Quantité' }),{ target:{ value:'1' } });
  fireEvent.click(screen.getByRole('button',{ name:'Ajouter aux courses' }));
  await waitFor(()=>expect(mockAdd).toHaveBeenLastCalledWith(expect.objectContaining({ unit:'paquet' })));
});
test('a product not on the list keeps the default unit, and « Autre… » takes a typed unit',async()=>{
  mockAdd.mockResolvedValue(undefined);
  render(<MemoryRouter><SmartShoppingList /></MemoryRouter>);
  await openAdd('Riz');
  expect(screen.getByRole('combobox',{ name:'Unité' })).toHaveValue('pièce');
  fireEvent.change(screen.getByRole('combobox',{ name:'Unité' }),{ target:{ value:'__other__' } });
  fireEvent.change(screen.getByRole('textbox',{ name:'Autre unité' }),{ target:{ value:'bocal' } });
  fireEvent.change(screen.getByRole('textbox',{ name:'Quantité' }),{ target:{ value:'2' } });
  fireEvent.click(screen.getByRole('button',{ name:'Ajouter aux courses' }));
  await waitFor(()=>expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ productName:'Riz',quantity:2,unit:'bocal' })));
});
test('checking a purchase sends its explicit state; a pending transfer freezes edits and keeps recovery visible',async()=>{
  mockToggle.mockResolvedValue(undefined);
  const page=render(<MemoryRouter><SmartShoppingList /></MemoryRouter>);
  fireEvent.click(screen.getByRole('checkbox',{ name:'Marquer acheté : Farine' }));
  expect(mockToggle).toHaveBeenCalledWith('line',true);
  mockPending=true;page.rerender(<MemoryRouter><SmartShoppingList /></MemoryRouter>);
  expect(screen.getByRole('checkbox',{ name:'Marquer acheté : Farine' })).toBeDisabled();
  await waitFor(()=>expect(screen.getByRole('button',{ name:'Vérifier le rangement' })).toBeEnabled());
});
