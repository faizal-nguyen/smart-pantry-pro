import { supabase } from '@/integrations/supabase/client';
import {
  Coordinates,
  Store,
  Promotion,
  StorePromotion,
  ComboOpportunity,
  PromotionRecommendation,
  PromotionsContext,
  FamilyPromotionsContext,
  UserContextPreferences
} from './types';

/**
 * Client d'API abstrait pour les magasins
 */
abstract class StoreAPIClient {
  abstract getPromotions(storeId: string): Promise<Promotion[]>;
  abstract isAvailable(): boolean;
}

/**
 * Implémentations mock des APIs magasins
 * En production, ces classes feraient de vrais appels API
 */
class CarrefourAPIClient extends StoreAPIClient {
  async getPromotions(storeId: string): Promise<Promotion[]> {
    // Simulation de promotions Carrefour
    return [
      {
        id: 'promo_1',
        product: 'Tomates grappes',
        category: 'vegetable',
        brand: 'Bio',
        originalPrice: 3.99,
        discountedPrice: 2.49,
        discountPercent: 38,
        validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        quantity: 'le kg'
      },
      {
        id: 'promo_2',
        product: 'Viande hachée 5%',
        category: 'meat',
        brand: 'Charal',
        originalPrice: 12.90,
        discountedPrice: 8.99,
        discountPercent: 30,
        validUntil: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        quantity: '500g'
      }
    ];
  }

  isAvailable(): boolean {
    return true;
  }
}

class LeclercAPIClient extends StoreAPIClient {
  async getPromotions(storeId: string): Promise<Promotion[]> {
    return [
      {
        id: 'promo_3',
        product: 'Pâtes Barilla',
        category: 'pantry',
        brand: 'Barilla',
        originalPrice: 2.15,
        discountedPrice: 1.29,
        discountPercent: 40,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        quantity: '500g',
        conditions: { type: '2+1', description: 'Le 3ème gratuit' }
      }
    ];
  }

  isAvailable(): boolean {
    return true;
  }
}

class IntermarcheAPIClient extends StoreAPIClient {
  async getPromotions(storeId: string): Promise<Promotion[]> {
    return [];
  }

  isAvailable(): boolean {
    return false; // API non disponible
  }
}

class LidlAPIClient extends StoreAPIClient {
  async getPromotions(storeId: string): Promise<Promotion[]> {
    return [
      {
        id: 'promo_4',
        product: 'Courgettes',
        category: 'vegetable',
        originalPrice: 2.99,
        discountedPrice: 1.49,
        discountPercent: 50,
        validUntil: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        quantity: 'le kg'
      }
    ];
  }

  isAvailable(): boolean {
    return true;
  }
}

/**
 * Service de gestion des promotions locales
 * Agrège les promotions de différents magasins et optimise les suggestions
 */
export class PromotionsContextService {
  private storeAPIs: Map<string, StoreAPIClient>;
  private promotionsCache: Map<string, { data: StorePromotion[]; expires: number }> = new Map();
  
  constructor() {
    this.storeAPIs = new Map([
      ['carrefour', new CarrefourAPIClient()],
      ['leclerc', new LeclercAPIClient()],
      ['intermarche', new IntermarcheAPIClient()],
      ['lidl', new LidlAPIClient()]
    ]);
  }

