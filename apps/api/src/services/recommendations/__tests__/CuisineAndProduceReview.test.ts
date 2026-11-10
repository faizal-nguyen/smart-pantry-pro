import {cuisineKey,recipeMatchesCuisine,produceReview,recipeNameMatchScore} from '@smart/shared';
const now=new Date('2026-11-20T12:00:00Z');
const lot=(name:string)=>({quantity:1,created_at:'2026-11-01T12:00:00Z',updated_at:'2026-11-01T12:00:00Z',product:{name}});
test('cuisine filters share French/English aliases and preserve distinct origins',()=>{
 expect(cuisineKey('Mexican')).toBe(cuisineKey('Mexicaine'));
 expect(recipeMatchesCuisine('Tunisienne',[],'Tunisian')).toBe(true);
 expect(recipeMatchesCuisine('Française',[],'cuisine française')).toBe(true);
 expect(recipeMatchesCuisine('Française',[],'Italienne')).toBe(false);
 expect(recipeMatchesCuisine(null,['Cuisine japonaise'],'Japanese')).toBe(true);
});
test('produce review uses age since the latest update, without asserting expiry',()=>{
 expect(produceReview(lot('Tomates'),now)).toEqual({days:19,interval:7});
 expect(produceReview({...lot('Tomates'),updated_at:'2026-11-19T12:00:00Z'},now)).toBeNull();
 expect(produceReview(lot('Coriandre fraîche'),new Date('2026-11-04T12:00:00Z'))).toEqual({days:3,interval:3});
 expect(produceReview(lot('Oignons'),new Date('2026-11-14T12:00:00Z'))).toBeNull();
});
test('frozen lots, processed products, empty lots and unknown/future timestamps do not produce fresh-food reminders',()=>{
 for(const name of ['Pulpe de tomates en conserve','Pâte ail-gingembre','Purée de piment','Basilic séché','Citron confit','Gingembre en poudre','Pois chiches secs','Moringa en feuilles'])expect(produceReview(lot(name),now)).toBeNull();
 for(const changes of [{quantity:0},{location:'Congélateur'},{updated_at:'2026-11-25'},{updated_at:undefined,created_at:undefined}])expect(produceReview({...lot('Brocoli'),...changes},now)).toBeNull();
});
test('the review date follows Paris calendar days rather than UTC midnight',()=>{
 expect(produceReview({...lot('Coriandre fraîche'),updated_at:'2026-11-01T23:30:00Z'},new Date('2026-11-04T12:00:00Z'))).toBeNull();
});


test('old policy-qualified names remain searchable after title cleanup without stripping meaningful restrictions',()=>{
 expect(recipeNameMatchScore('Blanquette de veau','Blanquette de veau sans vin')).toBeGreaterThan(0);
 expect(recipeNameMatchScore('Bœuf bourguignon','Bœuf façon bourguignon sans vin')).toBeGreaterThan(0);
 expect(recipeNameMatchScore('Tournedos Rossini','Tournedos Rossini avec jus sans alcool')).toBeGreaterThan(0);
 expect(recipeNameMatchScore('Pain','Pain sans gluten')).toBe(0);
 expect(recipeNameMatchScore('Coq','Coq au vin')).toBe(0);
});
