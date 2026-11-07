import express from 'express';
import request from 'supertest';
import { createRecipeDiscoveryRouter } from '../recipes.discovery.js';
import { DiscoveryError, type DiscoveryService } from '../../services/discovery/DiscoveryService.js';
jest.mock('../../middleware/auth.middleware.js',()=>({createAuthMiddleware:()=>((req:express.Request,res:express.Response,next:express.NextFunction)=>req.user?.id ? next():res.status(401).json({code:'UNAUTHORIZED'}))}));
jest.mock('../../middleware/userRateLimit.js',()=>({userRateLimit:()=>((_req:express.Request,_res:express.Response,next:express.NextFunction)=>next())}));
const OWNER='00000000-0000-4000-8000-000000000001', ID='10000000-0000-4000-8000-000000000001';
function setup(auth=true,enabled=true) {
 const service={
  feed:jest.fn().mockResolvedValue({items:[],savedItems:[],mode:'manual',limit:5,selectionAt:null,errors:[]}),
  creators:jest.fn().mockResolvedValue([]),starterLinks:jest.fn().mockResolvedValue([]),capture:jest.fn().mockResolvedValue({item:{id:ID}}),
  decide:jest.fn().mockResolvedValue({item:{id:ID}}),feedback:jest.fn().mockResolvedValue({item:{id:ID}}),
  prepareImport:jest.fn().mockResolvedValue({item:{id:ID}}),pauseCreator:jest.fn(),createCreator:jest.fn(),
 };
 const app=express();app.use(express.json());app.use((req,_res,next)=>{if(auth){req.user={id:OWNER};req.supabaseClient={} as NonNullable<express.Request['supabaseClient']>;}next();});
 const router=createRecipeDiscoveryRouter({} as Parameters<typeof createRecipeDiscoveryRouter>[0],{enabled,service:()=>service as unknown as DiscoveryService});
 app.use('/api/recipes/discovery',router);app.use('/api/v1/recipes/discovery',router);
 return {app,service};
}
test.each(['/api/recipes/discovery','/api/v1/recipes/discovery'])('both aliases %s enforce auth and serve manual contract',async base=>{
 await request(setup(false).app).get(base).expect(401);
 const {app,service}=setup();
 const response=await request(app).get(base).expect(200);
 expect(response.body.data).toMatchObject({mode:'manual',limit:5});
 await request(app).get(base+'/creators').expect(200);await request(app).get(base+'/links').expect(200);
 expect(service.feed).toHaveBeenCalledTimes(1);
});
test('commands reject owner spoofing, null revisions, undeclared cooking and raw body recipes',async()=>{
 const {app,service}=setup();const base='/api/recipes/discovery';
 await request(app).post(base+'/items').send({creatorId:ID,sourceUrl:'https://example.org/r',commandId:ID,userId:OWNER}).expect(400);
 await request(app).post(base+'/items/'+ID+'/decision').send({commandId:ID,expectedVersion:null,decision:'keep'}).expect(400);
 await request(app).post(base+'/items/'+ID+'/feedback').send({commandId:ID,expectedVersion:1,feedback:'repeat'}).expect(400);
 await request(app).post(base+'/items/'+ID+'/prepare-import').send({commandId:ID,expectedVersion:1,draft:{}}).expect(400);
 expect(service.capture).not.toHaveBeenCalled();expect(service.feedback).not.toHaveBeenCalled();
});
test('mutation receives exact validated request; typed failure is explicit and secrets never returned',async()=>{
 const {app,service}=setup();
 const input={creatorId:ID,sourceUrl:'https://example.org/r',title:'Soupe',commandId:ID};
 await request(app).post('/api/recipes/discovery/items').send(input).expect(200);
 expect(service.capture).toHaveBeenCalledWith(input);
 service.capture.mockRejectedValueOnce(new DiscoveryError('QUOTA_EXCEEDED',402));
 const refused=await request(app).post('/api/recipes/discovery/items').send(input).expect(402);
 expect(refused.body.code).toBe('QUOTA_EXCEEDED');
 service.capture.mockRejectedValueOnce(new Error('signed-token-health-data'));
 const failed=await request(app).post('/api/recipes/discovery/items').send(input).expect(503);
 expect(JSON.stringify(failed.body)).not.toContain('signed-token-health-data');
});
test('operator flag disables new reads/actions without deleting data',async()=>{
 const {app,service}=setup(true,false);await request(app).get('/api/recipes/discovery').expect(503);
 expect(service.feed).not.toHaveBeenCalled();
});
