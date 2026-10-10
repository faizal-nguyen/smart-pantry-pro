import { act, fireEvent, render, screen } from '@testing-library/react';
import MemoryPanel from '../MemoryPanel';
import type { AssistantMemoryItem } from '@/services/assistantApi';
const mockRefetch=jest.fn(),mockForget=jest.fn(),mockPromote=jest.fn();
const item:AssistantMemoryItem={ id:'memory',user_id:'owner',kind:'preference',scope:'global',status:'active',subject_type:null,subject_id:null,content:'Je préfère les soupes.',normalized_content:null,confidence:1,sensitivity:'normal',source:'user_explicit',approved_at:null,last_used_at:null,expires_at:null,deleted_at:null,created_at:'2026-10-10',updated_at:'2026-10-10' };
let mockError:Error|null=null;let mockItems:AssistantMemoryItem[]=[];let mockOwner='owner';
jest.mock('@/hooks/useAssistantMemories',()=>({ useAssistantMemories:()=>({ owner:mockOwner,memories:mockItems,actives:mockItems,candidates:[],isLoading:false,error:mockError,refetch:mockRefetch,forget:mockForget,promote:mockPromote,isForgetting:false,isPromoting:false }) }));
beforeEach(()=>{ mockError=null;mockItems=[];mockOwner='owner';mockRefetch.mockReset();mockForget.mockReset(); });
test('a failed read is not described as an empty memory and offers a retry',()=>{
  mockError=new Error('Coupure');render(<MemoryPanel/>);
  expect(screen.getByRole('alert')).toHaveTextContent('Impossible de lire');expect(screen.queryByText('Pas encore de mémoire')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{ name:'Réessayer la lecture de la mémoire' }));expect(mockRefetch).toHaveBeenCalledTimes(1);
});
test('a late forgetting failure does not appear in a different account',async()=>{
  let reject!: (failure:Error)=>void;
  mockForget.mockImplementation(()=>new Promise((_,fail)=>{ reject=fail; }));mockItems=[item];const view=render(<MemoryPanel/>);
  fireEvent.click(screen.getByRole('button',{ name:'Oublier cette mémoire' }));mockOwner='another-owner';mockItems=[];view.rerender(<MemoryPanel/>);
  await act(async()=>{ reject(new Error('Réponse du compte précédent')); });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();expect(screen.queryByText(item.content)).not.toBeInTheDocument();
});
test('failed forgetting keeps the visible memory and exposes the unconfirmed result',async()=>{
  mockItems=[item];mockForget.mockRejectedValue(new Error('Oubli non confirmé.'));render(<MemoryPanel/>);
  fireEvent.click(screen.getByRole('button',{ name:'Oublier cette mémoire' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Oubli non confirmé.');expect(screen.getByText(item.content)).toBeInTheDocument();expect(mockForget).toHaveBeenCalledWith('memory');
});
