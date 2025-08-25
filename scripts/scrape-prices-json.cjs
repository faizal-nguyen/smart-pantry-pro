#!/usr/bin/env node

/**
 * Script de génération et sauvegarde des prix en JSON
 * Alternative quand Supabase n'est pas configuré
 */

const fs = require('fs');
const path = require('path');

class PriceGenerator {
  constructor() {
    this.products = [];
  }

  generateRealisticPrices() {
    console.log('🎭 Génération de prix réalistes...');
    
    const fruits = [
      { name: 'Pomme Golden', basePrice: 2.50, unit: 'kg', category: 'fruits', variations: ['Bio', 'Conventionnel', 'Premium'] },
      { name: 'Pomme Granny Smith', basePrice: 2.80, unit: 'kg', category: 'fruits', variations: ['Bio', 'Conventionnel'] },
      { name: 'Banane', basePrice: 1.90, unit: 'kg', category: 'fruits', variations: ['Bio', 'Conventionnel', 'Équitable'] },
      { name: 'Orange Navel', basePrice: 2.20, unit: 'kg', category: 'fruits', variations: ['Bio', 'Conventionnel', 'Espagne'] },
      { name: 'Fraise', basePrice: 4.50, unit: 'kg', category: 'fruits', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Raisin Blanc', basePrice: 3.80, unit: 'kg', category: 'fruits', variations: ['Bio', 'Conventionnel', 'Italie'] },
      { name: 'Kiwi', basePrice: 0.40, unit: 'piece', category: 'fruits', variations: ['Bio', 'Conventionnel', 'Nouvelle-Zélande'] },
      { name: 'Ananas', basePrice: 2.90, unit: 'piece', category: 'fruits', variations: ['Bio', 'Conventionnel', 'Costa Rica'] },
      { name: 'Mangue', basePrice: 1.20, unit: 'piece', category: 'fruits', variations: ['Bio', 'Conventionnel', 'Pérou'] },
      { name: 'Pêche', basePrice: 3.20, unit: 'kg', category: 'fruits', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Poire Williams', basePrice: 2.60, unit: 'kg', category: 'fruits', variations: ['Bio', 'Conventionnel'] },
      { name: 'Citron', basePrice: 0.30, unit: 'piece', category: 'fruits', variations: ['Bio', 'Conventionnel', 'Espagne'] },
      { name: 'Mandarine', basePrice: 2.10, unit: 'kg', category: 'fruits', variations: ['Bio', 'Conventionnel', 'Maroc'] },
      { name: 'Clémentine', basePrice: 2.40, unit: 'kg', category: 'fruits', variations: ['Bio', 'Conventionnel', 'Corse'] },
      { name: 'Pamplemousse', basePrice: 1.80, unit: 'piece', category: 'fruits', variations: ['Bio', 'Conventionnel', 'Israël'] },
      { name: 'Melon Charentais', basePrice: 2.50, unit: 'piece', category: 'fruits', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Pastèque', basePrice: 1.90, unit: 'kg', category: 'fruits', variations: ['Bio', 'Conventionnel', 'Espagne'] },
      { name: 'Abricot', basePrice: 4.20, unit: 'kg', category: 'fruits', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Prune', basePrice: 3.60, unit: 'kg', category: 'fruits', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Cerise', basePrice: 6.80, unit: 'kg', category: 'fruits', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Framboise', basePrice: 8.50, unit: 'kg', category: 'fruits', variations: ['Bio', 'Conventionnel', 'France'] }
    ];

    const vegetables = [
      { name: 'Tomate Grappe', basePrice: 2.90, unit: 'kg', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'Serre'] },
      { name: 'Tomate Cerise', basePrice: 3.20, unit: 'kg', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'Serre'] },
      { name: 'Carotte', basePrice: 1.40, unit: 'kg', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Poivron Rouge', basePrice: 3.80, unit: 'kg', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'Espagne'] },
      { name: 'Poivron Vert', basePrice: 3.50, unit: 'kg', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'Espagne'] },
      { name: 'Poivron Jaune', basePrice: 4.20, unit: 'kg', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'Espagne'] },
      { name: 'Salade Laitue', basePrice: 1.20, unit: 'piece', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Salade Romaine', basePrice: 1.50, unit: 'piece', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Concombre', basePrice: 1.80, unit: 'kg', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'Serre'] },
      { name: 'Courgette', basePrice: 2.10, unit: 'kg', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Aubergine', basePrice: 2.80, unit: 'kg', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'Espagne'] },
      { name: 'Brocoli', basePrice: 2.40, unit: 'kg', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Chou-fleur', basePrice: 2.20, unit: 'piece', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Chou Vert', basePrice: 1.90, unit: 'piece', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Épinard', basePrice: 2.60, unit: 'kg', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Haricot Vert', basePrice: 3.40, unit: 'kg', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Petit Pois', basePrice: 2.80, unit: 'kg', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Maïs', basePrice: 1.50, unit: 'piece', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Oignon Jaune', basePrice: 1.20, unit: 'kg', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Oignon Rouge', basePrice: 1.60, unit: 'kg', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Ail', basePrice: 3.80, unit: 'kg', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Échalote', basePrice: 4.20, unit: 'kg', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Poireau', basePrice: 2.10, unit: 'kg', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Céleri', basePrice: 1.80, unit: 'piece', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Radis', basePrice: 1.90, unit: 'kg', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Betterave', basePrice: 2.30, unit: 'kg', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Navet', basePrice: 1.70, unit: 'kg', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Pomme de Terre', basePrice: 1.40, unit: 'kg', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'France'] },
      { name: 'Patate Douce', basePrice: 2.60, unit: 'kg', category: 'vegetables', variations: ['Bio', 'Conventionnel', 'États-Unis'] }
    ];

    let productIndex = 0;
    const allProducts = [];

    // Générer des variations pour chaque produit
    [...fruits, ...vegetables].forEach(product => {
      product.variations.forEach(variation => {
        // Ajouter une variation de prix réaliste (±20%)
        const priceVariation = 0.8 + Math.random() * 0.4; // Entre 0.8 et 1.2
        const finalPrice = product.basePrice * priceVariation;
        
        allProducts.push({
          id: `demo_${product.category}_${productIndex}_${Date.now()}`,
          product_id: `demo_${product.category}_${productIndex}`,
          name: `${product.name} ${variation}`,
          category: product.category,
          unit: product.unit,
          price: Math.round(finalPrice * 100) / 100, // Arrondir à 2 décimales
          currency: 'EUR',
          location: 'France',
          date: new Date().toISOString().split('T')[0],
          source: 'demo',
          variation: variation,
          original_name: product.name,
          url: `https://example.com/product/${product.name.toLowerCase().replace(/\s+/g, '-')}-${variation.toLowerCase()}`,
          image: `https://example.com/images/${product.name.toLowerCase().replace(/\s+/g, '-')}.jpg`
        });
        
        productIndex++;
      });
    });

    this.products = allProducts;
    console.log(`✅ ${this.products.length} produits générés avec variations`);
    return this.products;
  }

