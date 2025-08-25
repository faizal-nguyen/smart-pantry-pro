#!/usr/bin/env node

/**
 * Scraper Carrefour V2 - Version améliorée avec sélecteurs mis à jour
 * Récupère les prix des fruits et légumes
 */

const puppeteer = require('puppeteer');

class CarrefourScraperV2 {
  constructor() {
    this.browser = null;
    this.page = null;
    this.products = [];
  }

  async init() {
    console.log('🚀 Initialisation du navigateur...');
    this.browser = await puppeteer.launch({
      headless: false, // Pour voir ce qui se passe
      defaultViewport: { width: 1920, height: 1080 },
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

    this.page = await this.browser.newPage();
    
    // Configuration du user agent
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Intercepter les requêtes pour éviter les blocages
    await this.page.setRequestInterception(true);
    this.page.on('request', (req) => {
      if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log('✅ Navigateur initialisé');
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Navigateur fermé');
    }
  }

  async scrapeProducts(url, category) {
    console.log(`🔍 Scraping ${category} sur: ${url}`);
    
    try {
      await this.page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Attendre que la page soit chargée
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Accepter les cookies si nécessaire
      try {
        const cookieButton = await this.page.$('[data-testid="cookie-banner-accept"]');
        if (cookieButton) {
          await cookieButton.click();
          console.log('🍪 Cookies acceptés');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (e) {
        console.log('ℹ️ Pas de bannière de cookies trouvée');
      }

      // Essayer différents sélecteurs pour les produits
      const selectors = [
        '[data-testid*="product"]',
        '.product-card',
        '.product-item',
        '.product',
        '[class*="product"]',
        '[class*="card"]',
        'article',
        '.item'
      ];

      let products = [];
      let selectorUsed = null;

      for (const selector of selectors) {
        try {
          console.log(`🔍 Test du sélecteur: ${selector}`);
          
          // Attendre que les éléments soient présents
          await this.page.waitForSelector(selector, { timeout: 5000 });
          
          // Récupérer les produits
          products = await this.page.evaluate((sel, cat) => {
            const elements = document.querySelectorAll(sel);
            console.log(`Trouvé ${elements.length} éléments avec ${sel}`);
            
            return Array.from(elements).map((el, index) => {
              // Essayer de récupérer le nom
              const nameSelectors = [
                '[data-testid*="name"]',
                '.product-name',
                '.name',
                'h1', 'h2', 'h3', 'h4',
                '[class*="name"]',
                '[class*="title"]'
              ];
              
              let name = '';
              for (const nameSel of nameSelectors) {
                const nameEl = el.querySelector(nameSel);
                if (nameEl && nameEl.textContent.trim()) {
                  name = nameEl.textContent.trim();
                  break;
                }
              }
              
              // Essayer de récupérer le prix
              const priceSelectors = [
                '[data-testid*="price"]',
                '.price',
                '[class*="price"]',
                '[class*="cost"]',
                '.amount',
                '.value'
              ];
              
              let price = '';
              for (const priceSel of priceSelectors) {
                const priceEl = el.querySelector(priceSel);
                if (priceEl && priceEl.textContent.trim()) {
                  price = priceEl.textContent.trim();
                  break;
                }
              }
              
              // Essayer de récupérer l'image
              const imgEl = el.querySelector('img');
              const image = imgEl ? imgEl.src : '';
              
              // Essayer de récupérer le lien
              const linkEl = el.querySelector('a');
              const link = linkEl ? linkEl.href : '';
              
              return {
                id: `carrefour_${cat}_${index}_${Date.now()}`,
                name: name || `Produit ${index + 1}`,
                price: price,
                category: cat,
                image: image,
                link: link,
                rawHtml: el.outerHTML.substring(0, 200) // Pour debug
              };
            }).filter(p => p.name && p.name !== `Produit ${index + 1}`);
          }, selector, category);
          
          if (products.length > 0) {
            selectorUsed = selector;
            console.log(`✅ Trouvé ${products.length} produits avec ${selector}`);
            break;
          }
          
        } catch (e) {
          console.log(`❌ Sélecteur ${selector} échoué: ${e.message}`);
          continue;
        }
      }

      if (products.length === 0) {
        // Capture d'écran pour debug
        await this.page.screenshot({ 
          path: `debug-carrefour-${category}-${Date.now()}.png`,
          fullPage: true 
        });
        console.log(`📸 Capture d'écran sauvegardée pour debug`);
        
        // Analyser la structure de la page
        const pageStructure = await this.page.evaluate(() => {
          const allElements = document.querySelectorAll('*');
          const elementCounts = {};
          
          allElements.forEach(el => {
            const tag = el.tagName.toLowerCase();
            const className = el.className;
            const id = el.id;
            const testId = el.getAttribute('data-testid');
            
            if (className) {
              elementCounts[`class:${className.split(' ')[0]}`] = (elementCounts[`class:${className.split(' ')[0]}`] || 0) + 1;
            }
            if (id) {
              elementCounts[`id:${id}`] = (elementCounts[`id:${id}`] || 0) + 1;
            }
            if (testId) {
              elementCounts[`testid:${testId}`] = (elementCounts[`testid:${testId}`] || 0) + 1;
            }
          });
          
          return Object.entries(elementCounts)
            .filter(([key, count]) => count > 1)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);
        });
        
        console.log('🔍 Structure de la page:');
        pageStructure.forEach(([selector, count]) => {
          console.log(`  ${selector}: ${count} éléments`);
        });
      }

      return products;
      
    } catch (error) {
      console.error(`❌ Erreur lors du scraping de ${category}:`, error.message);
      return [];
    }
  }

  async scrapeFruits() {
    const url = 'https://www.carrefour.fr/fruits-et-legumes/fruits';
    return await this.scrapeProducts(url, 'fruits');
  }

  async scrapeVegetables() {
    const url = 'https://www.carrefour.fr/fruits-et-legumes/legumes';
    return await this.scrapeProducts(url, 'vegetables');
  }

  async scrapeAll() {
    console.log('🚀 Début du scraping complet...');
    
    try {
      await this.init();
      
      // Scraper les fruits
      console.log('\n🍎 Scraping des fruits...');
      const fruits = await this.scrapeFruits();
      console.log(`✅ ${fruits.length} fruits trouvés`);
      
      // Attendre un peu entre les requêtes
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Scraper les légumes
      console.log('\n🥬 Scraping des légumes...');
      const vegetables = await this.scrapeVegetables();
      console.log(`✅ ${vegetables.length} légumes trouvés`);
      
      // Combiner tous les produits
      this.products = [...fruits, ...vegetables];
      
      console.log(`\n📊 Total: ${this.products.length} produits récupérés`);
      
      // Afficher quelques exemples
      this.products.slice(0, 5).forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.name} - ${product.price} (${product.category})`);
      });
      
      return this.products;
      
    } catch (error) {
      console.error('❌ Erreur lors du scraping complet:', error.message);
      return [];
    } finally {
      await this.close();
    }
  }

  transformData(products) {
    return products.map(product => {
      // Nettoyer le prix
      let price = 0;
      if (product.price) {
        const priceStr = product.price.toString().replace(/[^\d,.]/g, '').replace(',', '.');
        price = parseFloat(priceStr) || 0;
      }

      // Nettoyer le nom
      let name = product.name.toString().trim();

      // Déterminer l'unité
      let unit = 'kg';
      if (name.toLowerCase().includes('kg') || name.toLowerCase().includes('kilo')) {
        unit = 'kg';
      } else if (name.toLowerCase().includes('g') || name.toLowerCase().includes('gramme')) {
        unit = 'g';
      } else if (name.toLowerCase().includes('pièce') || name.toLowerCase().includes('unité')) {
        unit = 'piece';
      }

      return {
        id: product.id,
        name: name,
        category: product.category,
        unit: unit,
        price: price,
        currency: 'EUR',
        location: 'France',
        date: new Date().toISOString().split('T')[0],
        source: 'carrefour',
        url: product.link,
        image: product.image
      };
    }).filter(item => item.name && item.price > 0);
  }
}

async function main() {
  console.log('🚀 Scraper Carrefour V2 - Récupération des prix');
  console.log('=' .repeat(60));

  const scraper = new CarrefourScraperV2();
  
  try {
    const products = await scraper.scrapeAll();
    
    if (products.length > 0) {
      console.log('\n🔄 Transformation des données...');
      const transformedProducts = scraper.transformData(products);
      
      console.log(`\n✅ ${transformedProducts.length} produits transformés`);
      
      // Afficher les résultats
      transformedProducts.slice(0, 10).forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.name} - ${product.price}€/${product.unit} (${product.category})`);
      });
      
      // Sauvegarder dans un fichier JSON
      const fs = require('fs');
      const filename = `carrefour-prices-${Date.now()}.json`;
      fs.writeFileSync(filename, JSON.stringify(transformedProducts, null, 2));
      console.log(`\n💾 Données sauvegardées dans: ${filename}`);
      
      return transformedProducts;
    } else {
      console.log('❌ Aucun produit récupéré');
      return [];
    }
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    return [];
  }
}

// Lancer le scraping
if (require.main === module) {
  main();
}

module.exports = { CarrefourScraperV2 };
