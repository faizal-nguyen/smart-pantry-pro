#!/usr/bin/env node

/**
 * Script de test pour vérifier les logs du système d'import vidéo
 * Ce script teste la connexion à Deepgram et l'import d'une vidéo de test
 */

const fetch = require('node-fetch');
const dotenv = require('dotenv');
const { createClient } = require('@deepgram/sdk');

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' });

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(emoji, message, color = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

async function testDeepgramConnection() {
  log('🧪', 'Test 1: Vérification de la connexion Deepgram', colors.cyan);
  
  const apiKey = process.env.DEEPGRAM_API_KEY;
  
  if (!apiKey) {
    log('❌', 'DEEPGRAM_API_KEY non trouvée dans .env.local', colors.red);
    return false;
  }
  
  log('🔑', `Deepgram API Key: ${apiKey.substring(0, 8)}...`, colors.green);
  
  try {
    const deepgram = createClient(apiKey);
    
    // Test avec un audio de démonstration
    const testUrl = 'https://static.deepgram.com/examples/Bueller-Life-moves-pretty-fast.wav';
    log('🎤', `Test avec URL: ${testUrl}`, colors.blue);
    
    const { result } = await deepgram.listen.prerecorded.transcribeUrl(
      { url: testUrl },
      { model: 'nova-2', language: 'en' }
    );
    
    const transcript = result.results.channels[0]?.alternatives[0]?.transcript;
    
    if (transcript) {
      log('✅', 'Deepgram fonctionne correctement!', colors.green);
      log('📝', `Transcription: "${transcript.substring(0, 50)}..."`, colors.magenta);
      return true;
    } else {
      log('⚠️', 'Pas de transcription reçue', colors.yellow);
      return false;
    }
    
  } catch (error) {
    log('❌', `Erreur Deepgram: ${error.message}`, colors.red);
    console.error(error);
    return false;
  }
}

async function testVideoImportAPI() {
  log('\n🧪', 'Test 2: Test de l\'API d\'import vidéo', colors.cyan);
  
  // Vérifier que le serveur est lancé
  try {
    const healthCheck = await fetch('http://localhost:3000/api/health');
    if (!healthCheck.ok) {
      log('⚠️', 'Le serveur n\'est pas accessible sur localhost:3000', colors.yellow);
      log('💡', 'Lancez le serveur avec: npm run dev', colors.blue);
      return false;
    }
  } catch (error) {
    log('❌', 'Le serveur n\'est pas lancé sur localhost:3000', colors.red);
    log('💡', 'Lancez le serveur avec: npm run dev', colors.blue);
    return false;
  }
  
  // URL de test (vidéo Instagram de recette)
  const testVideoUrl = 'https://www.instagram.com/reel/DK909L4ofTr/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==';
  
  log('🎥', `Test avec vidéo: ${testVideoUrl}`, colors.blue);
  
  try {
    const response = await fetch('http://localhost:3000/api/parse-video-recipe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoUrl: testVideoUrl,
        platform: 'instagram'
      })
    });
    
    log('📊', `Statut de la réponse: ${response.status}`, colors.magenta);
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      log('✅', 'Import vidéo réussi!', colors.green);
      log('🍳', `Recette: ${data.data?.title || 'Titre non trouvé'}`, colors.green);
      log('⏱️', `Temps de traitement: ${data.processingTime}`, colors.blue);
      return true;
    } else {
      log('❌', `Erreur API: ${data.error || 'Erreur inconnue'}`, colors.red);
      if (data.debug) {
        console.log('Debug info:', data.debug);
      }
      return false;
    }
    
  } catch (error) {
    log('❌', `Erreur de requête: ${error.message}`, colors.red);
    console.error(error);
    return false;
  }
}

async function checkEnvironmentVariables() {
  log('\n🧪', 'Test 3: Vérification des variables d\'environnement', colors.cyan);
  
  const requiredVars = [
    'DEEPGRAM_API_KEY',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'OPENAI_API_KEY'
  ];
  
  let allPresent = true;
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      log('✅', `${varName}: ${value.substring(0, 8)}...`, colors.green);
    } else {
      log('❌', `${varName}: MANQUANT`, colors.red);
      allPresent = false;
    }
  }
  
  return allPresent;
}

// Fonction principale
async function runTests() {
  console.log(colors.bright + '\n🚀 Test du système d\'import vidéo ultra-rapide\n' + colors.reset);
  
  // Test 1: Variables d'environnement
  const envOk = await checkEnvironmentVariables();
  
  // Test 2: Connexion Deepgram
  const deepgramOk = await testDeepgramConnection();
  
  // Test 3: API d'import vidéo
  const apiOk = await testVideoImportAPI();
  
  // Résumé
  console.log(colors.bright + '\n📊 Résumé des tests:\n' + colors.reset);
  log(envOk ? '✅' : '❌', `Variables d'environnement: ${envOk ? 'OK' : 'ERREUR'}`, envOk ? colors.green : colors.red);
  log(deepgramOk ? '✅' : '❌', `Connexion Deepgram: ${deepgramOk ? 'OK' : 'ERREUR'}`, deepgramOk ? colors.green : colors.red);
  log(apiOk ? '✅' : '❌', `API import vidéo: ${apiOk ? 'OK' : 'ERREUR'}`, apiOk ? colors.green : colors.red);
  
  if (envOk && deepgramOk) {
    console.log(colors.green + '\n🎉 Le système est prêt à être utilisé!\n' + colors.reset);
  } else {
    console.log(colors.red + '\n⚠️ Des corrections sont nécessaires avant utilisation.\n' + colors.reset);
  }
}

// Lancer les tests
runTests().catch(console.error);