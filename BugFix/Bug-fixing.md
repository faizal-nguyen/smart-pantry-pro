Bug-fixing.md

Echec lors du script de recipe seeding.
🚀 Starting recipe seeding process...
seeding-orchestrator.ts:204 📊 [scraping] 0/50 - Démarrage du scraping Kannamma Cooks...
kannamma-scraper.ts:147 🚀 Starting Kannamma Phase 1 scraping (50 recipes)...
kannamma-scraper.ts:151 
📂 Processing category: petit-déjeuner
kannamma-scraper.ts:79 🔍 Scraping category: https://www.kannammacooks.com/breakfast/
kannamma-scraper.ts:155 📋 Found 1 recipes in breakfast
kannamma-scraper.ts:104 🤖 Extracting batch of 1 recipes...
kannamma-scraper.ts:108 💰 Estimated cost: €0.003
@supabase_supabase-js.js?v=16e1fc8b:3930  POST https://jwoxacnflphclslpqfzs.supabase.co/rest/v1/api_usage_tracking 403 (Forbidden)
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3930
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3951
fulfilled @ @supabase_supabase-js.js?v=16e1fc8b:3903
Promise.then
step @ @supabase_supabase-js.js?v=16e1fc8b:3916
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3918
__awaiter6 @ @supabase_supabase-js.js?v=16e1fc8b:3900
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3941
then @ @supabase_supabase-js.js?v=16e1fc8b:89Comprendre cette erreur
kannamma-scraper.ts:180 ✅ Processed 0/50 recipes
kannamma-scraper.ts:151 
📂 Processing category: soupes-et-rasam
kannamma-scraper.ts:79 🔍 Scraping category: https://www.kannammacooks.com/soups-and-rasam/
kannamma-scraper.ts:155 📋 Found 1 recipes in soups
kannamma-scraper.ts:104 🤖 Extracting batch of 1 recipes...
kannamma-scraper.ts:108 💰 Estimated cost: €0.003
@supabase_supabase-js.js?v=16e1fc8b:3930  POST https://jwoxacnflphclslpqfzs.supabase.co/rest/v1/api_usage_tracking 403 (Forbidden)
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3930
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3951
fulfilled @ @supabase_supabase-js.js?v=16e1fc8b:3903
Promise.then
step @ @supabase_supabase-js.js?v=16e1fc8b:3916
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3918
__awaiter6 @ @supabase_supabase-js.js?v=16e1fc8b:3900
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3941
then @ @supabase_supabase-js.js?v=16e1fc8b:89Comprendre cette erreur
kannamma-scraper.ts:180 ✅ Processed 1/50 recipes
kannamma-scraper.ts:151 
📂 Processing category: plats-principaux
kannamma-scraper.ts:79 🔍 Scraping category: https://www.kannammacooks.com/rice-roti-and-biryani/
kannamma-scraper.ts:155 📋 Found 1 recipes in mains
kannamma-scraper.ts:104 🤖 Extracting batch of 1 recipes...
kannamma-scraper.ts:108 💰 Estimated cost: €0.003
recipe-seeding:1 Access to fetch at 'https://smart-pantry-pro.vercel.app/api/extract-recipes-batch' from origin 'http://localhost:3000' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.Comprendre cette erreur
kannamma-scraper.ts:111  POST https://smart-pantry-pro.vercel.app/api/extract-recipes-batch net::ERR_FAILED 504 (Gateway Timeout)
extractRecipesBatch @ kannamma-scraper.ts:111
await in extractRecipesBatch
scrapePhase1Recipes @ kannamma-scraper.ts:165
await in scrapePhase1Recipes
seedRecipes @ seeding-orchestrator.ts:43
startSeeding @ RecipeSeeding.tsx:29
callCallback2 @ chunk-276SZO74.js?v=28d19379:3674
invokeGuardedCallbackDev @ chunk-276SZO74.js?v=28d19379:3699
invokeGuardedCallback @ chunk-276SZO74.js?v=28d19379:3733
invokeGuardedCallbackAndCatchFirstError @ chunk-276SZO74.js?v=28d19379:3736
executeDispatch @ chunk-276SZO74.js?v=28d19379:7014
processDispatchQueueItemsInOrder @ chunk-276SZO74.js?v=28d19379:7034
processDispatchQueue @ chunk-276SZO74.js?v=28d19379:7043
dispatchEventsForPlugins @ chunk-276SZO74.js?v=28d19379:7051
(anonyme) @ chunk-276SZO74.js?v=28d19379:7174
batchedUpdates$1 @ chunk-276SZO74.js?v=28d19379:18913
batchedUpdates @ chunk-276SZO74.js?v=28d19379:3579
dispatchEventForPluginEventSystem @ chunk-276SZO74.js?v=28d19379:7173
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-276SZO74.js?v=28d19379:5478
dispatchEvent @ chunk-276SZO74.js?v=28d19379:5472
dispatchDiscreteEvent @ chunk-276SZO74.js?v=28d19379:5449Comprendre cette erreur
kannamma-scraper.ts:131 ❌ Batch extraction error: TypeError: Failed to fetch
    at KannammaScraperService.extractRecipesBatch (kannamma-scraper.ts:111:30)
    at async KannammaScraperService.scrapePhase1Recipes (kannamma-scraper.ts:165:34)
    at async RecipeSeedingOrchestrator.seedRecipes (seeding-orchestrator.ts:43:30)
    at async startSeeding (RecipeSeeding.tsx:29:29)
