import { act, fireEvent, render, screen, within } from '@testing-library/react';
import MemoryPanel from '../MemoryPanel';
import type { AssistantMemoryItem } from '@/services/assistantApi';
const mockRefetch=jest.fn(),mockExecute=jest.fn(),mockVerify=jest.fn();
const item:AssistantMemoryItem={ id:'memory',user_id:'owner',kind:'preference',scope:'global',status:'active',subject_type:null,subject_id:null,content:'Je préfère les plats épicés.',normalized_content:null,confidence:1,sensitivity:'normal',source:'user_explicit',approved_at:'2026-10-11',last_used_at:null,expires_at:null,deleted_at:null,created_at:'2026-10-11',updated_at:'2026-10-11',version:1,destination:'memory',payload:{type:'taste',subject:'spiciness',value:'spicy'} };
let mockError:Error|null=null;let mockItems:AssistantMemoryItem[]=[];let mockOwner='owner';let mockPending:unknown=null;
jest.mock('@/hooks/useAssistantMemories',()=>({ useAssistantMemories:()=>({ owner:mockOwner,memories:mockItems,isLoading:false,error:mockError,refetch:mockRefetch,
  execute:mockExecute,verifyPending:mockVerify,policy:{memoryEnabled:true,revision:4,profileVersion:2},policyError:null,pendingCommand:mockPending,storageError:null,isBusy:false }) }));
beforeEach(()=>{ mockError=null;mockItems=[];mockOwner='owner';mockPending=null;mockRefetch.mockReset();mockExecute.mockReset();mockVerify.mockReset(); });
test('failed read is not described as an empty memory and offers a retry',()=>{
  mockError=new Error('Coupure');render(<MemoryPanel/>);
  expect(screen.getByRole('alert')).toHaveTextContent('Impossible de lire');expect(screen.queryByText('Pas encore de mémoire')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Réessayer la lecture de la mémoire'}));expect(mockRefetch).toHaveBeenCalledTimes(1);
});
test('late forgetting failure does not appear in a different account',async()=>{
  let reject!: (failure:Error)=>void;mockExecute.mockImplementation(()=>new Promise((_,fail)=>{reject=fail;}));mockItems=[item];const view=render(<MemoryPanel/>);
  fireEvent.click(screen.getByRole('button',{name:'Oublier'}));mockOwner='another-owner';mockItems=[];view.rerender(<MemoryPanel/>);
  await act(async()=>{reject(new Error('Réponse du compte précédent'));});
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();expect(screen.queryByText(item.content)).not.toBeInTheDocument();
});
test('failed forgetting keeps visible memory and exposes the unconfirmed result',async()=>{
  mockItems=[item];mockExecute.mockRejectedValue(new Error('Oubli non confirmé.'));render(<MemoryPanel/>);
  fireEvent.click(screen.getByRole('button',{name:'Oublier'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Oubli non confirmé.');expect(screen.getByText(item.content)).toBeInTheDocument();
  expect(mockExecute).toHaveBeenCalledWith(item,'forget');
});
test('real correction preserves its draft through conflict and needs explicit reload before retry',async()=>{
  mockItems=[item];mockExecute.mockRejectedValueOnce(Object.assign(new Error('Une autre modification a été enregistrée.'),{status:409}));
  const view=render(<MemoryPanel/>);fireEvent.click(screen.getByRole('button',{name:'Corriger'}));
  const dialog=screen.getByRole('dialog');fireEvent.change(within(dialog).getByRole('textbox'),{target:{value:'Finalement je préfère les plats doux'}});
  fireEvent.click(within(dialog).getByRole('button',{name:'Enregistrer la correction'}));
  expect(await within(dialog).findByText('Un autre appareil a changé ce souvenir. Votre texte est conservé.')).toBeInTheDocument();
  expect(within(dialog).getByRole('textbox')).toHaveValue('Finalement je préfère les plats doux');
  expect(within(dialog).getByRole('button',{name:'Enregistrer la correction'})).toBeDisabled();
  const latest={...item,version:2,content:'Version sur un autre appareil'};mockItems=[latest];mockRefetch.mockResolvedValue({memories:[latest]});view.rerender(<MemoryPanel/>);
  fireEvent.click(within(dialog).getByRole('button',{name:'Relire la version actuelle et garder mon texte'}));
  await act(async()=>{});mockExecute.mockResolvedValueOnce({status:'saved',operation:'correct',destination:'memory'});
  fireEvent.click(within(dialog).getByRole('button',{name:'Enregistrer la correction'}));
  expect(mockExecute).toHaveBeenLastCalledWith(latest,'correct','Finalement je préfère les plats doux');
});
test('rejection is a distinct operation and search covers content/provenance/destination',async()=>{
  mockItems=[{...item,status:'candidate',source:'assistant_inferred'}];mockExecute.mockResolvedValue({status:'saved',operation:'reject',destination:'memory'});render(<MemoryPanel/>);
  expect(screen.getByText(/Proposition de l’assistant/)).toBeInTheDocument();expect(screen.getByText('Souvenir')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox',{name:'Rechercher un souvenir'}),{target:{value:'no match'}});expect(screen.getByText(/Aucun souvenir/)).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox',{name:'Rechercher un souvenir'}),{target:{value:'épicés'}});fireEvent.click(screen.getByRole('button',{name:'Rejeter'}));
  expect(mockExecute).toHaveBeenCalledWith(mockItems[0],'reject');
});
test('uncertain result offers verification and blocks a new effect',()=>{
  mockItems=[item];mockPending={command_id:'pending'};render(<MemoryPanel/>);
  expect(screen.getByRole('button',{name:'Oublier'})).toBeDisabled();expect(screen.getByRole('button',{name:'Corriger'})).toBeDisabled();
  expect(screen.getByRole('button',{name:'Vérifier puis réessayer'})).toBeEnabled();
});
