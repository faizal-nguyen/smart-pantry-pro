Bug-fixing.md

Imposible de lancer le script de recipe seeding.

🚀 Starting recipe seeding process...
seeding-orchestrator.ts:204 📊 [scraping] 0/50 - Démarrage du scraping Kannamma Cooks...
kannamma-scraper.ts:142 🚀 Starting Kannamma Phase 1 scraping (50 recipes)...
kannamma-scraper.ts:146 
📂 Processing category: petit-déjeuner
kannamma-scraper.ts:74 🔍 Scraping category: https://www.kannammacooks.com/breakfast/
kannamma-scraper.ts:77 
 POST http://localhost:3000/api/scrape-category net::ERR_ABORTED 404 (Not Found)
kannamma-scraper.ts:91 ❌ Error scraping category https://www.kannammacooks.com/breakfast/: Error: Failed to scrape category: 404
    at KannammaScraperService.scrapeCategoryLinks (kannamma-scraper.ts:84:15)
    at async KannammaScraperService.scrapePhase1Recipes (kannamma-scraper.ts:149:27)
    at async RecipeSeedingOrchestrator.seedRecipes (seeding-orchestrator.ts:43:30)
    at async startSeeding (RecipeSeeding.tsx:29:29)
kannamma-scraper.ts:150 📋 Found 0 recipes in breakfast
kannamma-scraper.ts:146 
📂 Processing category: soupes-et-rasam
kannamma-scraper.ts:74 🔍 Scraping category: https://www.kannammacooks.com/soups-and-rasam/
kannamma-scraper.ts:77 
 POST http://localhost:3000/api/scrape-category net::ERR_ABORTED 404 (Not Found)
kannamma-scraper.ts:91 ❌ Error scraping category https://www.kannammacooks.com/soups-and-rasam/: Error: Failed to scrape category: 404
    at KannammaScraperService.scrapeCategoryLinks (kannamma-scraper.ts:84:15)
    at async KannammaScraperService.scrapePhase1Recipes (kannamma-scraper.ts:149:27)
    at async RecipeSeedingOrchestrator.seedRecipes (seeding-orchestrator.ts:43:30)
    at async startSeeding (RecipeSeeding.tsx:29:29)
kannamma-scraper.ts:150 📋 Found 0 recipes in soups
kannamma-scraper.ts:146 
📂 Processing category: plats-principaux
kannamma-scraper.ts:74 🔍 Scraping category: https://www.kannammacooks.com/rice-roti-and-biryani/
kannamma-scraper.ts:77 
 POST http://localhost:3000/api/scrape-category net::ERR_ABORTED 404 (Not Found)
kannamma-scraper.ts:91 ❌ Error scraping category https://www.kannammacooks.com/rice-roti-and-biryani/: Error: Failed to scrape category: 404
    at KannammaScraperService.scrapeCategoryLinks (kannamma-scraper.ts:84:15)
    at async KannammaScraperService.scrapePhase1Recipes (kannamma-scraper.ts:149:27)
    at async RecipeSeedingOrchestrator.seedRecipes (seeding-orchestrator.ts:43:30)
    at async startSeeding (RecipeSeeding.tsx:29:29)
kannamma-scraper.ts:150 📋 Found 0 recipes in mains
kannamma-scraper.ts:146 
📂 Processing category: currys-et-dal
kannamma-scraper.ts:74 🔍 Scraping category: https://www.kannammacooks.com/gravy-kuzhambu-dal/
kannamma-scraper.ts:77 
 POST http://localhost:3000/api/scrape-category net::ERR_ABORTED 404 (Not Found)
kannamma-scraper.ts:91 ❌ Error scraping category https://www.kannammacooks.com/gravy-kuzhambu-dal/: Error: Failed to scrape category: 404
    at KannammaScraperService.scrapeCategoryLinks (kannamma-scraper.ts:84:15)
    at async KannammaScraperService.scrapePhase1Recipes (kannamma-scraper.ts:149:27)
    at async RecipeSeedingOrchestrator.seedRecipes (seeding-orchestrator.ts:43:30)
    at async startSeeding (RecipeSeeding.tsx:29:29)
kannamma-scraper.ts:150 📋 Found 0 recipes in curries
kannamma-scraper.ts:146 
📂 Processing category: desserts
kannamma-scraper.ts:74 🔍 Scraping category: https://www.kannammacooks.com/category/recipes/desserts/
kannamma-scraper.ts:77 
 POST http://localhost:3000/api/scrape-category net::ERR_ABORTED 404 (Not Found)
scrapeCategoryLinks	@	kannamma-scraper.ts:77
scrapePhase1Recipes	@	kannamma-scraper.ts:149
await in scrapePhase1Recipes		
seedRecipes	@	seeding-orchestrator.ts:43
startSeeding	@	RecipeSeeding.tsx:29
kannamma-scraper.ts:91 ❌ Error scraping category https://www.kannammacooks.com/category/recipes/desserts/: Error: Failed to scrape category: 404
    at KannammaScraperService.scrapeCategoryLinks (kannamma-scraper.ts:84:15)
    at async KannammaScraperService.scrapePhase1Recipes (kannamma-scraper.ts:149:27)
    at async RecipeSeedingOrchestrator.seedRecipes (seeding-orchestrator.ts:43:30)
    at async startSeeding (RecipeSeeding.tsx:29:29)
kannamma-scraper.ts:150 📋 Found 0 recipes in desserts
kannamma-scraper.ts:196 
📊 Scraping completed!
kannamma-scraper.ts:197 ✅ Success rate: NaN%
kannamma-scraper.ts:198 💰 Total cost: €0.00
kannamma-scraper.ts:199 📚 Total recipes: 0
seeding-orchestrator.ts:112 ❌ Erreur fatale: Error: Aucune recette n'a pu être extraite
    at RecipeSeedingOrchestrator.seedRecipes (seeding-orchestrator.ts:47:15)
    at async startSeeding (RecipeSeeding.tsx:29:29)
seedRecipes	@	seeding-orchestrator.ts:112
await in seedRecipes		
startSeeding	@	RecipeSeeding.tsx:29
