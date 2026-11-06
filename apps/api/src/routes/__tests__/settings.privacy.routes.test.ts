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

describe('delete-request erases the user files through the Storage API',()=>{
  const row={id:'request-1',status:'pending',requested_at:'2026-11-06T12:00:00Z'};
  function deletion(existing:unknown,{pages=[[{bucket_id:'recipe-images',name:'recipe-1.jpg'},{bucket_id:'recipe-media',name:`users/${USER}/image/2026/11/a.webp`}]],removeError=null as unknown}={}) {
    const chain:Record<string,jest.Mock>={};for(const m of ['select','eq','in','insert']) chain[m]=jest.fn(()=>chain);
    chain.maybeSingle=jest.fn(async()=>({data:existing,error:null}));chain.single=jest.fn(async()=>({data:row,error:null}));
    const remove=jest.fn(async(_names:string[])=>({data:[],error:removeError}));const from=jest.fn((_bucket:string)=>({remove}));
    const admin={rpc:jest.fn(async()=>({data:pages.shift() ?? [],error:null})),storage:{from}};
    const app=express();app.use(express.json());app.use((req,_res,next)=>{req.user={id:USER};req.supabaseClient={from:()=>chain} as never;next();});
    app.use('/settings',createSettingsPrivacyRouter(admin as never));return {app,chain,admin,from,remove};
  }
  test('a new request records the row, then removes every listed file bucket by bucket',async()=>{
    const s=deletion(null);const res=await request(s.app).post('/settings/delete-request').expect(200);
    expect(res.body.data).toMatchObject({id:'request-1',alreadyPending:false});expect(s.chain.insert).toHaveBeenCalledWith({user_id:USER,status:'pending'});
    expect(s.admin.rpc).toHaveBeenCalledWith('list_user_storage_objects',{p_user:USER,p_limit:1000});
    expect(s.from.mock.calls.map(([bucket])=>bucket)).toEqual(['recipe-images','recipe-media']);
    expect(s.remove.mock.calls).toEqual([[['recipe-1.jpg']],[[`users/${USER}/image/2026/11/a.webp`]]]);
  });
  test('a request already pending retries the files, so a failed removal can be redone',async()=>{
    const s=deletion(row);const res=await request(s.app).post('/settings/delete-request').expect(200);
    expect(res.body.data.alreadyPending).toBe(true);expect(s.chain.insert).not.toHaveBeenCalled();expect(s.remove).toHaveBeenCalledTimes(2);
  });
  test('a failed removal is reported without file names, the request staying recorded',async()=>{
    const log=jest.spyOn(console,'error').mockImplementation(()=>undefined);
    try {
      const s=deletion(null,{removeError:{name:'StorageApiError',message:`Object users/${USER}/image/a.webp`}});
      const res=await request(s.app).post('/settings/delete-request').expect(502);
      expect(res.body.code ?? res.body.error?.code).toBe('PRIVACY_FILES_DELETE_FAILED');expect(s.chain.insert).toHaveBeenCalled();
      expect(JSON.stringify([res.body,log.mock.calls])).not.toContain(USER);
    } finally { log.mockRestore(); }
  });
});
