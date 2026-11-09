#!/usr/bin/env node
/** Append-only importer. Dry-run by default; reruns fill missing IDs only. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {parseArgs} from 'node:util';
import {v5 as uuid} from 'uuid';
import dotenv from 'dotenv';
import {createClient} from '@supabase/supabase-js';
import {recipeNutritionSignature,SourcedRecipeNutritionSchema} from '@smart/shared';
const {values}=parseArgs({options:{env:{type:'string'},owner:{type:'string'},apply:{type:'boolean',default:false},journal:{type:'string',default:'/private/tmp/classics-import-journal.json'}}});
if(!values.env || values.owner!=='c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6')throw Error('Explicit env and approved owner required');
const env=dotenv.parse(await readFile(values.env));
const url=env.SUPABASE_URL??env.VITE_SUPABASE_URL;
if(new URL(url).hostname!=='jwoxacnflphclslpqfzs.supabase.co')throw Error('Wrong project');
const key=env.SUPABASE_SERVICE_ROLE_KEY??env.SUPABASE_SERVICE_KEY;if(!key)throw Error('Service key missing');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(30000)})}});
const pack=JSON.parse(await readFile('data/recipes/classics-approved-2026-11-09.json','utf8'));
const digest=createHash('sha256').update(JSON.stringify(pack)).digest('hex');
const namespace=uuid(pack.collection_id,values.owner);
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,' ').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
async function existing(){const {data,error}=await client.from('recipes').select('*,recipe_ingredients(*)').eq('user_id',values.owner).limit(1000);if(error)throw Error(error.message);if(data.length===1000)throw Error('Pagination required');return data;}
let current=await existing();const beforeIds=current.map(r=>r.id);const parents=[],children=[],skipped=[];
for(const r of pack.recipes){
 SourcedRecipeNutritionSchema.parse(r.nutrition_info);
 if(recipeNutritionSignature(r.ingredients,r.servings)!==r.nutrition_info.ingredient_signature)throw Error('Signature mismatch '+r.name);
 const id=uuid(String(r.selection_id),namespace);
 const duplicate=current.find(row=>row.id!==id&&norm(row.name)===norm(r.name));
 if(duplicate){skipped.push({selection_id:r.selection_id,name:r.name,existing_id:duplicate.id});continue;}
 const {selection_id,ingredients,instructions,...fields}=r;
 parents.push({...fields,id,user_id:values.owner,is_public:false,original_language:'fr',source_name:'Versions maison adaptées',source_platform:'manual',
  instructions:instructions.map((text,i)=>`${i+1}. ${text}`).join('\n'),source_metadata:{collection_id:pack.collection_id,selection_id,pack_sha256:digest,instructions:instructions.map((description,i)=>({step:i+1,description}))}});
 children.push(...ingredients.map((ing,i)=>({...ing,id:uuid('ingredient:'+i,id),recipe_id:id,order_index:i,inventory_product_id:null})));
}
const compare=(actual,expected)=>Object.entries(expected).every(([k,v])=>isDeepStrictEqual(actual[k],v));
function pending(rows,expected,label){return expected.filter(row=>{const old=rows.find(x=>x.id===row.id);if(!old)return true;if(!compare(old,row))throw Error(`${label} ${row.id} differs: preserve edits and stop`);return false;});}
const newParents=pending(current,parents,'Recipe');
const newChildren=pending(current.flatMap(r=>r.recipe_ingredients),children,'Ingredient');
const journal={project:'jwoxacnflphclslpqfzs',owner:values.owner,collection_id:pack.collection_id,pack_sha256:digest,started_at:new Date().toISOString(),before_ids:beforeIds,planned_recipe_ids:parents.map(r=>r.id),new_recipe_ids:newParents.map(r=>r.id),skipped,planned_ingredients:children.length,state:'dry-run'};
console.log(JSON.stringify({mode:values.apply?'apply':'dry-run',new_recipes:newParents.length,new_ingredients:newChildren.length,skipped,already_present:parents.length-newParents.length}));
if(!values.apply)process.exit(0);
await writeFile(values.journal,JSON.stringify(journal,null,2),{mode:0o600});
async function append(table,rows,label){
 if(!rows.length)return;
 // Each insert is atomic. Never upsert, update or delete. A lost response is
 // recovered by reading back deterministic IDs, not by blindly retrying writes.
 let failure=null;
 try{const {error}=await client.from(table).insert(rows);if(error)failure=error.message;}catch(e){failure=e.message;}
 current=await existing();
 const actual=table==='recipes'?current:current.flatMap(r=>r.recipe_ingredients);
 const missing=pending(actual,rows,label);
 if(missing.length)throw Error(`${table}: ${missing.length} missing after insert (${failure??'verification failed'}); rerun to resume`);
}
try{
 await append('recipes',newParents,'Recipe');
 current=await existing();pending(current,parents,'Recipe'); // Do not attach ingredients to edited parent rows.
 for(const parent of parents){const expectedIds=new Set(children.filter(i=>i.recipe_id===parent.id).map(i=>i.id));
  if(current.find(r=>r.id===parent.id).recipe_ingredients.some(i=>!expectedIds.has(i.id)))throw Error('Unexpected ingredients; preserve user edits and stop');}
 const remaining=pending(current.flatMap(r=>r.recipe_ingredients),children,'Ingredient');
 await append('recipe_ingredients',remaining,'Ingredient');
 current=await existing();pending(current,parents,'Recipe');pending(current.flatMap(r=>r.recipe_ingredients),children,'Ingredient');
 if(beforeIds.some(id=>!current.some(r=>r.id===id)))throw Error('An existing recipe disappeared during import');
 journal.state='verified';journal.completed_at=new Date().toISOString();journal.final_recipe_count=current.length;
}catch(e){journal.state='incomplete-resumable';journal.error=e.message;throw e;}
finally{await writeFile(values.journal,JSON.stringify(journal,null,2),{mode:0o600});}
console.log(JSON.stringify({state:journal.state,total_recipes:current.length,collection_recipes:parents.length,ingredients:children.length}));
