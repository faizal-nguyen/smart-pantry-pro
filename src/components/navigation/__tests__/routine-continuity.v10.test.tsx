import { act,fireEvent,render,screen,waitFor } from '@testing-library/react';
import type { UseDictationOptions } from '@/hooks/useDictation';
import { MemoryRouter } from 'react-router-dom';
import RoutineHeader from '../RoutineHeader';
let mockOwner='owner-a';let mockSequence=0;const mockPost=jest.fn();
jest.mock('@/hooks/useAuthenticatedUser',()=>({useAuthenticatedUser:()=>({id:mockOwner})}));
jest.mock('@/hooks/useFamilyMode',()=>({useFamilyMode:()=>({canAccessSection:()=>true,isFamilyModeActive:false})}));
jest.mock('@/services/assistantApi',()=>({postAssistantText:(...a:unknown[])=>mockPost(...a),newClientRequestId:()=>`request-${++mockSequence}`}));
jest.mock('@/services/cookingSessions',()=>({CookingSessionSchema:{safeParse:()=>({success:false})}}));
let mockDictation:UseDictationOptions|null=null;const mockCancel=jest.fn();
jest.mock('@/hooks/useDictation',()=>({...jest.requireActual('@/hooks/useDictation'),
  useDictation:(options:UseDictationOptions)=>{mockDictation=options;return {status:'idle',recordingMs:0,error:null,toggle:jest.fn(),cancel:mockCancel};}}));
const page=()=> <MemoryRouter initialEntries={['/inventory']}><RoutineHeader /></MemoryRouter>;
const reply=(id?:string,revision=4)=>({message:'Réponse fictive',conversation_id:id,memory_revision:revision});
async function ask(text:string) {fireEvent.change(screen.getByRole('textbox',{name:'Votre question'}),{target:{value:text}});fireEvent.click(screen.getByRole('button',{name:'Demander'}));await waitFor(()=>expect(screen.getByRole('button',{name:'Demander'})).toBeEnabled());}
beforeEach(()=>{localStorage.clear();mockOwner='owner-a';mockSequence=0;mockPost.mockReset();});
test('two questions continue one owned task conversation; new conversation is explicit',async()=>{
  mockPost.mockResolvedValue(reply('conversation-a'));render(page());fireEvent.click(screen.getByRole('button',{name:'Aide'}));
  await ask('Première question');await ask('Et pour la cuisson ?');
  expect(mockPost.mock.calls[0][0].conversationId).toBeUndefined();expect(mockPost.mock.calls[1][0].conversationId).toBe('conversation-a');
  expect(mockPost.mock.calls[0][0].clientRequestId).not.toBe(mockPost.mock.calls[1][0].clientRequestId);
  fireEvent.click(screen.getByRole('button',{name:'Nouvelle conversation'}));await ask('Un autre repas');expect(mockPost.mock.calls[2][0].conversationId).toBeUndefined();
});
test('when history is off, bounded session context continues and is cleared after a memory change',async()=>{
  mockPost.mockResolvedValue(reply());render(page());fireEvent.click(screen.getByRole('button',{name:'Aide'}));await ask('Une soupe ?');await ask('Combien de temps ?');
  expect(mockPost.mock.calls[1][0].sessionMessages).toHaveLength(2);expect(mockPost.mock.calls[1][0].sessionRevision).toBe(4);
  fireEvent(window,new CustomEvent('assistant-memory-changed',{detail:{owner:mockOwner}}));await ask('Autre question');expect(mockPost.mock.calls[2][0].sessionMessages).toEqual([]);
  expect(Object.values(localStorage).join(' ')).not.toContain('Réponse fictive');
});
test('when history is off, a memory saved by a reply keeps the session; a revocation clears it',async()=>{
  mockPost.mockResolvedValueOnce({...reply(),memory_revision:4,history_floor:4})
    .mockResolvedValueOnce({...reply(),memory_revision:5,history_floor:4})
    .mockResolvedValueOnce({...reply(),memory_revision:6,history_floor:6}).mockResolvedValue(reply(undefined,6));
  render(page());fireEvent.click(screen.getByRole('button',{name:'Aide'}));
  await ask('Une soupe ?');await ask('J’aime les tomates');await ask('Et avec quoi ?');
  expect(mockPost.mock.calls[2][0].sessionMessages).toHaveLength(4);expect(mockPost.mock.calls[2][0].sessionRevision).toBe(5);
  // The revoking reply drops the earlier turns and keeps only its own.
  await ask('Autre question');expect(mockPost.mock.calls[3][0].sessionMessages.map((m:{content:string})=>m.content)).toEqual(['Et avec quoi ?','Réponse fictive']);
});
test('changing accounts never reuses the previous account conversation or reply',async()=>{
  mockPost.mockResolvedValue(reply('conversation-a'));const view=render(page());fireEvent.click(screen.getByRole('button',{name:'Aide'}));await ask('Question du compte A');
  mockOwner='owner-b';view.rerender(page());expect(screen.queryByText('Réponse fictive')).not.toBeInTheDocument();await ask('Question du compte B');
  expect(mockPost.mock.calls[1][0]).toMatchObject({expectedUserId:'owner-b'});expect(mockPost.mock.calls[1][0].conversationId).toBeUndefined();
});
test('a dictated question is shown for review and asked with the same read-only scope',async()=>{
  mockPost.mockResolvedValue(reply('conversation-a'));render(page());fireEvent.click(screen.getByRole('button',{name:'Aide'}));
  expect(mockDictation?.owner).toBe('owner-a');
  fireEvent.change(screen.getByRole('textbox',{name:'Votre question'}),{target:{value:'Ce lait,'}});
  act(()=>mockDictation?.onTranscript('il se garde combien de temps ?'));
  expect(screen.getByRole('textbox',{name:'Votre question'})).toHaveValue('Ce lait, il se garde combien de temps ?');expect(mockPost).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Demander'}));await waitFor(()=>expect(mockPost).toHaveBeenCalledTimes(1));
  expect(mockPost.mock.calls[0][0].text).toContain('Ce lait, il se garde combien de temps ?');
  expect(mockPost.mock.calls[0][0].allowedTools).toEqual(['read_inventory','read_shopping_list','search_recipes','suggest_recipes_for_context','read_user_memories','ask_clarification']);
  mockCancel.mockClear();fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});await waitFor(()=>expect(mockCancel).toHaveBeenCalled());
});

test('recipe menu opens by keyboard and exposes the library and weekly menus',async()=>{
  render(page());
  const trigger=screen.getByRole('button',{name:'Recettes'});
  trigger.focus();
  fireEvent.keyDown(trigger,{key:'Enter',code:'Enter'});
  expect(await screen.findByRole('menuitem',{name:'Toutes les recettes'})).toHaveAttribute('href','/kitchen/recipes');
  expect(screen.getByRole('menuitem',{name:'Menus'})).toHaveAttribute('href','/kitchen/meal-planning');
  fireEvent.keyDown(screen.getByRole('menu'),{key:'Escape',code:'Escape'});
  await waitFor(()=>expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  expect(screen.getByRole('link',{name:'Kitchen OS — accueil'})).toHaveAttribute('href','/kitchen');
});
