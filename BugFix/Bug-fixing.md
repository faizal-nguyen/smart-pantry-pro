Bug-fixing.md

Lorsque je parse une URL voila les resultats de la console
🥘 Parsing Marmiton recipe with specialized parser: https://www.marmiton.org/recettes/recette_poireaux-a-la-grecque-rapides_29482.aspx
useRecipeParser.ts:94  POST http://localhost:3000/api/parse-recipe-marmiton 404 (Not Found)
parseMarmitonRecipe @ useRecipeParser.ts:94
parseRecipeFromURL @ useRecipeParser.ts:56
parseRecipeFromURL @ AddRecipeDialog.tsx:220
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
useRecipeParser.ts:102 Marmiton parser error: {}
parseMarmitonRecipe @ useRecipeParser.ts:102
await in parseMarmitonRecipe
parseRecipeFromURL @ useRecipeParser.ts:56
parseRecipeFromURL @ AddRecipeDialog.tsx:220
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
useRecipeParser.ts:126 Error with Marmiton specialized parser: Error: HTTP 404
    at parseMarmitonRecipe (useRecipeParser.ts:103:13)
    at async parseRecipeFromURL (useRecipeParser.ts:56:18)
    at async parseRecipeFromURL (AddRecipeDialog.tsx:220:22)
parseMarmitonRecipe @ useRecipeParser.ts:126
await in parseMarmitonRecipe
parseRecipeFromURL @ useRecipeParser.ts:56
parseRecipeFromURL @ AddRecipeDialog.tsx:220
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
useRecipeParser.ts:236 🤖 Parsing with AI: https://www.marmiton.org/recettes/recette_poireaux-a-la-grecque-rapides_29482.aspx
useRecipeParser.ts:244  POST http://localhost:3000/api/parse-recipe-ai 404 (Not Found)
parseWithAI @ useRecipeParser.ts:244
parseMarmitonRecipe @ useRecipeParser.ts:129
await in parseMarmitonRecipe
parseRecipeFromURL @ useRecipeParser.ts:56
parseRecipeFromURL @ AddRecipeDialog.tsx:220
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
useRecipeParser.ts:269 AI parsing failed: Error: AI parsing failed
    at parseWithAI (useRecipeParser.ts:252:13)
    at async parseMarmitonRecipe (useRecipeParser.ts:129:12)
    at async parseRecipeFromURL (useRecipeParser.ts:56:18)
    at async parseRecipeFromURL (AddRecipeDialog.tsx:220:22)
parseWithAI @ useRecipeParser.ts:269
await in parseWithAI
parseMarmitonRecipe @ useRecipeParser.ts:129
await in parseMarmitonRecipe
parseRecipeFromURL @ useRecipeParser.ts:56
parseRecipeFromURL @ AddRecipeDialog.tsx:220
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
AddRecipeDialog.tsx:263 URL parsing error: Error: AI parsing failed
    at parseRecipeFromURL (AddRecipeDialog.tsx:259:15)
parseRecipeFromURL @ AddRecipeDialog.tsx:263
await in parseRecipeFromURL
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
Layout.tsx:27 Auth event: SIGNED_IN faizal.nguyen@hotmail.fr


On va arrêter d'utiliser une fonction de parsing. Il faut utiliser OpenAI. 
On va supprimer la fonction de parsing et utiliser uniquement l'IA, en gros l'utilisateur donner une URL, ensuite c'est envoyé à open AI qui va extraire : nom de la recette, type de cuisine, description, temps de préparation, temps de cuisson, portions, la liste des ingrédients, quantité, gramme, kilo ou autre en fonction de ce qu'on a défini en db ainsi que les instructions. Il faut ensuite une fonction qui va ajouter côté front directement dans les champs concernés. 