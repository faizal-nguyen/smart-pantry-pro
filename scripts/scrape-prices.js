#!/usr/bin/env node

/**
 * Script de ligne de commande pour le scraping des prix des fruits et légumes
 * Usage: node scripts/scrape-prices.js [options]
 */

const { runPriceScraping } = require('../src/services/pricing/priceScraper.ts');

// Parse les arguments de ligne de commande
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    fruits: false,
    vegetables: false,
    specific: null,
    full: false,
    stats: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--fruits':
      case '-f':
        options.fruits = true;
        break;
      case '--vegetables':
      case '-v':
        options.vegetables = true;
        break;
      case '--specific':
      case '-s':
        options.specific = args[++i];
        break;
      case '--full':
        options.full = true;
        break;
      case '--stats':
        options.stats = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      default:
        console.error(`❌ Option inconnue: ${arg}`);
        showHelp();
        process.exit(1);
    }
  }

  return options;
}

function showHelp() {
  console.log(`
🚀 Script de scraping des prix des fruits et légumes

Usage: node scripts/scrape-prices.js [options]

Options:
  --fruits, -f           Scraper uniquement les fruits
  --vegetables, -v       Scraper uniquement les légumes
  --specific <nom>, -s   Rechercher et scraper un produit spécifique
  --full                 Scraper tous les produits (défaut)
  --stats                Afficher les statistiques des prix stockés
  --help, -h             Afficher cette aide

Exemples:
  node scripts/scrape-prices.js --full
  node scripts/scrape-prices.js --fruits
  node scripts/scrape-prices.js --vegetables
  node scripts/scrape-prices.js --specific "pomme"
  node scripts/scrape-prices.js --stats

Variables d'environnement requises:
  PILOTERR_API_KEY      Clé API Piloterr
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
`);
}

async function main() {
  try {
    // Utiliser la clé API fournie ou la variable d'environnement
    const apiKey = process.env.PILOTERR_API_KEY || '8b003b6b-9cda-4c98-b8d1-8871188a9a30';
    
    console.log('🔑 Clé API Piloterr configurée');
    console.log(`📡 URL: https://api.piloterr.com/v1`);
    console.log(`🎯 Cible: Carrefour (fruits et légumes)`);

    // Vérifier les variables Supabase
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('❌ Variables d\'environnement Supabase manquantes');
      console.log('💡 Vérifiez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY');
      process.exit(1);
    }

    const options = parseArguments();
    
    console.log('🔑 Clé API Piloterr configurée');
    console.log('🗄️  Connexion Supabase configurée');
    
    // Lancer le scraping
    await runPriceScraping(apiKey, options);
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

// Lancer le script
if (require.main === module) {
  main();
}
