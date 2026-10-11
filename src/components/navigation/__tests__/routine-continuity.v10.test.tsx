import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RoutineHeader from '../RoutineHeader';
let mockOwner='owner-a';let mockSequence=0;const mockPost=jest.fn();
jest.mock('@/hooks/useAuthenticatedUser',()=>({useAuthenticatedUser:()=>({id:mockOwner})}));
jest.mock('@/hooks/useFamilyMode',()=>({useFamilyMode:()=>({canAccessSection:()=>true,isFamilyModeActive:false})}));
jest.mock('@/services/assistantApi',()=>({postAssistantText:(...a:unknown[])=>mockPost(...a),newClientRequestId:()=>`request-${++mockSequence}`}));
jest.mock('@/services/cookingSessions',()=>({CookingSessionSchema:{safeParse:()=>({success:false})}}));
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
test('changing accounts never reuses the previous account conversation or reply',async()=>{
  mockPost.mockResolvedValue(reply('conversation-a'));const view=render(page());fireEvent.click(screen.getByRole('button',{name:'Aide'}));await ask('Question du compte A');
  mockOwner='owner-b';view.rerender(page());expect(screen.queryByText('Réponse fictive')).not.toBeInTheDocument();await ask('Question du compte B');
  expect(mockPost.mock.calls[1][0]).toMatchObject({expectedUserId:'owner-b'});expect(mockPost.mock.calls[1][0].conversationId).toBeUndefined();
});
