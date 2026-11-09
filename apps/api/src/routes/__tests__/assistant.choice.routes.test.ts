import express from 'express';
import request from 'supertest';
import { createAssistantAgentRouter } from '../assistant.agent.js';
import { clientFixture, USER } from '../../services/assistant/__fixtures__/memory.js';
import { VoiceAgentService } from '../../services/assistant/VoiceAgentService.js';
jest.mock('../../middleware/auth.middleware.js',()=>({createAuthMiddleware:()=>((req:express.Request,res:express.Response,next:express.NextFunction)=>req.user?.id ? next() : res.status(401).json({code:'UNAUTHORIZED'}))}));
jest.mock('../../middleware/userRateLimit.js',()=>({userRateLimit:()=>((_req:express.Request,_res:express.Response,next:express.NextFunction)=>next())}));
jest.mock('../../services/imports/index.js',()=>({}));
jest.mock('../../services/imports/SocialImportService.js',()=>({SocialImportService:jest.fn()}));
jest.mock('@vercel/functions',()=>({waitUntil:jest.fn()}));

// iPhone 2026-11-09: a tapped « Laquelle ? » answer took seconds; it now carries its action.
function setup() {
  const admin=clientFixture();
  const app=express();app.use(express.json());
  app.use((req,_res,next)=>{req.user={id:USER} as express.Request['user'];req.supabaseClient=admin.client as never;next();});
  app.use('/assistant',createAssistantAgentRouter(admin.client,{hmacSecret:'x'.repeat(32),ai:{complete:jest.fn()} as never,transcriber:{model:'t',transcribe:jest.fn()} as never}));
  const handle=jest.spyOn(VoiceAgentService.prototype,'handleRequest').mockResolvedValue({message:'ok'} as never);
  return { app,handle };
}
const body=(choice:unknown)=>({text:'J’ai cuisiné Lamb Biryani',client_request_id:'7a0c1f5e-2b9d-4c41-9e7f-3d2a8b6c5e10',choice});
afterEach(()=>jest.restoreAllMocks());

test('a tapped recipe choice reaches the assistant with its action',async()=>{
  const {app,handle}=setup();
  const choice={tool:'cook_recipe',args:{recipe_id:'lamb',servings:2}};
  await request(app).post('/assistant/text').send(body(choice)).expect(200);
  expect(handle.mock.calls[0][0]).toMatchObject({text:'J’ai cuisiné Lamb Biryani',choice});
});

test('a choice naming any other tool, or extra fields, is refused',async()=>{
  const {app,handle}=setup();
  await request(app).post('/assistant/text').send(body({tool:'add_inventory_items',args:{}})).expect(400);
  await request(app).post('/assistant/text').send(body({tool:'cook_recipe',args:{},confirmed:true})).expect(400);
  expect(handle).not.toHaveBeenCalled();
});
