import {renderHook,waitFor,act} from '@testing-library/react';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import type {ReactNode} from 'react';
import {useState} from 'react';
import {useAssistantConversations,useAssistantMessages} from '../useAssistantConversations';
import {getAssistantConversations,getAssistantMessages} from '@/services/assistantApi';
jest.mock('../useAuthenticatedUser',()=>({useAuthSessionOptional:()=>({user:{id:'owner'}})}));
jest.mock('@/services/assistantApi',()=>({getAssistantConversations:jest.fn(),getAssistantMessages:jest.fn()}));
const conversations=jest.mocked(getAssistantConversations),messages=jest.mocked(getAssistantMessages);
function Wrapper({children}:{children:ReactNode}){const [client]=useState(()=>new QueryClient({defaultOptions:{queries:{retry:false}}}));return <QueryClientProvider client={client}>{children}</QueryClientProvider>;}
test('conversation pagination keeps owner scope and combines pages without duplicate rows',async()=>{
  conversations.mockResolvedValueOnce({items:[{id:'a'}],nextCursor:'older'} as never)
    .mockResolvedValueOnce({items:[{id:'a'},{id:'b'}],nextCursor:null} as never);
  const {result}=renderHook(()=>useAssistantConversations(),{wrapper:Wrapper});
  await waitFor(()=>expect(result.current.hasMore).toBe(true));
  await act(async()=>{await result.current.loadMore();});
  await waitFor(()=>expect(result.current.conversations.map(r=>r.id)).toEqual(['a','b']));
  expect(conversations).toHaveBeenLastCalledWith(expect.objectContaining({cursor:'older'}),{expectedUserId:'owner'});
});
test('loading older messages prepends them and keeps the latest reply at the end',async()=>{
  messages.mockResolvedValueOnce({items:[{id:'recent-user'},{id:'recent-reply'}],nextCursor:'before'} as never)
    .mockResolvedValueOnce({items:[{id:'old-user'},{id:'old-reply'}],nextCursor:null} as never);
  const {result}=renderHook(()=>useAssistantMessages('conversation'),{wrapper:Wrapper});
  await waitFor(()=>expect(result.current.hasMore).toBe(true));
  await act(async()=>{await result.current.loadMore();});
  await waitFor(()=>expect(result.current.messages.map(r=>r.id)).toEqual(['old-user','old-reply','recent-user','recent-reply']));
});
