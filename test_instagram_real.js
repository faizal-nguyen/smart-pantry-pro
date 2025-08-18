#!/usr/bin/env node

/**
 * Test réel de l'URL Instagram avec l'API oEmbed
 * Pour obtenir les vraies métadonnées du Poulet Mayo Congolais de louloukitchen
 */

const INSTAGRAM_URL = "https://www.instagram.com/reel/DLScf5hofId/";

console.log("🧪 Test réel Instagram oEmbed");
console.log("="*50);
console.log(`URL: ${INSTAGRAM_URL}`);
console.log("\n");

// Fonction pour appeler l'API Instagram oEmbed locale
async function testInstagramOEmbed() {
  try {
    // 1. Tester d'abord l'endpoint local
    console.log("1️⃣ Test de l'API locale /api/social/instagram-oembed...");
    
    const localResponse = await fetch('http://localhost:3000/api/social/instagram-oembed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: INSTAGRAM_URL })
    }).catch(err => {
      console.error("❌ Erreur de connexion à l'API locale:", err.message);
      return null;
    });

    if (localResponse && localResponse.ok) {
      const data = await localResponse.json();
      console.log("✅ Métadonnées récupérées via API locale:");
      console.log(JSON.stringify(data, null, 2));
    } else if (localResponse) {
      console.error("❌ Erreur API locale:", localResponse.status, await localResponse.text());
    }

    // 2. Tester directement l'API Instagram oEmbed
    console.log("\n2️⃣ Test direct de l'API Instagram oEmbed...");
    
    const directUrl = `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(INSTAGRAM_URL)}&access_token=${process.env.FACEBOOK_ACCESS_TOKEN || 'TOKEN_NON_CONFIGURE'}`;
    
    const directResponse = await fetch(directUrl).catch(err => {
      console.error("❌ Erreur de connexion directe:", err.message);
      return null;
    });

    if (directResponse && directResponse.ok) {
      const data = await directResponse.json();
      console.log("✅ Métadonnées directes:");
      console.log("- Auteur:", data.author_name);
      console.log("- Titre:", data.title || "Non disponible");
      console.log("- Type:", data.type);
      console.log("- Version:", data.version);
      
      // Extraire le texte de la caption si disponible
      if (data.html) {
        const captionMatch = data.html.match(/<p[^>]*>([^<]+)<\/p>/);
        if (captionMatch) {
          console.log("- Caption:", captionMatch[1].substring(0, 100) + "...");
        }
      }
    } else if (directResponse) {
      const error = await directResponse.text();
      console.error("❌ Erreur API directe:", directResponse.status, error);
      
      if (directResponse.status === 400) {
        console.log("\n💡 Solution: Vérifiez que l'URL est publique et accessible");
      } else if (directResponse.status === 401 || directResponse.status === 403) {
        console.log("\n💡 Solution: Configurez FACEBOOK_ACCESS_TOKEN dans .env.local");
        console.log("   Voir: https://developers.facebook.com/docs/instagram-platform/oembed");
      }
    }

    // 3. Analyser le contenu probable
    console.log("\n3️⃣ Analyse du contenu attendu:");
    console.log("- Recette: Poulet Mayo Congolais");
    console.log("- Auteur: @louloukitchen");
    console.log("- Type de cuisine: Congolaise");
    console.log("- Ingrédients probables: Poulet, mayonnaise, légumes...");

    // 4. Suggestions pour l'extraction complète
    console.log("\n4️⃣ Pour une extraction complète:");
    console.log("✓ Le backend Python peut télécharger la vidéo");
    console.log("✓ Whisper peut transcrire l'audio (probablement en français)");
    console.log("✓ OpenAI Vision peut extraire le texte des frames");
    console.log("✓ L'IA peut structurer la recette congolaise");

  } catch (error) {
    console.error("❌ Erreur inattendue:", error);
  }
}

// Fonction pour simuler l'extraction de recette
function simulateRecipeExtraction() {
  console.log("\n5️⃣ Simulation de l'extraction de recette:");
  
  const simulatedRecipe = {
    name: "Poulet Mayo Congolais",
    author: "@louloukitchen",
    cuisine_category: "Congolaise",
    meal_type: "Plat principal",
    description: "Recette traditionnelle congolaise de poulet à la mayonnaise",
    estimated_ingredients: [
      "Poulet",
      "Mayonnaise",
      "Oignons",
      "Tomates",
      "Poivrons",
      "Ail",
      "Épices congolaises",
      "Huile",
      "Sel et poivre"
    ],
    note: "Les détails exacts nécessitent l'analyse de la vidéo"
  };

  console.log(JSON.stringify(simulatedRecipe, null, 2));
}

// Exécuter les tests
async function main() {
  await testInstagramOEmbed();
  simulateRecipeExtraction();
  
  console.log("\n" + "="*50);
  console.log("✅ Test terminé!");
  console.log("\n💡 Pour obtenir la recette complète:");
  console.log("1. Configurez FACEBOOK_ACCESS_TOKEN dans .env.local");
  console.log("2. Lancez le backend Python: ./start-video-backend.sh");
  console.log("3. Utilisez le bouton vidéo dans l'application");
}

main().catch(console.error);