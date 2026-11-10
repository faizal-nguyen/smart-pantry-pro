#!/usr/bin/env node
/** Remove redundant policy qualifiers from owned titles only. Dry-run default. */
import {readFile,writeFile} from 'node:fs/promises';import {parseArgs} from 'node:util';
import dotenv from 'dotenv';import {createClient} from '@supabase/supabase-js';
const excluded='(?:porc|vin(?:\\s+(?:blanc|rouge))?|alcool|cognac|rhum|bi[eè]re)';
const qualifier=new RegExp(`\\bsans\\s+${excluded}\\b(?:\\s*(?:,|et|ni)\\s*(?:sans\\s+)?${excluded}\\b)*`,'giu');
const overrides=new Map([['Tournedos Rossini avec jus sans alcool','Tournedos Rossini'],['Bœuf façon bourguignon sans vin','Bœuf bourguignon']]);
const clean=name=>overrides.get(name)??name.replace(qualifier,'').replace(/\(\s*\)|\[\s*\]/g,'').replace(/\s+([,.)])/g,'$1').replace(/\s{2,}/g,' ').replace(/[\s,;:—–-]+$/g,'').trim();
const {values}=parseArgs({options:{env:{type:'string'},owner:{type:'string'},apply:{type:'boolean',default:false},journal:{type:'string',default:'/private/tmp/recipe-titles-journal.json'}}});
if(!values.env||values.owner!=='c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6')throw Error('Explicit env and approved owner required');
const e=dotenv.parse(await readFile(values.env));const url=e.SUPABASE_URL??e.VITE_SUPABASE_URL;if(new URL(url).hostname!=='jwoxacnflphclslpqfzs.supabase.co')throw Error('Wrong project');
const c=createClient(url,e.SUPABASE_SERVICE_KEY??e.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const {data,error}=await c.from('recipes').select('id,name,updated_at').eq('user_id',values.owner).limit(1000);if(error||data.length===1000)throw Error(error?.message??'Pagination required');
const changes=data.map(r=>({...r,next:clean(r.name)})).filter(r=>r.next!==r.name);if(changes.some(r=>!r.next))throw Error('Empty title');
console.log(JSON.stringify({mode:values.apply?'apply':'dry-run',changes},null,2));if(!values.apply)process.exit(0);
const journal={started_at:new Date().toISOString(),owner:values.owner,changes,completed:[]};await writeFile(values.journal,JSON.stringify(journal,null,2),{mode:0o600,flag:'wx'});
try{for(const r of changes){const {data:result,error}=await c.from('recipes').update({name:r.next}).eq('id',r.id).eq('user_id',values.owner).eq('updated_at',r.updated_at).select('id,name,updated_at').single();if(error||result?.name!==r.next)throw Error('Title update not confirmed: '+r.id);journal.completed.push(result);await writeFile(values.journal,JSON.stringify(journal,null,2),{mode:0o600});}journal.state='verified';}
finally{await writeFile(values.journal,JSON.stringify(journal,null,2),{mode:0o600});}
console.log({state:journal.state,updated:journal.completed.length});
