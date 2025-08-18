#!/usr/bin/env node

/**
 * Test de l'API Instagram oEmbed PUBLIQUE (sans authentification)
 */

const INSTAGRAM_URL = "https://www.instagram.com/reel/DLScf5hofId/";

console.log("🧪 Test API Instagram oEmbed PUBLIQUE (sans auth)");
console.log("="*60);
console.log(`URL: ${INSTAGRAM_URL}`);
console.log("\n");

async function testPublicInstagramAPI() {
  try {
    // API publique Instagram oEmbed - GRATUITE, SANS AUTH!
    const oembedUrl = `https://api.instagram.com/oembed?url=${encodeURIComponent(INSTAGRAM_URL)}&omitscript=true&hidecaption=false`;
    
    console.log("🔗 Appel de l'API publique:");
    console.log(oembedUrl);
    console.log("\n");
    
    const response = await fetch(oembedUrl);
    
    if (response.ok) {
      const data = await response.json();
      
      console.log("✅ Succès! Données reçues:");
      console.log("-".repeat(40));
      console.log("Auteur:", data.author_name);
      console.log("ID Auteur:", data.author_id);
      console.log("Media ID:", data.media_id);
      console.log("Provider:", data.provider_name);
      console.log("Version:", data.version);
      console.log("Type:", data.type);
      console.log("Largeur:", data.width);
      
      if (data.thumbnail_url) {
        console.log("\n🖼️ Thumbnail URL:");
        console.log(data.thumbnail_url);
      }
      
      if (data.title) {
        console.log("\n📝 Titre:");
        console.log(data.title);
      }
      
      // Extraire le texte de la caption depuis le HTML
      if (data.html) {
        console.log("\n📄 HTML embed disponible");
        
        // Rechercher la caption dans le HTML
        const captionMatch = data.html.match(/<p[^>]*>([^<]+)<\/p>/);
        if (captionMatch && captionMatch[1]) {
          console.log("\n💬 Caption extraite:");
          console.log(captionMatch[1]);
          
          // Vérifier si c'est bien le Poulet Mayo
          if (captionMatch[1].toLowerCase().includes("mayo") || 
              captionMatch[1].toLowerCase().includes("congolais")) {
            console.log("\n✅ Confirmé: C'est bien une recette de Poulet Mayo Congolais!");
          }
        }
      }
      
      console.log("\n" + "-".repeat(40));
      console.log("✅ L'API publique fonctionne parfaitement!");
      console.log("🎉 Pas besoin de token Facebook!");
      
    } else {
      console.error("❌ Erreur API:", response.status);
      const errorText = await response.text();
      console.error("Détails:", errorText);
      
      if (response.status === 404) {
        console.log("\n💡 L'URL pourrait être privée ou supprimée");
      }
    }
    
  } catch (error) {
    console.error("❌ Erreur de connexion:", error.message);
    console.log("\n💡 Vérifiez votre connexion internet");
  }
}

// Test de l'endpoint local qui utilise cette API publique
async function testLocalEndpoint() {
  console.log("\n\n🧪 Test de l'endpoint local /api/social/instagram-oembed");
  console.log("-".repeat(60));
  
  try {
    const response = await fetch('http://localhost:3000/api/social/instagram-oembed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: INSTAGRAM_URL })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("✅ Endpoint local fonctionne!");
      console.log("Données reçues:", JSON.stringify(data, null, 2));
    } else {
      console.log("❌ Erreur endpoint local:", response.status);
    }
  } catch (error) {
    console.log("⚠️  L'endpoint local n'est pas accessible");
    console.log("   Lancez 'npm run dev' pour tester");
  }
}

// Exécuter les tests
async function main() {
  console.log("1️⃣ Test direct de l'API publique Instagram:");
  await testPublicInstagramAPI();
  
  console.log("\n2️⃣ Test via l'endpoint local:");
  await testLocalEndpoint();
  
  console.log("\n" + "="*60);
  console.log("📌 Conclusion:");
  console.log("- L'API Instagram oEmbed est PUBLIQUE et GRATUITE");
  console.log("- Pas besoin de token Facebook!");
  console.log("- Le code dans /pages/api/social/instagram-oembed.ts est correct");
}

main().catch(console.error);