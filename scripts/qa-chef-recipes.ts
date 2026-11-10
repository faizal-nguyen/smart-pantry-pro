/** Four bounded live-model traces with fictitious tools. No production writes or history. */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import dotenv from 'dotenv';import OpenAI from 'openai';
import {runScenario} from './assistant-models/harness.js';
import {benchmarkConfig} from '../apps/api/src/services/ai/ModelConfig.js';
import {createOpenAICompletionClient,parseCompletion,providerErrorSummary} from '../apps/api/src/services/ai/OpenAITransport.js';
import {maximumCallCost,measureCost} from '../apps/api/src/services/ai/ModelPricing.js';
const envPath=process.argv[2],output=process.argv[3];if(!envPath||!output||existsSync(output))throw Error('Explicit env and fresh report path required');
const env=dotenv.parse(readFileSync(envPath));if(!env.OPENAI_API_KEY)throw Error('Server model key missing');
const sdk=new OpenAI({apiKey:env.OPENAI_API_KEY,maxRetries:0,timeout:20000});
const prior=process.argv[4]?JSON.parse(readFileSync(process.argv[4],'utf8')):null;
if(prior&&(!prior.fictitious||!Number.isFinite(prior.reserved_usd)||prior.reserved_usd<0||prior.reserved_usd>0.25))throw Error('Invalid previous report');
let reserved=prior?.reserved_usd??0,observed=prior?.observed_usd??0;const report:{[key:string]:unknown}={fictitious:true,production_data:false,live_model:true,prior_report:process.argv[4]??null,budget_usd:0.25,trials:[]};
const persist=()=>writeFileSync(output,JSON.stringify({...report,reserved_usd:reserved,observed_usd:observed},null,2),{mode:0o600});
const dispatch=async(params:Record<string,unknown>,options:Record<string,unknown>,transport:'responses'|'chat_completions')=>{
 const reserve=maximumCallCost(String(params.model),Buffer.byteLength(JSON.stringify(params)),Number(params.max_output_tokens??params.max_tokens));if(reserved+reserve>0.25)throw Error('QA_BUDGET_LIMIT');reserved+=reserve;persist();
 const result=transport==='responses'?await sdk.responses.create(params as never,options):await sdk.chat.completions.create(params as never,options);
 const cost=measureCost(parseCompletion(result,transport));if(cost.usd===null)throw Error('QA_COST_UNKNOWN');observed+=cost.usd;if(cost.usd>reserve)throw Error('QA_RESERVATION_EXCEEDED');persist();return result;
};
const provider=createOpenAICompletionClient({sdk:async()=>({chat:{completions:{create:(p,o)=>dispatch(p,o,'chat_completions')}},responses:{create:(p,o)=>dispatch(p,o,'responses')}})});
const inventory={complete:true,items:[{id:'33333333-3333-4333-8333-333333333333',product_name:'Oignons',quantity:1,unit_type:'kg',quantity_quality:'estimated',date_kind:'unknown',expired:false},{id:'44444444-4444-4444-8444-444444444444',product_name:'Parmesan en poudre',quantity:1,unit_type:'conditionnement',quantity_quality:'unknown',date_kind:'unknown',expired:false}]};
const cases=[
 {id:'name-onion',prompt:'Cherche la recette de soupe aux oignons.',tool:'search_recipes',args:{query:'oignon'},name:'Soupe à l’oignon gratinée'},
 {id:'cuisine-tunisian',prompt:'Est-ce que tu as une recette tunisienne à proposer avec les ingrédients disponibles ?',tool:'suggest_recipes_for_context',args:{cuisine:'tunis'},name:'Ojja aux œufs'},
 {id:'course-dessert',prompt:'Propose un dessert pour ce soir.',tool:'suggest_recipes_for_context',args:{course:'dessert'},name:'Mousse au chocolat'},
 {id:'missing-onion',prompt:'Je veux faire une soupe aux oignons, qu’est-ce qu’il nous manque ?',tool:'suggest_recipes_for_context',args:{query:'oignon'},name:'Soupe à l’oignon gratinée'},
];
try{for(const test of cases){if(process.argv[5]&&test.id!==process.argv[5])continue;const missing=test.id==='cuisine-tunisian'?[{ingredient_name:'Œufs',quantity:4,unit:'pièce',is_essential:true,reason:'NOT_IN_STOCK'}]:test.id==='course-dessert'?[{ingredient_name:'Chocolat noir',quantity:200,unit:'g',is_essential:true,reason:'NOT_IN_STOCK'}]:[{ingredient_name:'Beurre',quantity:25,unit:'g',is_essential:true,reason:'UNIT_INCOMPATIBLE'},{ingredient_name:'Bouillon',quantity:500,unit:'ml',is_essential:true,reason:'NOT_IN_STOCK'},{ingredient_name:'Pain',quantity:120,unit:'g',is_essential:true,reason:'NOT_IN_STOCK'}];const recipe={id:'22222222-2222-4222-8222-222222222222',reference:{id:'22222222-2222-4222-8222-222222222222',source:'recipes'},profile_version:1,name:test.name,description:'Recette de test fictive.',servings:4,cuisine_category:test.id==='cuisine-tunisian'?'Tunisienne':'Française',duration_minutes:30,
 availability:{status:'missing',missing,allocations:[],uncertainties:['Quantités du stock à vérifier.']},constraints:{status:'compatible',findings:[],limitations:[]},reason_codes:[],nutrition:{status:'unavailable'},missing_count:missing.length,missing_ingredients:missing.map(i=>i.ingredient_name)};
 const fixtures={read_inventory:inventory,search_recipes:{recipes:[{id:recipe.id,name:recipe.name,description:recipe.description,prep_time:10,cook_time:20,servings:4,image_url:null,cuisine_category:recipe.cuisine_category,meal_type:'dinner',tags:[]}]},suggest_recipes_for_context:{pipeline_version:3,profile_version:1,cookable_now:[],almost_cookable:[recipe],verify_suggestions:[],excluded_suggestions:[],recent_suggestions:[]}};
 const result=await runScenario(test,benchmarkConfig('luna'),provider,fixtures);
 if(result.effects||result.chosen.some(c=>!['search_recipes','suggest_recipes_for_context','read_inventory','read_user_memories','read_recent_recipes'].includes(c.tool)))result.errors.push('unexpected_write_or_unrelated_tool');
 result.passed=result.errors.length===0;(report.trials as unknown[]).push(result);persist();console.log(test.id,result.passed?'PASS':'FAIL');}
 report.finished_at=new Date().toISOString();persist();if((report.trials as Array<{passed:boolean}>).some(t=>!t.passed))process.exitCode=1;
}catch(error){report.failure=providerErrorSummary(error);persist();console.log('QA stopped; see report.');process.exitCode=1;}
