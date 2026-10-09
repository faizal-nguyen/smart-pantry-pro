import { normalizeIngredientName, type StockIngredient } from '@smart/shared';
// Conservative ingredient-name filtering, not a claim about traces or nutritional fitness.
const aliases: Record<string,string[]> = {
  eggs:['œuf','oeuf','egg'],oeufs:['œuf','oeuf','egg'],œufs:['œuf','oeuf','egg'],
  dairy:['lait','milk','fromage','cheese','yaourt','yogurt','beurre','butter','creme','cream','paneer','ghee'],
  milk:['lait','milk','fromage','cheese','yaourt','yogurt','beurre','butter','creme','cream','paneer','ghee'],
  lait:['lait','milk','fromage','cheese','yaourt','yogurt','beurre','butter','creme','cream','paneer','ghee'],
  lactose:['lait','milk','fromage','cheese','yaourt','yogurt','beurre','butter','creme','cream','paneer','ghee'],
  gluten:['ble','wheat','farine','flour','orge','barley','seigle','rye','pate','pasta','pain','bread','chapati','naan'],
  peanuts:['arachide','cacahuete','peanut'],arachides:['arachide','cacahuete','peanut'],
  nuts:['amande','almond','noix','walnut','noisette','hazelnut','cajou','cashew','pistache','pistachio'],
  'fruits a coque':['amande','almond','noix','walnut','noisette','hazelnut','cajou','cashew','pistache','pistachio'],
  soy:['soja','soy','tofu'],soja:['soja','soy','tofu'],sesame:['sesame','tahini'],
  shellfish:['crevette','shrimp','prawn','crabe','crab','homard','lobster'],crustaces:['crevette','shrimp','prawn','crabe','crab','homard','lobster'],
  fish:['poisson','fish','saumon','salmon','thon','tuna','cabillaud','cod','anchois','anchovy'],poisson:['poisson','fish','saumon','salmon','thon','tuna','cabillaud','cod','anchois','anchovy'],
  celery:['celeri','celery'],celeri:['celeri','celery'],mustard:['moutarde','mustard'],moutarde:['moutarde','mustard'],
};
const meat = ['viande','meat','poulet','chicken','boeuf','bœuf','beef','porc','pork','jambon','ham','agneau','lamb','dinde','turkey','canard','duck','lard','bacon','saucisse'];
export function mealPreferenceVerificationIssue(restrictions:string[]): string|null {
  const certification = restrictions.map(normalizeIngredientName).filter(value => ['halal','kosher','casher'].includes(value));
  if (!certification.length) return null;
  const labels = [...new Set(certification.map(value => value==='halal' ? 'halal' : 'casher'))];
  return `La conformité ${labels.join(' et ')} n’est pas renseignée pour ces recettes. Les idées automatiques restent indisponibles ; vous pouvez ouvrir vos recettes et vérifier leurs ingrédients.`;
}
export function mealExclusionReason(ingredients:StockIngredient[],allergies:string[],restrictions:string[]): string|null {
  const issue = mealPreferenceVerificationIssue(restrictions);
  if (issue) return issue;
  if (ingredients.some(item => !item.ingredient_name.trim())) return 'Ingrédients à vérifier';
  const names = ingredients.map(item => normalizeIngredientName(item.ingredient_name));
  const banned = [...allergies.flatMap(value => aliases[normalizeIngredientName(value)] ?? [normalizeIngredientName(value)])];
  for (const restriction of restrictions) {
    const value = normalizeIngredientName(restriction);
    if (['vegetarian','vegetarien','vegetarienne','vegan','veganisme','vegetalien'].includes(value)) banned.push(...meat,...aliases.fish,...aliases.shellfish);
    if (['vegan','veganisme','vegetalien'].includes(value)) banned.push(...aliases.eggs,...aliases.dairy,'miel','honey');
    if (['gluten-free','sans gluten'].includes(value)) banned.push(...aliases.gluten);
    if (['lactose-free','dairy-free','sans lactose'].includes(value)) banned.push(...aliases.dairy);
    if (value.startsWith('sans ') && !['sans gluten','sans lactose'].includes(value)) banned.push(...(aliases[value.slice(5)] ?? [value.slice(5)]));
  }
  return banned.some(term => names.some(name => name.includes(term))) ? 'Ingrédient exclu par vos préférences' : null;
}
