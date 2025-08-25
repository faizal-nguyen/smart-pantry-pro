#!/usr/bin/env node

/**
 * Script de test pour l'API Piloterr
 * Teste la connexion et les fonctionnalités de base
 */

const PILOTERR_API_KEY = '8b003b6b-9cda-4c98-b8d1-8871188a9a30';
const BASE_URL = 'https://api.piloterr.com/v1';

async function testApiConnection() {
  console.log('🔑 Test de connexion à l\'API Piloterr...');
  console.log(`📡 URL: ${BASE_URL}`);
  console.log(`🔑 Clé API: ${PILOTERR_API_KEY.substring(0, 8)}...`);
  console.log('=' .repeat(50));

  try {
    // Test 1: Vérifier la connexion de base
    console.log('🧪 Test 1: Vérification de la connexion...');
    const response = await fetch(`${BASE_URL}/status`, {
      headers: {
        'Authorization': `Bearer ${PILOTERR_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Connexion réussie!');
      console.log('📋 Données reçues:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Erreur de connexion');
      const errorText = await response.text();
      console.log('📄 Réponse d\'erreur:', errorText);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test de connexion:', error.message);
  }
}

async function testScrapingEndpoint() {
  console.log('\n🧪 Test 2: Test de l\'endpoint de scraping...');
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
    const response = await fetch(`${BASE_URL}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PILOTERR_API_KEY}`,
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

  console.log('\n🧪 Test 3: Vérification du statut du job...');
  console.log('=' .repeat(50));

  try {
    console.log(`🆔 Vérification du job: ${jobId}`);
    
    const response = await fetch(`${BASE_URL}/status/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${PILOTERR_API_KEY}`,
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

async function testSpecificEndpoints() {
  console.log('\n🧪 Test 4: Test des endpoints spécifiques...');
  console.log('=' .repeat(50));

  const endpoints = [
    '/scrape',
    '/status',
    '/jobs',
    '/health',
    '/api/status'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`🔍 Test de l'endpoint: ${endpoint}`);
      
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${PILOTERR_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`  📊 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        console.log(`  ✅ Endpoint ${endpoint} accessible`);
      } else {
        console.log(`  ❌ Endpoint ${endpoint} non accessible`);
      }

    } catch (error) {
      console.log(`  ❌ Erreur pour ${endpoint}: ${error.message}`);
    }
  }
}

async function main() {
  console.log('🚀 Démarrage des tests de l\'API Piloterr');
  console.log('=' .repeat(60));

  try {
    // Test 1: Connexion de base
    await testApiConnection();
    
    // Test 2: Endpoint de scraping
    const jobId = await testScrapingEndpoint();
    
    // Test 3: Statut du job (si un job a été créé)
    await testJobStatus(jobId);
    
    // Test 4: Endpoints spécifiques
    await testSpecificEndpoints();
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ Tests terminés');
    console.log('\n💡 Prochaines étapes:');
    console.log('1. Vérifiez les résultats des tests ci-dessus');
    console.log('2. Si les tests sont réussis, lancez le scraping complet');
    console.log('3. Utilisez: node scripts/scrape-prices.js --full');
    
  } catch (error) {
    console.error('❌ Erreur fatale lors des tests:', error.message);
    process.exit(1);
  }
}

// Lancer les tests
if (require.main === module) {
  main();
}
