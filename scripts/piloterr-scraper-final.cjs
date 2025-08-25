#!/usr/bin/env node

/**
 * Scraper Piloterr Final - Utilise la bonne configuration API
 * GET avec x-api-key header et gestion de la pagination
 */

const PILOTERR_API_KEY = '8b003b6b-9cda-4c98-b8d1-8871188a9a30';
const BASE_URL = 'https://piloterr.com/api/v2';

class PiloterrScraper {
  constructor() {
    this.products = [];
    this.headers = {
      'x-api-key': PILOTERR_API_KEY,
      'Content-Type': 'application/json'
    };
  }

  async searchProducts(query, limit = 50, maxPages = 5) {
    console.log(`🔍 Recherche: "${query}" (max ${maxPages} pages)`);
    
    const allResults = [];
    let currentPage = 1;
    let hasNextPage = true;

    while (hasNextPage && currentPage <= maxPages) {
      try {
        console.log(`  📄 Page ${currentPage}...`);
        
        const url = `${BASE_URL}/carrefour/search?query=${encodeURIComponent(query)}&limit=${limit}&page=${currentPage}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: this.headers
        });

        if (!response.ok) {
          console.log(`    ❌ Erreur HTTP: ${response.status} ${response.statusText}`);
          break;
        }

        const data = await response.json();
        
        if (data.error) {
          console.log(`    ❌ Erreur API: ${data.error}`);
          break;
        }

        if (data.results && data.results.length > 0) {
          console.log(`    ✅ ${data.results.length} produits trouvés`);
          allResults.push(...data.results);
        } else {
          console.log(`    ℹ️ Aucun produit sur cette page`);
        }

        // Vérifier la pagination
        if (data.pagination) {
          hasNextPage = data.pagination.has_next_page && data.pagination.next > currentPage;
          currentPage = data.pagination.next;
        } else {
          hasNextPage = false;
        }

        // Attendre un peu entre les requêtes
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`    ❌ Erreur: ${error.message}`);
        break;
      }
    }

    console.log(`  📊 Total: ${allResults.length} produits pour "${query}"`);
    return allResults;
  }

  async searchFruits() {
    console.log('\n🍎 Recherche des fruits...');
    
    const fruitQueries = [
      'pomme',
      'banane', 
      'orange',
      'fraise',
      'raisin',
      'kiwi',
      'ananas',
      'mangue',
      'pêche',
      'poire',
      'citron',
      'mandarine',
      'clémentine',
      'pamplemousse',
      'melon',
      'pastèque',
      'abricot',
      'prune',
      'cerise',
      'framboise'
    ];

    const allFruits = [];
    
    for (const query of fruitQueries) {
      const results = await this.searchProducts(query, 20, 3);
      allFruits.push(...results);
      
      // Attendre entre les requêtes
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return allFruits;
  }

  async searchVegetables() {
    console.log('\n🥬 Recherche des légumes...');
    
    const vegetableQueries = [
      'tomate',
      'carotte',
      'poivron',
      'salade',
      'concombre',
      'courgette',
      'aubergine',
      'brocoli',
      'chou-fleur',
      'chou',
      'épinard',
      'haricot',
      'petit pois',
      'maïs',
      'oignon',
      'ail',
      'échalote',
      'poireau',
      'céleri',
      'radis',
      'betterave',
      'navet',
      'pomme de terre',
      'patate douce'
    ];

    const allVegetables = [];
    
    for (const query of vegetableQueries) {
      const results = await this.searchProducts(query, 20, 3);
      allVegetables.push(...results);
      
      // Attendre entre les requêtes
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return allVegetables;
  }

  transformData(products) {
    console.log('\n🔄 Transformation des données...');
    
    const transformed = products.map((product, index) => {
      // Extraire le prix
      let price = 0;
      if (product.price) {
        const priceStr = String(product.price).replace(/[^\d,.]/g, '').replace(',', '.');
        price = parseFloat(priceStr) || 0;
      }

      // Nettoyer le nom
      let name = String(product.name || product.title || product.product_name || `Produit ${index + 1}`);
      name = name.trim();

      // Déterminer la catégorie
      let category = 'unknown';
      const nameLower = name.toLowerCase();
      
      if (nameLower.includes('pomme') || nameLower.includes('banane') || 
          nameLower.includes('orange') || nameLower.includes('fraise') ||
          nameLower.includes('raisin') || nameLower.includes('kiwi') ||
          nameLower.includes('ananas') || nameLower.includes('mangue') ||
          nameLower.includes('pêche') || nameLower.includes('poire') ||
          nameLower.includes('citron') || nameLower.includes('mandarine') ||
          nameLower.includes('clémentine') || nameLower.includes('pamplemousse') ||
          nameLower.includes('melon') || nameLower.includes('pastèque') ||
          nameLower.includes('abricot') || nameLower.includes('prune') ||
          nameLower.includes('cerise') || nameLower.includes('framboise')) {
        category = 'fruits';
      } else if (nameLower.includes('tomate') || nameLower.includes('carotte') ||
                 nameLower.includes('poivron') || nameLower.includes('salade') ||
                 nameLower.includes('concombre') || nameLower.includes('courgette') ||
                 nameLower.includes('aubergine') || nameLower.includes('brocoli') ||
                 nameLower.includes('chou') || nameLower.includes('épinard') ||
                 nameLower.includes('haricot') || nameLower.includes('petit pois') ||
                 nameLower.includes('maïs') || nameLower.includes('oignon') ||
                 nameLower.includes('ail') || nameLower.includes('échalote') ||
                 nameLower.includes('poireau') || nameLower.includes('céleri') ||
                 nameLower.includes('radis') || nameLower.includes('betterave') ||
                 nameLower.includes('navet') || nameLower.includes('pomme de terre') ||
                 nameLower.includes('patate douce')) {
        category = 'vegetables';
      }

      // Déterminer l'unité
      let unit = 'kg';
      if (nameLower.includes('kg') || nameLower.includes('kilo')) {
        unit = 'kg';
      } else if (nameLower.includes('g') || nameLower.includes('gramme')) {
        unit = 'g';
      } else if (nameLower.includes('pièce') || nameLower.includes('unité')) {
        unit = 'piece';
      }

      return {
        id: String(product.id || product.product_id || `piloterr_${index}_${Date.now()}`),
        name: name,
        category: category,
        unit: unit,
        price: price,
        currency: 'EUR',
        location: 'France',
        date: new Date().toISOString().split('T')[0],
        source: 'piloterr',
        url: product.url || product.product_url,
        image: product.image || product.image_url
      };
    }).filter(item => item.name && item.price > 0);

    console.log(`✅ ${transformed.length} produits transformés`);
    return transformed;
  }

  async scrapeAll() {
    console.log('🚀 Début du scraping complet avec Piloterr API');
    console.log('=' .repeat(60));

    try {
      // Récupérer les fruits
      const fruits = await this.searchFruits();
      console.log(`\n🍎 Total fruits: ${fruits.length}`);

      // Récupérer les légumes
      const vegetables = await this.searchVegetables();
      console.log(`\n🥬 Total légumes: ${vegetables.length}`);

      // Combiner tous les produits
      this.products = [...fruits, ...vegetables];
      console.log(`\n📊 Total brut: ${this.products.length} produits`);

      // Supprimer les doublons basés sur l'ID
      const uniqueProducts = this.products.filter((product, index, self) => 
        index === self.findIndex(p => p.id === product.id)
      );
      console.log(`📊 Après déduplication: ${uniqueProducts.length} produits`);

      // Transformer les données
      const transformedProducts = this.transformData(uniqueProducts);

      // Sauvegarder dans un fichier JSON
      const fs = require('fs');
      const filename = `piloterr-prices-${Date.now()}.json`;
      fs.writeFileSync(filename, JSON.stringify(transformedProducts, null, 2));
      console.log(`\n💾 Données sauvegardées dans: ${filename}`);

      // Afficher quelques exemples
      console.log('\n📋 Exemples de produits récupérés:');
      transformedProducts.slice(0, 10).forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.name} - ${product.price}€/${product.unit} (${product.category})`);
      });

