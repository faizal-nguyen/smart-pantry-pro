import fetch from 'node-fetch';

const testUrl = 'https://www.instagram.com/reel/DHbVTRpo7p3/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==';

console.log('🧪 Test direct de l\'API Instagram thumbnail');
console.log('📍 URL:', testUrl);
console.log('-'.repeat(50));

try {
  const response = await fetch('http://localhost:3000/api/social/instagram-thumbnail', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: testUrl })
  });

  console.log('📡 Status:', response.status);
  
  const data = await response.json();
  console.log('\n📦 Réponse complète:');
  console.log(JSON.stringify(data, null, 2));
  
  if (data.thumbnail_url) {
    console.log('\n✅ Vignette trouvée !');
    console.log('🖼️ URL:', data.thumbnail_url);
  } else {
    console.log('\n❌ Pas de vignette dans la réponse');
  }
  
} catch (error) {
  console.error('\n❌ Erreur:', error.message);
}