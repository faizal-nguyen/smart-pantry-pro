import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {load} from 'cheerio';
const pack=JSON.parse(await readFile('data/recipes/classics-approved-2026-11-09.json','utf8'));
const queue=[...new Set(pack.recipes.map(r=>r.source_url).filter(Boolean))];
const results=[];
await mkdir('/private/tmp/classics-sources',{recursive:true});
await Promise.all(Array.from({length:4},async()=>{while(queue.length){const url=queue.shift();try{
 const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error(`HTTP ${response.status}`);
 const html=await response.text();const $=load(html);const recipes=[];
 const visit=v=>{if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object'){if([v['@type']].flat().includes('Recipe'))recipes.push(v);if(v['@graph'])visit(v['@graph']);}};
 $('script[type="application/ld+json"]').each((_,el)=>{try{visit(JSON.parse($(el).text()));}catch{}});
 const recipe=recipes[0];results.push({url,status:response.status,title:$('title').text(),recipe_name:recipe?.name ?? null,author:recipe?.author ?? null});
 await writeFile('/private/tmp/classics-sources/'+url.split('/').pop()+'.json',JSON.stringify(recipe??{},null,2));
 }catch(e){results.push({url,error:String(e.message)});}}}));
await writeFile('data/recipes/classics-source-check.json',JSON.stringify({checked_at:new Date().toISOString(),results},null,2));
console.log(JSON.stringify({checked:results.length,errors:results.filter(r=>r.error),without_recipe:results.filter(r=>!r.recipe_name).length}));
