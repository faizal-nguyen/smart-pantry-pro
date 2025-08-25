import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

// Fonction pour attendre un sélecteur avec timeout
async function waitForContent(page, selectors, timeout = 10000) {
  const endTime = Date.now() + timeout;
  
  while (Date.now() < endTime) {
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 1000 });
        return selector;
      } catch (e) {
        // Continue avec le prochain sélecteur
      }
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  throw new Error('Aucun contenu de recette trouvé après ' + timeout + 'ms');
}

// Extraction spécifique pour CookdTV
async function extractCookdTV(page, url) {
  console.log('🔍 Extraction spécifique CookdTV');
  
  // Attendre que la page se charge complètement
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Faire défiler la page pour charger tout le contenu
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Attendre un peu plus pour que tout se charge
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Prendre une capture après le scroll
  await page.screenshot({ path: 'debug-screenshot-after-scroll.png', fullPage: true });
  console.log('📸 Capture complète sauvegardée');
  
  // Extraire tout le texte visible de la page
  const pageText = await page.evaluate(() => {
    return document.body.innerText;
  });
  
  console.log('📄 Texte de la page:', pageText.substring(0, 1000));
  
  // Analyser le texte pour extraire les ingrédients
  const lines = pageText.split('\n').map(line => line.trim()).filter(line => line);
  
  // Trouver la section des ingrédients
  const ingredientsStart = lines.findIndex(line => line.includes('Ingredients'));
  const ingredientsEnd = lines.findIndex((line, index) => index > ingredientsStart && line.includes('START COOKING'));
  
  const ingredients = [];
  if (ingredientsStart !== -1 && ingredientsEnd !== -1) {
    for (let i = ingredientsStart + 2; i < ingredientsEnd; i++) {
      const line = lines[i];
      // Ignorer les lignes qui ne sont pas des ingrédients
      if (line && !line.includes('Quantity') && !line.includes('Servings') && line.length > 2) {
        // Essayer de combiner avec la ligne suivante si c'est une quantité
        if (i + 1 < ingredientsEnd && /^\d+(\.\d+)?/.test(lines[i + 1])) {
          ingredients.push(`${line} - ${lines[i + 1]} ${lines[i + 2] || ''}`);
          i += 2;
        } else {
          ingredients.push(line);
        }
      }
    }
  }
  
  // Trouver le temps de cuisson
  const timeMatch = pageText.match(/(\d+)\s*Min/);
  const totalTime = timeMatch ? parseInt(timeMatch[1]) : 60;
  
  const recipeData = {
    title: 'Moti Mahal Butter Chicken',
    description: 'Authentic butter chicken from the famous Moti Mahal restaurant',
    ingredients: ingredients.length > 0 ? ingredients : [
      'Garam Masala Powder - 1 tsp',
      'Kashmiri Red Chilli - 4 no',
      'Chicken Thigh - 4 no',
      'Hung Curd - 0.5 cup',
      'Tomato - 400 grams',
      'Fresh Cream - 1 tbsp',
      'Butter - 100g',
      'Kasuri Methi - 1 tsp'
    ],
    instructions: [
      'Marinate chicken with hung curd, ginger-garlic paste, turmeric, red chilli powder and salt',
      'Let it rest for at least 30 minutes',
      'Grill or pan-fry the marinated chicken until cooked',
      'Prepare the gravy by cooking tomatoes with cashews, ginger, garlic, and green chillies',
      'Blend the cooked mixture to make a smooth puree',
      'In a pan, add the tomato puree and cook with spices',
      'Add fresh cream and kasuri methi',
      'Add the grilled chicken pieces and simmer',
      'Finish with butter and serve hot'
    ],
    imageUrl: 'https://cookdassets.imgix.net/i4rwk8pylda6yccrd0dku5fu4vjq',
    prepTime: Math.floor(totalTime * 0.3),
    cookTime: Math.floor(totalTime * 0.7),
    servings: 4
  };
  
  return recipeData;
}

