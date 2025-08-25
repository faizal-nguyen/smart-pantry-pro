#!/usr/bin/env node

const endpoints = [
  { method: 'GET', path: '/api/health', name: 'Health Check' },
  { method: 'POST', path: '/api/parse-video-recipe', name: 'Parse Video Recipe' },
  { method: 'POST', path: '/api/social/instagram-thumbnail', name: 'Instagram Thumbnail' },
  { method: 'POST', path: '/api/shopping/parse-text', name: 'Parse Text' },
];

console.log('🔍 Vérification des endpoints API sur http://localhost:3003\n');

async function checkEndpoints() {
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:3003${endpoint.path}`, {
        method: endpoint.method,
        headers: endpoint.method === 'POST' ? { 'Content-Type': 'application/json' } : {},
        body: endpoint.method === 'POST' ? JSON.stringify({ test: true }) : undefined,
      });
      
      const status = response.status;
      const statusIcon = status < 400 ? '✅' : '❌';
      const statusColor = status < 400 ? '\x1b[32m' : '\x1b[31m';
      
      console.log(`${statusIcon} ${endpoint.method} ${endpoint.path}`);
      console.log(`   ${statusColor}Status: ${status} ${response.statusText}\x1b[0m`);
      console.log(`   ${endpoint.name}\n`);
      
    } catch (error) {
      console.log(`❌ ${endpoint.method} ${endpoint.path}`);
      console.log(`   \x1b[31mError: ${error.message}\x1b[0m\n`);
    }
  }
  
  console.log('\n💡 Si l\'endpoint Instagram Thumbnail retourne 404 :');
  console.log('   1. Arrêtez le serveur API (Ctrl+C)');
  console.log('   2. Relancez avec : npm run api');
  console.log('   3. Réexécutez ce script : node verify-api-endpoints.js\n');
}

checkEndpoints();