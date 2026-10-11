import express from 'express';
import request from 'supertest';
import {createAssistantAgentRouter} from '../assistant.agent.js';
import {clientFixture,USER} from '../../services/assistant/__fixtures__/memory.js';
import {AssistantModelCatalogSchema} from '@smart/shared';
jest.mock('../../middleware/auth.middleware.js',()=>({createAuthMiddleware:()=>((req:express.Request,res:express.Response,next:express.NextFunction)=>req.user?.id ? next() : res.status(401).json({code:'UNAUTHORIZED'}))}));
// This route must not initialize imports, media providers or rate-limit stores.
jest.mock('../../services/imports/index.js',()=>({}));
jest.mock('../../services/imports/SocialImportService.js',()=>({}));
jest.mock('../../middleware/userRateLimit.js',()=>({}));
function setup(authenticated=true) {
  const admin=clientFixture();const app=express();app.use(express.json());
  app.use((req,_res,next)=>{if(authenticated) req.user={id:USER};next();});
  app.use('/assistant',createAssistantAgentRouter(admin.client,{hmacSecret:''}));return {app,admin};
}
test('model catalog requires authentication and remains readable when actions are not configured',async()=>{
  await request(setup(false).app).get('/assistant/models').expect(401);
  const {app,admin}=setup();const response=await request(app).get('/assistant/models').expect(200);
  expect(AssistantModelCatalogSchema.parse(response.body.data.catalog).preset).toBe('baseline');
  expect(JSON.stringify(response.body)).not.toMatch(/api_key|hmac|https:\/\/|secret/i);
  expect(admin.calls).toHaveLength(0);expect(admin.rpc).not.toHaveBeenCalled();
  await request(app).post('/assistant/text').send({}).expect(503);
});
test('catalog has no client mutation route',async()=>{
  const {app}=setup();await request(app).post('/assistant/models').send({preset:'luna'}).expect(404);
  await request(app).patch('/assistant/models').send({model:'invented'}).expect(404);
});
