import {writeFileSync,mkdirSync,existsSync,readFileSync} from 'node:fs';
import {dirname} from 'node:path';
import OpenAI from 'openai';
import {CORPUS,CORPUS_VERSION} from './assistant-models/corpus.js';
import {runScenario} from './assistant-models/harness.js';
import {benchmarkConfig} from '../apps/api/src/services/ai/ModelConfig.js';
import {createOpenAICompletionClient,parseCompletion} from '../apps/api/src/services/ai/OpenAITransport.js';
import {maximumCallCost,measureCost,PRICING_VERSION} from '../apps/api/src/services/ai/ModelPricing.js';
const args=process.argv.slice(2);const live=args.includes('--live');
const flag=(name:string)=>args.find(a=>a.startsWith('--'+name+'='))?.split('=').slice(1).join('=');
const budget=Number(flag('budget'));const environment=flag('environment');
if(live && (!(budget>0&&budget<=5)||environment!=='local-fictitious'||!process.env.OPENAI_API_KEY)) throw new Error('Live requires --budget=1..5, --environment=local-fictitious and a server OpenAI key.');
const output=flag('out') ?? 'output/v10-models/'+(live?'live':'offline')+'.json';mkdirSync(dirname(output),{recursive:true});
if(live&&existsSync(output)) throw new Error('Live report already exists. Review its committed reservations before authorizing another spend.');
const prior=live&&flag('carry') ? JSON.parse(readFileSync(flag('carry')!,'utf8')) : null;
if(prior && (prior.mode!=='live'||prior.environment!=='local-fictitious'||!prior.finished_at||!Number.isFinite(prior.budget_reserved_usd)||prior.budget_reserved_usd<0||prior.budget_reserved_usd>=budget)) throw new Error('Prior reservations cannot be verified.');
const report:{[key:string]:unknown}={mode:live?'live':'offline',environment:live?environment:'offline-fictitious',is_fictitious:true,
  corpus_version:CORPUS_VERSION,scenario_count:CORPUS.length,critical_count:CORPUS.filter(s=>s.critical).length,
  started_at:new Date().toISOString(),budget_usd:live?budget:0,pricing_version:PRICING_VERSION,
  prior_report:flag('carry') ?? null,prior_reserved_usd:prior?.budget_reserved_usd ?? 0,prior_observed_usd:prior?.observed_cost_usd ?? 0,
  prior_observed_cost_complete:prior?.observed_cost_complete ?? true,
  configurations:['baseline','luna','luna-sol'].map(preset=>benchmarkConfig(preset as 'baseline'|'luna'|'luna-sol')),
  configuration_versions:Object.fromEntries(['baseline','luna','luna-sol'].map(preset=>[preset,benchmarkConfig(preset as 'baseline'|'luna'|'luna-sol').version])),
  criteria:{correct_rate:0.95,critical_failures:0,p95_ratio:1.15,cost_per_success_ratio:1,human_culinary_review_required:true},
  trials:[],availability:{},decisions:{},provider_failures:[],budget_reserved_usd:0,observed_cost_usd:0,observed_cost_complete:true};
