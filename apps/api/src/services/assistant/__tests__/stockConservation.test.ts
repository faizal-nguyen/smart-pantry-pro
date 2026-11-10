import {conservationReviewRequired} from '@smart/shared';
import {memoryModelToolResult} from '../MemoryModelOutput.js';
import {evaluateAvailability} from '../../recommendations/PersonalizationScoring.js';
import {policy} from '../__fixtures__/memory.js';
test('conservation signal survives private-profile redaction, free notes do not',()=>{
  const result=memoryModelToolResult('read_inventory',{complete:true,items:[{product_name:'Lait concentré',notes:'Conservation à vérifier. Texte privé.',conservation_review_required:true}]},policy());
  expect(JSON.stringify(result)).toContain('"conservation_review_required":true');
  expect(JSON.stringify(result)).not.toContain('Texte privé');
  expect(conservationReviewRequired('Conservation à vérifier.')).toBe(true);
});
test('a recorded conservation review prevents automatic stock sufficiency',()=>{
  const result=evaluateAvailability({servings:2,recipe_ingredients:[{ingredient_name:'Lait concentré',quantity:100,unit:'g'}]} as never,
    [{id:'lot',product_id:'p',product_name:'Lait concentré',quantity:200,unit:'g',stock_version:0,expiry_date:null,notes:'Conservation à vérifier.'}],2,new Date());
  expect(result.status).toBe('verify');expect(result.uncertainties.join(' ')).toContain('Conservation à vérifier');
});
