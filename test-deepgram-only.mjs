#!/usr/bin/env node

import { createClient } from '@deepgram/sdk';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' });

console.log('🧪 Test Deepgram SDK v3\n');

const apiKey = process.env.DEEPGRAM_API_KEY;
console.log('🔑 API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING');

if (!apiKey) {
  console.error('❌ DEEPGRAM_API_KEY manquante!');
  process.exit(1);
}

try {
  console.log('\n📡 Création du client Deepgram...');
  const deepgram = createClient(apiKey);
  
  // Test 1: Audio de test Deepgram
  console.log('\n🎤 Test 1: Audio de démonstration Deepgram');
  const testUrl = 'https://static.deepgram.com/examples/Bueller-Life-moves-pretty-fast.wav';
  
  console.log('🔗 URL:', testUrl);
  console.log('⏳ Transcription en cours...');
  
  const startTime = Date.now();
  
  // Utiliser la nouvelle API v3
  const { result } = await deepgram.listen.prerecorded.transcribeUrl(
    { url: testUrl },
    { 
      model: 'nova-2',
      language: 'en',
      smart_format: true,
      punctuate: true
    }
  );
  
  const processingTime = Date.now() - startTime;
  
  console.log('\n📊 Résultat brut (structure):', Object.keys(result));
  
  // Naviguer dans la structure
  const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
  const confidence = result?.results?.channels?.[0]?.alternatives?.[0]?.confidence;
  
  if (transcript) {
    console.log('\n✅ Transcription réussie!');
    console.log('📝 Texte:', transcript);
    console.log('🎯 Confiance:', (confidence * 100).toFixed(1) + '%');
    console.log('⏱️ Temps:', processingTime + 'ms');
  } else {
    console.log('\n❌ Pas de transcription trouvée');
    console.log('📦 Structure complète:', JSON.stringify(result, null, 2));
  }
  
  // Test 2: Vidéo YouTube
  console.log('\n\n🎥 Test 2: URL vidéo YouTube');
  const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  
  try {
    const { result: ytResult } = await deepgram.listen.prerecorded.transcribeUrl(
      { url: youtubeUrl },
      { 
        model: 'nova-2',
        language: 'auto',
        detect_language: true
      }
    );
    console.log('✅ YouTube supporté directement!');
  } catch (error) {
    console.log('⚠️ YouTube pas supporté directement:', error.message);
    console.log('💡 Il faut extraire l\'audio d\'abord');
  }
  
} catch (error) {
  console.error('\n❌ Erreur:', error.message);
  console.error('📄 Stack:', error.stack);
}

console.log('\n✅ Test terminé!');