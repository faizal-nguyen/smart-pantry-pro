#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Démarrage du serveur API en arrière-plan...');

const apiProcess = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'api:dev'], {
  cwd: __dirname,
  stdio: 'inherit',
  detached: false,
  env: { ...process.env }
});

apiProcess.on('error', (err) => {
  console.error('❌ Erreur lors du démarrage:', err.message);
  process.exit(1);
});

apiProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Le serveur s'est arrêté avec le code ${code}`);
  }
});

// Attendre un peu pour voir si le serveur démarre
setTimeout(() => {
  console.log('\n✅ API en cours d\'exécution (apps/api).');
  console.log('📍 Testez maintenant: http://localhost:3002 (proxy /api -> :4000)\n');
}, 2000);