extractRecipesBatch @ kannamma-scraper.ts:131
await in extractRecipesBatch
scrapePhase1Recipes @ kannamma-scraper.ts:165
await in scrapePhase1Recipes
seedRecipes @ seeding-orchestrator.ts:43
startSeeding @ RecipeSeeding.tsx:29
callCallback2 @ chunk-276SZO74.js?v=28d19379:3674
invokeGuardedCallbackDev @ chunk-276SZO74.js?v=28d19379:3699
invokeGuardedCallback @ chunk-276SZO74.js?v=28d19379:3733
invokeGuardedCallbackAndCatchFirstError @ chunk-276SZO74.js?v=28d19379:3736
executeDispatch @ chunk-276SZO74.js?v=28d19379:7014
processDispatchQueueItemsInOrder @ chunk-276SZO74.js?v=28d19379:7034
processDispatchQueue @ chunk-276SZO74.js?v=28d19379:7043
dispatchEventsForPlugins @ chunk-276SZO74.js?v=28d19379:7051
(anonyme) @ chunk-276SZO74.js?v=28d19379:7174
batchedUpdates$1 @ chunk-276SZO74.js?v=28d19379:18913
batchedUpdates @ chunk-276SZO74.js?v=28d19379:3579
dispatchEventForPluginEventSystem @ chunk-276SZO74.js?v=28d19379:7173
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-276SZO74.js?v=28d19379:5478
dispatchEvent @ chunk-276SZO74.js?v=28d19379:5472
dispatchDiscreteEvent @ chunk-276SZO74.js?v=28d19379:5449Comprendre cette erreur
kannamma-scraper.ts:180 ✅ Processed 1/50 recipes
kannamma-scraper.ts:151 
📂 Processing category: currys-et-dal
kannamma-scraper.ts:79 🔍 Scraping category: https://www.kannammacooks.com/gravy-kuzhambu-dal/
kannamma-scraper.ts:155 📋 Found 1 recipes in curries
kannamma-scraper.ts:104 🤖 Extracting batch of 1 recipes...
kannamma-scraper.ts:108 💰 Estimated cost: €0.003
@supabase_supabase-js.js?v=16e1fc8b:3930  POST https://jwoxacnflphclslpqfzs.supabase.co/rest/v1/api_usage_tracking 403 (Forbidden)
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3930
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3951
fulfilled @ @supabase_supabase-js.js?v=16e1fc8b:3903
Promise.then
step @ @supabase_supabase-js.js?v=16e1fc8b:3916
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3918
__awaiter6 @ @supabase_supabase-js.js?v=16e1fc8b:3900
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3941
then @ @supabase_supabase-js.js?v=16e1fc8b:89Comprendre cette erreur
kannamma-scraper.ts:180 ✅ Processed 2/50 recipes
kannamma-scraper.ts:151 
📂 Processing category: desserts
kannamma-scraper.ts:79 🔍 Scraping category: https://www.kannammacooks.com/category/recipes/desserts/
kannamma-scraper.ts:155 📋 Found 5 recipes in desserts
kannamma-scraper.ts:104 🤖 Extracting batch of 5 recipes...
kannamma-scraper.ts:108 💰 Estimated cost: €0.015
recipe-seeding:1 Access to fetch at 'https://smart-pantry-pro.vercel.app/api/extract-recipes-batch' from origin 'http://localhost:3000' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.Comprendre cette erreur
kannamma-scraper.ts:111  POST https://smart-pantry-pro.vercel.app/api/extract-recipes-batch net::ERR_FAILED 504 (Gateway Timeout)
extractRecipesBatch @ kannamma-scraper.ts:111
await in extractRecipesBatch
scrapePhase1Recipes @ kannamma-scraper.ts:165
await in scrapePhase1Recipes
seedRecipes @ seeding-orchestrator.ts:43
startSeeding @ RecipeSeeding.tsx:29
callCallback2 @ chunk-276SZO74.js?v=28d19379:3674
invokeGuardedCallbackDev @ chunk-276SZO74.js?v=28d19379:3699
invokeGuardedCallback @ chunk-276SZO74.js?v=28d19379:3733
invokeGuardedCallbackAndCatchFirstError @ chunk-276SZO74.js?v=28d19379:3736
executeDispatch @ chunk-276SZO74.js?v=28d19379:7014
processDispatchQueueItemsInOrder @ chunk-276SZO74.js?v=28d19379:7034
processDispatchQueue @ chunk-276SZO74.js?v=28d19379:7043
dispatchEventsForPlugins @ chunk-276SZO74.js?v=28d19379:7051
(anonyme) @ chunk-276SZO74.js?v=28d19379:7174
batchedUpdates$1 @ chunk-276SZO74.js?v=28d19379:18913
batchedUpdates @ chunk-276SZO74.js?v=28d19379:3579
dispatchEventForPluginEventSystem @ chunk-276SZO74.js?v=28d19379:7173
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-276SZO74.js?v=28d19379:5478
dispatchEvent @ chunk-276SZO74.js?v=28d19379:5472
dispatchDiscreteEvent @ chunk-276SZO74.js?v=28d19379:5449Comprendre cette erreur
kannamma-scraper.ts:131 ❌ Batch extraction error: TypeError: Failed to fetch
    at KannammaScraperService.extractRecipesBatch (kannamma-scraper.ts:111:30)
    at async KannammaScraperService.scrapePhase1Recipes (kannamma-scraper.ts:165:34)
    at async RecipeSeedingOrchestrator.seedRecipes (seeding-orchestrator.ts:43:30)
    at async startSeeding (RecipeSeeding.tsx:29:29)