      return transformedProducts;

    } catch (error) {
      console.error('❌ Erreur fatale:', error.message);
      return [];
    }
  }
}

async function main() {
  console.log('🚀 Scraper Piloterr Final');
  console.log('=' .repeat(60));

  const scraper = new PiloterrScraper();
  
  try {
    const products = await scraper.scrapeAll();
    
    if (products.length > 0) {
      console.log(`\n✅ Scraping terminé avec succès!`);
      console.log(`📊 ${products.length} produits récupérés`);
      
      // Statistiques par catégorie
      const fruits = products.filter(p => p.category === 'fruits');
      const vegetables = products.filter(p => p.category === 'vegetables');
      
      console.log(`🍎 Fruits: ${fruits.length}`);
      console.log(`🥬 Légumes: ${vegetables.length}`);
      
      // Prix moyens
      if (fruits.length > 0) {
        const avgFruitPrice = fruits.reduce((sum, p) => sum + p.price, 0) / fruits.length;
        console.log(`💰 Prix moyen fruits: ${avgFruitPrice.toFixed(2)}€`);
      }
      
      if (vegetables.length > 0) {
        const avgVegPrice = vegetables.reduce((sum, p) => sum + p.price, 0) / vegetables.length;
        console.log(`💰 Prix moyen légumes: ${avgVegPrice.toFixed(2)}€`);
      }
      
    } else {
      console.log('❌ Aucun produit récupéré');
    }
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
  }
}

// Lancer le scraping
if (require.main === module) {
  main();
}

module.exports = { PiloterrScraper };

