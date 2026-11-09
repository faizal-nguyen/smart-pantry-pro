#!/usr/bin/env node
/** Read-only report; never promotes legacy unsourced totals. */
import {readFile,writeFile} from 'node:fs/promises';import {parseArgs} from 'node:util';
import dotenv from 'dotenv';import {createClient} from '@supabase/supabase-js';
import {NUTRIENTS} from '@smart/shared';
import {estimateNutrition} from '../../apps/api/dist/services/recommendations/PersonalizationScoring.js';
const {values}=parseArgs({options:{env:{type:'string'},owner:{type:'string'},output:{type:'string',default:'/private/tmp/recipe-nutrition-audit.json'}}});
if(!values.env||!values.owner)throw Error('--env and --owner required');
const env=dotenv.parse(await readFile(values.env));const url=env.SUPABASE_URL??env.VITE_SUPABASE_URL;
if(new URL(url).hostname!=='jwoxacnflphclslpqfzs.supabase.co')throw Error('Wrong project');
const client=createClient(url,env.SUPABASE_SERVICE_ROLE_KEY??env.SUPABASE_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(30000)})}});
const {data:recipes,error}=await client.from('recipes').select('*,recipe_ingredients(*)').eq('user_id',values.owner).limit(1000);
if(error||recipes.length===1000)throw Error(error?.message??'Pagination required');
const ids=[...new Set(recipes.flatMap(r=>r.recipe_ingredients.map(i=>i.inventory_product_id).filter(Boolean)))];const products=new Map();
for(let i=0;i<ids.length;i+=100){const {data,error}=await client.from('products').select('id,name,nutrition_json,updated_at,off_last_synced_at').in('id',ids.slice(i,i+100));if(error)throw Error(error.message);for(const p of data)products.set(p.id,p);}
const rows=recipes.map(r=>{const n=estimateNutrition(r,products);return {id:r.id,name:r.name,collection:r.source_metadata?.collection_id??null,legacy_blob_present:!!r.nutrition_info&&r.nutrition_info.schema_version!==1,
 status:n.status,coverage:n.coverage,per_serving:n.per_serving,upper_bounds:n.upper_bounds??[],sources:n.sources,missing_nutrients:NUTRIENTS.filter(f=>n.per_serving[f.key]==null).map(f=>f.key),limitations:n.limitations};});
const summarize=rows=>({recipes:rows.length,statuses:rows.reduce((s,r)=>(s[r.status]=(s[r.status]??0)+1,s),{}),nutrient_coverage:Object.fromEntries(NUTRIENTS.map(f=>[f.key,rows.filter(r=>r.per_serving[f.key]!=null).length]))});
const summary={all:summarize(rows),existing:summarize(rows.filter(r=>!r.collection)),classics:summarize(rows.filter(r=>r.collection==='classics-approved-2026-11-09'))};
await writeFile(values.output,JSON.stringify({audited_at:new Date().toISOString(),summary,recipes:rows},null,2),{mode:0o600});
console.log(JSON.stringify(summary));