  calculateStatistics() {
    console.log('\n📈 Calcul des statistiques...');
    
    const fruits = this.products.filter(p => p.category === 'fruits');
    const vegetables = this.products.filter(p => p.category === 'vegetables');
    
    const stats = {
      total: this.products.length,
      fruits: {
        count: fruits.length,
        avgPrice: fruits.length > 0 ? fruits.reduce((sum, p) => sum + p.price, 0) / fruits.length : 0,
        minPrice: fruits.length > 0 ? Math.min(...fruits.map(p => p.price)) : 0,
        maxPrice: fruits.length > 0 ? Math.max(...fruits.map(p => p.price)) : 0
      },
      vegetables: {
        count: vegetables.length,
        avgPrice: vegetables.length > 0 ? vegetables.reduce((sum, p) => sum + p.price, 0) / vegetables.length : 0,
        minPrice: vegetables.length > 0 ? Math.min(...vegetables.map(p => p.price)) : 0,
        maxPrice: vegetables.length > 0 ? Math.max(...vegetables.map(p => p.price)) : 0
      },
      byVariation: {},
      byUnit: {}
    };

    // Statistiques par variation
    this.products.forEach(product => {
      if (!stats.byVariation[product.variation]) {
        stats.byVariation[product.variation] = { count: 0, avgPrice: 0, totalPrice: 0 };
      }
      stats.byVariation[product.variation].count++;
      stats.byVariation[product.variation].totalPrice += product.price;
    });

    Object.keys(stats.byVariation).forEach(variation => {
      stats.byVariation[variation].avgPrice = stats.byVariation[variation].totalPrice / stats.byVariation[variation].count;
    });

    // Statistiques par unité
    this.products.forEach(product => {
      if (!stats.byUnit[product.unit]) {
        stats.byUnit[product.unit] = { count: 0, avgPrice: 0, totalPrice: 0 };
      }
      stats.byUnit[product.unit].count++;
      stats.byUnit[product.unit].totalPrice += product.price;
    });

    Object.keys(stats.byUnit).forEach(unit => {
      stats.byUnit[unit].avgPrice = stats.byUnit[unit].totalPrice / stats.byUnit[unit].count;
    });

    return stats;
  }

