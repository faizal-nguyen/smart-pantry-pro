import {buildFoodGuidance,type FoodGuidanceLot} from '@smart/shared';
const now=new Date('2026-11-10T12:00:00Z');
const lot=(name:string,patch:Partial<FoodGuidanceLot>={}):FoodGuidanceLot=>({id:name,product_id:name,product_name:name,quantity:1,unit:'piece',created_at:'2026-11-09T12:00:00Z',...patch});
test('covers each actual stocked botanical while excluding medicinal/supplement routines and product forms',()=>{
 const result=buildFoodGuidance(['Rose de Damas','Pollen d’abeilles','Moringa — poudre Iswari','Moringa — feuilles','Bleuet — pétales François Nature','Feuilles de séné','Ashwagandha d’Inde','Rose de Jéricho','Hibiscus','Pissenlit — racine François Nature','Gingembre','Pâte ail-gingembre','Gingembre bio — poudre Nomie'].map(n=>lot(n)),{now});
 for(const name of ['Rose de Damas','Pollen d’abeilles','Moringa — poudre Iswari','Moringa — feuilles','Bleuet — pétales François Nature','Feuilles de séné','Ashwagandha d’Inde','Rose de Jéricho','Hibiscus','Pissenlit — racine François Nature'])expect(result.facts.some(f=>f.name===name)).toBe(true);
 expect(result.daily_drink?.name).toBe('Gingembre');expect(result.daily_foods).toEqual([]);
 expect(result.facts.find(f=>f.name==='Pâte ail-gingembre')).toBeUndefined();
 expect(result.facts.find(f=>f.name.includes('Pollen'))?.precautions.join()).toMatch(/allergique/);
 expect(result.facts.find(f=>f.name==='Feuilles de séné')?.limits).toMatch(/Pas une tisane quotidienne/);
 expect(result.facts.find(f=>f.name.includes('Bleuet'))?.limits).toMatch(/fruit appelé bleuet/);
 expect(result.uncovered_product_count).toBe(1);
});
test('past dates, conservation notes and old produce remain visible as facts but never become daily picks',()=>{
 const input=[lot('Carotte',{expiry_date:'2026-11-01'}),lot('Lentilles',{notes:'Conservation à vérifier. Donnée privée.'}),lot('Gingembre',{created_at:'2026-09-01T00:00:00Z'}),lot('Radis noir',{quantity:0})];
 const result=buildFoodGuidance(input,{now});
 expect(result.daily_foods).toEqual([]);expect(result.daily_drink).toBeNull();expect(result.facts).toHaveLength(3);
 expect(result.facts.find(f=>f.name==='Carotte')?.stock_state).toBe('past_date');
 expect(JSON.stringify(result)).not.toContain('Donnée privée');
});
test('daily picks use only actual compatible lots, keep quantities uncertain and do not mutate input',()=>{
 const input=[lot('Carotte',{quantity:500,unit:'g',quantity_quality:'estimated'}),lot('Lentilles'),lot('Pois chiches'),lot('Gingembre')],before=JSON.stringify(input);
 const excluded=new Set(['Carotte','Gingembre']);const result=buildFoodGuidance(input,{now,dailyExcludedIds:excluded});
 expect(result.daily_drink).toBeNull();expect(result.daily_foods.every(f=>!excluded.has(f.id))).toBe(true);
 expect(result.facts.find(f=>f.id==='Carotte')?.checks.join()).toMatch(/estimée/);
 expect(JSON.stringify(input)).toBe(before);expect(JSON.stringify(result)).not.toContain('dailyExcludedIds');
});
test('seasons follow the Paris date; fresh food and missing seasonal ideas stay distinct',()=>{
 const input=['Tomate','Carotte','Potimarron','Oignons nouveaux'].map(name=>lot(name,{created_at:'2026-11-29T12:00:00Z'}));
 const winter=buildFoodGuidance(input,{now:new Date('2026-11-30T23:30:00Z')});
 expect(winter.seasonal_calendar.find(r=>r.name==='Tomate')?.months).not.toContain(12);
 expect(winter.facts.find(f=>f.name==='Carotte')?.season_months).toContain(1);
 expect(winter.date).toBe('2026-12-01');expect(winter.season).toBe('Hiver');
 expect(winter.seasonal_in_stock.map(f=>f.name)).toEqual(['Carotte','Potimarron']);
 expect(winter.facts.find(f=>f.name==='Oignons nouveaux')?.season).toBe('not_documented');
 expect(winter.seasonal_ideas.every(i=>!input.some(l=>l.product_name===i.name))).toBe(true);
 const summer=buildFoodGuidance(input.map(l=>({...l,created_at:'2026-06-30T12:00:00Z'})),{now:new Date('2026-07-01T12:00:00Z')});expect(summer.seasonal_in_stock.map(f=>f.name)).toContain('Tomate');
});
test('the same day is stable, the next day rotates known alternatives, and an empty stock does not invent an infusion',()=>{
 const rows=[lot('Carotte'),lot('Endive'),lot('Potimarron'),lot('Lentilles'),lot('Pois chiches')];
 const first=buildFoodGuidance(rows,{now});expect(buildFoodGuidance(rows,{now})).toEqual(first);
 expect(buildFoodGuidance(rows,{now:new Date('2026-11-11T12:00:00Z')}).daily_foods.map(f=>f.name)).not.toEqual(first.daily_foods.map(f=>f.name));
 const empty=buildFoodGuidance([],{now});expect(empty.daily_foods).toEqual([]);expect(empty.daily_drink).toBeNull();
 expect(empty.facts).toEqual([]);expect(empty.seasonal_ideas.length).toBeGreaterThan(0);
});
