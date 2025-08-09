# Bug-fixing.md

Bug Import social 
àa ne fonctionne toujours pas 

videoProcessorAPI.ts:100  POST http://localhost:8000/process/url net::ERR_CONNECTION_REFUSED
processVideoURL @ videoProcessorAPI.ts:100
parseFromVideoUrl @ videoRecipeParser.ts:69
(anonyme) @ useVideoRecipeParser.ts:60
handleUrlImport @ VideoImportCard.tsx:78
callCallback2 @ chunk-276SZO74.js?v=a78225c2:3674
invokeGuardedCallbackDev @ chunk-276SZO74.js?v=a78225c2:3699
invokeGuardedCallback @ chunk-276SZO74.js?v=a78225c2:3733
invokeGuardedCallbackAndCatchFirstError @ chunk-276SZO74.js?v=a78225c2:3736
executeDispatch @ chunk-276SZO74.js?v=a78225c2:7014
processDispatchQueueItemsInOrder @ chunk-276SZO74.js?v=a78225c2:7034
processDispatchQueue @ chunk-276SZO74.js?v=a78225c2:7043
dispatchEventsForPlugins @ chunk-276SZO74.js?v=a78225c2:7051
(anonyme) @ chunk-276SZO74.js?v=a78225c2:7174
batchedUpdates$1 @ chunk-276SZO74.js?v=a78225c2:18913
batchedUpdates @ chunk-276SZO74.js?v=a78225c2:3579
dispatchEventForPluginEventSystem @ chunk-276SZO74.js?v=a78225c2:7173
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-276SZO74.js?v=a78225c2:5478
dispatchEvent @ chunk-276SZO74.js?v=a78225c2:5472
dispatchDiscreteEvent @ chunk-276SZO74.js?v=a78225c2:5449Comprendre cette erreur
videoRecipeParser.ts:88 Backend processing failed, falling back to basic extraction: TypeError: Failed to fetch
    at VideoProcessorAPI.processVideoURL (videoProcessorAPI.ts:100:28)
    at VideoRecipeParser.parseFromVideoUrl (videoRecipeParser.ts:69:44)
    at useVideoRecipeParser.ts:60:35
    at handleUrlImport (VideoImportCard.tsx:78:26)
    at HTMLUnknownElement.callCallback2 (chunk-276SZO74.js?v=a78225c2:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-276SZO74.js?v=a78225c2:3699:24)
    at invokeGuardedCallback (chunk-276SZO74.js?v=a78225c2:3733:39)
    at invokeGuardedCallbackAndCatchFirstError (chunk-276SZO74.js?v=a78225c2:3736:33)
    at executeDispatch (chunk-276SZO74.js?v=a78225c2:7014:11)
    at processDispatchQueueItemsInOrder (chunk-276SZO74.js?v=a78225c2:7034:15)
parseFromVideoUrl @ videoRecipeParser.ts:88
await in parseFromVideoUrl
(anonyme) @ useVideoRecipeParser.ts:60
handleUrlImport @ VideoImportCard.tsx:78
callCallback2 @ chunk-276SZO74.js?v=a78225c2:3674
invokeGuardedCallbackDev @ chunk-276SZO74.js?v=a78225c2:3699
invokeGuardedCallback @ chunk-276SZO74.js?v=a78225c2:3733
invokeGuardedCallbackAndCatchFirstError @ chunk-276SZO74.js?v=a78225c2:3736
executeDispatch @ chunk-276SZO74.js?v=a78225c2:7014
processDispatchQueueItemsInOrder @ chunk-276SZO74.js?v=a78225c2:7034
processDispatchQueue @ chunk-276SZO74.js?v=a78225c2:7043
dispatchEventsForPlugins @ chunk-276SZO74.js?v=a78225c2:7051
(anonyme) @ chunk-276SZO74.js?v=a78225c2:7174
batchedUpdates$1 @ chunk-276SZO74.js?v=a78225c2:18913
batchedUpdates @ chunk-276SZO74.js?v=a78225c2:3579
dispatchEventForPluginEventSystem @ chunk-276SZO74.js?v=a78225c2:7173
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-276SZO74.js?v=a78225c2:5478
dispatchEvent @ chunk-276SZO74.js?v=a78225c2:5472
dispatchDiscreteEvent @ chunk-276SZO74.js?v=a78225c2:5449Comprendre cet avertissement
videoRecipeParser.ts:346 VideoRecipeParser: Using fallback extraction for: instagram
videoRecipeParser.ts:353 VideoRecipeParser: Trying Instagram oEmbed API...
videoRecipeParser.ts:354  POST http://localhost:3001/api/social/instagram-oembed 500 (Internal Server Error)
fallbackExtraction @ videoRecipeParser.ts:354
await in fallbackExtraction
parseFromVideoUrl @ videoRecipeParser.ts:90
await in parseFromVideoUrl
(anonyme) @ useVideoRecipeParser.ts:60
handleUrlImport @ VideoImportCard.tsx:78
callCallback2 @ chunk-276SZO74.js?v=a78225c2:3674
invokeGuardedCallbackDev @ chunk-276SZO74.js?v=a78225c2:3699
invokeGuardedCallback @ chunk-276SZO74.js?v=a78225c2:3733
invokeGuardedCallbackAndCatchFirstError @ chunk-276SZO74.js?v=a78225c2:3736
executeDispatch @ chunk-276SZO74.js?v=a78225c2:7014
processDispatchQueueItemsInOrder @ chunk-276SZO74.js?v=a78225c2:7034
processDispatchQueue @ chunk-276SZO74.js?v=a78225c2:7043
dispatchEventsForPlugins @ chunk-276SZO74.js?v=a78225c2:7051
(anonyme) @ chunk-276SZO74.js?v=a78225c2:7174
batchedUpdates$1 @ chunk-276SZO74.js?v=a78225c2:18913
batchedUpdates @ chunk-276SZO74.js?v=a78225c2:3579
dispatchEventForPluginEventSystem @ chunk-276SZO74.js?v=a78225c2:7173
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-276SZO74.js?v=a78225c2:5478
dispatchEvent @ chunk-276SZO74.js?v=a78225c2:5472
dispatchDiscreteEvent @ chunk-276SZO74.js?v=a78225c2:5449Comprendre cette erreur
videoRecipeParser.ts:388 VideoRecipeParser: Instagram oEmbed failed, using basic metadata