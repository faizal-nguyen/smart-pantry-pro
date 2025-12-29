import puppeteer from 'puppeteer';

// Types pour les données de prix
export interface CarrefourProduct {
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

export interface ScrapingResult {
  success: boolean;
  products: CarrefourProduct[];
  error?: string;
  stats: {
    total: number;
    fruits: number;
    vegetables: number;
    duration: number;
  };
}

class CarrefourScraper {
  private browser: puppeteer.Browser | null = null;

  /**
   * Initialise le navigateur Puppeteer
   */
  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }
  }

  /**
   * Ferme le navigateur
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Scrape les fruits depuis Carrefour
   */
  async scrapeFruits(): Promise<CarrefourProduct[]> {
    console.log('🍎 Scraping des fruits sur Carrefour...');
    
    const startTime = Date.now();
    await this.initialize();
    
    try {
      const page = await this.browser!.newPage();
      
      // Configuration de la page
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navigation vers la page des fruits
      await page.goto('https://www.carrefour.fr/fruits-et-legumes/fruits', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Attendre que les produits se chargent
      await page.waitForSelector('.product-card, .product-item, [data-testid*="product"]', { timeout: 10000 });
      
      // Extraire les données des produits
      const products = await page.evaluate(() => {
        const selectors = [
          '.product-card',
          '.product-item',
          '[data-testid*="product"]',
          '.product',
          '.item'
        ];
        
        let items: Element[] = [];
        for (const selector of selectors) {
          const found = document.querySelectorAll(selector);
          if (found.length > 0) {
            items = Array.from(found);
            break;
          }
        }
        
        return items.map((item, index) => {
          // Sélecteurs pour le nom
          const nameSelectors = [
            '.product-name',
            '.product-title',
            '.name',
            'h1', 'h2', 'h3', 'h4',
            '[data-testid*="name"]',
            '.title'
          ];
          
          // Sélecteurs pour le prix
          const priceSelectors = [
            '.price',
            '.product-price',
            '[data-price]',
            '.cost',
            '[data-testid*="price"]'
          ];
          
          // Sélecteurs pour l'unité
          const unitSelectors = [
            '.unit',
            '.product-unit',
            '.weight',
            '.quantity',
            '[data-testid*="unit"]'
          ];
          
          // Sélecteurs pour l'image
          const imageSelectors = [
            'img[src*="product"]',
            'img[alt*="product"]',
            '.product-image img',
            'img'
          ];
          
          let name = '';
          let price = '';
          let unit = '';
          let image = '';
          
          // Extraire le nom
          for (const selector of nameSelectors) {
            const element = item.querySelector(selector);
            if (element && element.textContent?.trim()) {
              name = element.textContent.trim();
              break;
            }
          }
          
          // Extraire le prix
          for (const selector of priceSelectors) {
            const element = item.querySelector(selector);
            if (element && element.textContent?.trim()) {
              price = element.textContent.trim();
              break;
            }
          }
          
          // Extraire l'unité
          for (const selector of unitSelectors) {
            const element = item.querySelector(selector);
            if (element && element.textContent?.trim()) {
              unit = element.textContent.trim();
              break;
            }
          }
          
          // Extraire l'image
          for (const selector of imageSelectors) {
            const element = item.querySelector(selector) as HTMLImageElement;
            if (element && element.src) {
              image = element.src;
              break;
            }
          }
          
          return {
            name,
            price,
            unit,
            image,
            url: item.querySelector('a')?.href || ''
          };
        }).filter(item => item.name && item.price);
      });
      
      await page.close();
      
      // Transformer les données
      const transformedProducts = this.transformProducts(products, 'fruits');
      
      const duration = Date.now() - startTime;
      console.log(`✅ ${transformedProducts.length} fruits scrapés en ${duration}ms`);
      
      return transformedProducts;
      
    } catch (error) {
      console.error('❌ Erreur lors du scraping des fruits:', error);
      throw error;
    }
  }

  /**
   * Scrape les légumes depuis Carrefour
   */
  async scrapeVegetables(): Promise<CarrefourProduct[]> {
    console.log('🥕 Scraping des légumes sur Carrefour...');
    
    const startTime = Date.now();
    await this.initialize();
    
    try {
      const page = await this.browser!.newPage();
      
      // Configuration de la page
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navigation vers la page des légumes
      await page.goto('https://www.carrefour.fr/fruits-et-legumes/legumes', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Attendre que les produits se chargent
      await page.waitForSelector('.product-card, .product-item, [data-testid*="product"]', { timeout: 10000 });
      
      // Extraire les données des produits (même logique que pour les fruits)
      const products = await page.evaluate(() => {
        const selectors = [
          '.product-card',
          '.product-item',
          '[data-testid*="product"]',
          '.product',
          '.item'
        ];
        
        let items: Element[] = [];
        for (const selector of selectors) {
          const found = document.querySelectorAll(selector);
          if (found.length > 0) {
            items = Array.from(found);
            break;
          }
        }
        
        return items.map((item, index) => {
          const nameSelectors = [
            '.product-name',
            '.product-title',
            '.name',
            'h1', 'h2', 'h3', 'h4',
            '[data-testid*="name"]',
            '.title'
          ];
          
          const priceSelectors = [
            '.price',
            '.product-price',
            '[data-price]',
            '.cost',
            '[data-testid*="price"]'
          ];
          
          const unitSelectors = [
            '.unit',
            '.product-unit',
            '.weight',
            '.quantity',
            '[data-testid*="unit"]'
          ];
          
          const imageSelectors = [
            'img[src*="product"]',
            'img[alt*="product"]',
            '.product-image img',
            'img'
          ];
          
          let name = '';
          let price = '';
          let unit = '';
          let image = '';
          
          for (const selector of nameSelectors) {
            const element = item.querySelector(selector);
            if (element && element.textContent?.trim()) {
              name = element.textContent.trim();
              break;
            }
          }
          
          for (const selector of priceSelectors) {
            const element = item.querySelector(selector);
            if (element && element.textContent?.trim()) {
              price = element.textContent.trim();
              break;
            }
          }
          
          for (const selector of unitSelectors) {
            const element = item.querySelector(selector);
            if (element && element.textContent?.trim()) {
              unit = element.textContent.trim();
              break;
            }
          }
          
          for (const selector of imageSelectors) {
            const element = item.querySelector(selector) as HTMLImageElement;
            if (element && element.src) {
              image = element.src;
              break;
            }
          }
          
          return {
            name,
            price,
            unit,
            image,
            url: item.querySelector('a')?.href || ''
          };
        }).filter(item => item.name && item.price);
      });
      
      await page.close();
      
      // Transformer les données
      const transformedProducts = this.transformProducts(products, 'vegetables');
      
      const duration = Date.now() - startTime;
      console.log(`✅ ${transformedProducts.length} légumes scrapés en ${duration}ms`);
      
      return transformedProducts;
      
    } catch (error) {
      console.error('❌ Erreur lors du scraping des légumes:', error);
      throw error;
    }
  }

  /**
   * Scrape tous les produits (fruits + légumes)
   */
  async scrapeAll(): Promise<ScrapingResult> {
    console.log('🚀 Démarrage du scraping complet Carrefour...');
    
    const startTime = Date.now();
    
    try {
      const fruits = await this.scrapeFruits();
      const vegetables = await this.scrapeVegetables();
      
      const allProducts = [...fruits, ...vegetables];
      
      const result: ScrapingResult = {
        success: true,
        products: allProducts,
        stats: {
          total: allProducts.length,
          fruits: fruits.length,
          vegetables: vegetables.length,
          duration: Date.now() - startTime
        }
      };
      
      console.log(`✅ Scraping terminé: ${result.stats.total} produits (${result.stats.fruits} fruits, ${result.stats.vegetables} légumes) en ${result.stats.duration}ms`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Erreur lors du scraping complet:', error);
      
      return {
        success: false,
        products: [],
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        stats: {
          total: 0,
          fruits: 0,
          vegetables: 0,
          duration: Date.now() - startTime
        }
      };
    } finally {
      await this.close();
    }
  }

  /**
   * Transforme les données brutes en format standardisé
   */
  private transformProducts(rawProducts: any[], category: string): CarrefourProduct[] {
    return rawProducts.map((item, index) => {
      // Nettoyer et extraire le prix
      let price = 0;
      if (item.price) {
        const priceStr = item.price.toString().replace(/[^\d,.]/g, '').replace(',', '.');
        price = parseFloat(priceStr) || 0;
      }

      // Nettoyer le nom
      let name = item.name || `Produit ${index + 1}`;
      name = name.toString().trim();

      // Déterminer l'unité
      let unit = item.unit || 'kg';
      if (name.toLowerCase().includes('kg') || name.toLowerCase().includes('kilo')) {
        unit = 'kg';
      } else if (name.toLowerCase().includes('g') || name.toLowerCase().includes('gramme')) {
        unit = 'g';
      } else if (name.toLowerCase().includes('pièce') || name.toLowerCase().includes('unité')) {
        unit = 'piece';
      }

      return {
        id: `carrefour_${category}_${index}_${Date.now()}`,
        name: name,
        category: category,
        unit: unit,
        price: price,
        currency: 'EUR',
        location: 'France',
        date: new Date().toISOString().split('T')[0], // Format YYYY-MM-DD
        source: 'carrefour',
        url: item.url,
        image: item.image
      };
    }).filter(item => item.name && item.price > 0); // Filtrer les produits valides
  }
}

export default CarrefourScraper;
