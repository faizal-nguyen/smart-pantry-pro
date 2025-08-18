#!/usr/bin/env node

import { createClient } from '@deepgram/sdk';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' });

console.log('🧪 Test Deepgram Simple\n');

const apiKey = process.env.DEEPGRAM_API_KEY;
console.log('🔑 API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING');

// Test direct avec l'API REST
async function testDeepgramREST() {
  console.log('\n📡 Test avec API REST directe...');
  
  const audioUrl = 'https://static.deepgram.com/examples/Bueller-Life-moves-pretty-fast.wav';
  
  try {
    const response = await fetch('https://api.deepgram.com/v1/listen', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: audioUrl,
        model: 'nova-2',
        language: 'en',
        punctuate: true
      })
    });
    
    console.log('📊 Status:', response.status);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Succès!');
      const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
      console.log('📝 Transcription:', transcript || 'Pas trouvée');
    } else {
      console.log('❌ Erreur:', data);
    }
    
  } catch (error) {
    console.error('❌ Erreur réseau:', error.message);
  }
}

// Test avec le SDK
async function testDeepgramSDK() {
  console.log('\n🛠️ Test avec SDK...');
  
  try {
    const deepgram = createClient(apiKey);
    console.log('✅ Client créé');
    
    // Vérifier les méthodes disponibles
    console.log('📦 Méthodes disponibles:', Object.keys(deepgram));
    console.log('🎤 Listen methods:', deepgram.listen ? Object.keys(deepgram.listen) : 'N/A');
    
    // Essayer l'ancienne API
    if (deepgram.transcription?.preRecorded) {
      console.log('\n🔄 Utilisation de l\'ancienne API...');
      const { results } = await deepgram.transcription.preRecorded(
        { url: 'https://static.deepgram.com/examples/Bueller-Life-moves-pretty-fast.wav' },
        { model: 'nova-2', language: 'en' }
      );
      console.log('📝 Résultat:', results);
    }
    
  } catch (error) {
    console.error('❌ Erreur SDK:', error.message);
    console.log('💡 Suggestion: Vérifier la version du SDK');
  }
}

// Lancer les tests
(async () => {
  await testDeepgramREST();
  await testDeepgramSDK();
})();