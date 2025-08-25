import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types pour les données de prix
export interface PiloterrProduct {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  currency: string;
  location: string;
  date: string;
  source: string;
  url?: string;
  image?: string;
}

export interface PriceData {
  product_id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  currency: string;
  location: string;
  date: string;
  source: string;
  created_at: string;
}

// Configuration de l'API Piloterr
interface PiloterrConfig {
  apiKey: string;
  baseUrl: string;
  endpoints: {
    search: string;
    product: string;
  };
}

class PiloterrPriceService {
  private supabase: SupabaseClient;
  private config: PiloterrConfig;

  constructor(apiKey: string = '8b003b6b-9cda-4c98-b8d1-8871188a9a30') {
    // Initialiser Supabase pour stocker les données
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Configuration de l'API Piloterr
    this.config = {
      apiKey,
      baseUrl: 'https://piloterr.com/api/v2',
      endpoints: {
        search: '/carrefour/search',
        product: '/carrefour/product'
      }
    };
  }

  /**
   * Recherche des produits via l'API Piloterr
   */
  async searchProducts(query: string, category?: string): Promise<PiloterrProduct[]> {
    try {
      console.log(`🔍 Recherche de produits "${query}" via l'API Piloterr...`);
      
      const searchData = {
        query: query,
        category: category || 'all',
        limit: 50
      };

      const response = await fetch(`${this.config.baseUrl}${this.config.endpoints.search}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchData)
      });

      if (!response.ok) {
        throw new Error(`Erreur API Piloterr: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformPiloterrData(data.products || data.results || []);
    } catch (error) {
      console.error('Erreur lors de la recherche de produits:', error);
      throw error;
    }
  }

  /**
   * Récupère les détails d'un produit spécifique
   */
  async getProductDetails(productId: string): Promise<PiloterrProduct | null> {
    try {
      console.log(`📋 Récupération des détails du produit ${productId}...`);
      
      const response = await fetch(`${this.config.baseUrl}${this.config.endpoints.product}/${productId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur API Piloterr: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const products = this.transformPiloterrData([data.product || data]);
      return products.length > 0 ? products[0] : null;
    } catch (error) {
      console.error('Erreur lors de la récupération des détails du produit:', error);
      throw error;
    }
  }

  /**
   * Récupère les prix des fruits depuis l'API Piloterr
   */
  async fetchFruitsPrices(): Promise<PiloterrProduct[]> {
    try {
      console.log('🍎 Récupération des prix des fruits via l\'API Piloterr...');
      
      const fruitQueries = [
        'pomme', 'banane', 'orange', 'fraise', 'raisin', 'poire', 'pêche', 'abricot',
        'cerise', 'ananas', 'mangue', 'kiwi', 'citron', 'lime', 'pamplemousse'
      ];
      
      const allFruits: PiloterrProduct[] = [];
      
      for (const query of fruitQueries) {
        try {
          const fruits = await this.searchProducts(query, 'fruits');
          allFruits.push(...fruits);
          
          // Attendre un peu entre les requêtes pour éviter le rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.warn(`Erreur lors de la recherche de ${query}:`, error);
        }
      }
      
      // Supprimer les doublons basés sur l'ID
      const uniqueFruits = allFruits.filter((fruit, index, self) => 
        index === self.findIndex(f => f.id === fruit.id)
      );
      
      console.log(`✅ ${uniqueFruits.length} fruits récupérés`);
      return uniqueFruits;
    } catch (error) {
      console.error('Erreur lors de la récupération des prix des fruits:', error);
      throw error;
    }
  }

  /**
   * Récupère les prix des légumes depuis l'API Piloterr
   */
  async fetchVegetablesPrices(): Promise<PiloterrProduct[]> {
    try {
      console.log('🥕 Récupération des prix des légumes via l\'API Piloterr...');
      
      const vegetableQueries = [
        'tomate', 'carotte', 'poivron', 'salade', 'concombre', 'oignon', 'ail',
        'pomme de terre', 'courgette', 'aubergine', 'brocoli', 'chou-fleur',
        'épinard', 'haricot vert', 'petit pois'
      ];
      
      const allVegetables: PiloterrProduct[] = [];
      
      for (const query of vegetableQueries) {
        try {
          const vegetables = await this.searchProducts(query, 'vegetables');
          allVegetables.push(...vegetables);
          
          // Attendre un peu entre les requêtes pour éviter le rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.warn(`Erreur lors de la recherche de ${query}:`, error);
        }
      }
      
      // Supprimer les doublons basés sur l'ID
      const uniqueVegetables = allVegetables.filter((vegetable, index, self) => 
        index === self.findIndex(v => v.id === vegetable.id)
      );
      
      console.log(`✅ ${uniqueVegetables.length} légumes récupérés`);
      return uniqueVegetables;
    } catch (error) {
      console.error('Erreur lors de la récupération des prix des légumes:', error);
      throw error;
    }
  }

  /**
   * Recherche un produit spécifique via l'API Piloterr
   */
  async searchProduct(query: string): Promise<PiloterrProduct[]> {
    try {
      console.log(`🔍 Recherche du produit "${query}" via l'API Piloterr...`);
      return await this.searchProducts(query);
    } catch (error) {
      console.error('Erreur lors de la recherche de produit:', error);
      throw error;
    }
  }

  /**
   * Transforme les données de l'API Piloterr en format standardisé
   */
  private transformPiloterrData(data: Record<string, unknown>[]): PiloterrProduct[] {
    return data.map((item, index) => {
      // Nettoyer et extraire le prix
      let price = 0;
      if (item.price) {
        const priceStr = String(item.price).replace(/[^\d,.]/g, '').replace(',', '.');
        price = parseFloat(priceStr) || 0;
      }

      // Nettoyer le nom
      let name = String(item.name || item.title || item.product_name || `Produit ${index + 1}`);
      name = name.trim();

      // Déterminer la catégorie
      let category = String(item.category || 'unknown');
      if (name.toLowerCase().includes('pomme') || name.toLowerCase().includes('banane') || 
          name.toLowerCase().includes('orange') || name.toLowerCase().includes('fraise')) {
        category = 'fruits';
      } else if (name.toLowerCase().includes('tomate') || name.toLowerCase().includes('carotte') || 
                 name.toLowerCase().includes('poivron') || name.toLowerCase().includes('salade')) {
        category = 'vegetables';
      }

      // Déterminer l'unité
      let unit = String(item.unit || 'kg');
      if (name.toLowerCase().includes('kg') || name.toLowerCase().includes('kilo')) {
        unit = 'kg';
      } else if (name.toLowerCase().includes('g') || name.toLowerCase().includes('gramme')) {
        unit = 'g';
      } else if (name.toLowerCase().includes('pièce') || name.toLowerCase().includes('unité')) {
        unit = 'piece';
      }

      return {
        id: String(item.id || item.product_id || `piloterr_${index}_${Date.now()}`),
        name: name,
        category: category,
        unit: unit,
        price: price,
        currency: 'EUR',
        location: 'France',
        date: new Date().toISOString().split('T')[0], // Format YYYY-MM-DD
        source: 'piloterr',
        url: item.url ? String(item.url) : undefined,
        image: item.image ? String(item.image) : undefined
      };
    }).filter(item => item.name && item.price > 0); // Filtrer les produits valides
  }

  /**
   * Stocke les données de prix dans Supabase
   */
  async storePrices(products: PiloterrProduct[]): Promise<void> {
    try {
      const priceData: PriceData[] = products.map(product => ({
        product_id: product.id,
        name: product.name,
        category: product.category,
        unit: product.unit,
        price: product.price,
        currency: product.currency,
        location: product.location,
        date: product.date,
        source: product.source,
        created_at: new Date().toISOString()
      }));

      const { error } = await this.supabase
        .from('product_prices')
        .upsert(priceData, { 
          onConflict: 'product_id,date,location',
          ignoreDuplicates: false 
        });

      if (error) {
        throw new Error(`Erreur Supabase: ${error.message}`);
      }

      console.log(`${priceData.length} prix stockés avec succès`);
    } catch (error) {
      console.error('Erreur lors du stockage des prix:', error);
      throw error;
    }
  }

  /**
   * Récupère les prix depuis Supabase
   */
  async getStoredPrices(category?: string, location?: string): Promise<PriceData[]> {
    try {
      let query = this.supabase
        .from('product_prices')
        .select('*')
        .order('date', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      if (location) {
        query = query.eq('location', location);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Erreur Supabase: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des prix stockés:', error);
      throw error;
    }
  }

  /**
   * Met à jour complètement la base de données des prix
   */
  async updateAllPrices(): Promise<void> {
    try {
      console.log('Début de la mise à jour des prix...');
      
      // Récupérer les fruits
      console.log('Récupération des prix des fruits...');
      const fruits = await this.fetchFruitsPrices();
      await this.storePrices(fruits);
      
      // Récupérer les légumes
      console.log('Récupération des prix des légumes...');
      const vegetables = await this.fetchVegetablesPrices();
      await this.storePrices(vegetables);
      
      console.log('Mise à jour des prix terminée avec succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour des prix:', error);
      throw error;
    }
  }

  /**
   * Obtient le prix moyen d'un produit sur une période donnée
   */
  async getAveragePrice(productName: string, days: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await this.supabase
        .from('product_prices')
        .select('price')
        .ilike('name', `%${productName}%`)
        .gte('date', cutoffDate.toISOString());

      if (error) {
        throw new Error(`Erreur Supabase: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return 0;
      }

      const totalPrice = data.reduce((sum, item) => sum + item.price, 0);
      return totalPrice / data.length;
    } catch (error) {
      console.error('Erreur lors du calcul du prix moyen:', error);
      throw error;
    }
  }
}

export default PiloterrPriceService;
