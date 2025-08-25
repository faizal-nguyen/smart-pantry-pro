#!/usr/bin/env node

/**
 * Script de test pour le scraper Carrefour
 */

const { CarrefourScraper } = require('../src/services/pricing/carrefourScraper.ts');

async function testCarrefourScraper() {
  console.log('🚀 Test du scraper Carrefour');
  console.log('=' .repeat(50));

  const scraper = new CarrefourScraper();

  try {
    // Test 1: Scraping des fruits
    console.log('\n🍎 Test 1: Scraping des fruits...');
    const fruits = await scraper.scrapeFruits();
    console.log(`✅ ${fruits.length} fruits récupérés`);
    
    if (fruits.length > 0) {
      console.log('📋 Exemples de fruits:');
      fruits.slice(0, 3).forEach(fruit => {
        console.log(`  - ${fruit.name}: ${fruit.price}€/${fruit.unit}`);
      });
    }

    // Test 2: Scraping des légumes
    console.log('\n🥕 Test 2: Scraping des légumes...');
    const vegetables = await scraper.scrapeVegetables();
    console.log(`✅ ${vegetables.length} légumes récupérés`);
    
    if (vegetables.length > 0) {
      console.log('📋 Exemples de légumes:');
      vegetables.slice(0, 3).forEach(vegetable => {
        console.log(`  - ${vegetable.name}: ${vegetable.price}€/${vegetable.unit}`);
      });
    }

    // Test 3: Scraping complet
    console.log('\n🚀 Test 3: Scraping complet...');
    const result = await scraper.scrapeAll();
    
    if (result.success) {
      console.log(`✅ Scraping complet réussi!`);
      console.log(`📊 Statistiques:`);
      console.log(`  - Total: ${result.stats.total} produits`);
      console.log(`  - Fruits: ${result.stats.fruits}`);
      console.log(`  - Légumes: ${result.stats.vegetables}`);
      console.log(`  - Durée: ${result.stats.duration}ms`);
    } else {
      console.log(`❌ Scraping échoué: ${result.error}`);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  } finally {
    await scraper.close();
  }
}

async function testWithService() {
  console.log('\n🔧 Test avec le service principal...');
  console.log('=' .repeat(50));

  const PiloterrPriceService = require('../src/services/pricing/piloterrPriceService.ts').default;
  const service = new PiloterrPriceService();

  try {
    // Test des fruits
    console.log('\n🍎 Test des fruits via le service...');
    const fruits = await service.fetchFruitsPrices();
    console.log(`✅ ${fruits.length} fruits récupérés via le service`);

    // Test des légumes
    console.log('\n🥕 Test des légumes via le service...');
    const vegetables = await service.fetchVegetablesPrices();
    console.log(`✅ ${vegetables.length} légumes récupérés via le service`);

    // Test de recherche
    console.log('\n🔍 Test de recherche "pomme"...');
    const searchResults = await service.searchProduct('pomme');
    console.log(`✅ ${searchResults.length} résultats pour "pomme"`);

  } catch (error) {
    console.error('❌ Erreur lors du test du service:', error.message);
  }
}

async function main() {
  console.log('🚀 Démarrage des tests du scraper Carrefour');
  console.log('=' .repeat(60));

  try {
    await testCarrefourScraper();
    await testWithService();
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ Tests terminés');
    console.log('\n💡 Prochaines étapes:');
    console.log('1. Si les tests sont réussis, lancez le scraping complet');
    console.log('2. Utilisez: node scripts/scrape-prices.js --full');
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

// Lancer les tests
if (require.main === module) {
  main();
}
