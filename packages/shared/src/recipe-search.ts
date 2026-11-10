import {ingredientNameTokens,normalizeIngredientName} from './quantities.js';
/** Adjacent transpositions count once, e.g. fired → fried. */
function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    const cost = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}
export function recipeWordMatches(word: string, wanted: string): boolean {
  if (word === wanted) return true;
  // Short words stay exact (« riz » is not « ris »); longer ones allow 1 or 2 typos.
  const typos = wanted.length >= 7 ? 2 : wanted.length >= 4 ? 1 : 0;
  return typos > 0 && Math.abs(word.length - wanted.length) <= typos && editDistance(word, wanted) <= typos;
}

const CONNECTORS=new Set(['a','au','aux','de','des','du','d','le','la','les','l','et','avec','pour','un','une','je','tu','nous','veux','voudrai','voudrais','souhaite','propose','cherche','recherche','recette','faire','preparer','comment','peux','moi','facon']);
export function recipeSearchWords(query:string):string[]{const title=normalizeIngredientName(query).replace(/\bsans\s+(?:porc|vin(?:\s+(?:blanc|rouge))?|alcool|cognac|rhum|biere)\b(?:\s+(?:ni|et)\s+(?:sans\s+)?(?:porc|vin|alcool|cognac|rhum|biere)\b)*/g,'').replace(/\bavec jus\b/g,'');return ingredientNameTokens(title).filter(word=>!CONNECTORS.has(word));}
export function recipeNameMatchScore(name:string,query:string):number {
 const wanted=recipeSearchWords(query);if(!wanted.length)return 0;
 const words=recipeSearchWords(name);
 if(!wanted.every(w=>words.some(word=>recipeWordMatches(word,w))))return 0;
 return 1+Number(` ${words.join(' ')} `.includes(` ${wanted.join(' ')} `));
}
