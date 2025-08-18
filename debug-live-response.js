import { readFileSync } from 'fs';

const html = readFileSync('instagram-live-response.html', 'utf-8');

console.log('🔍 Debugging live Instagram HTML response...');
console.log('📏 HTML length:', html.length);
console.log('');

console.log('🔍 Searching for meta tags...');
console.log('Contains "og:description":', html.includes('og:description'));  
console.log('Contains "property=\\"og:description\\"":', html.includes('property="og:description"'));
console.log('Contains "name=\\"description\\"":', html.includes('name="description"'));
console.log('');

console.log('🔍 Testing meta description regex...');
const metaDescMatch = html.match(/<meta name="description" content="([^"]*)"/i);
console.log('Meta description found:', metaDescMatch !== null);

if (metaDescMatch) {
  console.log('📏 Meta description length:', metaDescMatch[1].length);
  console.log('📄 Meta description preview:');
  console.log(metaDescMatch[1].substring(0, 200) + '...');
  console.log('');
  
  console.log('🔍 Testing recipe keywords...');
  const recipeKeywords = /(?:ingrédient|cuisson|recette|taillez|ajoutez|disposez|faites|revenir|cuisiner|préparation|mélangez|chauffez|laissez|servez)/i;
  console.log('Has recipe keywords:', recipeKeywords.test(metaDescMatch[1]));
  console.log('Passes length test (>200):', metaDescMatch[1].length > 200);
  
  if (recipeKeywords.test(metaDescMatch[1]) && metaDescMatch[1].length > 200) {
    console.log('✅ This should have been extracted as recipe content!');
  }
}