extractRecipesBatch @ kannamma-scraper.ts:131
await in extractRecipesBatch
scrapePhase1Recipes @ kannamma-scraper.ts:165
await in scrapePhase1Recipes
seedRecipes @ seeding-orchestrator.ts:43
startSeeding @ RecipeSeeding.tsx:29
callCallback2 @ chunk-276SZO74.js?v=28d19379:3674
invokeGuardedCallbackDev @ chunk-276SZO74.js?v=28d19379:3699
invokeGuardedCallback @ chunk-276SZO74.js?v=28d19379:3733
invokeGuardedCallbackAndCatchFirstError @ chunk-276SZO74.js?v=28d19379:3736
executeDispatch @ chunk-276SZO74.js?v=28d19379:7014
processDispatchQueueItemsInOrder @ chunk-276SZO74.js?v=28d19379:7034
processDispatchQueue @ chunk-276SZO74.js?v=28d19379:7043
dispatchEventsForPlugins @ chunk-276SZO74.js?v=28d19379:7051
(anonyme) @ chunk-276SZO74.js?v=28d19379:7174
batchedUpdates$1 @ chunk-276SZO74.js?v=28d19379:18913
batchedUpdates @ chunk-276SZO74.js?v=28d19379:3579
dispatchEventForPluginEventSystem @ chunk-276SZO74.js?v=28d19379:7173
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-276SZO74.js?v=28d19379:5478
dispatchEvent @ chunk-276SZO74.js?v=28d19379:5472
dispatchDiscreteEvent @ chunk-276SZO74.js?v=28d19379:5449Comprendre cette erreur
kannamma-scraper.ts:180 ✅ Processed 2/50 recipes
kannamma-scraper.ts:201 
📊 Scraping completed!
kannamma-scraper.ts:202 ✅ Success rate: 22.2%
kannamma-scraper.ts:203 💰 Total cost: €0.00
kannamma-scraper.ts:204 📚 Total recipes: 2
seeding-orchestrator.ts:204 📊 [scraping] 2/50 - 2 recettes extraites avec succès
seeding-orchestrator.ts:204 📊 [translation] 0/2 - Traduction des recettes en français...
translation-service.ts:78 🌐 Translating batch of 2 recipes...
translation-service.ts:84 📝 Unique texts to translate: 35
translation-service.ts:88 💾 Found 0 cached translations
translation-service.ts:89 🆕 Need to translate 35 new texts
translation-service.ts:195 💰 Batch translation cost: €0.027
@supabase_supabase-js.js?v=16e1fc8b:3930  POST https://jwoxacnflphclslpqfzs.supabase.co/rest/v1/api_usage_tracking 403 (Forbidden)
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3930
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3951
fulfilled @ @supabase_supabase-js.js?v=16e1fc8b:3903
Promise.then
step @ @supabase_supabase-js.js?v=16e1fc8b:3916
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3918
__awaiter6 @ @supabase_supabase-js.js?v=16e1fc8b:3900
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3941
then @ @supabase_supabase-js.js?v=16e1fc8b:89Comprendre cette erreur
@supabase_supabase-js.js?v=16e1fc8b:3930  POST https://jwoxacnflphclslpqfzs.supabase.co/rest/v1/translation_cache?columns=%22source_text%22%2C%22source_language%22%2C%22target_language%22%2C%22translated_text%22%2C%22context%22 403 (Forbidden)
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3930
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3951
fulfilled @ @supabase_supabase-js.js?v=16e1fc8b:3903
Promise.then
step @ @supabase_supabase-js.js?v=16e1fc8b:3916
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3918
__awaiter6 @ @supabase_supabase-js.js?v=16e1fc8b:3900
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3941
then @ @supabase_supabase-js.js?v=16e1fc8b:89Comprendre cette erreur
seeding-orchestrator.ts:204 📊 [translation] 2/2 - Traduction terminée
seeding-orchestrator.ts:204 📊 [validation] 0/2 - Validation de la sécurité alimentaire...
food-safety-validator.ts:96 🔒 Validating food safety for 2 recipes...
food-safety-validator.ts:114 ✅ Validation complete: 2/2 passed (100.0%)
seeding-orchestrator.ts:204 📊 [validation] 2/2 - 2 recettes validées
seeding-orchestrator.ts:204 📊 [import] 0/2 - Import des recettes dans la base de données...
@supabase_supabase-js.js?v=16e1fc8b:3930  POST https://jwoxacnflphclslpqfzs.supabase.co/rest/v1/recipes?select=* 400 (Bad Request)
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3930
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3951
fulfilled @ @supabase_supabase-js.js?v=16e1fc8b:3903
Promise.then
step @ @supabase_supabase-js.js?v=16e1fc8b:3916
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3918
__awaiter6 @ @supabase_supabase-js.js?v=16e1fc8b:3900
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3941
then @ @supabase_supabase-js.js?v=16e1fc8b:89Comprendre cette erreur
seeding-orchestrator.ts:92 Erreur import recette 0: Error: Erreur insertion recette: Could not find the 'cuisine_type' column of 'recipes' in the schema cache
    at RecipeSeedingOrchestrator.importRecipeToDatabase (seeding-orchestrator.ts:175:13)
    at async RecipeSeedingOrchestrator.seedRecipes (seeding-orchestrator.ts:85:11)
    at async startSeeding (RecipeSeeding.tsx:29:29)
