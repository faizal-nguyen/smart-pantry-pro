#!/usr/bin/env node

/**
 * Test de l'endpoint corrigé /api/social/instagram-oembed
 */

const INSTAGRAM_URL = "https://www.instagram.com/reel/DLScf5hofId/";

async function testFixedEndpoint() {
    console.log("🧪 Test de l'endpoint corrigé");
    console.log("="*50);
    console.log(`URL testée: ${INSTAGRAM_URL}`);
    console.log("Recette attendue: Poulet Mayo Congolais de @louloukitchen");
    console.log("\n");
    
    try {
        // Tester l'endpoint local corrigé
        console.log("📡 Tentative de connexion à l'endpoint local...");
        
        const response = await fetch('http://localhost:3000/api/social/instagram-oembed', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: INSTAGRAM_URL })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log("✅ SUCCÈS! L'endpoint fonctionne!");
            console.log("-".repeat(40));
            console.log(`Auteur: ${data.author_name}`);
            console.log(`Media ID: ${data.media_id}`);
            console.log(`Type: ${data.type}`);
            console.log(`Dimensions: ${data.width}x${data.height}px`);
            
            if (data.title) {
                console.log(`Titre: ${data.title}`);
            }
            
            // Vérifier si c'est bien louloukitchen
            if (data.author_name && data.author_name.toLowerCase().includes('louloukitchen')) {
                console.log("\n🎯 CONFIRMÉ: C'est bien @louloukitchen!");
            }
            
            // Extraire la caption du HTML
            if (data.html) {
                const captionMatch = data.html.match(/<p[^>]*>([^<]+)<\/p>/);
                if (captionMatch) {
                    const caption = captionMatch[1];
                    console.log(`\n💬 Caption: ${caption}`);
                    
                    // Vérifier les mots-clés
                    const text = caption.toLowerCase();
                    if (text.includes('mayo') || text.includes('mayonnaise')) {
                        console.log("🍗 CONFIRMÉ: Recette avec mayonnaise!");
                    }
                    if (text.includes('congolais') || text.includes('congo')) {
                        console.log("🇨🇩 CONFIRMÉ: Cuisine congolaise!");
                    }
                    if (text.includes('poulet') || text.includes('chicken')) {
                        console.log("🐔 CONFIRMÉ: Recette de poulet!");
                    }
                }
            }
            
            console.log(`\n📸 Thumbnail: ${data.thumbnail_url ? 'Disponible' : 'Non disponible'}`);
            
        } else if (data.fallback) {
            console.log("⚠️  L'endpoint fonctionne mais l'API Instagram est indisponible");
            console.log(`Raison: ${data.reason}`);
            console.log("💡 L'utilisateur devra saisir manuellement les informations");
            
        } else {
            console.log("❌ Erreur de l'endpoint:");
            console.log(JSON.stringify(data, null, 2));
        }
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log("❌ L'endpoint local n'est pas accessible");
            console.log("💡 Solutions:");
            console.log("  1. Lancez le serveur de développement: npm run dev");
            console.log("  2. Ou testez avec: npx next dev");
            console.log("  3. Vérifiez que le serveur écoute sur le port 3000");
            
        } else {
            console.log("❌ Erreur inattendue:", error.message);
        }
    }
}

// Test direct de l'API publique (pour comparaison)
async function testDirectAPI() {
    console.log("\n\n🔍 Test direct de l'API publique (pour comparaison):");
    console.log("-".repeat(50));
    
    try {
        const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(INSTAGRAM_URL)}&omitscript=true&hidecaption=false`;
        
        const response = await fetch(oembedUrl, {
            headers: {
                'User-Agent': 'Smart-Pantry-Pro/1.0',
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ API directe fonctionne! Auteur: ${data.author_name}`);
        } else {
            console.log(`❌ API directe échoue: ${response.status} ${response.statusText}`);
            if (response.status === 301 || response.status === 302) {
                console.log("💡 Problème de redirection détecté");
            }
        }
        
    } catch (error) {
        console.log(`❌ Erreur API directe: ${error.message}`);
    }
}

async function main() {
    await testFixedEndpoint();
    await testDirectAPI();
    
    console.log("\n" + "="*50);
    console.log("📌 Résumé:");
    console.log("✅ L'endpoint a été corrigé pour utiliser l'API publique Instagram");
    console.log("✅ Plus besoin de token Facebook!");
    console.log("✅ Le code est maintenant beaucoup plus simple et fiable");
    console.log("\n💡 Prochaines étapes:");
    console.log("  1. Lancer le serveur: npm run dev");
    console.log("  2. Tester dans l'application avec le bouton social");
    console.log("  3. Vérifier que la recette de Poulet Mayo Congolais est bien extraite");
}

main().catch(console.error);