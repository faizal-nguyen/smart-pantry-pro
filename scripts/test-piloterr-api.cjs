#!/usr/bin/env node

/**
 * Script de test pour l'API Piloterr
 * Teste la connexion et les fonctionnalités de base
 */

const PILOTERR_API_KEY = '8b003b6b-9cda-4c98-b8d1-8871188a9a30';
const WORKING_URL = 'https://piloterr.com/api';

async function testEndpoints() {
  console.log('🔍 Test des différents endpoints...');
  console.log('=' .repeat(50));

  const endpoints = [
    '/status',
    '/health',
    '/api/status',
    '/v1/status',
    '/scrape',
    '/jobs',
    '/'
  ];

  for (const endpoint of endpoints) {
    console.log(`\n🔍 Test de l'endpoint: ${endpoint}`);
    
    try {
      const response = await fetch(`${WORKING_URL}${endpoint}`, {
        headers: {
          'X-API-Key': PILOTERR_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      console.log(`  📊 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  ✅ Endpoint ${endpoint} fonctionne!`);
        console.log(`  📋 Réponse:`, JSON.stringify(data, null, 2));
        return endpoint;
      } else {
        const errorText = await response.text();
        console.log(`  ❌ Endpoint ${endpoint} ne fonctionne pas`);
        console.log(`  📄 Erreur: ${errorText}`);
      }

    } catch (error) {
      console.log(`  ❌ Erreur pour ${endpoint}: ${error.message}`);
    }
  }
  
  return null;
}

async function testScrapingDirect() {
  console.log('\n🧪 Test direct de scraping...');
  console.log('=' .repeat(50));

  try {
    // Test simple de scraping
    const scrapeData = {
      url: 'https://www.carrefour.fr',
      selectors: ['.product-card', '.product-item'],
      extract: {
        name: '.product-name, .product-title',
        price: '.price, .product-price'
      },
      max_pages: 1
    };

    console.log('🚀 Lancement d\'un test de scraping...');
    const response = await fetch(`${WORKING_URL}/scrape`, {
      method: 'POST',
      headers: {
        'X-API-Key': PILOTERR_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(scrapeData)
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Scraping lancé avec succès!');
      console.log('📋 Résultat:', JSON.stringify(result, null, 2));
      
      if (result.job_id || result.id) {
        console.log(`🆔 Job ID: ${result.job_id || result.id}`);
        return result.job_id || result.id;
      }
    } else {
      console.log('❌ Erreur lors du lancement du scraping');
      const errorText = await response.text();
      console.log('📄 Réponse d\'erreur:', errorText);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test de scraping:', error.message);
  }
  
  return null;
}

async function testJobStatus(jobId) {
  if (!jobId) {
    console.log('\n⏭️  Pas de Job ID, test de statut ignoré');
    return;
  }

  console.log('\n🧪 Test du statut du job...');
  console.log('=' .repeat(50));

  try {
    console.log(`🆔 Vérification du job: ${jobId}`);
    
    const response = await fetch(`${WORKING_URL}/status/${jobId}`, {
      headers: {
        'X-API-Key': PILOTERR_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const status = await response.json();
      console.log('✅ Statut récupéré avec succès!');
      console.log('📋 Statut:', JSON.stringify(status, null, 2));
      
      if (status.status === 'completed') {
        console.log('🎉 Job terminé avec succès!');
        if (status.results || status.data) {
          console.log(`📊 Nombre de résultats: ${(status.results || status.data).length}`);
        }
      } else if (status.status === 'failed') {
        console.log('❌ Job échoué');
        console.log('📄 Erreur:', status.error);
      } else {
        console.log(`⏳ Job en cours: ${status.status}`);
      }
    } else {
      console.log('❌ Erreur lors de la récupération du statut');
      const errorText = await response.text();
      console.log('📄 Réponse d\'erreur:', errorText);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test de statut:', error.message);
  }
}

async function testSimpleScraping() {
  console.log('\n🧪 Test de scraping simple...');
  console.log('=' .repeat(50));

  try {
    // Test avec des paramètres minimaux
    const scrapeData = {
      url: 'https://www.carrefour.fr',
      selectors: ['body'],
      extract: {
        title: 'title'
      }
    };

    console.log('🚀 Lancement d\'un scraping simple...');
    const response = await fetch(`${WORKING_URL}/scrape`, {
      method: 'POST',
      headers: {
        'X-API-Key': PILOTERR_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(scrapeData)
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Scraping simple réussi!');
      console.log('📋 Résultat:', JSON.stringify(result, null, 2));
      return true;
    } else {
      console.log('❌ Erreur lors du scraping simple');
      const errorText = await response.text();
      console.log('📄 Réponse d\'erreur:', errorText);
    }

  } catch (error) {
    console.error('❌ Erreur lors du scraping simple:', error.message);
  }
  
  return false;
}

async function main() {
  console.log('🚀 Démarrage des tests de l\'API Piloterr');
  console.log('=' .repeat(60));
  console.log(`🔑 Clé API: ${PILOTERR_API_KEY.substring(0, 8)}...`);
  console.log(`🎯 URL: ${WORKING_URL}`);

  // Test des endpoints
  const workingEndpoint = await testEndpoints();

  if (workingEndpoint) {
    console.log(`\n✅ Endpoint fonctionnel trouvé: ${workingEndpoint}`);
  } else {
    console.log('\n⚠️  Aucun endpoint de statut trouvé, test direct du scraping...');
  }

  // Test de scraping simple
  const scrapingWorks = await testSimpleScraping();

  if (scrapingWorks) {
    console.log('\n✅ Le scraping fonctionne!');
    
    // Test de scraping complet
    const jobId = await testScrapingDirect();
    
    // Test du statut du job
    await testJobStatus(jobId);
  } else {
    console.log('\n❌ Le scraping ne fonctionne pas');
    console.log('💡 Vérifiez:');
    console.log('  1. La clé API est-elle correcte?');
    console.log('  2. L\'URL de l\'API est-elle correcte?');
    console.log('  3. Consultez la documentation de Piloterr');
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Tests terminés');
  console.log(`🎯 URL: ${WORKING_URL}`);
  console.log(`🔑 Clé API: ${PILOTERR_API_KEY.substring(0, 8)}...`);
  console.log('\n💡 Prochaines étapes:');
  console.log('1. Si les tests sont réussis, lancez le scraping complet');
  console.log('2. Utilisez: node scripts/scrape-prices.js --full');
}

// Lancer les tests
if (require.main === module) {
  main();
}
