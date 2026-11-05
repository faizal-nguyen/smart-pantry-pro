import { allowedMemory, allowedMessage, allowedSummary, allowedSession, privateProfileTerms, sameMemoryPolicy } from '../MemoryPolicy.js';
import { memoryModelToolResult } from '../MemoryModelOutput.js';
import { emptyNutritionProfile, keepsSessionTurns } from '@smart/shared';
import { policy, memory, message, summary, session, OTHER, CONV } from '../__fixtures__/memory.js';

test('personal consultation does not grant provider sharing', () => {
  const row = memory({ sensitivity:'health_sensitive', destination:'profile' });
  expect(allowedMemory(row,policy({ memoryEnabled:false }), 'personal_ui')).toBe(true);
  expect(allowedMemory(row,policy(), 'model_tool')).toBe(false);
});
test('expired new memories and messages are not readable or reusable', () => {
  expect(allowedMemory(memory({ expires_at: '2000-01-01' }), policy(), 'personal_ui')).toBe(false);
  expect(allowedMessage(message({ expires_at: '2000-01-01' }), policy())).toBe(false);
});
test.each([
  { status:'candidate' },{ status:'deleted' },{ source:'assistant_inferred' },{ user_id:OTHER },
  { version:0 },{ payload:null },{ destination:'profile' },{ content:'Je suis allergique au lait' },
  { expires_at:'2000-01-01' },{ expires_at:'invalid' },{ policy_revision:5 },{ approved_at:null },
])('stored fact rejected in both model paths: %j', changes => {
  const row = memory(changes as Parameters<typeof memory>[0]);
  for (const purpose of ['model_context','model_tool','deterministic'] as const) expect(allowedMemory(row,policy(),purpose)).toBe(false);
});
test('confirmed complementary taste is permitted; ordinary profile preferences are not', () => {
  expect(allowedMemory(memory(),policy(),'model_context')).toBe(true);
  expect(allowedMemory(memory({ content:'J’aime le lait' }),policy(),'model_context')).toBe(false);
  expect(allowedMemory(memory(),policy({ memoryEnabled:false }),'deterministic')).toBe(false);
});
test('old revisions and unshared profile terms never return through history or summaries', () => {
  const terms = privateProfileTerms({ ...emptyNutritionProfile(),consent:true,allergies:['cacahuètes'] });
  expect(allowedMessage(message(),policy())).toBe(true);
  expect(allowedMessage(message({ policy_revision:3 }),policy())).toBe(false);
  expect(allowedMessage(message({ content:'Utilise des cacahuètes' }),policy(),terms)).toBe(false);
  expect(allowedSummary(summary({ summary:'Je suis allergique au lait' }),policy())).toBe(false);
  expect(allowedSummary(summary({ policy_revision:3 }),policy())).toBe(false);
  expect(allowedSummary(summary(),policy({ saveHistory:false }))).toBe(false);
  expect(allowedSession(session({ conversation_id:OTHER }),policy(),CONV)).toBe(false);
  expect(allowedSession(session({ expires_at:'2000-01-01' }),policy(),CONV)).toBe(false);
  expect(allowedSession(session(),policy(),CONV)).toBe(true);
});
test('tool synthesis validates revisions and sends technical write status without raw preference', () => {
  expect(memoryModelToolResult('read_user_memories',{ policy_revision:3,memories:[{ content:'secret' }] },policy())).toEqual({ status:'unavailable' });
  expect(memoryModelToolResult('search_conversation_history',{ policy_revision:4,matches:[{ snippet:'secret' }] },policy({ saveHistory:false }))).toEqual({ status:'unavailable' });
  expect(memoryModelToolResult('remember_preference',{ status:'disabled',content:'allergie lait',evidence:{ quote:'private' } },policy())).toEqual({ status:'disabled' });
  expect(JSON.stringify(memoryModelToolResult('other',{ id:'x',profile:{ allergies:['lait'] },personal_notes:'secret' },policy()))).not.toContain('lait');
});
test('a revoked snapshot or a failed permission read is never equivalent', () => {
  expect(sameMemoryPolicy(policy(),null)).toBe(false);
  expect(sameMemoryPolicy(policy(),policy({ revision:5 }))).toBe(false);
  expect(sameMemoryPolicy(policy(),policy({ memoryEnabled:false }))).toBe(false);
  expect(sameMemoryPolicy(policy(),policy())).toBe(true);
});

