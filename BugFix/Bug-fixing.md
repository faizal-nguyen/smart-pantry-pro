ShoppingList.tsx:254 Uncaught ReferenceError: MaterialCard is not defined
    at ShoppingList (ShoppingList.tsx:254:12)

ShoppingList.tsx:254 Uncaught ReferenceError: MaterialCard is not defined
    at ShoppingList (ShoppingList.tsx:254:12)
chunk-276SZO74.js?v=d4248c1e:14032 The above error occurred in the <ShoppingList> component:

    at ShoppingList (http://localhost:3002/src/pages/ShoppingList.tsx?t=1755778795334:51:43)
    at ShoppingListErrorBoundary (http://localhost:3002/src/components/shopping/ShoppingListErrorBoundary.tsx:193:5)
    at div
    at http://localhost:3002/node_modules/.vite/deps/chunk-SGAVZH5V.js?v=d4248c1e:43:13
    at Presence (http://localhost:3002/node_modules/.vite/deps/chunk-GWCB6ZNV.js?v=d4248c1e:24:11)
    at http://localhost:3002/node_modules/.vite/deps/@radix-ui_react-tabs.js?v=78105246:178:13
    at _c4 (http://localhost:3002/src/components/ui/tabs.tsx:47:61)
    at div
    at http://localhost:3002/node_modules/.vite/deps/chunk-SGAVZH5V.js?v=d4248c1e:43:13
    at Provider (http://localhost:3002/node_modules/.vite/deps/chunk-3RXG37ZK.js?v=d4248c1e:38:15)
    at http://localhost:3002/node_modules/.vite/deps/@radix-ui_react-tabs.js?v=78105246:55:7
    at div
    at main
    at div
    at Layout (http://localhost:3002/src/components/Layout.tsx?t=1755778241566:30:19)
    at SmartShoppingList (http://localhost:3002/src/pages/SmartShoppingList.tsx?t=1755778795334:39:39)
    at RenderedRoute (http://localhost:3002/node_modules/.vite/deps/react-router-dom.js?v=ffcb2257:4088:5)
    at RenderErrorBoundary (http://localhost:3002/node_modules/.vite/deps/react-router-dom.js?v=ffcb2257:4048:5)
    at DataRoutes (http://localhost:3002/node_modules/.vite/deps/react-router-dom.js?v=ffcb2257:5239:5)
    at Router (http://localhost:3002/node_modules/.vite/deps/react-router-dom.js?v=ffcb2257:4501:15)
    at RouterProvider (http://localhost:3002/node_modules/.vite/deps/react-router-dom.js?v=ffcb2257:5053:5)
    at MaterialYouThemeProvider (http://localhost:3002/src/contexts/MaterialYouThemeContext.tsx?t=1755778241566:31:44)
    at ThemeProvider (http://localhost:3002/src/components/ThemeProvider.tsx:24:33)
    at QueryClientProvider (http://localhost:3002/node_modules/.vite/deps/@tanstack_react-query.js?v=5d2b838b:2934:3)
    at App

React will try to recreate this component tree from scratch using the error boundary you provided, ShoppingListErrorBoundary.
ShoppingListErrorBoundary.tsx:32 ShoppingList Error Boundary caught an error: ReferenceError: MaterialCard is not defined
    at ShoppingList (ShoppingList.tsx:254:12)
 
{componentStack: '\n    at ShoppingList (http://localhost:3002/src/pa…tack_react-query.js?v=5d2b838b:2934:3)\n    at App'}
