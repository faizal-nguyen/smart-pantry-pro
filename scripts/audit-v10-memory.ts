/** Offline dry run only: no credentials, database client or mutation path. */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { classifyMemoryFact, normalizeIngredientName } from '@smart/shared';
import { z } from 'zod';
const Input = z.object({ fictitious: z.literal(true), profiles: z.array(z.object({ user_id:z.string().uuid(),allergies:z.array(z.string()) })),
  memories:z.array(z.object({ id:z.string().uuid(),user_id:z.string().uuid(),content:z.string().max(2000),kind:z.enum(['preference','constraint','negative_preference','response_style']),source:z.enum(['user_explicit','assistant_inferred']),status:z.enum(['active','candidate']),version:z.number().int() })) });
const flag=process.argv.indexOf('--fixture');
const data=Input.parse(JSON.parse(readFileSync(flag>=0 ? process.argv[flag+1]! : 'scripts/fixtures/v10-memory/historical.json','utf8')));
const groups=new Map<string,Array<{ id:string; value:string; explicit:boolean }>>();
const ingredient=(value:string) => normalizeIngredientName(value.replace(/^(?:les|le|la|des|du|de la)\s+/iu,''));
const proposals:Array<{ ids:string[];action:string;reason:string;group?:string }>=[];
for(const row of data.memories) {
  const fact=classifyMemoryFact(row.content,{kind:row.kind,explicit:row.source==='user_explicit'});
  if(!fact) continue;
  const key=createHash('sha256').update([row.user_id,fact.destination,fact.kind,fact.semanticSubject].join(':')).digest('hex');
  if(fact.destination==='profile') proposals.push({ids:[row.id],action:'propose_profile_confirmation',reason:'canonical_profile_required'});
  else if(row.version===0) proposals.push({ids:[row.id],action:'keep_candidate',reason:'legacy_not_confirmed'});
  const profile=data.profiles.find(p=>p.user_id===row.user_id);
  if(fact.payload.type==='profile' && fact.payload.field==='likedIngredients' && Array.isArray(fact.payload.value) &&
    fact.payload.value.some(v=>profile?.allergies.some(a=>ingredient(a)===ingredient(v))))
    proposals.push({ids:[row.id],action:'review_conflict',reason:'canonical_allergy_wins'});
  const group=groups.get(key) ?? [];group.push({id:row.id,value:JSON.stringify(fact.payload),explicit:row.source==='user_explicit'});groups.set(key,group);
}
for(const [group,rows] of groups) {
  const values=new Set(rows.map(r=>r.value));
  for(const value of values) {
    const duplicates=rows.filter(r=>r.value===value);
    if(duplicates.length>1) proposals.push({ids:duplicates.map(r=>r.id),group,action:'merge_provenance_after_review',reason:'semantic_duplicate'});
  }
  if(values.size>1) proposals.push({ids:rows.map(r=>r.id),group,action:'review_conflict',reason:'one_subject_multiple_values'});
}
process.stdout.write(JSON.stringify({mode:'offline_fictitious_dry_run',writes:0,owners:new Set(data.memories.map(m=>m.user_id)).size,
  inspected:data.memories.length,proposals,automatic_promotions:0,profile_changes:0},null,2)+'\n');