  /**
   * Obtient le contexte complet des promotions
   */
  async getPromotionsContext(
    userLocation: Coordinates,
    preferences: UserContextPreferences,
    familySize: number = 2
  ): Promise<PromotionsContext> {
    try {
      // 1. Identifier les magasins proches
      const nearbyStores = await this.getNearbyStores(
        userLocation, 
        preferences.preferred_stores || [],
        preferences.max_store_distance || 10
      );
      
      // 2. Récupérer les promotions en parallèle
      const promotionsPromises = nearbyStores.map(store => 
        this.getStorePromotions(store)
      );
      
      const allPromotionsResults = await Promise.allSettled(promotionsPromises);
      
      // 3. Traiter les résultats
      const allPromotions = allPromotionsResults
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => (r as PromiseFulfilledResult<StorePromotion[]>).value);
      
      // 4. Filtrer et scorer les promotions
      const relevantPromotions = this.filterRelevantPromotions(
        allPromotions,
        preferences
      );
      
      // 5. Grouper par catégorie
      const byCategory = this.groupByCategory(relevantPromotions);
      
      // 6. Calculer le potentiel d'économies
      const totalSavingsPotential = this.calculateSavingsPotential(relevantPromotions);
      
      // 7. Générer des recommandations
      const recommendations = this.generatePromotionRecommendations(
        relevantPromotions,
        familySize
      );
      
      // 8. Identifier les promotions qui expirent bientôt
      const expiringToday = this.getExpiringPromotions(relevantPromotions, 1);
      
      // 9. Sélectionner les meilleures offres
      const bestDeals = this.getBestDeals(relevantPromotions, 10);
      
      // 10. Ajouter le contexte famille si applicable
      const familyDeals = familySize > 3 ? this.getFamilyDeals(relevantPromotions, familySize) : undefined;

      const context: PromotionsContext = {
        promotions: relevantPromotions,
        byCategory,
        totalSavingsPotential,
        recommendations,
        expiringToday,
        bestDeals,
        familyDeals
      };

      // Mettre en cache
      await this.cachePromotionsContext(userLocation, context);
      
      return context;
    } catch (error) {
      console.error('Failed to get promotions context:', error);
      return this.getDefaultPromotionsContext();
    }
  }

  /**
   * Récupère les magasins à proximité
   */
  private async getNearbyStores(
    location: Coordinates,
    preferredStores: string[],
    maxDistance: number
  ): Promise<Store[]> {
    try {
      // Récupérer depuis la base
      const { data: stores } = await supabase
        .from('store_partnerships')
        .select('*')
        .eq('is_active', true)
        .lte('distance', maxDistance);
      
      if (!stores || stores.length === 0) {
        // Utiliser des données mock si pas de magasins en base
        return this.getMockStores(location);
      }
      
      // Convertir et trier
      const storeList: Store[] = stores.map(s => ({
        id: s.id,
        chain: s.store_chain.toLowerCase(),
        name: s.store_name,
        distance: this.calculateDistance(location, s.store_location),
        location: s.store_location
      }));
      
      // Prioriser les magasins préférés
      return storeList.sort((a, b) => {
        const aPreferred = preferredStores.includes(a.id);
        const bPreferred = preferredStores.includes(b.id);
        if (aPreferred && !bPreferred) return -1;
        if (!aPreferred && bPreferred) return 1;
        return a.distance - b.distance;
      });
    } catch (error) {
      console.error('Failed to get nearby stores:', error);
      return this.getMockStores(location);
    }
  }

  /**
   * Données mock pour les magasins
   */
  private getMockStores(location: Coordinates): Store[] {
    return [
      {
        id: 'store_1',
        chain: 'carrefour',
        name: 'Carrefour Market République',
        distance: 1.2,
        location: { lat: location.lat + 0.01, lng: location.lng + 0.01, address: '15 Place République' }
      },
      {
        id: 'store_2',
        chain: 'leclerc',
        name: 'E.Leclerc Drive',
        distance: 3.5,
        location: { lat: location.lat - 0.02, lng: location.lng + 0.02, address: 'Zone Commerciale Nord' }
      },
      {
        id: 'store_3',
        chain: 'lidl',
        name: 'Lidl Centre-Ville',
        distance: 0.8,
        location: { lat: location.lat + 0.005, lng: location.lng - 0.005, address: '8 Rue du Commerce' }
      }
    ];
  }

  /**
   * Récupère les promotions d'un magasin
   */
  private async getStorePromotions(store: Store): Promise<StorePromotion[]> {
    // Vérifier le cache
    const cacheKey = `${store.id}_${new Date().toDateString()}`;
    const cached = this.promotionsCache.get(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    
    const client = this.storeAPIs.get(store.chain);
    if (!client || !client.isAvailable()) {
      return [];
    }
    
    try {
      const promotions = await client.getPromotions(store.id);
      const storePromotions = promotions.map(promo => ({
        storeId: store.id,
        storeName: store.name,
        distance: store.distance,
        promotion: promo
      }));
      
      // Mettre en cache pour 6 heures
      this.promotionsCache.set(cacheKey, {
        data: storePromotions,
        expires: Date.now() + 6 * 60 * 60 * 1000
      });
      
      return storePromotions;
    } catch (error) {
      console.error(`Failed to get promotions for ${store.name}:`, error);
      return [];
    }
  }

  /**
   * Filtre les promotions selon les préférences
   */
  private filterRelevantPromotions(
    promotions: StorePromotion[],
    preferences: UserContextPreferences
  ): StorePromotion[] {
    return promotions
      .filter(p => {
        // Filtrer par budget si spécifié
        if (preferences.max_price_per_item && 
            p.promotion.discountedPrice > preferences.max_price_per_item) {
          return false;
        }
        
        // Filtrer par catégories exclues
        if (preferences.excluded_categories?.includes(
          p.promotion.category || 'other'
        )) {
          return false;
        }
        
        // Filtrer les promotions expirées
        if (p.promotion.validUntil < new Date()) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        // Trier par économies absolues
        const savingsA = a.promotion.originalPrice - a.promotion.discountedPrice;
        const savingsB = b.promotion.originalPrice - b.promotion.discountedPrice;
        return savingsB - savingsA;
      });
  }

  /**
   * Groupe les promotions par catégorie
   */
  private groupByCategory(promotions: StorePromotion[]): Map<string, StorePromotion[]> {
    const grouped = new Map<string, StorePromotion[]>();
    
    promotions.forEach(promo => {
      const category = promo.promotion.category || 'other';
      const existing = grouped.get(category) || [];
      existing.push(promo);
      grouped.set(category, existing);
    });
    
    return grouped;
  }

  /**
   * Calcule le potentiel total d'économies
   */
  private calculateSavingsPotential(promotions: StorePromotion[]): number {
    return promotions.reduce((total, p) => {
      const savings = p.promotion.originalPrice - p.promotion.discountedPrice;
      return total + savings;
    }, 0);
  }

  /**
   * Génère des recommandations basées sur les promotions
   */
  private generatePromotionRecommendations(
    promotions: StorePromotion[],
    familySize: number
  ): PromotionRecommendation[] {
    const recommendations: PromotionRecommendation[] = [];
    
    // 1. Identifier les opportunités de stock (viande, produits congelables)
    const meatPromotions = promotions.filter(p => 
      p.promotion.category === 'meat' && p.promotion.discountPercent >= 30
    );
    
    if (meatPromotions.length >= 2) {
      recommendations.push({
        type: 'bulk_opportunity',
        title: 'Opportunité viande - Congelez!',
        description: `${meatPromotions.length} promotions sur la viande. Parfait pour faire des stocks au congélateur.`,
        products: meatPromotions.slice(0, 5),
        savingsPotential: this.calculateSavingsPotential(meatPromotions),
        priority: 'high'
      });
    }
    
    // 2. Promotions qui expirent bientôt
    const expiringSoon = this.getExpiringPromotions(promotions, 2);
    if (expiringSoon.length > 0) {
      recommendations.push({
        type: 'urgency',
        title: 'Derniers jours!',
        description: `${expiringSoon.length} promotions se terminent dans les 48h`,
        products: expiringSoon.slice(0, 5),
        priority: 'high'
      });
    }
    
    // 3. Combos de recettes
    const comboOpportunities = this.findComboOpportunities(promotions);
    comboOpportunities.forEach(combo => {
      recommendations.push({
        type: 'combo',
        title: combo.recipeName,
        description: `Tous les ingrédients principaux en promo!`,
        products: combo.products,
        totalSavings: combo.savings,
        recipeName: combo.recipeName,
        priority: 'medium'
      });
    });
    
    // 4. Promotions saisonnières
    const seasonalDeals = promotions.filter(p => 
      ['fruit', 'vegetable'].includes(p.promotion.category || '') &&
      p.promotion.discountPercent >= 40
    );
    
    if (seasonalDeals.length > 0) {
      recommendations.push({
        type: 'seasonal_deal',
        title: 'Produits frais en promo',
        description: 'Profitez des fruits et légumes à prix réduit',
        products: seasonalDeals.slice(0, 5),
        savingsPotential: this.calculateSavingsPotential(seasonalDeals),
        priority: 'medium'
      });
    }
    
    // 5. Recommandations famille nombreuse
    if (familySize > 3) {
      const bulkDeals = promotions.filter(p => 
        p.promotion.conditions?.type === '2+1' ||
        p.promotion.conditions?.type === 'bulk' ||
        p.promotion.quantity?.includes('lot')
      );
      
      if (bulkDeals.length > 0) {
        recommendations.push({
          type: 'bulk_opportunity',
          title: 'Offres familiales',
          description: 'Promotions idéales pour les familles nombreuses',
          products: bulkDeals,
          priority: 'high'
        });
      }
    }
    
    return recommendations.slice(0, 10); // Limiter à 10 recommandations
  }

  /**
   * Trouve des opportunités de combos recettes
   */
  private findComboOpportunities(promotions: StorePromotion[]): ComboOpportunity[] {
    const combos: ComboOpportunity[] = [];
    
    // Définir des recettes populaires et leurs ingrédients
    const recipes = [
      {
        name: 'Sauce Bolognaise',
        ingredients: ['viande hachée', 'tomate', 'pâtes', 'oignon', 'carotte']
      },
      {
        name: 'Quiche Lorraine',
        ingredients: ['lardons', 'œufs', 'crème', 'pâte brisée', 'fromage']
      },
      {
        name: 'Ratatouille',
        ingredients: ['tomate', 'courgette', 'aubergine', 'poivron', 'oignon']
      },
      {
        name: 'Gratin Dauphinois',
        ingredients: ['pomme de terre', 'crème', 'lait', 'fromage', 'ail']
      }
    ];
    
    recipes.forEach(recipe => {
      const matchedPromos: StorePromotion[] = [];
      const missingIngredients: string[] = [];
      
      recipe.ingredients.forEach(ingredient => {
        const promo = promotions.find(p => 
          p.promotion.product.toLowerCase().includes(ingredient) ||
          ingredient.includes(p.promotion.product.toLowerCase())
        );
        
        if (promo) {
          matchedPromos.push(promo);
        } else {
          missingIngredients.push(ingredient);
        }
      });
      
      // Si au moins 60% des ingrédients sont en promo
      if (matchedPromos.length >= recipe.ingredients.length * 0.6) {
        combos.push({
          recipeName: recipe.name,
          products: matchedPromos,
          savings: this.calculateSavingsPotential(matchedPromos),
          missingIngredients: missingIngredients.length > 0 ? missingIngredients : undefined
        });
      }
    });
    
    return combos.sort((a, b) => b.savings - a.savings);
  }

  /**
   * Obtient les promotions qui expirent dans N jours
   */
  private getExpiringPromotions(promotions: StorePromotion[], days: number): StorePromotion[] {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);
    
    return promotions.filter(p => 
      p.promotion.validUntil <= deadline
    ).sort((a, b) => 
      a.promotion.validUntil.getTime() - b.promotion.validUntil.getTime()
    );
  }

  /**
   * Sélectionne les meilleures offres
   */
  private getBestDeals(promotions: StorePromotion[], limit: number): StorePromotion[] {
    return promotions
      .filter(p => p.promotion.discountPercent >= 30)
      .sort((a, b) => {
        // Scorer par pourcentage de réduction et économies absolues
        const scoreA = a.promotion.discountPercent + 
                      (a.promotion.originalPrice - a.promotion.discountedPrice) * 10;
        const scoreB = b.promotion.discountPercent + 
                      (b.promotion.originalPrice - b.promotion.discountedPrice) * 10;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Obtient les promotions adaptées aux familles
   */
  private getFamilyDeals(promotions: StorePromotion[], familySize: number): FamilyPromotionsContext {
    const bulkDeals = promotions.filter(p => 
      p.promotion.conditions?.type === '2+1' ||
      p.promotion.conditions?.type === 'bulk' ||
      p.promotion.quantity?.includes('lot') ||
      p.promotion.quantity?.includes('pack')
    );
    
    const multipackOffers = promotions.filter(p =>
      p.promotion.quantity?.match(/\d+\s*x/) || // "3x500g", etc.
      p.promotion.conditions?.description?.includes('gratuit')
    );
    
    // Calculer les économies hebdomadaires potentielles
    const weeklyNeeds = this.estimateWeeklyNeeds(familySize);
    const estimatedWeeklySavings = this.calculateWeeklySavings(promotions, weeklyNeeds);
    
    return {
      bulkDeals,
      multipackOffers,
      estimatedWeeklySavings
    };
  }

  /**
   * Estime les besoins hebdomadaires selon la taille de la famille
   */
  private estimateWeeklyNeeds(familySize: number): Map<string, number> {
    const baseNeeds = new Map([
      ['vegetable', 5 * familySize], // kg
      ['fruit', 3 * familySize], // kg
      ['meat', 1.5 * familySize], // kg
      ['dairy', 7 * familySize], // litres/unités
      ['pantry', 2 * familySize] // kg
    ]);
    
    return baseNeeds;
  }

  /**
   * Calcule les économies hebdomadaires potentielles
   */
  private calculateWeeklySavings(
    promotions: StorePromotion[], 
    weeklyNeeds: Map<string, number>
  ): number {
    let totalSavings = 0;
    
    weeklyNeeds.forEach((quantity, category) => {
      const categoryPromos = promotions.filter(p => 
        p.promotion.category === category
      );
      
      if (categoryPromos.length > 0) {
        // Prendre la meilleure promo de chaque catégorie
        const bestPromo = categoryPromos.reduce((best, current) => 
          current.promotion.discountPercent > best.promotion.discountPercent ? current : best
        );
        
        const savings = (bestPromo.promotion.originalPrice - bestPromo.promotion.discountedPrice) * 
                       Math.min(quantity, 10); // Limiter à des quantités raisonnables
        totalSavings += savings;
      }
    });
    
    return Math.round(totalSavings * 100) / 100;
  }

  /**
   * Calcule la distance entre deux points
   */
  private calculateDistance(point1: Coordinates, point2: any): number {
    // Formule de distance simplifiée (en km)
    const lat1 = point1.lat;
    const lon1 = point1.lng;
    const lat2 = point2.lat;
    const lon2 = point2.lng;
    
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return Math.round(R * c * 10) / 10;
  }

  /**
   * Met en cache le contexte promotions
   */
  private async cachePromotionsContext(location: Coordinates, context: PromotionsContext) {
    try {
      await supabase.from('context_cache').upsert({
        cache_key: `promotions:${location.lat.toFixed(2)}:${location.lng.toFixed(2)}:${new Date().toDateString()}`,
        cache_type: 'promotions',
        data: context,
        metadata: {
          source: 'PromotionsContextService',
          confidence: 0.8,
          timestamp: new Date()
        },
        expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000) // 6 heures
      });
    } catch (error) {
      console.error('Failed to cache promotions context:', error);
    }
  }

  /**
   * Retourne un contexte promotions par défaut
   */
  private getDefaultPromotionsContext(): PromotionsContext {
    return {
      promotions: [],
      byCategory: new Map(),
      totalSavingsPotential: 0,
      recommendations: [],
      expiringToday: [],
      bestDeals: []
    };
  }
}

// Export de l'instance
export const promotionsContextService = new PromotionsContextService();