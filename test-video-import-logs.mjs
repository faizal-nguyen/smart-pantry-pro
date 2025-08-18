#!/usr/bin/env node

/**
 * Script de test pour vérifier les logs du système d'import vidéo
 * Ce script teste la connexion à Deepgram et l'import d'une vidéo de test
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { createClient } from '@deepgram/sdk';

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
    
    console.log('🔍 Deepgram response structure:', JSON.stringify(result, null, 2).substring(0, 200) + '...');
    
    // Le SDK Deepgram v3 a une structure différente
    const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || 
                      result?.channels?.[0]?.alternatives?.[0]?.transcript;
    
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
  
  // Vérifier que le serveur est lancé - essayer plusieurs ports
  const ports = [3000, 3001, 5173, 5174];
  let serverUrl = null;
  
  for (const port of ports) {
    try {
      const testUrl = `http://localhost:${port}`;
      log('🔍', `Test du serveur sur ${testUrl}...`, colors.blue);
      const response = await fetch(testUrl, { timeout: 2000 });
      if (response.ok || response.status) {
        serverUrl = testUrl;
        log('✅', `Serveur trouvé sur ${testUrl}`, colors.green);
        break;
      }
    } catch (error) {
      // Continue to next port
    }
  }
  
  if (!serverUrl) {
    log('❌', 'Aucun serveur trouvé sur les ports 3000, 3001, 5173, 5174', colors.red);
    log('💡', 'Lancez le serveur avec: npm run dev', colors.blue);
    return false;
  }
  
  // URL de test (vidéo Instagram de recette)
  const testVideoUrl = 'https://www.instagram.com/reel/DK909L4ofTr/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==';
  
  log('🎥', `Test avec vidéo Instagram: ${testVideoUrl}`, colors.blue);
  
  try {
    // Tester directement sur le port 3001 si disponible
    const apiUrl = serverUrl.includes('3000') 
      ? 'http://localhost:3001/api/parse-video-recipe'
      : `${serverUrl}/api/parse-video-recipe`;
    
    log('📡', `Appel API: ${apiUrl}`, colors.blue);
    
    const response = await fetch(apiUrl, {
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
    
    let data;
    try {
      const text = await response.text();
      if (text) {
        data = JSON.parse(text);
      } else {
        data = { error: 'Empty response' };
      }
    } catch (parseError) {
      log('⚠️', 'Réponse non-JSON reçue', colors.yellow);
      data = { error: 'Invalid JSON response' };
    }
    
    if (response.ok && data.success) {
      log('✅', 'Import vidéo réussi!', colors.green);
      log('🍳', `Recette: ${data.data?.title || data.data?.recipe?.title || 'Titre non trouvé'}`, colors.green);
      log('⏱️', `Temps de traitement: ${data.processingTime}`, colors.blue);
      
      // Afficher plus de détails sur la recette
      if (data.data?.recipe || data.data) {
        const recipe = data.data?.recipe || data.data;
        log('👥', `Portions: ${recipe.nutritionalInfo?.servings || 'N/A'}`, colors.blue);
        log('🥘', `Ingrédients: ${recipe.ingredients?.length || 0} items`, colors.blue);
        log('📋', `Instructions: ${recipe.instructions?.length || 0} étapes`, colors.blue);
      }
      
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
  
  // Variables optionnelles mais utiles
  const optionalVars = ['VITE_OPENAI_API_KEY'];
  log('\n📌', 'Variables optionnelles:', colors.yellow);
  
  for (const varName of optionalVars) {
    const value = process.env[varName];
    if (value) {
      log('✅', `${varName}: ${value.substring(0, 8)}...`, colors.green);
    } else {
      log('⚠️', `${varName}: Non défini`, colors.yellow);
    }
  }
  
  return allPresent;
}

// Fonction principale
async function runTests() {
  console.log(colors.bright + '\n🚀 Test du système d\'import vidéo ultra-rapide\n' + colors.reset);
  console.log(colors.cyan + '📍 URL de test: Instagram Reel' + colors.reset);
  console.log(colors.cyan + '🔗 https://www.instagram.com/reel/DK909L4ofTr/\n' + colors.reset);
  
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