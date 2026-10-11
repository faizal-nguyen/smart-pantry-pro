import { act,renderHook,waitFor } from '@testing-library/react';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { useAssistantMemories } from '../useAssistantMemories';
import { readPendingMemoryCommand } from '@/lib/assistantMemoryCommands';
import type { MemoryWriteResult } from '@smart/shared';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',MID='33333333-3333-4333-8333-333333333333',CID='44444444-4444-4444-8444-444444444444';
let mockOwner=A;
const mockList=jest.fn(),mockPolicy=jest.fn(),mockReceipt=jest.fn(),mockExecute=jest.fn();
jest.mock('@/hooks/useAuthenticatedUser',()=>({useAuthSessionOptional:()=>({user:{id:mockOwner}})}));
jest.mock('@/lib/api',()=>({ApiError:class ApiError extends Error {status=409;}}));
jest.mock('@/services/assistantApi',()=>({getAssistantMemories:(...a:unknown[])=>mockList(...a),getAssistantMemoryPolicy:(...a:unknown[])=>mockPolicy(...a),
  getAssistantMemoryReceipt:(...a:unknown[])=>mockReceipt(...a),executeAssistantMemoryCommand:(...a:unknown[])=>mockExecute(...a),newClientRequestId:()=>CID}));
const row={id:MID,user_id:A,kind:'preference' as const,status:'active' as const,content:'Je préfère les plats épicés.',version:1};
const saved:MemoryWriteResult={command_id:CID,operation:'forget',status:'saved',memory_id:MID,version:2,destination:'memory',policy_revision:5,profile_version:null,reason:null};
function mount(client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})) {
  const wrapper=({children}:{children:React.ReactNode})=><QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return {...renderHook(()=>useAssistantMemories(),{wrapper}),client};
}
beforeEach(()=>{sessionStorage.clear();mockOwner=A;[mockList,mockPolicy,mockReceipt,mockExecute].forEach(m=>m.mockReset());
  mockList.mockResolvedValue({items:[row],nextCursor:null});mockPolicy.mockImplementation(async(owner:string)=>({userId:owner,revision:4,memoryEnabled:true,saveHistory:true,shareProfile:false,profileVersion:2}));mockReceipt.mockResolvedValue(null);});
test('uncertain write keeps the exact command across policy changes and replay',async()=>{
  mockExecute.mockResolvedValueOnce({...saved,status:'verification_required'}).mockResolvedValueOnce(saved);
  const h=mount();await waitFor(()=>expect(h.result.current.policy).toBeDefined());
  await act(async()=>{await h.result.current.execute(row as never,'forget');});
  const frozen=readPendingMemoryCommand(A);expect(frozen).toMatchObject({command_id:CID,expected_version:1,expected_revision:4});
  mockPolicy.mockResolvedValue({userId:A,revision:19,memoryEnabled:false,saveHistory:false,shareProfile:false,profileVersion:7});
  await act(async()=>{await h.result.current.refetch();});
  await act(async()=>{await h.result.current.verifyPending();});
  expect(mockExecute.mock.calls[1]).toEqual(mockExecute.mock.calls[0]);expect(readPendingMemoryCommand(A)).toBeNull();
});
test('a lost response is recovered from its receipt after remount without a second write',async()=>{
  mockExecute.mockRejectedValue(new Error('Réponse perdue'));const h=mount();await waitFor(()=>expect(h.result.current.policy).toBeDefined());
  await act(async()=>{await expect(h.result.current.execute(row as never,'forget')).rejects.toThrow('perdue');});h.unmount();
  mockReceipt.mockResolvedValue(saved);const reopened=mount();await waitFor(()=>expect(reopened.result.current.pendingCommand).not.toBeNull());
  await act(async()=>{await reopened.result.current.verifyPending();});expect(mockExecute).toHaveBeenCalledTimes(1);expect(readPendingMemoryCommand(A)).toBeNull();
});
test('late owner A completion does not clear or publish into owner B',async()=>{
  let finish:(v:MemoryWriteResult)=>void=()=>{};mockExecute.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
  const h=mount();await waitFor(()=>expect(h.result.current.policy).toBeDefined());let pending:Promise<unknown>;
  act(()=>{pending=h.result.current.execute(row as never,'forget').catch(e=>e);});
  await waitFor(()=>expect(mockExecute).toHaveBeenCalled());mockOwner=B;h.rerender();
  await act(async()=>{finish(saved);await pending!;});
  expect(h.result.current.owner).toBe(B);expect(h.result.current.pendingCommand).toBeNull();expect(readPendingMemoryCommand(A)).not.toBeNull();
});
test('unknown permissions and unavailable command storage prevent any write',async()=>{
  mockPolicy.mockRejectedValue(new Error('Autorisations indisponibles'));const h=mount();await waitFor(()=>expect(h.result.current.policyError).toBeTruthy());
  expect(()=>h.result.current.execute(row as never,'forget')).toThrow('autorisations');expect(mockExecute).not.toHaveBeenCalled();h.unmount();
  mockPolicy.mockResolvedValue({userId:A,revision:4,memoryEnabled:true,saveHistory:true,shareProfile:false,profileVersion:2});const fresh=mount();await waitFor(()=>expect(fresh.result.current.policy).toBeDefined());
  const storage=jest.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('Quota');});
  await act(async()=>{await expect(fresh.result.current.execute(row as never,'forget')).rejects.toThrow('Aucune modification');});expect(mockExecute).not.toHaveBeenCalled();storage.mockRestore();
});
test('older memories remain reachable beyond two pages with the owner-bound cursor',async()=>{
  mockList.mockImplementation(async({cursor}:{cursor?:string})=>cursor==='page-three'
    ? {items:[{...row,id:'third'}],nextCursor:null}
    : cursor==='page-two' ? {items:[{...row,id:'second'}],nextCursor:'page-three'}
    : {items:[row],nextCursor:'page-two'});
  const h=mount();await waitFor(()=>expect(h.result.current.memories).toHaveLength(1));
  await act(async()=>{await h.result.current.loadMore();});
  await waitFor(()=>expect(h.result.current.memories).toHaveLength(2));
  await act(async()=>{await h.result.current.loadMore();});
  await waitFor(()=>expect(h.result.current.memories).toHaveLength(3));
  expect(h.result.current.memories.map(m=>m.id)).toEqual([MID,'second','third']);
  expect(h.result.current.hasMore).toBe(false);
  expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({cursor:'page-three'}),{expectedUserId:A});
  expect(mockExecute).not.toHaveBeenCalled();
});
