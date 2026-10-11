import { ContextBuilder, CONTEXT_BUILDER_LIMITS } from '../ContextBuilder.js';
import { MemoryService } from '../MemoryService.js';
import { emptyNutritionProfile } from '@smart/shared';
import { memory, policy, summary, message, session, USER, CONV } from '../__fixtures__/memory.js';
const profile = (share:boolean) => ({ profile:{ user_id:USER, version:2, schema_version:1 as const, origin:'explicit' as const, updated_at:null,
  settings:{ ...emptyNutritionProfile(),consent:true,shareWithAssistant:share,allergies:['lait'] } },legacyServerPresent:false });
function stub(share=false) {
  const service = { readPolicySafe:jest.fn(async()=>policy({ shareProfile:share })),
    modelMemories:jest.fn(async()=>[memory()]), modelArtifacts:jest.fn(async()=>({ messages:[message()],summary:summary(),session:[session()],privateTerms:[] })) };
  return { service, builder:new ContextBuilder(service as unknown as MemoryService,async()=>profile(share)) };
}
test('unknown permissions yield no stored data', async()=>{
  const {service,builder}=stub();service.readPolicySafe.mockResolvedValueOnce(null);
  expect((await builder.build(USER,CONV)).combinedText).toBe('');expect(service.modelMemories).not.toHaveBeenCalled();
});
test('allowed complementary memory, recent history, summary and current meal keep references',async()=>{
  const {builder}=stub();const block=await builder.build(USER,CONV);
  expect(block.combinedText).toContain('plats épicés');expect(block.combinedText).toContain('soupe');expect(block.combinedText).toContain('Ce soir');
  expect(block.references).toEqual([{ id:memory().id,version:1,destination:'memory',source:'user_explicit' }]);
  expect(block.combinedText).not.toContain('"allergies"');expect(block.shareProfileWithModel).toBe(false);
});
test('only explicitly shared canonical profile enters context and primes its constraints',async()=>{
  const block=await stub(true).builder.build(USER,CONV);
  expect(block.combinedText).toContain('"allergies":["lait"]');expect(block.combinedText).toContain('Le profil confirmé prime');
});
test('failed canonical read cannot silently authorize another profile path',async()=>{
  const {service}=stub(true);const builder=new ContextBuilder(service as unknown as MemoryService,async()=>{throw new Error('offline');});
  expect((await builder.build(USER,CONV)).combinedText).toBe('');
});
test('limits are requested after shared filtering and the model budget remains bounded',async()=>{
  const {service,builder}=stub();service.modelMemories.mockResolvedValueOnce([memory({ content:'x'.repeat(20000) })]);
  const block=await builder.build(USER,CONV);
  expect(service.modelMemories).toHaveBeenCalledWith(USER,policy(),8);
  expect(block.tokenEstimate).toBeLessThanOrEqual(CONTEXT_BUILDER_LIMITS.maxTokensEstimate);
});
