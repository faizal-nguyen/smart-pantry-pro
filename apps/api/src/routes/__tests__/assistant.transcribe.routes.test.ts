import { existsSync } from 'node:fs';
import express from 'express';
import request from 'supertest';
import { AssistantTranscriptionSchema } from '@smart/shared';
import { createAssistantAgentRouter } from '../assistant.agent.js';
import { clientFixture, USER, CID } from '../../services/assistant/__fixtures__/memory.js';
import type { SpeechTranscriber, TranscribeInput } from '../../services/media/SpeechTranscriber.js';
jest.mock('../../middleware/auth.middleware.js',()=>({createAuthMiddleware:()=>((req:express.Request,res:express.Response,next:express.NextFunction)=>req.user?.id ? next() : res.status(401).json({code:'UNAUTHORIZED'}))}));
jest.mock('../../middleware/userRateLimit.js',()=>({userRateLimit:()=>((_req:express.Request,_res:express.Response,next:express.NextFunction)=>next())}));
jest.mock('../../services/imports/index.js',()=>({}));
jest.mock('../../services/imports/SocialImportService.js',()=>({SocialImportService:jest.fn()}));

const WEBM = Buffer.from([0x1a,0x45,0xdf,0xa3,0x9f,0x42,0x86,0x81,0x01,0x42,0xf7,0x81,0x01,0x42,0xf2,0x81]);
function setup({ authenticated=true, fails=false, hmacSecret='x'.repeat(32) }={}) {
  const admin=clientFixture();const inputs:TranscribeInput[]=[];const seenFiles:string[]=[];
  const transcriber:SpeechTranscriber={ model:'gpt-transcribe', async transcribe(input) {
    inputs.push(input);seenFiles.push(input.audioPath);if(fails) throw new Error('provider said: secret detail');
    return { transcription_id:'t-1',text:'Ajoute deux litres de lait',languages:['fr'],requested_model:'gpt-transcribe',served_model:null,
      duration_seconds:4,duration_source:'provider',cost:{usd:0.0003,quality:'known',reason:null,pricing_version:'test'} };
  } };
  const ai={ complete:jest.fn() };
  const app=express();app.use(express.json());
  app.use((req,_res,next)=>{if(authenticated){req.user={id:USER} as express.Request['user'];req.supabaseClient=admin.client as never;}next();});
  app.use('/assistant',createAssistantAgentRouter(admin.client,{hmacSecret,transcriber,ai:ai as never}));
  return { app,admin,inputs,seenFiles,ai };
}
const post=(app:express.Express,fields:Record<string,string>={client_request_id:CID},audio=WEBM,contentType='audio/webm;codecs=opus')=>{
  const call=request(app).post('/assistant/transcribe');for(const [k,v] of Object.entries(fields)) call.field(k,v);
  return call.attach('audio',audio,{filename:'recording.webm',contentType});
};

test('dictation returns text only: no model call, no conversation, no database write',async()=>{
  const {app,admin,inputs,seenFiles,ai}=setup();
  const response=await post(app,{client_request_id:CID,languages:'fr',audio_duration_seconds:'4'}).expect(200);
  const body=AssistantTranscriptionSchema.parse(response.body.data);
  expect(body).toMatchObject({client_request_id:CID,text:'Ajoute deux litres de lait',cost:{quality:'known'}});
  expect(inputs[0]).toMatchObject({languages:['fr'],clientDurationSeconds:4});
  expect(seenFiles[0]).toMatch(/audio\.webm$/);expect(existsSync(seenFiles[0])).toBe(false);
  expect(ai.complete).not.toHaveBeenCalled();expect(admin.calls).toHaveLength(0);expect(admin.rpc).not.toHaveBeenCalled();
  expect(response.body.data).not.toHaveProperty('actions_executed');
});

test('requires an account and a configured assistant',async()=>{
  await post(setup({authenticated:false}).app).expect(401);
  await post(setup({hmacSecret:''}).app).expect(503);
});

test('the declared type is not enough: content, size and claimed duration are checked',async()=>{
  const {app,inputs}=setup();
  expect((await post(app,undefined,Buffer.from('<html><body>not audio</body></html>')).expect(415)).body.code).toBe('UNSUPPORTED_AUDIO');
  await post(app,undefined,WEBM,'text/plain').expect(415);
  expect((await post(app,undefined,Buffer.concat([WEBM,Buffer.alloc(3*1024*1024)])).expect(413)).body.code).toBe('AUDIO_TOO_LARGE');
  expect((await post(app,{client_request_id:CID,audio_duration_seconds:'120'}).expect(413)).body.code).toBe('AUDIO_TOO_LONG');
  expect(inputs).toHaveLength(0);
});

test('hints are bounded and the request identity is required',async()=>{
  const {app,inputs}=setup();
  await post(app,{client_request_id:CID,languages:'fr,en,es,de'}).expect(400);
  await post(app,{client_request_id:CID,languages:'fra'}).expect(400);
  await post(app,{languages:'fr'}).expect(400);
  await request(app).post('/assistant/transcribe').field('client_request_id',CID).expect(400);
  expect(inputs).toHaveLength(0);
});

test('a provider failure keeps a usable message without leaking its detail',async()=>{
  const {app,seenFiles}=setup({fails:true});
  const response=await post(app).expect(502);
  expect(response.body.code).toBe('TRANSCRIPTION_FAILED');
  expect(JSON.stringify(response.body)).not.toContain('secret detail');
  expect(existsSync(seenFiles[0])).toBe(false);
});
