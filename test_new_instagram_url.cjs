#!/usr/bin/env node

/**
 * Test direct avec la nouvelle URL Instagram
 * URL: https://www.instagram.com/reel/DK909L4ofTr/
 * Ingrédients attendus: zaatar, courgettes, poulet jaune, oignon rouge, etc.
 */

const https = require('https');
const { URL } = require('url');

const INSTAGRAM_URL = "https://www.instagram.com/reel/DK909L4ofTr/";

console.log("🧪 Test nouvelle URL Instagram");
console.log("="*60);
console.log(`URL: ${INSTAGRAM_URL}`);
console.log("Ingrédients attendus:");
console.log("- 2 courgettes ou une énorme");
console.log("- 1 CAC de zaatar");
console.log("- Huile d'olive");
console.log("- 2 filet de poulet (jaune)");
console.log("- 1 oignon rouge");
console.log("- 1 cas de curcuma");
console.log("- 2 cas de moutarde à l'ancienne");
console.log("- Ciboulette");
console.log("- 1 cac de bouillon de poulet");
console.log("\n");

function testInstagramAPI() {
    return new Promise((resolve, reject) => {
        // Tester les deux formats d'API
        const apis = [
            'https://api.instagram.com/oembed/?url=' + encodeURIComponent(INSTAGRAM_URL),
            'https://graph.facebook.com/v18.0/instagram_oembed?url=' + encodeURIComponent(INSTAGRAM_URL) + '&access_token=dummy'
        ];
        
        function testAPI(apiUrl, apiName) {
            return new Promise((resolve, reject) => {
                console.log(`🔗 Test ${apiName}:`);
                console.log(apiUrl);
                
                const url = new URL(apiUrl);
                const options = {
                    hostname: url.hostname,
                    path: url.pathname + url.search,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Smart-Pantry-Pro/1.0',
                        'Accept': 'application/json'
                    }
                };

                const req = https.request(options, (res) => {
                    let data = '';

                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        console.log(`\n📊 Réponse ${apiName}: ${res.statusCode}`);
                        console.log('Headers:', JSON.stringify(res.headers, null, 2));
                        
                        if (res.statusCode === 200) {
                            try {
                                const jsonData = JSON.parse(data);
                                console.log(`✅ ${apiName} SUCCÈS!`);
                                console.log(JSON.stringify(jsonData, null, 2));
                                
                                // Analyser la caption pour les ingrédients
                                if (jsonData.html) {
                                    console.log('\n🔍 Analyse de la caption:');
                                    const captionRegex = /<p[^>]*>([^<]+)<\/p>/g;
                                    const matches = [...jsonData.html.matchAll(captionRegex)];
                                    
                                    matches.forEach((match, i) => {
                                        const text = match[1];
                                        console.log(`Caption ${i + 1}: ${text}`);
                                        
                                        // Rechercher les ingrédients attendus
                                        const ingredients = [
                                            'zaatar', 'courgettes', 'poulet', 'oignon rouge',
                                            'curcuma', 'moutarde', 'ciboulette', 'bouillon',
                                            'huile d\'olive'
                                        ];
                                        
                                        const foundIngredients = ingredients.filter(ing => 
                                            text.toLowerCase().includes(ing.toLowerCase())
                                        );
                                        
                                        if (foundIngredients.length > 0) {
                                            console.log(`🎯 Ingrédients trouvés: ${foundIngredients.join(', ')}`);
                                        }
                                    });
                                }
                                
                                resolve(jsonData);
                            } catch (parseError) {
                                console.log(`❌ Erreur parsing JSON: ${parseError.message}`);
                                console.log('Réponse brute:', data.substring(0, 500));
                                reject(parseError);
                            }
                        } else {
                            console.log(`❌ Erreur HTTP ${res.statusCode}`);
                            console.log('Réponse:', data.substring(0, 500));
                            
                            if (res.statusCode === 301 || res.statusCode === 302) {
                                console.log('🔄 Redirection détectée');
                                const location = res.headers.location;
                                if (location) {
                                    console.log(`Nouvelle URL: ${location}`);
                                }
                            }
                            
                            reject(new Error(`HTTP ${res.statusCode}`));
                        }
                    });
                });

                req.on('error', (error) => {
                    console.log(`❌ Erreur réseau: ${error.message}`);
                    reject(error);
                });

                req.setTimeout(10000, () => {
                    console.log('❌ Timeout');
                    req.abort();
                    reject(new Error('Timeout'));
                });

                req.end();
            });
        }
        
        // Tester API publique d'abord
        testAPI(apis[0], 'API Publique Instagram')
            .then(resolve)
            .catch((error) => {
                console.log('\n🔄 API publique échouée, test API Facebook...');
                // Si la première échoue, essayer la seconde
                testAPI(apis[1], 'API Facebook Graph')
                    .then(resolve)
                    .catch(reject);
            });
    });
}

// Fonction pour tester l'endpoint local
function testLocalEndpoint() {
    return new Promise((resolve, reject) => {
        console.log('\n\n🧪 Test endpoint local /api/social/instagram-oembed');
        console.log('-'.repeat(60));
        
        const http = require('http');
        const postData = JSON.stringify({ url: INSTAGRAM_URL });
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/social/instagram-oembed',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log(`✅ Endpoint local: ${res.statusCode}`);
                    console.log(JSON.stringify(result, null, 2));
                    resolve(result);
                } catch (error) {
                    console.log(`❌ Erreur parsing: ${error.message}`);
                    console.log('Réponse brute:', data);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.log('❌ Endpoint local non accessible');
            console.log('💡 Lancez: npm run dev');
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

async function main() {
    try {
        console.log('1️⃣ Test direct de l\'API Instagram...');
        const apiResult = await testInstagramAPI();
        
        console.log('\n2️⃣ Test de l\'endpoint local...');
        try {
            const localResult = await testLocalEndpoint();
        } catch (localError) {
            console.log('⚠️  Endpoint local non accessible');
        }
        
        console.log('\n' + '='*60);
        console.log('📌 Conclusions:');
        console.log('- URL testée avec vraie recette de courgettes au zaatar');
        console.log('- Vérification des ingrédients spécifiques demandés');
        console.log('- Test des deux APIs (publique et Facebook)');
        
    } catch (error) {
        console.log(`\n❌ Tous les tests ont échoué: ${error.message}`);
        console.log('\n💡 Solutions possibles:');
        console.log('1. L\'URL Instagram est peut-être privée');
        console.log('2. Instagram bloque les requêtes automatisées');
        console.log('3. L\'API a changé récemment');
        console.log('4. Problème de réseau/proxy');
    }
}

main().catch(console.error);