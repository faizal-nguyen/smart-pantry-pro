import express from 'express';
import request from 'supertest';
import { createAssistantAgentRouter } from '../assistant.agent.js';
import { clientFixture, USER } from '../../services/assistant/__fixtures__/memory.js';
import type { AICompletionRequest } from '../../services/imports/RecipeExtractionService.js';
jest.mock('../../middleware/auth.middleware.js',()=>({createAuthMiddleware:()=>((req:express.Request,res:express.Response,next:express.NextFunction)=>req.user?.id ? next() : res.status(401).json({code:'UNAUTHORIZED'}))}));
jest.mock('../../middleware/userRateLimit.js',()=>({userRateLimit:()=>((_req:express.Request,_res:express.Response,next:express.NextFunction)=>next())}));
jest.mock('../../services/imports/index.js',()=>({}));
jest.mock('../../services/imports/SocialImportService.js',()=>({SocialImportService:jest.fn()}));

const JPEG = Buffer.from([0xff,0xd8,0xff,0xe0,0x00,0x10,0x4a,0x46,0x49,0x46]);
function setup({ authenticated=true, hmacSecret='x'.repeat(32), answer='{"items":[{"name":"Lait","quantity":6,"unit":"bouteille","confidence":"high"}]}' as string|Error }={}) {
  const admin=clientFixture();
  const ai={ complete:jest.fn(async(req:AICompletionRequest)=>{ if(answer instanceof Error) throw answer; return {content:answer,model:req.model,usage:{prompt_tokens:2500,completion_tokens:100}}; }) };
  const app=express();app.use(express.json());
  app.use((req,_res,next)=>{if(authenticated){req.user={id:USER} as express.Request['user'];req.supabaseClient=admin.client as never;}next();});
  app.use('/assistant',createAssistantAgentRouter(admin.client,{hmacSecret,ai:ai as never,transcriber:{model:'t',transcribe:jest.fn()} as never}));
  return { app,admin,ai };
}
const post=(app:express.Express,files:Array<[Buffer,string]>=[[JPEG,'image/jpeg']])=>{
  const call=request(app).post('/assistant/photos/recognize');
  files.forEach(([body,type],index)=>call.attach('photos',body,{filename:`photo-${index}.jpg`,contentType:type}));
  return call;
};

test('reads the photos and returns the products, without any write',async()=>{
  const {app,admin,ai}=setup();
  const response=await post(app,[[JPEG,'image/jpeg'],[JPEG,'image/jpeg']]).expect(200);
  expect(response.body.data.items).toEqual([{name:'Lait',quantity:6,unit:'bouteille',brand:null,expiry_date:null,confidence:'high'}]);
  expect(response.body.data.model_receipt.calls[0]).toMatchObject({role:'vision',purpose:'grocery_photo'});
  expect(ai.complete.mock.calls[0][0].messages[1].images).toHaveLength(2);
  expect(admin.calls).toHaveLength(0);expect(admin.rpc).not.toHaveBeenCalled();
});

test('requires an account and a configured assistant',async()=>{
  await post(setup({authenticated:false}).app).expect(401);
  await post(setup({hmacSecret:''}).app).expect(503);
});

test('refuses no photo, too many photos, or a file that is not an image',async()=>{
  const {app,ai}=setup();
  await post(app,[]).expect(400);
  await post(app,Array.from({length:5},()=>[JPEG,'image/jpeg'] as [Buffer,string])).expect(400);
  await post(app,[[Buffer.from('<html>'),'image/jpeg']]).expect(415);
  await post(app,[[JPEG,'application/pdf']]).expect(415);
  expect(ai.complete).not.toHaveBeenCalled();
});

test('a failed recognition answers 502 without the provider details',async()=>{
  const log=jest.spyOn(console,'warn').mockImplementation(()=>{});
  try {
    const response=await post(setup({answer:Object.assign(new Error('Incorrect API key provided: sk-proj-secret'),{status:401})}).app).expect(502);
    expect(JSON.stringify(response.body)).not.toContain('sk-proj');
  } finally { log.mockRestore(); }
});

test('adding the kept products validates its body and requires an account',async()=>{
  const {app}=setup();
  await request(app).post('/assistant/photos/add').send({items:[{name:'Riz',quantity:1,unit:'kg'}]}).expect(400);
  await request(app).post('/assistant/photos/add').send({client_request_id:'66666666-6666-4666-8666-666666666666',items:[]}).expect(400);
  await request(setup({authenticated:false}).app).post('/assistant/photos/add').send({client_request_id:'66666666-6666-4666-8666-666666666666',items:[{name:'Riz',quantity:1,unit:'kg'}]}).expect(401);
  await request(setup({hmacSecret:''}).app).post('/assistant/photos/add').send({}).expect(503);
});
