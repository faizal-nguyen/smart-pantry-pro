#!/usr/bin/env node

/**
 * Script pour tester l'interface web de Piloterr
 * et comprendre comment utiliser leur service de scraping
 */

const PILOTERR_API_KEY = '8b003b6b-9cda-4c98-b8d1-8871188a9a30';

async function testPiloterrWebInterface() {
  console.log('🌐 Test de l\'interface web de Piloterr...');
  console.log('=' .repeat(50));

  try {
    // Test de la page d'accueil
    console.log('🔍 Test de la page d\'accueil...');
    const response = await fetch('https://piloterr.com');
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const html = await response.text();
      
      // Chercher des informations sur l'API
      if (html.includes('api') || html.includes('API')) {
        console.log('✅ Page d\'accueil accessible');
        console.log('📋 Contient des références à l\'API');
        
        // Extraire des informations utiles
        const apiMatches = html.match(/api[^"]*/gi);
        if (apiMatches) {
          console.log('🔗 Références API trouvées:', apiMatches.slice(0, 5));
        }
      }
    } else {
      console.log('❌ Page d\'accueil non accessible');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test de la page d\'accueil:', error.message);
  }
}

async function testPiloterrDocumentation() {
  console.log('\n📚 Recherche de la documentation...');
  console.log('=' .repeat(50));

  const docUrls = [
    'https://piloterr.com/docs',
    'https://piloterr.com/api/docs',
    'https://docs.piloterr.com',
    'https://piloterr.com/help',
    'https://piloterr.com/api'
  ];

  for (const url of docUrls) {
    try {
      console.log(`🔍 Test de: ${url}`);
      const response = await fetch(url);
      
      console.log(`  📊 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const html = await response.text();
        console.log(`  ✅ Documentation accessible: ${url}`);
        
        // Chercher des exemples d'API
        if (html.includes('curl') || html.includes('fetch') || html.includes('POST')) {
          console.log(`  📋 Contient des exemples d'API`);
        }
        
        return url;
      } else {
        console.log(`  ❌ Non accessible`);
      }

    } catch (error) {
      console.log(`  ❌ Erreur: ${error.message}`);
    }
  }
  
  return null;
}

async function testPiloterrLogin() {
  console.log('\n🔐 Test de l\'authentification...');
  console.log('=' .repeat(50));

  try {
    // Test de la page de connexion
    const response = await fetch('https://piloterr.com/login', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('✅ Page de connexion accessible');
      console.log('💡 Vous devrez peut-être vous connecter via l\'interface web');
    } else {
      console.log('❌ Page de connexion non accessible');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test de connexion:', error.message);
  }
}

async function testAlternativeAPIs() {
  console.log('\n🔧 Test d\'APIs alternatives...');
  console.log('=' .repeat(50));

  // Test d'autres services de scraping populaires
  const alternativeAPIs = [
    {
      name: 'ScrapingBee',
      url: 'https://app.scrapingbee.com/api/v1/',
      key: PILOTERR_API_KEY
    },
    {
      name: 'ScraperAPI',
      url: 'https://api.scraperapi.com',
      key: PILOTERR_API_KEY
    },
    {
      name: 'Bright Data',
      url: 'https://api.brightdata.com',
      key: PILOTERR_API_KEY
    }
  ];

  for (const api of alternativeAPIs) {
    try {
      console.log(`🔍 Test de ${api.name}...`);
      
      const response = await fetch(`${api.url}?api_key=${api.key}&url=https://www.carrefour.fr`);
      
      console.log(`  📊 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        console.log(`  ✅ ${api.name} fonctionne!`);
        return api;
      } else {
        console.log(`  ❌ ${api.name} ne fonctionne pas`);
      }

    } catch (error) {
      console.log(`  ❌ Erreur avec ${api.name}: ${error.message}`);
    }
  }
  
  return null;
}

async function createSimpleScraper() {
  console.log('\n🛠️  Création d\'un scraper simple...');
  console.log('=' .repeat(50));

  console.log('💡 Création d\'un scraper basique pour Carrefour...');
  
  const scraperCode = `
// Scraper simple pour Carrefour
const puppeteer = require('puppeteer');

async function scrapeCarrefour() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://www.carrefour.fr/fruits-et-legumes/fruits', {
      waitUntil: 'networkidle2'
    });
    
    const products = await page.evaluate(() => {
      const items = document.querySelectorAll('.product-card, .product-item');
      return Array.from(items).map(item => ({
        name: item.querySelector('.product-name, .product-title')?.textContent?.trim(),
        price: item.querySelector('.price, .product-price')?.textContent?.trim(),
        unit: item.querySelector('.unit, .product-unit')?.textContent?.trim()
      })).filter(p => p.name && p.price);
    });
    
    return products;
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeCarrefour };
`;

  console.log('📝 Code du scraper créé');
  console.log('💡 Vous pouvez utiliser ce code comme alternative');
  
  return scraperCode;
}

async function main() {
  console.log('🚀 Analyse de Piloterr et alternatives');
  console.log('=' .repeat(60));
  console.log(`🔑 Clé API: ${PILOTERR_API_KEY.substring(0, 8)}...`);

  // Test de l'interface web
  await testPiloterrWebInterface();
  
  // Recherche de documentation
  const docUrl = await testPiloterrDocumentation();
  
  // Test de connexion
  await testPiloterrLogin();
  
  // Test d'APIs alternatives
  const workingAPI = await testAlternativeAPIs();
  
  // Création d'un scraper simple
  await createSimpleScraper();
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Analyse terminée');
  
  if (workingAPI) {
    console.log(`🎯 API alternative fonctionnelle: ${workingAPI.name}`);
    console.log('💡 Vous pouvez utiliser cette API comme alternative');
  } else {
    console.log('💡 Recommandations:');
    console.log('1. Connectez-vous à https://piloterr.com pour configurer votre projet');
    console.log('2. Créez une entité ou un projet dans leur interface');
    console.log('3. Utilisez leur interface web pour configurer le scraping');
    console.log('4. Ou utilisez un scraper simple avec Puppeteer');
  }
  
  console.log('\n📚 Documentation trouvée:', docUrl || 'Aucune');
  console.log('\n💡 Prochaines étapes:');
  console.log('1. Visitez https://piloterr.com pour configurer votre projet');
  console.log('2. Ou utilisez une API alternative de scraping');
  console.log('3. Ou implémentez un scraper simple avec Puppeteer');
}

// Lancer l'analyse
if (require.main === module) {
  main();
}
