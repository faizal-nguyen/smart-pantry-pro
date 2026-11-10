#!/usr/bin/env node
/** Explicitly scoped, resumable photo/reference update. Dry-run by default. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseArgs,isDeepStrictEqual} from 'node:util';
import dotenv from 'dotenv';
import {createClient} from '@supabase/supabase-js';
import {z} from 'zod';
const {values}=parseArgs({options:{env:{type:'string'},owner:{type:'string'},apply:{type:'boolean',default:false},journal:{type:'string',default:'/private/tmp/classics-media-journal.json'}}});
if(!values.env||values.owner!=='c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6')throw Error('Explicit env and approved owner required');
const env=dotenv.parse(await readFile(values.env));const url=env.SUPABASE_URL??env.VITE_SUPABASE_URL;
if(new URL(url).hostname!=='jwoxacnflphclslpqfzs.supabase.co')throw Error('Wrong project');
const https=z.string().url().startsWith('https://');
const reference=z.object({url:https,title:z.string().min(1),kind:z.enum(['recipe','video','technique']),publisher:z.string().optional(),author:z.string().optional()});
const media=z.object({collection_id:z.literal('classics-approved-2026-11-09'),recipes:z.array(z.object({selection_id:z.number().int(),name:z.string(),image_url:https,
 photo:z.object({image_url:https,source_url:https,publisher:z.string().min(1),note:z.string()}),sources:z.array(reference).min(1).max(12),image_dimensions:z.tuple([z.number().min(400),z.number().min(300)]),browser_image_verified:z.literal(true)})).length(53)}).parse(JSON.parse(await readFile('data/recipes/classics-media-2026-11-10.json','utf8')));
const approved=JSON.parse(await readFile('data/recipes/classics-approved-2026-11-09.json','utf8'));
const digest=createHash('sha256').update(JSON.stringify(media)).digest('hex');const revision='classics-media-2026-11-10:'+digest;
const client=createClient(url,env.SUPABASE_SERVICE_ROLE_KEY??env.SUPABASE_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(25000)})}});
async function readRecipes(){const {data,error}=await client.from('recipes').select('*').eq('user_id',values.owner).limit(1000);if(error)throw Error(error.message);if(data.length===1000)throw Error('Pagination required');return data;}
const all=await readRecipes();const rows=all.filter(r=>r.source_metadata?.collection_id===media.collection_id);if(rows.length!==53)throw Error('Wrong collection count');
const changes=[];const seen=new Set();
for(const item of media.recipes){if(seen.has(item.selection_id))throw Error('Duplicate selection');seen.add(item.selection_id);
 const known=approved.recipes.find(r=>r.selection_id===item.selection_id);if(!known||known.name!==item.name)throw Error('Unapproved recipe');
 const row=rows.find(r=>r.source_metadata?.selection_id===item.selection_id);if(!row||row.name!==item.name)throw Error('Recipe identity changed');
 if(item.photo.image_url!==item.image_url||!item.sources.some(s=>s.url===item.photo.source_url))throw Error('Attribution missing');
 if(row.image_url && row.image_url!==item.image_url)throw Error('Preserve existing personal photo: '+row.id);
 if(row.source_metadata.media_revision && row.source_metadata.media_revision!==revision)throw Error('Another media revision exists');
 const sources=[...item.sources];for(const source of row.source_metadata.sources??[])if(!sources.some(s=>s.url===source.url))sources.push(source);
 const patch={image_url:item.image_url,source_url:item.sources[0].url,source_metadata:{...row.source_metadata,sources,photo:item.photo,media_revision:revision}};
 const matches=Object.entries(patch).every(([key,val])=>isDeepStrictEqual(row[key],val));
 if(!matches&&row.source_metadata.media_revision===revision)throw Error('Preserve edits after enrichment: '+row.id);
 if(!matches)changes.push({before:row,patch});
}
console.log(JSON.stringify({mode:values.apply?'apply':'dry-run',photos_to_update:changes.length,already_present:53-changes.length,sources:media.recipes.reduce((n,r)=>n+r.sources.length,0)}));
if(!values.apply)process.exit(0);
// Persist the exact prior state before any mutation. Reruns use a new journal
// path so the original backup is never overwritten.
try{await readFile(values.journal);throw Error('Journal exists; use a fresh --journal path to preserve the backup');}catch(e){if(e.code!=='ENOENT')throw e;}
const journal={revision,owner:values.owner,started_at:new Date().toISOString(),state:'started',before:changes.map(c=>c.before),completed:[]};
await writeFile(values.journal,JSON.stringify(journal,null,2),{mode:0o600});
try{
 for(const {before,patch} of changes){let failure=null;
  try{const {error}=await client.from('recipes').update(patch).eq('id',before.id).eq('user_id',values.owner).eq('updated_at',before.updated_at).select('id').maybeSingle();if(error)failure=error.message;}catch(e){failure=e.message;}
  const {data:readback,error}=await client.from('recipes').select('*').eq('id',before.id).eq('user_id',values.owner).single();
  if(error||!readback||!Object.entries(patch).every(([k,v])=>isDeepStrictEqual(readback[k],v)))throw Error('Update not confirmed; preserve concurrent edits: '+before.id+' '+(failure??''));
  if(!isDeepStrictEqual(before.nutrition_info,readback.nutrition_info)||before.instructions!==readback.instructions)throw Error('Recipe content changed during update');
  journal.completed.push({id:before.id,updated_at:readback.updated_at});await writeFile(values.journal,JSON.stringify(journal,null,2),{mode:0o600});
 }
 const after=await readRecipes();for(const old of all.filter(r=>r.source_metadata?.collection_id!==media.collection_id))if(!isDeepStrictEqual(old,after.find(r=>r.id===old.id)))throw Error('Another recipe changed during update');
 journal.state='verified';journal.completed_at=new Date().toISOString();
}catch(e){journal.state='incomplete-resumable';journal.error=e.message;throw e;}
finally{await writeFile(values.journal,JSON.stringify(journal,null,2),{mode:0o600});}
console.log(JSON.stringify({state:journal.state,updated:journal.completed.length,other_recipes_unchanged:all.length-53}));
