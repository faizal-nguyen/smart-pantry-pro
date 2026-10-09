import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import { MemoryRouter,Routes,Route } from 'react-router-dom';
import CookingSessionPage from '../CookingSessionPage';
import { startCookingSession,readCookingSessions } from '@/services/cookingSessions';
import { executeStockCommand,previewRecipeStock } from '@/services/stockCommands';
const A='00000000-0000-4000-8000-000000000001',ID='40000000-0000-4000-8000-000000000001',R='30000000-0000-4000-8000-000000000001',LOT='20000000-0000-4000-8000-000000000001';
jest.mock('@/hooks/useAuthenticatedUser',()=>({ useAuthenticatedUser:()=>({ id:A }) }));
jest.mock('@/integrations/supabase/client',()=>({ supabase:{ auth:{ getSession:async()=>({ data:{ session:{ user:{ id:A } } } }) } } }));
jest.mock('@/lib/api',()=>({ ApiError:class extends Error { status=0; } }));
jest.mock('@/services/stockCommands',()=>({ previewRecipeStock:jest.fn(),executeStockCommand:jest.fn(),getStockCommandResult:jest.fn(),pendingIntent:async()=>null,finishIntent:jest.fn(),undoStockCommand:jest.fn() }));
const preview={ recipe:{ id:R,canonicalId:R,source:'recipes' as const,name:'Pain',servings:4,version:'v1',ingredients:[{ ingredient_name:'Farine',quantity:200,unit:'g' }] },servings:4,lots:[{ id:LOT,product_id:LOT,product_name:'Farine',quantity:1,unit:'kg',stock_version:0 }],allocations:[],missing:[] };
beforeEach(async()=>{
  localStorage.clear();jest.clearAllMocks();Object.defineProperty(crypto,'randomUUID',{ configurable:true,value:()=>ID });
  jest.mocked(previewRecipeStock).mockResolvedValue(preview);
  await startCookingSession(A,{ id:R,source:'recipes' },['Mélanger','Cuire']);
});
function show() { return render(<MemoryRouter initialEntries={[`/kitchen/cooking/${ID}`]}><Routes><Route path="/kitchen/cooking/:sessionId" element={<CookingSessionPage/>}/></Routes></MemoryRouter>); }
test('step and timer return after remount, with a focused heading and no stock write',async()=>{
  const page=show();fireEvent.click(screen.getByRole('button',{ name:'Commencer les étapes' }));fireEvent.click(screen.getByRole('button',{ name:'Suivante' }));
  fireEvent.click(screen.getByRole('button',{ name:'Démarrer le minuteur' }));page.unmount();show();
  expect(screen.getByRole('heading',{ name:'Étape 2 sur 2' })).toHaveFocus();
  expect(readCookingSessions(A)[0].timers).toHaveLength(1);
  expect(executeStockCommand).not.toHaveBeenCalled();
});
test('actual quantity enters one typed confirmation, then reopening the completed screen sends nothing',async()=>{
  jest.mocked(executeStockCommand).mockResolvedValue({ command_id:ID,command_type:'consume_recipe',status:'confirmed',journal_id:ID,affected_tables:['inventory','cooking_journal'] });
  const page=show();fireEvent.click(screen.getByRole('button',{ name:'Commencer les étapes' }));fireEvent.click(screen.getByRole('button',{ name:'Suivante' }));fireEvent.click(screen.getByRole('button',{ name:'J’ai terminé : vérifier les ingrédients' }));
  await waitFor(()=>expect(screen.getByRole('button',{ name:'Confirmer et mettre à jour le stock' })).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Quantité utilisée de Farine'),{ target:{ value:'125' } });
  fireEvent.click(screen.getByRole('button',{ name:'Confirmer et mettre à jour le stock' }));
  await screen.findByText('Le stock et le journal sont confirmés. Ce repas ne sera pas enregistré une deuxième fois.');
  expect(executeStockCommand).toHaveBeenCalledWith(expect.objectContaining({ payload:expect.objectContaining({ adjustments:[{ ingredient_index:0,quantity:125,unit:'g' }] }) }),A);
  page.unmount();show();expect(executeStockCommand).toHaveBeenCalledTimes(1);
});
