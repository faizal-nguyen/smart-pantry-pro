// Test the regex pattern for og:description extraction

const testHTML = `<meta property="og:description" content="62K likes, 358 comments - louloukitchen_ on June 16, 2025: &quot;DÎNER DE SEMAINE: POULET CRÉMEUX JAUNE
Ingrédients :
Pour 2/3 personnes 
2 courgettes ou une énorme Ahah
1 CAC de zaatar
Huile d'olive 
2 filet de poulet ( ici jaune )
1 oignon rouge 
1 cas de curcuma 
2 cas de moutarde à l'ancienne
Ciboulette 
1 cac de bouillon de poulet ou un cube bouillon dilué dans un peu d'eau 
Un peu de riz 
1/ taillez les courgettes à la mandoline puis faites les revenir à la poêle avec de l'huile d'olive et du zaatar. Réservez
2/ faire revenir l'oignon rouge, ajoutez le poulet decoupé, moutarde , bouillon de poulet , ciboulette puis laissez réduire à feu moyen
3/ disposez joliement les courgettes ajoutez un peu de riz au centre et le poulet onctueux sur le riz&quot;" />`;

console.log('🧪 Testing regex pattern extraction...');

// Test the exact pattern from the Instagram downloader
const ogDescriptionMatch = testHTML.match(/<meta property="og:description" content="([^"]*)"/i);

if (ogDescriptionMatch) {
  console.log('✅ Pattern matched!');
  console.log('📏 Length:', ogDescriptionMatch[1].length);
  console.log('📄 Content preview:', ogDescriptionMatch[1].substring(0, 200) + '...');
  
  // Test recipe keywords
  const recipeKeywords = /(?:ingrédient|cuisson|recette|taillez|ajoutez|disposez|faites|revenir|cuisiner|préparation|mélangez|chauffez|laissez|servez)/i;
  console.log('🔍 Has recipe keywords:', recipeKeywords.test(ogDescriptionMatch[1]));
  
  // Test content length threshold
  console.log('📊 Passes length test (>200):', ogDescriptionMatch[1].length > 200);
  
} else {
  console.log('❌ Pattern did not match!');
}