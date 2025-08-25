import PiloterrPriceService from './piloterrPriceService';

/**
 * Script pour lancer le scraping des prix des fruits et légumes
 */
export class PriceScraper {
  private piloterrService: PiloterrPriceService;

  constructor(apiKey: string) {
    this.piloterrService = new PiloterrPriceService(apiKey);
  }

  /**
   * Lance le scraping complet des prix
   */
  async runFullScraping(): Promise<void> {
    try {
      console.log('🚀 Début du scraping des prix des fruits et légumes...');
      
      // Mise à jour complète des prix
      await this.piloterrService.updateAllPrices();
      
      console.log('✅ Scraping terminé avec succès !');
    } catch (error) {
      console.error('❌ Erreur lors du scraping:', error);
      throw error;
    }
  }

  /**
   * Scrape uniquement les fruits
   */
  async scrapeFruits(): Promise<void> {
    try {
      console.log('🍎 Scraping des prix des fruits...');
      
      const fruits = await this.piloterrService.fetchFruitsPrices();
      await this.piloterrService.storePrices(fruits);
      
      console.log(`✅ ${fruits.length} fruits scrapés avec succès`);
    } catch (error) {
      console.error('❌ Erreur lors du scraping des fruits:', error);
      throw error;
    }
  }

  /**
   * Scrape uniquement les légumes
   */
  async scrapeVegetables(): Promise<void> {
    try {
      console.log('🥕 Scraping des prix des légumes...');
      
      const vegetables = await this.piloterrService.fetchVegetablesPrices();
      await this.piloterrService.storePrices(vegetables);
      
      console.log(`✅ ${vegetables.length} légumes scrapés avec succès`);
    } catch (error) {
      console.error('❌ Erreur lors du scraping des légumes:', error);
      throw error;
    }
  }

  /**
   * Recherche et scrape un produit spécifique
   */
  async scrapeSpecificProduct(productName: string): Promise<void> {
    try {
      console.log(`🔍 Recherche du produit: ${productName}`);
      
      const products = await this.piloterrService.searchProduct(productName);
      await this.piloterrService.storePrices(products);
      
      console.log(`✅ ${products.length} résultats trouvés et stockés pour "${productName}"`);
    } catch (error) {
      console.error('❌ Erreur lors de la recherche du produit:', error);
      throw error;
    }
  }

  /**
   * Affiche les statistiques des prix stockés
   */
  async showStatistics(): Promise<void> {
    try {
      console.log('📊 Statistiques des prix stockés...');
      
      const allPrices = await this.piloterrService.getStoredPrices();
      const fruits = await this.piloterrService.getStoredPrices('fruits');
      const vegetables = await this.piloterrService.getStoredPrices('vegetables');
      
      console.log(`📈 Total des prix stockés: ${allPrices.length}`);
      console.log(`🍎 Fruits: ${fruits.length}`);
      console.log(`🥕 Légumes: ${vegetables.length}`);
      
      if (allPrices.length > 0) {
        const avgPrice = allPrices.reduce((sum, item) => sum + item.price, 0) / allPrices.length;
        console.log(`💰 Prix moyen: ${avgPrice.toFixed(2)} EUR`);
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'affichage des statistiques:', error);
      throw error;
    }
  }
}

/**
 * Fonction utilitaire pour lancer le scraping depuis la ligne de commande
 */
export async function runPriceScraping(apiKey: string, options: {
  fruits?: boolean;
  vegetables?: boolean;
  specific?: string;
  full?: boolean;
  stats?: boolean;
}): Promise<void> {
  const scraper = new PriceScraper(apiKey);

  try {
    if (options.stats) {
      await scraper.showStatistics();
      return;
    }

    if (options.full) {
      await scraper.runFullScraping();
      return;
    }

    if (options.fruits) {
      await scraper.scrapeFruits();
    }

    if (options.vegetables) {
      await scraper.scrapeVegetables();
    }

    if (options.specific) {
      await scraper.scrapeSpecificProduct(options.specific);
    }

    // Si aucune option n'est spécifiée, lancer le scraping complet
    if (!options.fruits && !options.vegetables && !options.specific) {
      await scraper.runFullScraping();
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution du scraping:', error);
    process.exit(1);
  }
}
