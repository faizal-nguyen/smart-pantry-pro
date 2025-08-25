#!/usr/bin/env node

/**
 * Test simple de l'API Piloterr avec différentes approches
 */

const PILOTERR_API_KEY = '8b003b6b-9cda-4c98-b8d1-8871188a9a30';

async function testPiloterrAPI() {
  console.log('🚀 Test simple de l\'API Piloterr');
  console.log('=' .repeat(50));

  const baseUrls = [
    'https://piloterr.com/api/v2',
    'https://api.piloterr.com/v2',
    'https://piloterr.com/api/v1',
    'https://api.piloterr.com/v1'
  ];

  const authHeaders = [
    { 'Authorization': `Bearer ${PILOTERR_API_KEY}` },
    { 'X-API-Key': PILOTERR_API_KEY },
    { 'Authorization': `Token ${PILOTERR_API_KEY}` },
    { 'api-key': PILOTERR_API_KEY }
  ];

  for (const baseUrl of baseUrls) {
    console.log(`\n🔍 Test avec l'URL: ${baseUrl}`);
    
    for (const headers of authHeaders) {
      try {
        console.log(`  🔑 Test avec headers: ${Object.keys(headers)[0]}`);
        
        // Test 1: Endpoint de recherche simple
        const searchResponse = await fetch(`${baseUrl}/carrefour/search`, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: 'pomme',
            limit: 5
          })
        });

        console.log(`    📊 Status: ${searchResponse.status} ${searchResponse.statusText}`);
        
        if (searchResponse.ok) {
          const data = await searchResponse.json();
          console.log(`    ✅ Succès! Données reçues:`, JSON.stringify(data, null, 2));
          return { baseUrl, headers, data };
        } else {
          const errorText = await searchResponse.text();
          console.log(`    ❌ Erreur: ${errorText}`);
        }

        // Attendre un peu entre les tests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`    ❌ Exception: ${error.message}`);
      }
    }
  }

  console.log('\n❌ Aucune combinaison URL/headers n\'a fonctionné');
  return null;
}

async function testAlternativeEndpoints() {
  console.log('\n🔍 Test d\'endpoints alternatifs...');
  
  const endpoints = [
    '/search',
    '/products/search',
    '/carrefour/products',
    '/scrape',
    '/products'
  ];

  const baseUrl = 'https://piloterr.com/api/v2';
  const headers = { 'Authorization': `Bearer ${PILOTERR_API_KEY}` };

  for (const endpoint of endpoints) {
    try {
      console.log(`  🔍 Test de: ${baseUrl}${endpoint}`);
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: 'pomme',
          limit: 5
        })
      });

      console.log(`    📊 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`    ✅ Endpoint fonctionnel: ${endpoint}`);
        return { endpoint, data };
      }
      
    } catch (error) {
      console.log(`    ❌ Erreur: ${error.message}`);
    }
  }

  return null;
}

async function testGETEndpoints() {
  console.log('\n🔍 Test d\'endpoints GET...');
  
  const baseUrl = 'https://piloterr.com/api/v2';
  const headers = { 'Authorization': `Bearer ${PILOTERR_API_KEY}` };

  const getEndpoints = [
    '/carrefour/search?query=pomme&limit=5',
    '/search?query=pomme&limit=5',
    '/products?query=pomme&limit=5'
  ];

  for (const endpoint of getEndpoints) {
    try {
      console.log(`  🔍 Test GET: ${baseUrl}${endpoint}`);
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: headers
      });

      console.log(`    📊 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`    ✅ Endpoint GET fonctionnel: ${endpoint}`);
        return { endpoint, data };
      }
      
    } catch (error) {
      console.log(`    ❌ Erreur: ${error.message}`);
    }
  }

  return null;
}

async function main() {
  console.log('🚀 Test complet de l\'API Piloterr');
  console.log('=' .repeat(60));

  try {
    // Test 1: Différentes URLs et headers
    const result1 = await testPiloterrAPI();
    if (result1) {
      console.log('\n✅ Configuration trouvée!');
      console.log('URL:', result1.baseUrl);
      console.log('Headers:', result1.headers);
      return;
    }

    // Test 2: Endpoints alternatifs
    const result2 = await testAlternativeEndpoints();
    if (result2) {
      console.log('\n✅ Endpoint alternatif trouvé!');
      console.log('Endpoint:', result2.endpoint);
      return;
    }

    // Test 3: Endpoints GET
    const result3 = await testGETEndpoints();
    if (result3) {
      console.log('\n✅ Endpoint GET trouvé!');
      console.log('Endpoint:', result3.endpoint);
      return;
    }

    console.log('\n❌ Aucune méthode n\'a fonctionné');
    console.log('\n💡 Suggestions:');
    console.log('1. Vérifier la clé API sur le site Piloterr');
    console.log('2. Consulter la documentation de l\'API');
    console.log('3. Contacter le support Piloterr');
    console.log('4. Utiliser le scraper Carrefour comme alternative');

  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
  }
}

// Lancer les tests
if (require.main === module) {
  main();
}

