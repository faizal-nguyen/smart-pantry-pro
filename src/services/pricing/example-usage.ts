/**
 * Exemple d'utilisation du système de prix des fruits et légumes
 * 
 * Ce fichier montre comment utiliser les différentes fonctionnalités
 * du système de prix avec l'API Piloterr.
 */

import PiloterrPriceService from './piloterrPriceService';
import { PriceScraper } from './priceScraper';

// Configuration
const PILOTERR_API_KEY = process.env.PILOTERR_API_KEY || 'your_api_key_here';

/**
 * Exemple 1: Scraping complet des prix
 */
export async function exampleFullScraping() {
  console.log('🍎🥕 Exemple 1: Scraping complet des prix');
  
  const scraper = new PriceScraper(PILOTERR_API_KEY);
  
  try {
    await scraper.runFullScraping();
    console.log('✅ Scraping complet terminé');
  } catch (error) {
    console.error('❌ Erreur lors du scraping complet:', error);
  }
}

/**
 * Exemple 2: Scraping sélectif
 */
export async function exampleSelectiveScraping() {
  console.log('🍎 Exemple 2: Scraping sélectif');
  
  const scraper = new PriceScraper(PILOTERR_API_KEY);
  
  try {
    // Scraper uniquement les fruits
    await scraper.scrapeFruits();
    
    // Scraper uniquement les légumes
    await scraper.scrapeVegetables();
    
    console.log('✅ Scraping sélectif terminé');
  } catch (error) {
    console.error('❌ Erreur lors du scraping sélectif:', error);
  }
}

/**
 * Exemple 3: Recherche de produits spécifiques
 */
export async function exampleSpecificProductSearch() {
  console.log('🔍 Exemple 3: Recherche de produits spécifiques');
  
  const scraper = new PriceScraper(PILOTERR_API_KEY);
  
  const productsToSearch = ['pomme', 'banane', 'tomate', 'carotte'];
  
  for (const product of productsToSearch) {
    try {
      await scraper.scrapeSpecificProduct(product);
      console.log(`✅ Recherche terminée pour: ${product}`);
    } catch (error) {
      console.error(`❌ Erreur pour ${product}:`, error);
    }
  }
}

/**
 * Exemple 4: Utilisation directe du service
 */
export async function exampleDirectServiceUsage() {
  console.log('🔧 Exemple 4: Utilisation directe du service');
  
  const piloterrService = new PiloterrPriceService(PILOTERR_API_KEY);
  
  try {
    // Récupérer les prix des fruits
    const fruits = await piloterrService.fetchFruitsPrices();
    console.log(`📊 ${fruits.length} fruits récupérés`);
    
    // Stocker les données
    await piloterrService.storePrices(fruits);
    console.log('💾 Données stockées');
    
    // Récupérer les prix stockés
    const storedFruits = await piloterrService.getStoredPrices('fruits');
    console.log(`📈 ${storedFruits.length} fruits stockés en base`);
    
    // Calculer le prix moyen des pommes
    const avgApplePrice = await piloterrService.getAveragePrice('pomme', 30);
    console.log(`💰 Prix moyen des pommes (30 jours): ${avgApplePrice.toFixed(2)} EUR`);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'utilisation directe:', error);
  }
}

/**
 * Exemple 5: Affichage des statistiques
 */
export async function exampleStatistics() {
  console.log('📊 Exemple 5: Affichage des statistiques');
  
  const scraper = new PriceScraper(PILOTERR_API_KEY);
  
  try {
    await scraper.showStatistics();
  } catch (error) {
    console.error('❌ Erreur lors de l\'affichage des statistiques:', error);
  }
}

/**
 * Exemple 6: Analyse des tendances de prix
 */
export async function examplePriceTrends() {
  console.log('📈 Exemple 6: Analyse des tendances de prix');
  
  const piloterrService = new PiloterrPriceService(PILOTERR_API_KEY);
  
  const products = ['pomme', 'banane', 'tomate', 'carotte'];
  
  for (const product of products) {
    try {
      // Prix moyen sur 7 jours
      const avg7Days = await piloterrService.getAveragePrice(product, 7);
      
      // Prix moyen sur 30 jours
      const avg30Days = await piloterrService.getAveragePrice(product, 30);
      
      console.log(`${product}:`);
      console.log(`  7 jours: ${avg7Days.toFixed(2)} EUR`);
      console.log(`  30 jours: ${avg30Days.toFixed(2)} EUR`);
      
      if (avg7Days > 0 && avg30Days > 0) {
        const change = ((avg7Days - avg30Days) / avg30Days) * 100;
        console.log(`  Variation: ${change > 0 ? '+' : ''}${change.toFixed(1)}%`);
      }
      
    } catch (error) {
      console.error(`❌ Erreur pour ${product}:`, error);
    }
  }
}

/**
 * Fonction principale pour exécuter tous les exemples
 */
export async function runAllExamples() {
  console.log('🚀 Démarrage des exemples d\'utilisation du système de prix');
  console.log('=' .repeat(60));
  
  try {
    await exampleFullScraping();
    console.log('\n' + '-'.repeat(40) + '\n');
    
    await exampleSelectiveScraping();
    console.log('\n' + '-'.repeat(40) + '\n');
    
    await exampleSpecificProductSearch();
    console.log('\n' + '-'.repeat(40) + '\n');
    
    await exampleDirectServiceUsage();
    console.log('\n' + '-'.repeat(40) + '\n');
    
    await exampleStatistics();
    console.log('\n' + '-'.repeat(40) + '\n');
    
    await examplePriceTrends();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Tous les exemples terminés avec succès');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution des exemples:', error);
  }
}

// Exécution si le fichier est appelé directement
if (require.main === module) {
  runAllExamples();
}
