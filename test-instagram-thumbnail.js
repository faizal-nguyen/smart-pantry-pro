// Test de récupération de la vignette Instagram via oEmbed

const testUrl = 'https://www.instagram.com/reel/DIMJkxwIGhn/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==';

async function testInstagramOEmbed() {
  console.log('🧪 Test de récupération de la vignette Instagram');
  console.log('📍 URL:', testUrl);
  
  try {
    // Test direct de l'API oEmbed Instagram
    const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(testUrl)}&omitscript=true&hidecaption=false`;
    
    console.log('\n🌐 Appel à l\'API oEmbed...');
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Smart-Pantry-Pro/1.0',
        'Accept': 'application/json'
      }
    });
    
    console.log('📡 Status:', response.status);
    console.log('📡 Headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur:', errorText);
      return;
    }
    
    const responseText = await response.text();
    console.log('\n📄 Réponse brute (100 premiers caractères):', responseText.substring(0, 100));
    
    // Vérifier si c'est du JSON ou du HTML
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      console.error('❌ La réponse est du HTML, pas du JSON');
      console.log('\n🔧 Essai avec l\'endpoint alternatif...');
      
      // Essayer avec un format d'URL différent
      const cleanUrl = testUrl.split('?')[0]; // Retirer les paramètres
      const altOembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(cleanUrl)}`;
      
      console.log('🌐 URL alternative:', altOembedUrl);
      const altResponse = await fetch(altOembedUrl);
      console.log('📡 Status alternatif:', altResponse.status);
      
      if (altResponse.ok) {
        const altData = await altResponse.json();
        console.log('\n✅ Données alternatives reçues:');
        console.log('📸 Thumbnail URL:', altData.thumbnail_url);
        return;
      }
    }
    
    const data = JSON.parse(responseText);
    console.log('\n✅ Données reçues:');
    console.log('📸 Thumbnail URL:', data.thumbnail_url);
    console.log('👤 Auteur:', data.author_name);
    console.log('📝 Titre:', data.title);
    console.log('📐 Dimensions:', data.width, 'x', data.height);
    console.log('🆔 Media ID:', data.media_id);
    
    console.log('\n📦 Données complètes:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error.message);
    console.error(error.stack);
  }
}

// Exécuter le test
testInstagramOEmbed();