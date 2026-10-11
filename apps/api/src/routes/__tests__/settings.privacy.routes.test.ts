import express from 'express';
import request from 'supertest';
import { createSettingsPrivacyRouter } from '../settings.privacy.routes.js';
import { clientFixture,USER } from '../../services/assistant/__fixtures__/memory.js';
jest.mock('../../middleware/userRateLimit.js',()=>({userRateLimit:()=>((_req:express.Request,_res:express.Response,next:express.NextFunction)=>next())}));
function setup(stored:unknown=null,signedIn=true) {
  const db=clientFixture({user_privacy_settings:{data:stored}});const app=express();app.use(express.json());
  app.use((req,_res,next)=>{if(signedIn){req.user={id:USER};req.supabaseClient=db.client;}next();});app.use('/settings',createSettingsPrivacyRouter(db.client));return {app,db};
}
test('missing authorization is disabled while existing explicit history remains independent',async()=>{
  const s=setup();const empty=await request(s.app).get('/settings/privacy').expect(200);
  expect(empty.body.data.settings).toMatchObject({assistantMemoryEnabled:false,saveHistory:false});
  expect(s.db.calls).toContainEqual({table:'user_privacy_settings',method:'eq',args:['user_id',USER]});
  const stored=await request(setup({settings:{saveHistory:true},consent_date:null}).app).get('/settings/privacy').expect(200);
  expect(stored.body.data.settings).toMatchObject({assistantMemoryEnabled:false,saveHistory:true});await request(setup(null,false).app).get('/settings/privacy').expect(401);
});
test('partial privacy writes use the atomic RPC and strict keys; failure does not return a false confirmation',async()=>{
  const s=setup();s.db.rpc.mockResolvedValue({data:{assistantMemoryEnabled:true,saveHistory:false},error:null});
  const result=await request(s.app).patch('/settings/privacy').send({assistantMemoryEnabled:true}).expect(200);expect(result.body.data.settings.saveHistory).toBe(false);
  expect(s.db.rpc).toHaveBeenCalledWith('patch_assistant_privacy_settings',{p_patch:{assistantMemoryEnabled:true}});
  await request(s.app).patch('/settings/privacy').send({user_id:USER}).expect(400);
  const log=jest.spyOn(console,'error').mockImplementation(()=>undefined);s.db.rpc.mockResolvedValue({data:null,error:{message:'allergie privée'}});
  const failure=await request(s.app).patch('/settings/privacy').send({assistantMemoryEnabled:false}).expect(500);expect(JSON.stringify(failure.body)).not.toContain('allergie');
  s.db.rpc.mockResolvedValue({data:null,error:null});await request(s.app).patch('/settings/privacy').send({assistantMemoryEnabled:true}).expect(500);log.mockRestore();
});
