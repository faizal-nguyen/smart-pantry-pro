import { MemoryService } from '../MemoryService.js';
import { clientFixture, policy, memory, command, receipt, USER, OTHER, CID, CONV, MEM } from '../__fixtures__/memory.js';

test('settings read failure, malformed policy and mismatched owner fail closed', async () => {
  const f = clientFixture(); const service = new MemoryService(f.client);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  for (const failure of [{ data: null, error: { message: 'offline' } }, { data: policy({ userId: OTHER }), error: null }, { data: {}, error: null }]) {
    f.rpc.mockResolvedValueOnce(failure).mockResolvedValueOnce(failure);
    expect(await service.readPolicySafe(USER)).toBeNull();
  }
});
test('a brief policy read failure is retried once instead of reading as a revocation', async () => {
  const f = clientFixture(); const service = new MemoryService(f.client);
  f.rpc.mockResolvedValueOnce({ data: null, error: { message: 'timeout' } });
  expect(await service.readPolicySafe(USER)).toEqual(policy());
  expect(f.rpc).toHaveBeenCalledTimes(2);
});
test('the thread lists its latest messages, oldest first (it stopped at the 50 oldest)', async () => {
  const f = clientFixture({ assistant_messages: { data: [{ id: 'm3', created_at: '3' }, { id: 'm2', created_at: '2' }] } });
  const page = await new MemoryService(f.client).listMessages(CONV, USER, { limit: 2 });
  expect(page).toEqual({ items: [{ id: 'm2', created_at: '2' }, { id: 'm3', created_at: '3' }], nextCursor: null });
  expect(f.calls).toContainEqual({ table: 'assistant_messages', method: 'order', args: ['created_at', { ascending: false }] });
});
test('older messages use a stable timestamp/id cursor and do not disappear after the latest page',async()=>{
  const ids=['33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111'];
  const f=clientFixture({assistant_messages:{data:ids.map(id=>({id,created_at:'2026-11-10T10:00:00Z'}))}});
  const service=new MemoryService(f.client),page=await service.listMessages(CONV,USER,{limit:2});
  expect(page.items.map(r=>r.id)).toEqual([ids[1],ids[0]]);expect(page.nextCursor).toBeTruthy();
  await service.listMessages(CONV,USER,{limit:2,cursor:page.nextCursor!});
  expect(f.calls).toContainEqual({table:'assistant_messages',method:'or',args:[expect.stringContaining('id.lt.'+ids[1])]});
});
test('authorized global search still rejects expired, revoked, foreign and unshared profile messages',async()=>{
  const f=clientFixture({nutrition_profiles:{data:{settings:{}}}});
  const base={user_id:USER,id:CID,conversation_id:CONV,role:'user',content:'Une soupe',policy_revision:4,created_at:'2026-11-10T00:00:00Z'};
  f.rpc.mockResolvedValue({data:[{source:'message',record:base},{source:'message',record:{...base,user_id:OTHER}},
    {source:'message',record:{...base,policy_revision:0}},{source:'message',record:{...base,expires_at:'2000-01-01'}}] as never,error:null});
  const result=await new MemoryService(f.client).searchAuthorizedHistory(USER,policy({historyFloor:3}),'soupe');
  expect(result).toHaveLength(1);expect(result[0].snippet).toBe('Une soupe');
});
test('authenticated command envelope is validated before RPC; no admin memory inserts', async () => {
  const admin = clientFixture(), user = clientFixture(); user.rpc.mockResolvedValueOnce({ data: receipt(), error: null });
  const service = new MemoryService(admin.client);
  expect(await service.executeCommand(USER, command(), user.client)).toEqual(receipt());
  expect(user.rpc).toHaveBeenCalledWith('execute_assistant_memory_command', { p_command: command() });
  expect(admin.rpc).not.toHaveBeenCalled();
  await expect(service.executeCommand(USER, { ...command(), payload: undefined }, user.client)).rejects.toThrow();
  expect(user.rpc).toHaveBeenCalledTimes(1);
});
test.each(['MEMORY_VERSION_CONFLICT', 'MEMORY_REVISION_CONFLICT', 'MEMORY_SEMANTIC_CONFLICT', 'PROFILE_VERSION_CONFLICT'])('known conflict %s is qualified, never retried as a new effect', async message => {
  const admin = clientFixture(), user = clientFixture(); user.rpc.mockResolvedValueOnce({ data: null, error: { message } });
  await expect(new MemoryService(admin.client).executeCommand(USER, command(), user.client)).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
  expect(user.rpc).toHaveBeenCalledTimes(1);
});
test('lost reply checks the scoped receipt and uncertain write stays verification_required', async () => {
  const admin = clientFixture({ assistant_memory_commands: { data: { result: receipt() } } }), user = clientFixture();
  user.rpc.mockResolvedValueOnce({ data: null, error: { message: 'transport lost' } });
  expect(await new MemoryService(admin.client).executeCommand(USER, command(), user.client)).toMatchObject({ ...receipt(), replayed: true });
  expect(admin.calls).toContainEqual({ table: 'assistant_memory_commands', method: 'eq', args: ['user_id', USER] });
  const failedAdmin = clientFixture({ assistant_memory_commands: { data: null, error: { message: 'offline' } } });
  user.rpc.mockResolvedValueOnce({ data: null, error: { message: 'transport lost' } });
  expect(await new MemoryService(failedAdmin.client).executeCommand(USER, command(), user.client)).toMatchObject({ command_id: CID, status: 'verification_required' });
});
test('missing migration has a known not_saved result', async () => {
  const user = clientFixture(); user.rpc.mockResolvedValueOnce({ data: null, error: { message: 'missing function', code: 'PGRST202' } });
  expect(await new MemoryService(user.client).executeCommand(USER, command(), user.client)).toMatchObject({ status: 'not_saved', reason: 'migration_required' });
});
test('legacy writers cannot bypass commands or promote sensitive facts', async () => {
  const f = clientFixture(); const service = new MemoryService(f.client);
  await expect(service.createMemory(USER, { kind: 'preference', content: 'allergie lait' })).rejects.toMatchObject({ code: 'COMMAND_REQUIRED' });
  await expect(service.patchMemory(MEM, USER, { status: 'active' })).rejects.toMatchObject({ code: 'COMMAND_REQUIRED' });
  await expect(service.forgetMemory(MEM, USER)).rejects.toMatchObject({ code: 'COMMAND_REQUIRED' });
  await expect(service.promoteCandidate(MEM, USER)).rejects.toMatchObject({ code: 'COMMAND_REQUIRED' });
  expect(f.calls).toEqual([]);
});
test('filtering precedes the eight-memory limit and rejects legacy, expired, foreign and profile rows', async () => {
  const forbidden = Array.from({ length: 12 }, (_,i) => memory({ id: 'old-' + i, sensitivity: 'health_sensitive', content: 'allergie lait' }));
  const f = clientFixture({ assistant_memory_items: { data: [...forbidden, memory({ id: 'allowed' }), memory({ id: 'legacy', version: 0 }),
    memory({ user_id: OTHER }), memory({ destination: 'profile' }), memory({ expires_at: '2000-01-01' })] } });
  const rows = await new MemoryService(f.client).modelMemories(USER, policy(), 8);
  expect(rows.map(row => row.id)).toEqual(['allowed']);
  expect(f.calls).toContainEqual({ table: 'assistant_memory_items', method: 'limit', args: [200] });
});
test('artifact writes carry a frozen revision and never persist with history disabled', async () => {
  const f = clientFixture(); const service = new MemoryService(f.client);
  expect(await service.persistArtifact(USER, policy({ saveHistory: false }), 'message', { content: 'secret' })).toBeNull();
  expect(f.rpc).not.toHaveBeenCalled();
  f.rpc.mockResolvedValueOnce({ data: null, error: null });
  await expect(service.recordMessage(CONV, USER, { role: 'assistant', content: 'answer', policy: policy() })).rejects.toMatchObject({ code: 'DISABLED' });
  expect(f.rpc).toHaveBeenCalledWith('persist_assistant_memory_artifact', expect.objectContaining({ p_user_id: USER, p_revision: 4 }));
});
test('an extraction retry reads its old receipt before choosing a new revision/version', async () => {
  const f = clientFixture({ assistant_memory_commands: { data: { result: receipt() } } });
  expect(await new MemoryService(f.client).saveExtractedFact(USER,CID,'new text','preference','user_explicit',f.client)).toMatchObject({ replayed:true });
  expect(f.rpc).not.toHaveBeenCalled();
});
