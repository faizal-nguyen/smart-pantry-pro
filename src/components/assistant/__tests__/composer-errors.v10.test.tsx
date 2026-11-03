import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AssistantComposer from '../AssistantComposer';
import type { UseDictationOptions } from '@/hooks/useDictation';
const mockPost=jest.fn();let mockDictationStatus='idle';
const mockToggle=jest.fn();const mockCancel=jest.fn();let mockDictationError:string|null=null;let mockDictation:UseDictationOptions|null=null;
jest.mock('@/hooks/useDictation',()=>({ ...jest.requireActual('@/hooks/useDictation'),
  useDictation:(options:UseDictationOptions)=>{ mockDictation=options;return { status:mockDictationStatus,recordingMs:12000,toggle:mockToggle,cancel:mockCancel,error:mockDictationError }; } }));
jest.mock('@/services/assistantApi',()=>({ postAssistantText:(...args:unknown[])=>mockPost(...args),newClientRequestId:()=> 'request',patchAssistantConversation:jest.fn() }));
jest.mock('../AssistantModePicker',()=>({ __esModule:true,default:()=>null }));
jest.mock('@/hooks/use-toast',()=>({ useToast:()=>({ toast:jest.fn() }) }));
const wrap=(onResponse?:jest.Mock)=> <QueryClientProvider client={new QueryClient()}><AssistantComposer expectedUserId="owner-a" onResponse={onResponse} /></QueryClientProvider>;
beforeEach(()=>{ mockPost.mockReset();mockToggle.mockReset();mockCancel.mockReset();mockDictationStatus='idle';mockDictationError=null;mockDictation=null; });
test('a rejected response leaves a visible error, the question and the input focus',async()=>{
  mockPost.mockRejectedValue(new Error('Réponse non confirmée.'));render(wrap());
  const input=screen.getByRole('textbox',{ name:"Message à envoyer à l'assistant" });
  fireEvent.change(input,{ target:{ value:'Par quoi remplacer la farine ?' } });
  fireEvent.click(screen.getByRole('button',{ name:'Envoyer' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Réponse non confirmée.');
  expect(input).toHaveValue('Par quoi remplacer la farine ?');expect(input).toHaveFocus();
});
test('sending stays disabled while a dictation is transcribed, and the dictation can be cancelled',()=>{
  const view=render(wrap());fireEvent.change(screen.getByRole('textbox'),{ target:{ value:'Une question' } });
  mockDictationStatus='transcribing';view.rerender(wrap());
  expect(screen.getByRole('button',{ name:'Envoyer' })).toBeDisabled();expect(mockPost).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByRole('textbox'),{ key:'Enter' });expect(mockPost).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{ name:'Annuler la dictée' }));expect(mockCancel).toHaveBeenCalledTimes(1);
});
test('the microphone starts a dictation and exposes its error without blocking typing',()=>{
  const view=render(wrap());fireEvent.click(screen.getByRole('button',{ name:'Dicter' }));
  expect(mockToggle).toHaveBeenCalledTimes(1);expect(mockDictation?.owner).toBe('owner-a');
  mockDictationStatus='recording';view.rerender(wrap());expect(screen.getByRole('status')).toHaveTextContent("J'écoute… 0:12 / 1:00");
  mockDictationStatus='error';mockDictationError='Micro refusé. Autorise-le dans le navigateur ou écris ta demande.';view.rerender(wrap());
  expect(screen.getByRole('alert')).toHaveTextContent(mockDictationError);expect(screen.getByRole('textbox')).toBeEnabled();
});
test('a dictation fills the editable field; only Envoyer sends the corrected text',async()=>{
  const onResponse=jest.fn();mockPost.mockResolvedValue({ message:'Ajouté' });render(wrap(onResponse));
  const input=screen.getByRole('textbox');fireEvent.change(input,{ target:{ value:'Pour ce soir,' } });
  act(()=>mockDictation?.onTranscript('ajoute deux litres de lait'));
  expect(input).toHaveValue('Pour ce soir, ajoute deux litres de lait');
  expect(screen.getByText(/Texte dicté : relis-le/)).toBeInTheDocument();expect(mockPost).not.toHaveBeenCalled();
  fireEvent.change(input,{ target:{ value:'Pour ce soir, ajoute trois litres de lait' } });
  fireEvent.click(screen.getByRole('button',{ name:'Envoyer' }));
  expect(await screen.findByRole('textbox')).toHaveValue('');
  expect(mockPost).toHaveBeenCalledTimes(1);expect(mockPost.mock.calls[0][0]).toMatchObject({ text:'Pour ce soir, ajoute trois litres de lait',expectedUserId:'owner-a' });
  expect(onResponse).toHaveBeenCalledWith({ message:'Ajouté' });
});
