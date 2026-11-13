import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import RecipeLibraryActions from '../RecipeLibraryActions';
const mockSave=jest.fn();let mockState:unknown;
jest.mock('@/hooks/useAuthenticatedUser',()=>({useAuthenticatedUser:()=>({id:'owner'})}));
jest.mock('@/hooks/useRecipeLifecycle',()=>({useRecipeLifecycle:()=>({stateFor:()=>mockState,save:mockSave,isLoading:false,isError:false})}));
jest.mock('../AfterCookingFeedback',()=>({__esModule:true,default:()=> <button>À refaire</button>}));
const recipe={id:'00000000-0000-4000-8000-000000000001',source:'recipes' as const};
beforeEach(()=>{mockState=undefined;mockSave.mockReset().mockResolvedValue(undefined);});
test('saving an intention does not record cooking, and a queued recipe can be removed',async()=>{
 const view=render(<RecipeLibraryActions recipe={recipe} name="Lo Mein"/>);
 fireEvent.click(screen.getByRole('button'));await waitFor(()=>expect(mockSave).toHaveBeenCalledWith(recipe,'queue'));
 view.unmount();mockState={queued_at:'2026-11-13T12:00:00Z'};
 render(<RecipeLibraryActions recipe={recipe} name="Lo Mein"/>);fireEvent.click(screen.getByRole('button'));await waitFor(()=>expect(mockSave).toHaveBeenLastCalledWith(recipe,'unqueue'));
});
test('cooking needs explicit confirmation and then offers the existing repeat feedback',async()=>{
 render(<RecipeLibraryActions recipe={recipe} name="Lo Mein" detail/>);
 expect(screen.getByText('Aucune préparation enregistrée.')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Je l’ai faite'}));expect(mockSave).not.toHaveBeenCalled();
 expect(screen.getByRole('dialog')).toHaveTextContent('La mise à jour du stock');
 fireEvent.click(screen.getByRole('button',{name:'Confirmer : je l’ai faite'}));
 await waitFor(()=>expect(mockSave).toHaveBeenCalledWith(recipe,'cooked'));
 expect(await screen.findByRole('button',{name:'À refaire'})).toBeVisible();
});
