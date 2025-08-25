#!/usr/bin/env node

/**
 * Script de test final pour l'API Piloterr
 * Utilise les vraies routes: /api/v2/carrefour/search et /api/v2/carrefour/product
 */

const PILOTERR_API_KEY = '8b003b6b-9cda-4c98-b8d1-8871188a9a30';
const BASE_URL = 'https://piloterr.com/api/v2';

async function testSearchEndpoint() {
  console.log('🔍 Test de l\'endpoint de recherche...');
  console.log('=' .repeat(50));

  try {
    const searchData = {
      query: 'pomme',
      category: 'fruits',
      limit: 10
    };

    console.log('🚀 Recherche de "pomme"...');
    const response = await fetch(`${BASE_URL}/carrefour/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PILOTERR_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(searchData)
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Recherche réussie!');
      console.log('📋 Réponse:', JSON.stringify(data, null, 2));
      
      if (data.products && data.products.length > 0) {
        console.log(`📊 ${data.products.length} produits trouvés`);
        data.products.slice(0, 3).forEach((product, index) => {
          console.log(`  ${index + 1}. ${product.name || product.title}: ${product.price}€`);
        });
      }
      
      return data.products || data.results || [];
    } else {
      const errorText = await response.text();
      console.log('❌ Erreur lors de la recherche');
      console.log('📄 Réponse d\'erreur:', errorText);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test de recherche:', error.message);
  }
  
  return [];
}

async function testProductEndpoint(productId) {
  if (!productId) {
    console.log('\n⏭️  Pas d\'ID produit, test de produit ignoré');
    return;
  }

  console.log('\n📋 Test de l\'endpoint produit...');
  console.log('=' .repeat(50));

  try {
    console.log(`🆔 Récupération du produit: ${productId}`);
    
    const response = await fetch(`${BASE_URL}/carrefour/product/${productId}`, {
      headers: {
        'Authorization': `Bearer ${PILOTERR_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Détails du produit récupérés!');
      console.log('📋 Réponse:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Erreur lors de la récupération du produit');
      console.log('📄 Réponse d\'erreur:', errorText);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test de produit:', error.message);
  }
}

async function testMultipleSearches() {
  console.log('\n🔍 Test de multiples recherches...');
  console.log('=' .repeat(50));

  const queries = [
    { query: 'pomme', category: 'fruits' },
    { query: 'banane', category: 'fruits' },
    { query: 'tomate', category: 'vegetables' },
    { query: 'carotte', category: 'vegetables' }
  ];

  const allProducts = [];

  for (const { query, category } of queries) {
    try {
      console.log(`🔍 Recherche: ${query} (${category})`);
      
      const searchData = {
        query: query,
        category: category,
        limit: 5
      };

      const response = await fetch(`${BASE_URL}/carrefour/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PILOTERR_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchData)
      });

      if (response.ok) {
        const data = await response.json();
        const products = data.products || data.results || [];
        console.log(`  ✅ ${products.length} produits trouvés`);
        allProducts.push(...products);
      } else {
        console.log(`  ❌ Erreur pour ${query}`);
      }

      // Attendre un peu entre les requêtes
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`  ❌ Erreur pour ${query}: ${error.message}`);
    }
  }

  console.log(`\n📊 Total: ${allProducts.length} produits récupérés`);
  return allProducts;
}

async function testServiceIntegration() {
  console.log('\n🔧 Test d\'intégration avec le service...');
  console.log('=' .repeat(50));

  try {
    // Simuler l'utilisation du service
    console.log('🚀 Test de recherche de fruits...');
    
    const fruitQueries = ['pomme', 'banane', 'orange'];
    const allFruits = [];
    
    for (const query of fruitQueries) {
      try {
        const searchData = {
          query: query,
          category: 'fruits',
          limit: 3
        };

        const response = await fetch(`${BASE_URL}/carrefour/search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PILOTERR_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(searchData)
        });

        if (response.ok) {
          const data = await response.json();
          const products = data.products || data.results || [];
          allFruits.push(...products);
          console.log(`  ✅ ${query}: ${products.length} produits`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`  ❌ Erreur pour ${query}: ${error.message}`);
      }
    }

    console.log(`\n📊 Total fruits: ${allFruits.length}`);
    
    // Supprimer les doublons
    const uniqueFruits = allFruits.filter((fruit, index, self) => 
      index === self.findIndex(f => f.id === fruit.id)
    );
    
    console.log(`📊 Fruits uniques: ${uniqueFruits.length}`);
    
  } catch (error) {
    console.error('❌ Erreur lors du test d\'intégration:', error.message);
  }
}

async function main() {
  console.log('🚀 Test final de l\'API Piloterr');
  console.log('=' .repeat(60));
  console.log(`🔑 Clé API: ${PILOTERR_API_KEY.substring(0, 8)}...`);
  console.log(`🎯 URL: ${BASE_URL}`);

  try {
    // Test 1: Endpoint de recherche
    const searchResults = await testSearchEndpoint();
    
    // Test 2: Endpoint de produit (si on a un ID)
    if (searchResults.length > 0 && searchResults[0].id) {
      await testProductEndpoint(searchResults[0].id);
    }
    
    // Test 3: Multiples recherches
    await testMultipleSearches();
    
    // Test 4: Intégration avec le service
    await testServiceIntegration();
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ Tests terminés');
    console.log('\n💡 Prochaines étapes:');
    console.log('1. Si les tests sont réussis, lancez le scraping complet');
    console.log('2. Utilisez: node scripts/scrape-prices.js --full');
    console.log('3. Les données seront stockées dans Supabase');
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

// Lancer les tests
if (require.main === module) {
  main();
}

