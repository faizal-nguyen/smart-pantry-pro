import express from 'express';
import request from 'supertest';
import { createAssistantMemoryRouter } from '../assistant.memory.js';
import { clientFixture,USER,OTHER,CID,policy,command,receipt } from '../../services/assistant/__fixtures__/memory.js';
jest.mock('../../middleware/auth.middleware.js',()=>({createAuthMiddleware:()=>((req:express.Request,res:express.Response,next:express.NextFunction)=>req.user?.id ? next() : res.status(401).json({code:'UNAUTHORIZED'}))}));
function setup(owner:string|null=USER) {
  const admin=clientFixture();const user=clientFixture();user.rpc.mockResolvedValue({data:receipt(),error:null});
  const app=express();app.use(express.json());app.use((req,_res,next)=>{if(owner) {req.user={id:owner};req.supabaseClient=user.client;}next();});
  app.use('/assistant',createAssistantMemoryRouter(admin.client));return {app,admin,user};
}
test('memory HTTP requires an authenticated owner and policy failures are closed',async()=>{
  await request(setup(null).app).get('/assistant/memory-policy').expect(401);
  const s=setup();const result=await request(s.app).get('/assistant/memory-policy').expect(200);expect(result.body.data.policy.userId).toBe(USER);
  expect(s.admin.rpc).toHaveBeenCalledWith('read_assistant_memory_policy',{p_user_id:USER});
  s.admin.rpc.mockResolvedValue({data:policy({userId:OTHER}),error:null});await request(s.app).get('/assistant/memory-policy').expect(503);
});
test('strict command rejects forged owners and uses the user RPC, not the privileged client',async()=>{
  const s=setup();await request(s.app).post('/assistant/memory-commands').send({...command(),user_id:OTHER}).expect(400);expect(s.user.rpc).not.toHaveBeenCalled();
  const result=await request(s.app).post('/assistant/memory-commands').send(command()).expect(200);expect(result.body.data.receipt.status).toBe('saved');
  expect(s.user.rpc).toHaveBeenCalledWith('execute_assistant_memory_command',{p_command:command()});expect(s.admin.rpc).not.toHaveBeenCalled();
});
test('version conflicts remain recoverable and uncertain replies never expose raw private errors',async()=>{
  const s=setup();s.user.rpc.mockResolvedValue({data:null,error:{message:'MEMORY_VERSION_CONFLICT'}});
  await request(s.app).post('/assistant/memory-commands').send(command()).expect(409);
  s.user.rpc.mockResolvedValue({data:null,error:{message:'Allergie privée cacahuètes — erreur interne'}});
  const uncertain=await request(s.app).post('/assistant/memory-commands').send(command()).expect(200);
  expect(uncertain.body.data.receipt.status).toBe('verification_required');expect(JSON.stringify(uncertain.body)).not.toContain('cacahuètes');
});
test('receipt reads scope both owner and identity; obsolete writes cannot bypass the command',async()=>{
  const s=setup();await request(s.app).get('/assistant/memory-commands/'+CID).expect(200);
  expect(s.admin.calls).toEqual(expect.arrayContaining([{table:'assistant_memory_commands',method:'eq',args:['user_id',USER]},{table:'assistant_memory_commands',method:'eq',args:['command_id',CID]}]));
  await request(s.app).post('/assistant/memories').send({content:'Allergie'}).expect(426);await request(s.app).patch('/assistant/memories/'+CID).send({status:'active'}).expect(426);
});
