import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AssistantProvider } from '../AssistantProvider';
import type { UseDictationOptions } from '@/hooks/useDictation';
const mockPost=jest.fn();const mockToggle=jest.fn();const mockCancel=jest.fn();const mockDbChanged=jest.fn();
let mockDictation:UseDictationOptions|null=null;let mockOwner='owner-a';
jest.mock('@/hooks/useDictation',()=>({ ...jest.requireActual('@/hooks/useDictation'),
  useDictation:(options:UseDictationOptions)=>{ mockDictation=options;return { status:'idle',recordingMs:0,toggle:mockToggle,cancel:mockCancel,error:null }; } }));
jest.mock('@/services/assistantApi',()=>({ postAssistantText:(...args:unknown[])=>mockPost(...args),newClientRequestId:()=> 'request-1' }));
jest.mock('@/hooks/useAuthenticatedUser',()=>({ useAuthSessionOptional:()=>({ user:{ id:mockOwner } }) }));
jest.mock('@/hooks/useResponsive',()=>({ useResponsive:()=>({ isMobile:false }) }));
jest.mock('@/lib/agentEvents',()=>({ tablesForTool:(tool:string)=>[tool],dispatchAgentDbChanged:(...args:unknown[])=>mockDbChanged(...args) }));
jest.mock('../AssistantFAB',()=>({ AssistantFAB:({ onClick }:{ onClick:()=>void })=> <button onClick={onClick}>Micro flottant</button> }));
jest.mock('../AssistantResultDialog',()=>({ AssistantResultDialog:({ result }:{ result:{ message:string }|null })=> result ? <p>Résultat : {result.message}</p> : null }));
const page=()=> <MemoryRouter initialEntries={['/inventory']}><AssistantProvider /></MemoryRouter>;
beforeEach(()=>{ mockPost.mockReset();mockToggle.mockReset();mockCancel.mockReset();mockDbChanged.mockReset();mockDictation=null;mockOwner='owner-a';sessionStorage.clear(); });

test('the floating mic opens a review: nothing reaches the assistant before Envoyer',async()=>{
  mockPost.mockResolvedValue({ message:'Lait ajouté',conversation_id:'conversation-a',actions_executed:[{ tool:'add_shopping_items' }] });
  render(page());fireEvent.click(screen.getByRole('button',{ name:'Micro flottant' }));
  expect(mockToggle).toHaveBeenCalledTimes(1);expect(screen.getByRole('dialog',{ name:'Vérifie ta demande' })).toBeInTheDocument();
  act(()=>mockDictation?.onTranscript('ajoute deux litres de lait'));
  const draft=screen.getByRole('textbox',{ name:'Demande à envoyer' });expect(draft).toHaveValue('ajoute deux litres de lait');
  expect(mockPost).not.toHaveBeenCalled();
  fireEvent.change(draft,{ target:{ value:'ajoute trois litres de lait' } });
  fireEvent.click(screen.getByRole('button',{ name:'Envoyer' }));
  expect(await screen.findByText('Résultat : Lait ajouté')).toBeInTheDocument();
  expect(mockPost).toHaveBeenCalledWith(expect.objectContaining({ text:'ajoute trois litres de lait',clientRequestId:'request-1',expectedUserId:'owner-a',conversationId:undefined }));
  expect(mockDbChanged).toHaveBeenCalledWith(['add_shopping_items']);
  expect(screen.queryByRole('dialog',{ name:'Vérifie ta demande' })).not.toBeInTheDocument();
});

test('Annuler drops the dictation and sends nothing; a failed send keeps the draft',async()=>{
  render(page());fireEvent.click(screen.getByRole('button',{ name:'Micro flottant' }));
  act(()=>mockDictation?.onTranscript('vide le stock'));
  fireEvent.click(screen.getByRole('button',{ name:'Annuler' }));
  expect(mockCancel).toHaveBeenCalled();expect(mockPost).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  mockPost.mockRejectedValue(new Error('Réseau indisponible.'));
  fireEvent.click(screen.getByRole('button',{ name:'Micro flottant' }));act(()=>mockDictation?.onTranscript('deux tomates'));
  fireEvent.click(screen.getByRole('button',{ name:'Envoyer' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Réseau indisponible.');
  expect(screen.getByRole('textbox',{ name:'Demande à envoyer' })).toHaveValue('deux tomates');
});
