#!/usr/bin/env node

/**
 * Script de vérification du système contextuel
 * Valide la configuration et les services
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Charger les variables d'environnement
config({ path: path.join(rootDir, '.env.local') });

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStatus(status, message) {
  const icon = status === 'success' ? '✅' : status === 'warning' ? '⚠️' : '❌';
  const color = status === 'success' ? 'green' : status === 'warning' ? 'yellow' : 'red';
  log(`${icon} ${message}`, color);
}

async function checkEnvironmentVariables() {
  log('\n🔧 Vérification des variables d\'environnement...', 'blue');
  
  const requiredVars = {
    'NEXT_PUBLIC_CONTEXTUAL_SYSTEM_ENABLED': 'Configuration générale',
    'NEXT_PUBLIC_OPENWEATHER_API_KEY': 'API Météo principale',
    'NEXT_PUBLIC_WEATHERAPI_KEY': 'API Météo de secours',
    'NEXT_PUBLIC_GOOGLE_CLIENT_ID': 'Google Calendar OAuth',
    'NEXT_PUBLIC_GOOGLE_CLIENT_SECRET': 'Google Calendar Secret'
  };

  let allGood = true;
  
  for (const [varName, description] of Object.entries(requiredVars)) {
    const value = process.env[varName];
    if (value && value !== 'undefined') {
      if (value.includes('test_') || value.includes('demo_mode')) {
        logStatus('warning', `${description}: Mode démo (${varName})`);
      } else {
        logStatus('success', `${description}: Configurée`);
      }
    } else {
      logStatus('error', `${description}: Manquante (${varName})`);
      allGood = false;
    }
  }
  
  return allGood;
}

async function checkFileStructure() {
  log('\n📁 Vérification de la structure des fichiers...', 'blue');
  
  const requiredFiles = {
    'src/services/context/ContextAdapter.ts': 'Adaptateur contextuel principal',
    'src/services/context/WeatherContextService.ts': 'Service météo',
    'src/services/context/CalendarContextService.ts': 'Service calendrier',
    'src/services/context/PerformanceOptimizer.ts': 'Optimiseur de performance',
    'src/components/context/PerformanceMonitor.tsx': 'Moniteur de performance',
    'src/components/meal-planning/ContextualAdaptationsPanel.tsx': 'Panel d\'adaptations',
    'src/hooks/useContextualAdaptation.ts': 'Hook React contextuel',
    'supabase/migrations/20250830000003_create_contextual_system_tables_fixed.sql': 'Migration BDD'
  };

  let allGood = true;
  
  for (const [filePath, description] of Object.entries(requiredFiles)) {
    const fullPath = path.join(rootDir, filePath);
    if (fs.existsSync(fullPath)) {
      logStatus('success', `${description}: Présent`);
    } else {
      logStatus('error', `${description}: Manquant (${filePath})`);
      allGood = false;
    }
  }
  
  return allGood;
}

async function checkDatabaseMigrations() {
  log('\n🗄️ Vérification des migrations...', 'blue');
  
  const migrationFiles = [
    '20250830000003_create_contextual_system_tables_fixed.sql',
    '20250830000004_fix_contextual_constraints.sql',
    '20250830000005_verify_contextual_system.sql'
  ];

  let allGood = true;
  
  for (const migration of migrationFiles) {
    const fullPath = path.join(rootDir, 'supabase', 'migrations', migration);
    if (fs.existsSync(fullPath)) {
      logStatus('success', `Migration ${migration}: Présente`);
    } else {
      logStatus('warning', `Migration ${migration}: Manquante (optionnelle)`);
    }
  }
  
  return allGood;
}

async function testServices() {
  log('\n⚡ Test des services (mode démo)...', 'blue');
  
  try {
    // Import dynamique pour éviter les erreurs de module
    const { contextualPerformanceOptimizer } = await import('../src/services/context/PerformanceOptimizer.ts');
    
    // Test du cache
    const testData = { test: true, timestamp: new Date() };
    await contextualPerformanceOptimizer.getCached(
      'test_key',
      async () => testData,
      60000,
      'low'
    );
    
    const metrics = contextualPerformanceOptimizer.getMetrics();
    logStatus('success', `Performance Optimizer: ${metrics.totalRequests} requêtes, ${Math.round(metrics.cacheHitRatio * 100)}% cache hit`);
    
    return true;
  } catch (error) {
    logStatus('error', `Erreur service: ${error.message}`);
    return false;
  }
}

async function checkPackageDependencies() {
  log('\n📦 Vérification des dépendances...', 'blue');
  
  try {
    const packageJsonPath = path.join(rootDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredDeps = {
      'googleapis': 'Google Calendar API',
      'date-fns': 'Manipulation des dates',
      'framer-motion': 'Animations React',
      '@supabase/supabase-js': 'Base de données'
    };
    
    let allGood = true;
    
    for (const [dep, description] of Object.entries(requiredDeps)) {
      if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
        logStatus('success', `${description}: Installée`);
      } else {
        logStatus('error', `${description}: Manquante (${dep})`);
        allGood = false;
      }
    }
    
    return allGood;
  } catch (error) {
    logStatus('error', `Erreur lecture package.json: ${error.message}`);
    return false;
  }
}

async function generateReport(results) {
  log('\n📊 RAPPORT DE VÉRIFICATION', 'bold');
  log('================================', 'blue');
  
  const totalChecks = Object.keys(results).length;
  const passedChecks = Object.values(results).filter(Boolean).length;
  const percentage = Math.round((passedChecks / totalChecks) * 100);
  
  if (percentage === 100) {
    logStatus('success', `Système contextuel: ${percentage}% configuré - Prêt pour production! 🚀`);
  } else if (percentage >= 80) {
    logStatus('warning', `Système contextuel: ${percentage}% configuré - Quelques ajustements nécessaires`);
  } else {
    logStatus('error', `Système contextuel: ${percentage}% configuré - Configuration incomplète`);
  }
  
  log('\n📋 Actions recommandées:', 'blue');
  
  if (!results.env) {
    log('• Configurez les clés API dans .env.local (voir CONTEXTUAL_SYSTEM_SETUP.md)', 'yellow');
  }
  
  if (!results.files) {
    log('• Vérifiez que tous les fichiers du système contextuel sont présents', 'yellow');
  }
  
  if (!results.deps) {
    log('• Installez les dépendances manquantes: npm install', 'yellow');
  }
  
  log('\n🔗 Ressources utiles:', 'blue');
  log('• Guide: CONTEXTUAL_SYSTEM_SETUP.md', 'reset');
  log('• Tests: npm test src/services/context', 'reset');
  log('• Interface: /meal-planning → onglet "Contexte"', 'reset');
  
  return percentage >= 80;
}

async function main() {
  log('🎯 VÉRIFICATION DU SYSTÈME CONTEXTUEL', 'bold');
  log('=====================================\n', 'blue');
  
  const results = {
    env: await checkEnvironmentVariables(),
    files: await checkFileStructure(),
    migrations: await checkDatabaseMigrations(),
    deps: await checkPackageDependencies(),
    services: await testServices()
  };
  
  const isReady = await generateReport(results);
  
  process.exit(isReady ? 0 : 1);
}

main().catch(error => {
  logStatus('error', `Erreur script: ${error.message}`);
  process.exit(1);
});