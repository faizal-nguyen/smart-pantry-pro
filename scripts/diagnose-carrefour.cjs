#!/usr/bin/env node

/**
 * Script de diagnostic pour analyser la structure de la page Carrefour
 */

const puppeteer = require('puppeteer');

class CarrefourDiagnostic {
  constructor() {
    this.browser = null;
  }

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: false, // Mode visible pour debug
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
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

  async diagnosePage(url, pageName) {
    console.log(`🔍 Diagnostic de ${pageName}: ${url}`);
    
    await this.initialize();
    
    try {
      const page = await this.browser.newPage();
      
      // Configuration de la page
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navigation
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Attendre un peu pour que la page se charge
      await page.waitForTimeout(5000);
      
      // Analyser la structure de la page
      const analysis = await page.evaluate(() => {
        const results = {
          title: document.title,
          url: window.location.href,
          selectors: {},
          products: [],
          errors: []
        };
        
        // Chercher des éléments de produits
        const possibleSelectors = [
          '.product-card',
          '.product-item',
          '[data-testid*="product"]',
          '.product',
          '.item',
          '.card',
          '.article',
          '[class*="product"]',
          '[class*="item"]',
          '[class*="card"]'
        ];
        
        possibleSelectors.forEach(selector => {
          try {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              results.selectors[selector] = elements.length;
            }
          } catch (e) {
            results.errors.push(`Erreur avec le sélecteur ${selector}: ${e.message}`);
          }
        });
        
        // Chercher des éléments avec des prix
        const priceSelectors = [
          '[class*="price"]',
          '[class*="cost"]',
          '[data-price]',
          '.price',
          '.cost',
          '.prix'
        ];
        
        priceSelectors.forEach(selector => {
          try {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              results.selectors[`price_${selector}`] = elements.length;
            }
          } catch (e) {
            results.errors.push(`Erreur avec le sélecteur de prix ${selector}: ${e.message}`);
          }
        });
        
        // Chercher des éléments avec des noms
        const nameSelectors = [
          '[class*="name"]',
          '[class*="title"]',
          '.name',
          '.title',
          'h1', 'h2', 'h3', 'h4'
        ];
        
        nameSelectors.forEach(selector => {
          try {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              results.selectors[`name_${selector}`] = elements.length;
            }
          } catch (e) {
            results.errors.push(`Erreur avec le sélecteur de nom ${selector}: ${e.message}`);
          }
        });
        
        // Essayer d'extraire quelques produits
        const allElements = document.querySelectorAll('*');
        const productCandidates = [];
        
        for (let i = 0; i < Math.min(allElements.length, 100); i++) {
          const element = allElements[i];
          const text = element.textContent?.trim();
          
          if (text && text.length > 5 && text.length < 100) {
            // Chercher des patterns de prix
            const priceMatch = text.match(/(\d+[,.]?\d*)\s*€/);
            if (priceMatch) {
              productCandidates.push({
                text: text,
                tagName: element.tagName,
                className: element.className,
                id: element.id
              });
            }
          }
        }
        
        results.products = productCandidates.slice(0, 10);
        
        return results;
      });
      
      console.log(`📊 Analyse de ${pageName}:`);
      console.log(`  - Titre: ${analysis.title}`);
      console.log(`  - URL: ${analysis.url}`);
      console.log(`  - Sélecteurs trouvés:`);
      
      Object.entries(analysis.selectors).forEach(([selector, count]) => {
        console.log(`    - ${selector}: ${count} éléments`);
      });
      
      if (analysis.products.length > 0) {
        console.log(`  - Candidats produits:`);
        analysis.products.forEach((product, index) => {
          console.log(`    ${index + 1}. "${product.text}" (${product.tagName}.${product.className})`);
        });
      }
      
      if (analysis.errors.length > 0) {
        console.log(`  - Erreurs:`);
        analysis.errors.forEach(error => {
          console.log(`    - ${error}`);
        });
      }
      
      // Prendre une capture d'écran
      await page.screenshot({ 
        path: `carrefour-${pageName.toLowerCase()}.png`,
        fullPage: true 
      });
      console.log(`  - Capture d'écran sauvegardée: carrefour-${pageName.toLowerCase()}.png`);
      
      await page.close();
      
      return analysis;
      
    } catch (error) {
      console.error(`❌ Erreur lors du diagnostic de ${pageName}:`, error.message);
      return null;
    }
  }
}

async function main() {
  console.log('🚀 Diagnostic de la structure Carrefour');
  console.log('=' .repeat(50));

  const diagnostic = new CarrefourDiagnostic();

  try {
    // Diagnostic de la page d'accueil
    await diagnostic.diagnosePage('https://www.carrefour.fr', 'Accueil');
    
    // Diagnostic de la page fruits
    await diagnostic.diagnosePage('https://www.carrefour.fr/fruits-et-legumes/fruits', 'Fruits');
    
    // Diagnostic de la page légumes
    await diagnostic.diagnosePage('https://www.carrefour.fr/fruits-et-legumes/legumes', 'Légumes');
    
    console.log('\n✅ Diagnostic terminé');
    console.log('💡 Vérifiez les captures d\'écran pour analyser la structure');

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error.message);
  } finally {
    await diagnostic.close();
  }
}

// Lancer le diagnostic
if (require.main === module) {
  main();
}