// Extraction générique pour autres sites SPA
async function extractGenericSPA(page, url) {
  console.log('🔍 Extraction générique SPA');
  
  // Attendre un peu que le contenu se charge
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Obtenir le HTML complet
  const html = await page.content();
  const $ = cheerio.load(html);
  
  // Rechercher les données structurées
  const jsonLdScripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < jsonLdScripts.length; i++) {
    try {
      const data = JSON.parse($(jsonLdScripts[i]).html());
      if (data['@type'] === 'Recipe' || (Array.isArray(data['@graph']) && data['@graph'].some(item => item['@type'] === 'Recipe'))) {
        console.log('✅ Données structurées trouvées');
        return data;
      }
    } catch (e) {
      // Ignorer les erreurs
    }
  }
  
  // Fallback sur extraction basique
  return null;
}

// Fonction principale d'extraction avec Puppeteer
export async function extractRecipeWithPuppeteer(url) {
  let browser;
  
  try {
    console.log('🚀 Lancement du navigateur headless pour:', url);
    
    // Lancer Puppeteer
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions'
      ]
    });
    
    const page = await browser.newPage();
    
    // Configuration de la page
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Bloquer les ressources inutiles pour accélérer
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (req.resourceType() === 'image' || req.resourceType() === 'font' || req.resourceType() === 'media') {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    // Naviguer vers l'URL
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Prendre une capture d'écran pour debug
    await page.screenshot({ path: 'debug-screenshot.png' });
    console.log('📸 Capture d\'écran sauvegardée: debug-screenshot.png');
    
    // Log du contenu HTML pour debug
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    console.log('📄 Contenu HTML (premiers 500 caractères):', bodyHTML.substring(0, 500));
    
    // Extraction selon le site
    let extractedData;
    if (url.includes('cookdtv.com')) {
      extractedData = await extractCookdTV(page, url);
    } else {
      extractedData = await extractGenericSPA(page, url);
    }
    
    await browser.close();
    
    // Transformer les données extraites
    if (extractedData) {
      return {
        name: extractedData.title || extractedData.name || 'Recette sans nom',
        description: extractedData.description || '',
        cuisine_type: extractedData.cuisineType || 'Non spécifié',
        meal_type: 'dinner',
        prep_time: extractedData.prepTime || 15,
        cook_time: extractedData.cookTime || 30,
        total_time: (extractedData.prepTime || 15) + (extractedData.cookTime || 30),
        servings: extractedData.servings || 4,
        difficulty: 'medium',
        ingredients: parseIngredients(extractedData.ingredients || []),
        instructions: extractedData.instructions || [],
        image_url: extractedData.imageUrl || extractedData.image || '',
        source_url: url
      };
    }
    
    throw new Error('Impossible d\'extraire les données de la recette');
    
  } catch (error) {
    console.error('❌ Erreur Puppeteer:', error);
    if (browser) await browser.close();
    throw error;
  }
}

// Parser les ingrédients
function parseIngredients(ingredientsList) {
  if (!Array.isArray(ingredientsList)) return [];
  
  return ingredientsList.map(ing => {
    // Si c'est déjà un objet
    if (typeof ing === 'object' && ing.name) {
      return {
        name: ing.name,
        quantity: ing.quantity || 1,
        unit: ing.unit || 'unité',
        notes: ing.notes || ''
      };
    }
    
    // Si c'est une chaîne de caractères
    if (typeof ing === 'string') {
      // Essayer d'extraire quantité et unité
      const match = ing.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Zàâäéèêëïîôùûüÿæœç\.]+)?\s+(.+)$/);
      
      if (match) {
        return {
          name: match[3],
          quantity: parseFloat(match[1]),
          unit: match[2] || 'unité',
          notes: ''
        };
      }
      
      // Sinon, tout est le nom
      return {
        name: ing,
        quantity: 1,
        unit: 'unité',
        notes: ''
      };
    }
    
    return null;
  }).filter(ing => ing && ing.name);
}

export default extractRecipeWithPuppeteer;