describe('the assistant keeps its thread (audit 2026-11-04)',()=>{
  const floor=policy({ historyFloor:2 });
  test('a memory saved later does not hide the messages, summary and session written before it',()=>{
    expect(allowedMessage(message({ policy_revision:3 }),floor)).toBe(true);
    expect(allowedSummary(summary({ policy_revision:2 }),floor)).toBe(true);
    expect(allowedSession(session({ policy_revision:3 }),floor,CONV)).toBe(true);
    expect(memoryModelToolResult('read_user_memories',{ policy_revision:3,memories:[] },floor)).toEqual({ policy_revision:3,memories:[] });
  });
  test('what came before a revocation, or claims a future revision, stays out',()=>{
    expect(allowedMessage(message({ policy_revision:1 }),floor)).toBe(false);
    expect(allowedMessage(message({ policy_revision:5 }),floor)).toBe(false);
    expect(allowedSummary(summary({ policy_revision:1 }),floor)).toBe(false);
    expect(allowedSession(session({ policy_revision:1 }),floor,CONV)).toBe(false);
    expect(memoryModelToolResult('read_user_memories',{ policy_revision:1,memories:[{ content:'secret' }] },floor)).toEqual({ status:'unavailable' });
  });
  test('only a revocation changes the policy seen by an ongoing turn',()=>{
    expect(sameMemoryPolicy(floor,policy({ revision:5,historyFloor:2 }))).toBe(true);
    expect(sameMemoryPolicy(floor,policy({ revision:5,historyFloor:5 }))).toBe(false);
  });
  test.each(['Vous préférez les plats doux.','Voici 3 idées : 1. Curry 2. Gratin. Si tu préfères, une omelette.',
    'Je n’aime pas les champignons','Souviens-toi que je préfère les plats épicés','D’habitude on laisse reposer la pâte.'])(
    'the thread keeps what was said: %s',content=>expect(allowedMessage(message({ content }),policy())).toBe(true));
  test('a summary may keep a preference of the conversation',()=>
    expect(allowedSummary(summary({ summary:'Vous aimez les plats épicés.' }),policy())).toBe(true));
  test('an unshared profile term is matched as a word: « four » hides the oven, not the fork',()=>{
    const terms=privateProfileTerms({ ...emptyNutritionProfile(),consent:true,equipment:['four'] });
    expect(allowedMessage(message({ content:'Préchauffe le four.' }),policy(),terms)).toBe(false);
    expect(allowedMessage(message({ content:'Prends une fourchette.' }),policy(),terms)).toBe(true);
    expect(allowedMessage(message({ content:'Préchauffe le four.' }),policy({ shareProfile:true }),terms)).toBe(true);
  });
  test.each([['arachide','Une recette sans arachides'],['champignons','Un champignon de Paris'],['œufs','Deux oeufs'],['noix','Des noix de cajou']])(
    'an unshared profile term %s is hidden in singular and plural: %s',(term,content)=>{
      const terms=privateProfileTerms({ ...emptyNutritionProfile(),consent:true,avoidedIngredients:[term] });
      expect(allowedMessage(message({ content }),policy(),terms)).toBe(false);
    });
  test('client session turns survive a new memory, not a revocation; older APIs keep the old rule',()=>{
    expect(keepsSessionTurns(4,{ memory_revision:5,history_floor:2 })).toBe(true);
    expect(keepsSessionTurns(4,{ memory_revision:5,history_floor:5 })).toBe(false);
    expect(keepsSessionTurns(undefined,{ memory_revision:5,history_floor:2 })).toBe(false);
    expect(keepsSessionTurns(4,{ memory_revision:4 })).toBe(true);
    expect(keepsSessionTurns(4,{ memory_revision:5 })).toBe(false);
    expect(keepsSessionTurns(undefined,{})).toBe(true);
  });
});
test('old meal context expires in message reuse, and cannot become a durable summary',()=>{
  expect(allowedMessage(message({content:'Ce soir, pas épicé',created_at:'2020-01-01T00:00:00Z'}),policy())).toBe(false);
  expect(allowedSummary(summary({summary:'Ce soir, pas épicé.'}),policy())).toBe(false);
});
test('a mismatching structured taste and displayed content is rejected before ranking or model use',()=>{
  expect(allowedMemory(memory({content:'Je préfère les plats doux.'}),policy(),'deterministic')).toBe(false);
});
