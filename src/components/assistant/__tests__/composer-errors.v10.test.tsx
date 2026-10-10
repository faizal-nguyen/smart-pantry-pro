import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AssistantComposer from '../AssistantComposer';
import type { AssistantPlanResponse } from '@/services/assistantApi';
const mockPost=jest.fn();let mockVoiceStatus='idle';
const mockToggle=jest.fn();let mockVoiceError:string|null=null;let mockVoiceResult:AssistantPlanResponse|null=null;
jest.mock('@/hooks/useAssistantVoice',()=>({ useAssistantVoice:()=>({ status:mockVoiceStatus,toggleRecording:mockToggle,error:mockVoiceError,result:mockVoiceResult }) }));
jest.mock('@/services/assistantApi',()=>({ postAssistantText:(...args:unknown[])=>mockPost(...args),newClientRequestId:()=> 'request',patchAssistantConversation:jest.fn() }));
jest.mock('../AssistantModePicker',()=>({ __esModule:true,default:()=>null }));
jest.mock('@/hooks/use-toast',()=>({ useToast:()=>({ toast:jest.fn() }) }));
const wrap=()=> <QueryClientProvider client={new QueryClient()}><AssistantComposer /></QueryClientProvider>;
beforeEach(()=>{ mockPost.mockReset();mockToggle.mockReset();mockVoiceStatus='idle';mockVoiceError=null;mockVoiceResult=null; });
test('a rejected response leaves a visible error, the question and the input focus',async()=>{
  mockPost.mockRejectedValue(new Error('Réponse non confirmée.'));render(wrap());
  const input=screen.getByRole('textbox',{ name:"Message à envoyer à l'assistant" });
  fireEvent.change(input,{ target:{ value:'Par quoi remplacer la farine ?' } });
  fireEvent.click(screen.getByRole('button',{ name:'Envoyer' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Réponse non confirmée.');
  expect(input).toHaveValue('Par quoi remplacer la farine ?');expect(input).toHaveFocus();
});
test('sending stays disabled while an audio transcription is in progress',()=>{
  const view=render(wrap());fireEvent.change(screen.getByRole('textbox'),{ target:{ value:'Une question' } });
  mockVoiceStatus='processing';view.rerender(wrap());
  expect(screen.getByRole('button',{ name:'Envoyer' })).toBeDisabled();expect(mockPost).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByRole('textbox'),{ key:'Enter' });expect(mockPost).not.toHaveBeenCalled();
});
test('the microphone uses the existing toggle contract and exposes its error',()=>{
  const view=render(wrap());fireEvent.click(screen.getByRole('button',{ name:'Démarrer un enregistrement vocal' }));
  expect(mockToggle).toHaveBeenCalledTimes(1);
  mockVoiceStatus='error';mockVoiceError='Microphone indisponible. Tu peux écrire ta question.';view.rerender(wrap());
  expect(screen.getByRole('alert')).toHaveTextContent(mockVoiceError);expect(screen.getByRole('textbox')).toBeEnabled();
});
test('a voice result reaches the conversation once, including after parent rerender',()=>{
  const onResponse=jest.fn();const page=()=> <QueryClientProvider client={new QueryClient()}><AssistantComposer onResponse={response=>onResponse(response)} /></QueryClientProvider>;
  const view=render(page());mockVoiceResult={ conversation_id:'conversation-test',session_id:'session-test',transcript:'Une question',message:'Une réponse',actions_executed:[],actions_pending:[],confirmation_token:null,cost:{ whisper_usd:0,llm_usd:0,total_usd:0 },model_used:'fixture',duration_ms:1 };mockVoiceStatus='done';view.rerender(page());
  expect(onResponse).toHaveBeenCalledWith(mockVoiceResult);view.rerender(page());expect(onResponse).toHaveBeenCalledTimes(1);
});