  saveToFiles() {
    console.log('\n💾 Sauvegarde des fichiers...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dataDir = path.join(__dirname, '..', 'data', 'prices');
    
    // Créer le dossier data/prices s'il n'existe pas
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Fichier principal avec tous les produits
    const mainFile = path.join(dataDir, `prices-${timestamp}.json`);
    fs.writeFileSync(mainFile, JSON.stringify(this.products, null, 2));
    console.log(`✅ Fichier principal: ${mainFile}`);

    // Fichier de statistiques
    const stats = this.calculateStatistics();
    const statsFile = path.join(dataDir, `stats-${timestamp}.json`);
    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
    console.log(`✅ Fichier statistiques: ${statsFile}`);

    // Fichiers séparés par catégorie
    const fruits = this.products.filter(p => p.category === 'fruits');
    const vegetables = this.products.filter(p => p.category === 'vegetables');
    
    const fruitsFile = path.join(dataDir, `fruits-${timestamp}.json`);
    fs.writeFileSync(fruitsFile, JSON.stringify(fruits, null, 2));
    console.log(`✅ Fichier fruits: ${fruitsFile}`);

    const vegetablesFile = path.join(dataDir, `vegetables-${timestamp}.json`);
    fs.writeFileSync(vegetablesFile, JSON.stringify(vegetables, null, 2));
    console.log(`✅ Fichier légumes: ${vegetablesFile}`);

    // Fichier CSV pour Excel
    const csvFile = path.join(dataDir, `prices-${timestamp}.csv`);
    const csvHeader = 'ID,Product ID,Name,Category,Unit,Price,Currency,Location,Date,Source,Variation,URL,Image\n';
    const csvContent = this.products.map(p => 
      `"${p.id}","${p.product_id}","${p.name}","${p.category}","${p.unit}",${p.price},"${p.currency}","${p.location}","${p.date}","${p.source}","${p.variation}","${p.url}","${p.image}"`
    ).join('\n');
    fs.writeFileSync(csvFile, csvHeader + csvContent);
    console.log(`✅ Fichier CSV: ${csvFile}`);

    return {
      mainFile,
      statsFile,
      fruitsFile,
      vegetablesFile,
      csvFile
    };
  }

  displayResults() {
    console.log('\n📋 Résultats générés:');
    console.log('=' .repeat(50));
    
    const stats = this.calculateStatistics();
    
    console.log(`📊 Total: ${stats.total} produits`);
    console.log(`🍎 Fruits: ${stats.fruits.count} (prix moyen: ${stats.fruits.avgPrice.toFixed(2)}€)`);
    console.log(`🥬 Légumes: ${stats.vegetables.count} (prix moyen: ${stats.vegetables.avgPrice.toFixed(2)}€)`);
    
    console.log('\n💰 Prix par variation:');
    Object.entries(stats.byVariation).forEach(([variation, data]) => {
      console.log(`   ${variation}: ${data.count} produits (prix moyen: ${data.avgPrice.toFixed(2)}€)`);
    });
    
    console.log('\n📏 Prix par unité:');
    Object.entries(stats.byUnit).forEach(([unit, data]) => {
      console.log(`   ${unit}: ${data.count} produits (prix moyen: ${data.avgPrice.toFixed(2)}€)`);
    });
    
    console.log('\n📋 Exemples de produits:');
    this.products.slice(0, 15).forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} - ${product.price}€/${product.unit} (${product.variation})`);
    });
  }

  async run() {
    console.log('🚀 Générateur de prix réalistes');
    console.log('=' .repeat(60));

    try {
      // 1. Générer les données
      this.generateRealisticPrices();
      
      // 2. Afficher les résultats
      this.displayResults();
      
      // 3. Sauvegarder les fichiers
      const files = this.saveToFiles();
      
      console.log('\n✅ Génération terminée avec succès!');
      console.log('\n💡 Fichiers créés:');
      console.log(`   📄 JSON principal: ${files.mainFile}`);
      console.log(`   📊 Statistiques: ${files.statsFile}`);
      console.log(`   🍎 Fruits: ${files.fruitsFile}`);
      console.log(`   🥬 Légumes: ${files.vegetablesFile}`);
      console.log(`   📋 CSV: ${files.csvFile}`);
      
      console.log('\n🎯 Prochaines étapes:');
      console.log('1. Importez les données dans votre application');
      console.log('2. Utilisez le fichier CSV pour Excel/Google Sheets');
      console.log('3. Intégrez avec l\'API Piloterr ou le scraper Carrefour');
      
    } catch (error) {
      console.error('❌ Erreur fatale:', error.message);
    }
  }
}

async function main() {
  const generator = new PriceGenerator();
  await generator.run();
}

// Lancer le générateur
if (require.main === module) {
  main();
}

module.exports = { PriceGenerator };

