import express from 'express';
import request from 'supertest';
import { emptyNutritionProfile,type ProfileWrite } from '@smart/shared';
import type { SupabaseClient,User } from '@supabase/supabase-js';
import { createNutritionProfileRouter } from '../settings.nutrition.routes.js';
const OWNER='00000000-0000-4000-8000-000000000001',OTHER='00000000-0000-4000-8000-000000000002',ID='40000000-0000-4000-8000-000000000001';
function appFor(signedIn=true,error:{ message?:string;code?:string }|null=null,returnedOwner=OWNER) {
  const filters:Array<{ table:string;key:string;value:unknown }>=[];
  let profile={ user_id:returnedOwner,version:1,schema_version:1,origin:'explicit',settings:{ ...emptyNutritionProfile(),consent:true,allergies:['lait'] },updated_at:'2026-10-09T12:00:00Z' };
  const rpc=jest.fn(async(_name:string,args:{ p_command:ProfileWrite })=>{
    if (error) return { data:null,error };
    profile={ ...profile,version:2,settings:args.p_command.settings };return { data:{ version:2 },error:null };
  });
  const client={ rpc,from:(table:string)=>{
    interface Query { select():Query;eq(key:string,value:unknown):Query;maybeSingle():Promise<{ data:typeof profile;error:null }> }
    const chain:Query={ select:()=>chain,eq:(key:string,value:unknown)=>{ filters.push({ table,key,value });return chain; },maybeSingle:async()=>({ data:profile,error:null }) };return chain;
  } };
  const app=express();app.use(express.json());app.use((req,_res,next)=>{ if (signedIn) { req.user={ id:OWNER } as User;req.supabaseClient=client as unknown as SupabaseClient; }next(); });
  app.use('/api/v1/settings/nutrition-profile',createNutritionProfileRouter());
  return { app,rpc,filters };
}
const body=()=>({ command_id:ID,expected_version:1,operation:'save',settings:{ ...emptyNutritionProfile(),consent:true,allergies:['lait'] },origin:'explicit' });
test('profile HTTP requires authentication and uses the authenticated owner for each read',async()=>{
  await request(appFor(false).app).get('/api/v1/settings/nutrition-profile').expect(401);
  const setup=appFor();
  const response=await request(setup.app).get('/api/v1/settings/nutrition-profile').expect(200);
  expect(response.body.data.profile.user_id).toBe(OWNER);
  expect(setup.filters).toContainEqual({ table:'nutrition_profiles',key:'user_id',value:OWNER });
});
test('forged owner, clinical data, disabled target defaults and absent consent are rejected before RPC',async()=>{
  const setup=appFor();
  for (const invalid of [{ ...body(),user_id:OTHER },{ ...body(),settings:{ ...body().settings,weight:75 } },{ ...body(),settings:{ ...body().settings,consent:false } },{ ...body(),settings:{ ...body().settings,targets:{ enabled:false,dailyCaloriesKcal:1800,dailyProteinG:null } } }]) await request(setup.app).post('/api/v1/settings/nutrition-profile').send(invalid).expect(400);
  expect(setup.rpc).not.toHaveBeenCalled();
});
test('verified write returns applied and reread versions, and version conflict remains recoverable',async()=>{
  const setup=appFor();
  const response=await request(setup.app).post('/api/v1/settings/nutrition-profile').send(body()).expect(200);
  expect(response.body.data).toMatchObject({ applied_version:2,profile:{ version:2,user_id:OWNER } });
  const conflict=await request(appFor(true,{ message:'PROFILE_VERSION_CONFLICT' }).app).post('/api/v1/settings/nutrition-profile').send(body()).expect(409);
  expect(conflict.body.code).toBe('PROFILE_VERSION_CONFLICT');
});
test('foreign read and failed write do not expose health text or claim success',async()=>{
  await request(appFor(true,null,OTHER).app).get('/api/v1/settings/nutrition-profile').expect(503);
  const logger=jest.spyOn(console,'error').mockImplementation(()=>undefined);
  const result=await request(appFor(true,{ message:'SQL erreur allergie lait diagnostic privé' }).app).post('/api/v1/settings/nutrition-profile').send(body()).expect(503);
  expect(JSON.stringify(result.body)).not.toContain('diagnostic');expect(logger).not.toHaveBeenCalled();logger.mockRestore();
});
