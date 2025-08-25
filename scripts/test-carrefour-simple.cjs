#!/usr/bin/env node

/**
 * Script de test simple pour le scraper Carrefour
 */

const puppeteer = require('puppeteer');

class SimpleCarrefourScraper {
  constructor() {
    this.browser = null;
  }

  async initialize() {
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

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeFruits() {
    console.log('🍎 Scraping des fruits sur Carrefour...');
    
    const startTime = Date.now();
    await this.initialize();
    
    try {
      const page = await this.browser.newPage();
      
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
        
        let items = [];
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
          
          let name = '';
          let price = '';
          
          for (const selector of nameSelectors) {
            const element = item.querySelector(selector);
            if (element && element.textContent && element.textContent.trim()) {
              name = element.textContent.trim();
              break;
            }
          }
          
          for (const selector of priceSelectors) {
            const element = item.querySelector(selector);
            if (element && element.textContent && element.textContent.trim()) {
              price = element.textContent.trim();
              break;
            }
          }
          
          return { name, price };
        }).filter(item => item.name && item.price);
      });
      
      await page.close();
      
      const duration = Date.now() - startTime;
      console.log(`✅ ${products.length} fruits scrapés en ${duration}ms`);
      
      return products;
      
    } catch (error) {
      console.error('❌ Erreur lors du scraping des fruits:', error);
      throw error;
    }
  }

  async scrapeVegetables() {
    console.log('🥕 Scraping des légumes sur Carrefour...');
    
    const startTime = Date.now();
    await this.initialize();
    
    try {
      const page = await this.browser.newPage();
      
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
      
      // Extraire les données des produits
      const products = await page.evaluate(() => {
        const selectors = [
          '.product-card',
          '.product-item',
          '[data-testid*="product"]',
          '.product',
          '.item'
        ];
        
        let items = [];
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
          
          let name = '';
          let price = '';
          
          for (const selector of nameSelectors) {
            const element = item.querySelector(selector);
            if (element && element.textContent && element.textContent.trim()) {
              name = element.textContent.trim();
              break;
            }
          }
          
          for (const selector of priceSelectors) {
            const element = item.querySelector(selector);
            if (element && element.textContent && element.textContent.trim()) {
              price = element.textContent.trim();
              break;
            }
          }
          
          return { name, price };
        }).filter(item => item.name && item.price);
      });
      
      await page.close();
      
      const duration = Date.now() - startTime;
      console.log(`✅ ${products.length} légumes scrapés en ${duration}ms`);
      
      return products;
      
    } catch (error) {
      console.error('❌ Erreur lors du scraping des légumes:', error);
      throw error;
    }
  }
}

async function main() {
  console.log('🚀 Test simple du scraper Carrefour');
  console.log('=' .repeat(50));

  const scraper = new SimpleCarrefourScraper();

  try {
    // Test des fruits
    console.log('\n🍎 Test des fruits...');
    const fruits = await scraper.scrapeFruits();
    
    if (fruits.length > 0) {
      console.log('📋 Exemples de fruits:');
      fruits.slice(0, 5).forEach(fruit => {
        console.log(`  - ${fruit.name}: ${fruit.price}`);
      });
    }

    // Test des légumes
    console.log('\n🥕 Test des légumes...');
    const vegetables = await scraper.scrapeVegetables();
    
    if (vegetables.length > 0) {
      console.log('📋 Exemples de légumes:');
      vegetables.slice(0, 5).forEach(vegetable => {
        console.log(`  - ${vegetable.name}: ${vegetable.price}`);
      });
    }

    console.log('\n✅ Tests terminés avec succès!');
    console.log(`📊 Total: ${fruits.length} fruits + ${vegetables.length} légumes`);

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.message);
  } finally {
    await scraper.close();
  }
}

// Lancer les tests
if (require.main === module) {
  main();
}