let held=prior?.budget_reserved_usd ?? 0,observed=0,complete=true,stopReason:string|null=null;
const persist=()=>writeFileSync(output,JSON.stringify({...report,budget_reserved_usd:held,observed_cost_usd:observed,observed_cost_complete:complete,stop_reason:stopReason},null,2)+'\n');
const sdk=live ? new OpenAI({apiKey:process.env.OPENAI_API_KEY,maxRetries:0,baseURL:'https://api.openai.com/v1',timeout:20000}) : null;
const dispatch=async(params:Record<string,unknown>,opts:Record<string,unknown>,transport:'responses'|'chat_completions')=>{
  const reserve=maximumCallCost(String(params.model),Buffer.byteLength(JSON.stringify(params)),Number(params.max_output_tokens ?? params.max_tokens));
  if(held+reserve>budget) {stopReason='budget';throw new Error('BENCHMARK_BUDGET_LIMIT');}
  held+=reserve;persist();
  try {
    const result=transport==='responses' ? await sdk!.responses.create(params as unknown as Parameters<OpenAI['responses']['create']>[0],opts) : await sdk!.chat.completions.create(params as unknown as Parameters<OpenAI['chat']['completions']['create']>[0],opts);
    let parsed;try {parsed=parseCompletion(result,transport);} catch(error) {parsed=(error as {measured?:ReturnType<typeof parseCompletion>}).measured;}
    if(!parsed) {complete=false;stopReason='usage_unobservable';persist();return result;}
    const cost=measureCost(parsed);
    if(cost.usd!==null) observed+=cost.usd;else {complete=false;stopReason='cost_unknown';}
    if(cost.quality==='known') held-=Math.max(0,reserve-(cost.usd ?? reserve));else complete=false;
    if(cost.usd!==null&&cost.usd>reserve) stopReason='reservation_exceeded';
    persist();return result;
  } catch(error) {
    complete=false;stopReason='provider_failure';
    const failure=error as {status?:number;code?:string};
    (report.provider_failures as unknown[]).push({transport,requested_model:String(params.model),http_status:failure.status ?? null,
      code:typeof failure.code==='string'&&/^[a-z_]+$/.test(failure.code) ? failure.code : null});
    persist();throw new Error('BENCHMARK_PROVIDER_FAILURE');
  }
};
const provider=live ? createOpenAICompletionClient({sdk:async()=>({
  chat:{completions:{create:(p,o)=>dispatch(p,o,'chat_completions')}},responses:{create:(p,o)=>dispatch(p,o,'responses')},
})}) : undefined;
const availability:Record<string,{accessible:boolean;status:string}>={};
if(live) for(const model of ['gpt-4o-mini','gpt-4o','gpt-6-luna','gpt-6.1-sol']) {
  try {await sdk!.models.retrieve(model);availability[model]={accessible:true,status:'model_metadata_accessible'};}
  catch(error) {availability[model]={accessible:false,status:'http_'+((error as {status?:number}).status ?? 'network_error')};}
}
report.availability=availability;persist();
const trials:Array<Awaited<ReturnType<typeof runScenario>>&{preset:string;repetition:number}>=[];
for(const preset of ['baseline','luna','luna-sol'] as const) {
  const config=benchmarkConfig(preset);
  if(live && Object.values(config.roles).some(role=>!availability[role.model]?.accessible)) continue;
  for(const scenario of CORPUS) for(let repetition=1;repetition<=(live?3:1);repetition++) {
    if(stopReason) break;
    const result=await runScenario(scenario,config,provider);trials.push({...result,preset,repetition});report.trials=trials;persist();
    process.stdout.write(preset+' '+scenario.id+' '+repetition+' '+(result.passed?'PASS':'FAIL')+'\n');
  }
}
const percentile=(values:number[],percent:number)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.ceil(sorted.length*percent)-1] ?? null;};
const metrics=Object.fromEntries(['baseline','luna','luna-sol'].map(preset=>{const t=trials.filter(t=>t.preset===preset),success=t.filter(t=>t.passed);const priced=t.filter(t=>typeof t.receipt?.llm_usd==='number');
  return [preset,{completed_trials:t.length,critical_failures:t.filter(t=>t.critical&&!t.passed).length,correct_rate:t.length ? success.length/t.length : null,
    p50_ms:percentile(t.map(t=>t.latency_ms),0.5),p95_ms:percentile(t.map(t=>t.latency_ms),0.95),
    cost_per_success_usd:priced.length===t.length && success.length ? t.reduce((n,t)=>n+(t.receipt?.llm_usd ?? 0),0)/success.length : null}];}));
report.metrics=metrics;
report.decisions=Object.fromEntries(Object.entries(metrics).map(([preset,m])=>[preset,{...m,
  decision:!live ? 'not_evaluated_offline' : m.completed_trials!==120 ? 'not_evaluated_incomplete' : m.critical_failures||Number(m.correct_rate)<0.95 ? 'reject' : 'pending_human_review',
  latency_pass:!!m.p95_ms&&!!metrics.baseline.p95_ms&&m.p95_ms<=metrics.baseline.p95_ms*1.15,
  cost_pass:m.cost_per_success_usd!==null&&metrics.baseline.cost_per_success_usd!==null&&m.cost_per_success_usd<=metrics.baseline.cost_per_success_usd,
  human_review:{status:'pending',reviewer:null},
}]));
report.finished_at=new Date().toISOString();persist();
process.stdout.write('Report '+output+'; reserved $'+held.toFixed(6)+'; observed $'+observed.toFixed(6)+'; complete='+complete+'\n');
if(!live&&trials.some(t=>!t.passed)) process.exitCode=1;
