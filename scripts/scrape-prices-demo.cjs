#!/usr/bin/env node

/**
 * Script de démonstration - Récupération et stockage des prix
 * Utilise des données simulées pour démontrer le système complet
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

class PriceScraperDemo {
  constructor() {
    this.products = [];
  }

  generateMockData() {
    console.log('🎭 Génération de données de démonstration...');
    
    const fruits = [
      { name: 'Pomme Golden', price: 2.50, unit: 'kg', category: 'fruits' },
      { name: 'Pomme Granny Smith', price: 2.80, unit: 'kg', category: 'fruits' },
      { name: 'Banane', price: 1.90, unit: 'kg', category: 'fruits' },
      { name: 'Orange Navel', price: 2.20, unit: 'kg', category: 'fruits' },
      { name: 'Fraise', price: 4.50, unit: 'kg', category: 'fruits' },
      { name: 'Raisin Blanc', price: 3.80, unit: 'kg', category: 'fruits' },
      { name: 'Kiwi', price: 0.40, unit: 'piece', category: 'fruits' },
      { name: 'Ananas', price: 2.90, unit: 'piece', category: 'fruits' },
      { name: 'Mangue', price: 1.20, unit: 'piece', category: 'fruits' },
      { name: 'Pêche', price: 3.20, unit: 'kg', category: 'fruits' },
      { name: 'Poire Williams', price: 2.60, unit: 'kg', category: 'fruits' },
      { name: 'Citron', price: 0.30, unit: 'piece', category: 'fruits' },
      { name: 'Mandarine', price: 2.10, unit: 'kg', category: 'fruits' },
      { name: 'Clémentine', price: 2.40, unit: 'kg', category: 'fruits' },
      { name: 'Pamplemousse', price: 1.80, unit: 'piece', category: 'fruits' },
      { name: 'Melon Charentais', price: 2.50, unit: 'piece', category: 'fruits' },
      { name: 'Pastèque', price: 1.90, unit: 'kg', category: 'fruits' },
      { name: 'Abricot', price: 4.20, unit: 'kg', category: 'fruits' },
      { name: 'Prune', price: 3.60, unit: 'kg', category: 'fruits' },
      { name: 'Cerise', price: 6.80, unit: 'kg', category: 'fruits' },
      { name: 'Framboise', price: 8.50, unit: 'kg', category: 'fruits' }
    ];

    const vegetables = [
      { name: 'Tomate Grappe', price: 2.90, unit: 'kg', category: 'vegetables' },
      { name: 'Tomate Cerise', price: 3.20, unit: 'kg', category: 'vegetables' },
      { name: 'Carotte', price: 1.40, unit: 'kg', category: 'vegetables' },
      { name: 'Poivron Rouge', price: 3.80, unit: 'kg', category: 'vegetables' },
      { name: 'Poivron Vert', price: 3.50, unit: 'kg', category: 'vegetables' },
      { name: 'Poivron Jaune', price: 4.20, unit: 'kg', category: 'vegetables' },
      { name: 'Salade Laitue', price: 1.20, unit: 'piece', category: 'vegetables' },
      { name: 'Salade Romaine', price: 1.50, unit: 'piece', category: 'vegetables' },
      { name: 'Concombre', price: 1.80, unit: 'kg', category: 'vegetables' },
      { name: 'Courgette', price: 2.10, unit: 'kg', category: 'vegetables' },
      { name: 'Aubergine', price: 2.80, unit: 'kg', category: 'vegetables' },
      { name: 'Brocoli', price: 2.40, unit: 'kg', category: 'vegetables' },
      { name: 'Chou-fleur', price: 2.20, unit: 'piece', category: 'vegetables' },
      { name: 'Chou Vert', price: 1.90, unit: 'piece', category: 'vegetables' },
      { name: 'Épinard', price: 2.60, unit: 'kg', category: 'vegetables' },
      { name: 'Haricot Vert', price: 3.40, unit: 'kg', category: 'vegetables' },
      { name: 'Petit Pois', price: 2.80, unit: 'kg', category: 'vegetables' },
      { name: 'Maïs', price: 1.50, unit: 'piece', category: 'vegetables' },
      { name: 'Oignon Jaune', price: 1.20, unit: 'kg', category: 'vegetables' },
      { name: 'Oignon Rouge', price: 1.60, unit: 'kg', category: 'vegetables' },
      { name: 'Ail', price: 3.80, unit: 'kg', category: 'vegetables' },
      { name: 'Échalote', price: 4.20, unit: 'kg', category: 'vegetables' },
      { name: 'Poireau', price: 2.10, unit: 'kg', category: 'vegetables' },
      { name: 'Céleri', price: 1.80, unit: 'piece', category: 'vegetables' },
      { name: 'Radis', price: 1.90, unit: 'kg', category: 'vegetables' },
      { name: 'Betterave', price: 2.30, unit: 'kg', category: 'vegetables' },
      { name: 'Navet', price: 1.70, unit: 'kg', category: 'vegetables' },
      { name: 'Pomme de Terre', price: 1.40, unit: 'kg', category: 'vegetables' },
      { name: 'Patate Douce', price: 2.60, unit: 'kg', category: 'vegetables' }
    ];

    this.products = [...fruits, ...vegetables].map((product, index) => ({
      id: `demo_${product.category}_${index}_${Date.now()}`,
      product_id: `demo_${product.category}_${index}`,
      name: product.name,
      category: product.category,
      unit: product.unit,
      price: product.price,
      currency: 'EUR',
      location: 'France',
      date: new Date().toISOString().split('T')[0],
      source: 'demo',
      url: `https://example.com/product/${product.name.toLowerCase().replace(/\s+/g, '-')}`,
      image: `https://example.com/images/${product.name.toLowerCase().replace(/\s+/g, '-')}.jpg`
    }));

    console.log(`✅ ${this.products.length} produits générés (${fruits.length} fruits, ${vegetables.length} légumes)`);
    return this.products;
  }

  async storeInSupabase(products) {
    console.log('\n💾 Stockage dans Supabase...');
    
    try {
      // Vérifier la connexion Supabase
      const { data: testData, error: testError } = await supabase
        .from('product_prices')
        .select('count')
        .limit(1);

      if (testError) {
        console.log('❌ Erreur de connexion Supabase:', testError.message);
        console.log('💡 Vérifiez vos variables d\'environnement:');
        console.log('   - NEXT_PUBLIC_SUPABASE_URL');
        console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
        return false;
      }

      console.log('✅ Connexion Supabase établie');

      // Insérer les produits par lots de 10
      const batchSize = 10;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        
        const { data, error } = await supabase
          .from('product_prices')
          .insert(batch)
          .select();

        if (error) {
          console.log(`❌ Erreur lors de l'insertion du lot ${Math.floor(i/batchSize) + 1}:`, error.message);
          errorCount += batch.length;
        } else {
          console.log(`✅ Lot ${Math.floor(i/batchSize) + 1} inséré: ${batch.length} produits`);
          successCount += data.length;
        }

        // Attendre un peu entre les lots
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`\n📊 Résumé du stockage:`);
      console.log(`   ✅ ${successCount} produits insérés avec succès`);
      console.log(`   ❌ ${errorCount} produits en erreur`);

      return successCount > 0;

    } catch (error) {
      console.error('❌ Erreur fatale lors du stockage:', error.message);
      return false;
    }
  }

  async getStatistics() {
    console.log('\n📈 Récupération des statistiques...');
    
    try {
      // Compter tous les produits
      const { count: totalCount, error: totalError } = await supabase
        .from('product_prices')
        .select('*', { count: 'exact', head: true });

      if (totalError) {
        console.log('❌ Erreur lors du comptage:', totalError.message);
        return;
      }

      // Compter par catégorie
      const { data: categoryStats, error: categoryError } = await supabase
        .from('product_prices')
        .select('category, price')
        .eq('source', 'demo');

      if (categoryError) {
        console.log('❌ Erreur lors de la récupération des catégories:', categoryError.message);
        return;
      }

      const fruits = categoryStats.filter(p => p.category === 'fruits');
      const vegetables = categoryStats.filter(p => p.category === 'vegetables');

      console.log(`📊 Statistiques:`);
      console.log(`   📦 Total produits: ${totalCount}`);
      console.log(`   🍎 Fruits: ${fruits.length}`);
      console.log(`   🥬 Légumes: ${vegetables.length}`);

      if (fruits.length > 0) {
        const avgFruitPrice = fruits.reduce((sum, p) => sum + p.price, 0) / fruits.length;
        console.log(`   💰 Prix moyen fruits: ${avgFruitPrice.toFixed(2)}€`);
      }

      if (vegetables.length > 0) {
        const avgVegPrice = vegetables.reduce((sum, p) => sum + p.price, 0) / vegetables.length;
        console.log(`   💰 Prix moyen légumes: ${avgVegPrice.toFixed(2)}€`);
      }

    } catch (error) {
      console.error('❌ Erreur lors de la récupération des statistiques:', error.message);
    }
  }

  async run() {
    console.log('🚀 Démonstration du système de prix');
    console.log('=' .repeat(60));

    try {
      // 1. Générer les données de démonstration
      const products = this.generateMockData();

      // 2. Afficher quelques exemples
      console.log('\n📋 Exemples de produits:');
      products.slice(0, 10).forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.name} - ${product.price}€/${product.unit} (${product.category})`);
      });

      // 3. Stocker dans Supabase
      const stored = await this.storeInSupabase(products);

      if (stored) {
        // 4. Récupérer les statistiques
        await this.getStatistics();

        console.log('\n✅ Démonstration terminée avec succès!');
        console.log('\n💡 Prochaines étapes:');
        console.log('1. Vérifiez les données dans votre dashboard Supabase');
        console.log('2. Intégrez le système dans votre application');
        console.log('3. Configurez l\'API Piloterr ou le scraper Carrefour pour de vraies données');
      } else {
        console.log('\n❌ Échec du stockage des données');
      }

    } catch (error) {
      console.error('❌ Erreur fatale:', error.message);
    }
  }
}

async function main() {
  const scraper = new PriceScraperDemo();
  await scraper.run();
}

// Lancer la démonstration
if (require.main === module) {
  main();
}

module.exports = { PriceScraperDemo };