seedRecipes @ seeding-orchestrator.ts:92
await in seedRecipes
startSeeding @ RecipeSeeding.tsx:29
callCallback2 @ chunk-276SZO74.js?v=28d19379:3674
invokeGuardedCallbackDev @ chunk-276SZO74.js?v=28d19379:3699
invokeGuardedCallback @ chunk-276SZO74.js?v=28d19379:3733
invokeGuardedCallbackAndCatchFirstError @ chunk-276SZO74.js?v=28d19379:3736
executeDispatch @ chunk-276SZO74.js?v=28d19379:7014
processDispatchQueueItemsInOrder @ chunk-276SZO74.js?v=28d19379:7034
processDispatchQueue @ chunk-276SZO74.js?v=28d19379:7043
dispatchEventsForPlugins @ chunk-276SZO74.js?v=28d19379:7051
(anonyme) @ chunk-276SZO74.js?v=28d19379:7174
batchedUpdates$1 @ chunk-276SZO74.js?v=28d19379:18913
batchedUpdates @ chunk-276SZO74.js?v=28d19379:3579
dispatchEventForPluginEventSystem @ chunk-276SZO74.js?v=28d19379:7173
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-276SZO74.js?v=28d19379:5478
dispatchEvent @ chunk-276SZO74.js?v=28d19379:5472
dispatchDiscreteEvent @ chunk-276SZO74.js?v=28d19379:5449Comprendre cette erreur
@supabase_supabase-js.js?v=16e1fc8b:3930  POST https://jwoxacnflphclslpqfzs.supabase.co/rest/v1/recipes?select=* 400 (Bad Request)
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3930
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3951
fulfilled @ @supabase_supabase-js.js?v=16e1fc8b:3903
Promise.then
step @ @supabase_supabase-js.js?v=16e1fc8b:3916
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3918
__awaiter6 @ @supabase_supabase-js.js?v=16e1fc8b:3900
(anonyme) @ @supabase_supabase-js.js?v=16e1fc8b:3941
then @ @supabase_supabase-js.js?v=16e1fc8b:89Comprendre cette erreur
seeding-orchestrator.ts:92 Erreur import recette 1: Error: Erreur insertion recette: Could not find the 'cuisine_type' column of 'recipes' in the schema cache
    at RecipeSeedingOrchestrator.importRecipeToDatabase (seeding-orchestrator.ts:175:13)
    at async RecipeSeedingOrchestrator.seedRecipes (seeding-orchestrator.ts:85:11)
    at async startSeeding (RecipeSeeding.tsx:29:29)
