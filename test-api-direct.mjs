#!/usr/bin/env node

console.log('🧪 Test direct de l\'API parse-video-recipe\n');

// Test simple avec fetch
const testAPI = async () => {
  const url = 'http://localhost:3001/api/parse-video-recipe';
  const payload = {
    videoUrl: 'https://www.instagram.com/reel/DK909L4ofTr/',
    platform: 'instagram'
  };
  
  console.log('📡 URL:', url);
  console.log('📦 Payload:', payload);
  
  try {
    console.log('\n⏳ Envoi de la requête...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    console.log('📊 Status:', response.status);
    console.log('📋 Headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('📄 Response text:', text);
    
    if (text) {
      try {
        const data = JSON.parse(text);
        console.log('✅ Parsed JSON:', JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('⚠️ Not valid JSON');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

testAPI();