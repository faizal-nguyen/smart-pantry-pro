#!/usr/bin/env node

/**
 * Test de l'API Instagram oEmbed avec Node.js (contourne CORS)
 */

const https = require('https');
const { URL } = require('url');

const INSTAGRAM_URL = "https://www.instagram.com/reel/DLScf5hofId/";

function fetchInstagramData() {
    return new Promise((resolve, reject) => {
        const apiUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(INSTAGRAM_URL)}&omitscript=true&hidecaption=false`;
        
        console.log("🧪 Test API Instagram oEmbed avec Node.js");
        console.log("="*60);
        console.log(`URL Instagram: ${INSTAGRAM_URL}`);
        console.log(`API URL: ${apiUrl}`);
        console.log("\n⏳ Requête en cours...\n");

        const url = new URL(apiUrl);
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Smart-Pantry-Pro/1.0 (+https://github.com/your-repo)',
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    if (res.statusCode === 200) {
                        const jsonData = JSON.parse(data);
                        
                        console.log("✅ SUCCÈS! Données Instagram récupérées:");
                        console.log("-".repeat(50));
                        console.log(`Auteur: ${jsonData.author_name}`);
                        console.log(`ID Auteur: ${jsonData.author_id}`);
                        console.log(`Media ID: ${jsonData.media_id}`);
                        console.log(`Type: ${jsonData.type}`);
                        console.log(`Version: ${jsonData.version}`);
                        console.log(`Largeur: ${jsonData.width}px`);
                        console.log(`Hauteur: ${jsonData.height}px`);
                        
                        if (jsonData.title) {
                            console.log(`\n📝 Titre: ${jsonData.title}`);
                        }
                        
                        if (jsonData.thumbnail_url) {
                            console.log(`\n🖼️  Thumbnail: ${jsonData.thumbnail_url}`);
                        }
                        
                        // Extraire la caption du HTML
                        if (jsonData.html) {
                            console.log(`\n📄 HTML embed disponible (${jsonData.html.length} caractères)`);
                            
                            // Essayer d'extraire la caption
                            const captionRegex = /<p[^>]*>([^<]+)<\/p>/g;
                            const matches = [...jsonData.html.matchAll(captionRegex)];
                            
                            if (matches.length > 0) {
                                console.log(`\n💬 Captions trouvées:`);
                                matches.forEach((match, i) => {
                                    console.log(`${i + 1}. ${match[1]}`);
                                });
                                
                                // Chercher des mots-clés liés au Poulet Mayo Congolais
                                const allText = matches.map(m => m[1]).join(' ').toLowerCase();
                                const keywords = ['mayo', 'mayonnaise', 'congolais', 'congo', 'poulet', 'chicken', 'louloukitchen'];
                                const foundKeywords = keywords.filter(kw => allText.includes(kw));
                                
                                if (foundKeywords.length > 0) {
                                    console.log(`\n🎯 Mots-clés trouvés: ${foundKeywords.join(', ')}`);
                                    console.log(`✅ CONFIRMÉ: C'est bien du contenu culinaire!`);
                                    
                                    if (foundKeywords.some(kw => ['mayo', 'mayonnaise'].includes(kw))) {
                                        console.log(`🍗 DOUBLE CONFIRMÉ: Recette avec mayonnaise!`);
                                    }
                                }
                            }
                        }
                        
                        console.log(`\n${"=".repeat(50)}`);
                        console.log(`✅ L'API Instagram oEmbed fonctionne parfaitement!`);
                        console.log(`🎉 Pas besoin de token Facebook!`);
                        console.log(`📱 Le code dans /pages/api/social/instagram-oembed.ts devrait fonctionner`);
                        
                        resolve(jsonData);
                        
                    } else {
                        console.log(`❌ Erreur HTTP ${res.statusCode}`);
                        console.log(`Réponse: ${data}`);
                        
                        if (res.statusCode === 404) {
                            console.log(`\n💡 Possible causes:`);
                            console.log(`- La vidéo est privée`);
                            console.log(`- L'URL est incorrecte`);
                            console.log(`- Le contenu a été supprimé`);
                        }
                        
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                } catch (parseError) {
                    console.log(`❌ Erreur de parsing JSON: ${parseError.message}`);
                    console.log(`Réponse brute: ${data}`);
                    reject(parseError);
                }
            });
        });

        req.on('error', (error) => {
            console.log(`❌ Erreur de requête: ${error.message}`);
            reject(error);
        });

        req.setTimeout(10000, () => {
            console.log(`❌ Timeout après 10 secondes`);
            req.abort();
            reject(new Error('Timeout'));
        });

        req.end();
    });
}

// Exécuter le test
async function main() {
    try {
        await fetchInstagramData();
        
        console.log(`\n\n🔍 Tests supplémentaires:`);
        console.log(`1. L'API publique Instagram est accessible`);
        console.log(`2. Les métadonnées sont extraites correctement`);
        console.log(`3. Le contenu identifie la recette`);
        console.log(`\n👉 Prochaine étape: Lancer le serveur et tester l'endpoint local`);
        
    } catch (error) {
        console.log(`\n❌ Test échoué: ${error.message}`);
        console.log(`\n🤔 Possible solutions:`);
        console.log(`- Vérifier la connexion internet`);
        console.log(`- L'URL Instagram est peut-être privée`);
        console.log(`- Utiliser le backend pour contourner les restrictions`);
    }
}

main();