seedRecipes @ seeding-orchestrator.ts:92
await in seedRecipes
startSeeding @ RecipeSeeding.tsx:29
callCallback2 @ chunk-276SZO74.js?v=28d19379:3674
invokeGuardedCallbackDev @ chunk-276SZO74.js?v=28d19379:3699
invokeGuardedCallback @ chunk-276SZO74.js?v=28d19379:3733
invokeGuardedCallbackAndCatchFirstError @ chunk-276SZO74.js?v=28d19379:3736
executeDispatch @ chunk-276SZO74.js?v=28d19379:7014
processDispatchQueueItemsInOrder @ chunk-276SZO74.js?v=28d19379:7034
processDispatchQueue @ chunk-276SZO74.js?v=28d19379:7043
dispatchEventsForPlugins @ chunk-276SZO74.js?v=28d19379:7051
(anonyme) @ chunk-276SZO74.js?v=28d19379:7174
batchedUpdates$1 @ chunk-276SZO74.js?v=28d19379:18913
batchedUpdates @ chunk-276SZO74.js?v=28d19379:3579
dispatchEventForPluginEventSystem @ chunk-276SZO74.js?v=28d19379:7173
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-276SZO74.js?v=28d19379:5478
dispatchEvent @ chunk-276SZO74.js?v=28d19379:5472
dispatchDiscreteEvent @ chunk-276SZO74.js?v=28d19379:5449Comprendre cette erreur
seeding-orchestrator.ts:204 📊 [complete] 0/0 - ✅ Import terminé! 0 recettes ajoutées.