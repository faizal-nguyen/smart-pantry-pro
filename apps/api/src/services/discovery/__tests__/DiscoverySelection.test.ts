import { emptyNutritionProfile, type DiscoveryItem, type ImportedRecipeDraft } from '@smart/shared';
import { chooseDiscoveryItems, discoveryContentEvidence, discoverySelectionKey } from '../DiscoverySelection.js';
import { validateDiscoveryUrl, discoveryDatabaseError } from '../DiscoveryService.js';
const now=new Date('2026-10-12T10:00:00Z');
function item(id:string,creatorId:string,patch:Partial<DiscoveryItem>={}):DiscoveryItem {
 return { id,creatorId,userId:'u',sourceUrl:'https://example.org/recipe',title:id,description:null,imageUrl:null,
  createdAt:'2026-10-12T10:00:00Z',publishedAt:null,version:1,status:'new',quality:{state:'inspiration',unknowns:[],metadata_only:true,can_save:false,requires_acknowledgement:false},
  draft:null,importId:null,recipeReference:null,snoozedUntil:null,reasons:[],constraints:'unknown',lastFeedback:null,...patch };
}
const draft:ImportedRecipeDraft={title:'Plat',ingredients:[{name:'Lait',quantity:100,unit:'ml'}],instructions:[{step:1,description:'Cuire'}],
 tags:[],confidence:0,extractionWarnings:[],source:{platform:'web',sourceUrl:'https://example.org/r',importedAt:now.toISOString(),extractionMethod:'metadata'}};
test('Paris Monday/Thursday windows survive UTC day and DST transitions',()=>{
 expect(discoverySelectionKey(new Date('2026-10-11T22:30:00Z'))).toBe('2026-42-a');
 expect(discoverySelectionKey(new Date('2026-10-14T22:30:00Z'))).toBe('2026-42-b');
 expect(discoverySelectionKey(new Date('2026-10-25T23:30:00Z'))).toBe('2026-44-a');
 expect(discoverySelectionKey(new Date('2026-12-31T23:30:00Z'))).toBe('2026-53-b');
});
test('at most five, diversified creators; pause, known incompatibility and snooze are respected',()=>{
 const candidates=[item('a','one'),item('b','one'),item('c','two'),item('d','three'),item('e','paused'),
  item('f','four',{constraints:'incompatible'}),item('g','five',{status:'passed'}),
  item('h','six',{status:'snoozed',snoozedUntil:'2026-10-14T00:00:00Z'}),
  item('i','seven',{status:'snoozed',snoozedUntil:'2026-10-10T00:00:00Z'}),item('j','one')];
 expect(chooseDiscoveryItems(candidates,new Set(['paused']),now).map(row=>row.id)).toEqual(['a','c','d','i','b']);
 expect(chooseDiscoveryItems([item('a','one',{status:'kept'}),item('b','two',{status:'added'})],new Set(),now)).toEqual([]);
});
test('incomplete and profile unavailable remain unverified; positive allergy and food policy cannot be ranked away',()=>{
 const profile=emptyNutritionProfile();profile.allergies=['milk'];
 expect(discoveryContentEvidence(null,profile).constraints).toBe('unknown');
 const evidence=discoveryContentEvidence(draft,profile);
 expect(evidence.constraints).toBe('incompatible');
 expect(evidence.reasons.join(' ')).toContain('exclu');
 expect(discoveryContentEvidence(draft,null).constraints).toBe('verify');
 expect(discoveryContentEvidence({...draft,ingredients:[{name:'Porc'}]},null).constraints).toBe('incompatible');
});
test('external links cannot execute script or expose credentials/private literals',()=>{
 for(const url of ['javascript:alert(1)','https://user:pass@example.org/a','http://127.0.0.1/a','http://[::1]/','https://localhost/','http://food.local/a']) {
  expect(()=>validateDiscoveryUrl(url)).toThrow('INVALID_URL');
 }
 expect(validateDiscoveryUrl('https://instagram.com.evil.example/r')).toBe('https://instagram.com.evil.example/r');
 // It remains a normal web link. There is no trusted social collector in this path.
});
test('missing migration, stale command and quota map to distinct errors without raw DB text',()=>{
 expect(()=>discoveryDatabaseError({code:'42P01',message:'secret detail'})).toThrow('MIGRATION_REQUIRED');
 expect(()=>discoveryDatabaseError({message:'VERSION_CONFLICT private row'})).toThrow('VERSION_CONFLICT');
 expect(()=>discoveryDatabaseError({message:'QUOTA_EXCEEDED'})).toThrow('QUOTA_EXCEEDED');
});
