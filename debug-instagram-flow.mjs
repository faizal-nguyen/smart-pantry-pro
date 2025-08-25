import fetch from 'node-fetch';

const url = 'https://www.instagram.com/reel/DHbVTRpo7p3/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==';

console.log('🧪 Debug du flux Instagram complet');
console.log('=' .repeat(50));

async function testAPI(apiUrl, body) {
    console.log(`\n📡 Test de ${apiUrl}`);
    try {
        const response = await fetch(`http://localhost:3000${apiUrl}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        console.log('✅ Réponse:', JSON.stringify(data, null, 2));
        
        // Vérifier spécifiquement la vignette
        if (data.thumbnail_url) {
            console.log('🖼️ VIGNETTE TROUVÉE DIRECTEMENT:', data.thumbnail_url);
        } else if (data.data?.metadata?.thumbnail) {
            console.log('🖼️ VIGNETTE DANS METADATA:', data.data.metadata.thumbnail);
        } else if (data.success && data.data) {
            console.log('❌ PAS DE VIGNETTE DANS LA RÉPONSE');
            console.log('Structure metadata:', data.data.metadata);
        }
        
        return data;
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        return null;
    }
}

// Test 1: API Thumbnail directe
await testAPI('/api/social/instagram-thumbnail', { url });

// Test 2: API Parse Video Recipe
await testAPI('/api/parse-video-recipe', { videoUrl: url, platform: 'instagram' });

console.log('\n✅ Tests terminés');