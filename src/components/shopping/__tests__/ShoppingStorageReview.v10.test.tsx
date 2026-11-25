import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ShoppingStorageReview from '../ShoppingStorageReview';
import { pendingIntent } from '@/services/stockCommands';
const OWNER='00000000-0000-4000-8000-000000000001',ID='50000000-0000-4000-8000-000000000001';
jest.mock('@/hooks/useAuthenticatedUser',()=>({ useAuthenticatedUser:()=>({ id:OWNER }) }));
jest.mock('@/services/stockCommands',()=>({ pendingIntent:jest.fn() }));
const items=[{ id:ID,product_id:ID,quantity:1,unit:'kg',stock_version:2,is_purchased:true,priority:1,created_at:'',updated_at:'',product:{ id:ID,name:'Farine',category:'Épicerie',unit_type:'kg' } }];
beforeEach(()=>{ localStorage.clear();jest.clearAllMocks();jest.mocked(pendingIntent).mockResolvedValue(null); });
test('reviewed values survive rejection and reopening; unknown date remains null on confirmation',async()=>{
  const confirm=jest.fn().mockRejectedValueOnce(new Error('Connexion coupée')).mockResolvedValueOnce({ command_id:ID,command_type:'transfer_shopping',status:'confirmed',affected_tables:['inventory','shopping_list'] });
  const props={ open:true,onOpenChange:jest.fn(),items,busy:false,onConfirm:confirm };
  const page=render(<MemoryRouter><ShoppingStorageReview {...props}/></MemoryRouter>);
  await waitFor(()=>expect(screen.getByRole('button',{ name:'Confirmer le rangement' })).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Quantité de rangement de Farine'),{ target:{ value:'750' } });
  fireEvent.change(screen.getByLabelText('Unité de rangement de Farine'),{ target:{ value:'g' } });
  fireEvent.click(screen.getByRole('button',{ name:'Confirmer le rangement' }));
  await screen.findByRole('alert');
  page.unmount();render(<MemoryRouter><ShoppingStorageReview {...props}/></MemoryRouter>);
  await waitFor(()=>expect(screen.getByRole('button',{ name:'Confirmer le rangement' })).toBeEnabled());
  expect(screen.getByLabelText('Quantité de rangement de Farine')).toHaveValue('750');
  fireEvent.click(screen.getByRole('button',{ name:'Confirmer le rangement' }));
  await screen.findByRole('link',{ name:'Voir mon stock' });
  expect(confirm).toHaveBeenLastCalledWith([{ id:ID,expected_version:2,quantity:750,unit:'g',location:null,expiry_date:null,date_kind:'unknown',quantity_quality:'unknown' }]);
  expect(localStorage.getItem(`v10-routine:${OWNER}:shopping-review`)).toBeNull();
});

// V11-01 E5b: the draft is merged per row (a receipt adds purchases), and only the stored rows leave it.
test('a new purchase joins an open draft without losing what was typed; only the stored rows leave it',async()=>{
  const TOMATO='50000000-0000-4000-8000-000000000002';
  const tomatoes={ ...items[0],id:TOMATO,product_id:TOMATO,quantity:250,unit:'g',stock_version:4,product:{ id:TOMATO,name:'Tomates',category:'Épicerie',unit_type:'g' } };
  const confirm=jest.fn().mockResolvedValue({ command_id:ID,command_type:'transfer_shopping',status:'confirmed',affected_tables:['inventory','shopping_list'] });
  const props={ open:true,onOpenChange:jest.fn(),busy:false,onConfirm:confirm };
  const first=render(<MemoryRouter><ShoppingStorageReview {...props} items={items}/></MemoryRouter>);
  await waitFor(()=>expect(screen.getByRole('button',{ name:'Confirmer le rangement' })).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Quantité de rangement de Farine'),{ target:{ value:'900' } });
  first.unmount();
  render(<MemoryRouter><ShoppingStorageReview {...props} items={[items[0],tomatoes]}/></MemoryRouter>);
  await waitFor(()=>expect(screen.getByLabelText('Quantité de rangement de Tomates')).toHaveValue('250'));
  expect(screen.getByLabelText('Quantité de rangement de Farine')).toHaveValue('900');
  fireEvent.click(screen.getAllByRole('checkbox',{ name:'Ranger ce produit' })[1]);
  fireEvent.click(screen.getByRole('button',{ name:'Confirmer le rangement' }));
  await screen.findByRole('link',{ name:'Voir mon stock' });
  expect(confirm).toHaveBeenCalledWith([expect.objectContaining({ id:ID,quantity:900 })]);
  expect(JSON.parse(localStorage.getItem(`v10-routine:${OWNER}:shopping-review`) ?? '[]').map((row:{ id:string })=>row.id)).toEqual([TOMATO]);
});
