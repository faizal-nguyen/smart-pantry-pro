import { act,renderHook,waitFor } from '@testing-library/react';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { useRoutinePreferences } from '../useRoutinePreferences';
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002';
let mockOwner=A;
const mockServer={ user_id:A,introduction:'new',stock_view:'list',updated_at:'' };
const mockUpsert=jest.fn();
jest.mock('../useAuthenticatedUser',()=>({ useAuthenticatedUser:()=>({ id:A }) }));
jest.mock('@/integrations/supabase/client',()=>({ supabase:{
  auth:{ getSession:async()=>({ data:{ session:{ user:{ id:mockOwner } } } }) },
  from:()=>{ let patch:Record<string,unknown>|null=null;const query={ select:()=>query,eq:()=>query,maybeSingle:async()=>({ data:{ ...mockServer },error:null }),upsert:(value:Record<string,unknown>)=>{ mockUpsert(value);patch=value;return query; },single:async()=>{ Object.assign(mockServer,patch);return { data:{ ...mockServer },error:null }; } };return query; },
} }));
function createWrapper() {
  const client = new QueryClient({ defaultOptions:{ queries:{ retry:false } } });
  return function Wrapper({ children }:PropsWithChildren) { return <QueryClientProvider client={client}>{children}</QueryClientProvider>; };
}
beforeEach(()=>{ mockOwner=A;Object.assign(mockServer,{ introduction:'new',stock_view:'list' });jest.clearAllMocks(); });
test('a stale device changing stock layout cannot reset the introduction completed on another device',async()=>{
  const { result }=renderHook(()=>useRoutinePreferences(),{ wrapper:createWrapper() });
  await waitFor(()=>expect(result.current.isSuccess).toBe(true));
  mockServer.introduction='skipped';
  await act(async()=>{ await result.current.update({ stock_view:'grid' }); });
  expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({ user_id:A,stock_view:'grid' }));
  expect(mockUpsert.mock.calls[0][0]).not.toHaveProperty('introduction');
  await waitFor(()=>expect(result.current.data?.introduction).toBe('skipped'));
  const another=renderHook(()=>useRoutinePreferences(),{ wrapper:createWrapper() });
  await waitFor(()=>expect(another.result.current.data?.introduction).toBe('skipped'));
});
test('switching account before saving never writes the previous account preferences',async()=>{
  const { result }=renderHook(()=>useRoutinePreferences(),{ wrapper:createWrapper() });
  await waitFor(()=>expect(result.current.isSuccess).toBe(true));mockOwner=B;
  await expect(result.current.update({ introduction:'skipped' })).rejects.toThrow('Reconnectez');
  expect(mockUpsert).not.toHaveBeenCalled();
});
