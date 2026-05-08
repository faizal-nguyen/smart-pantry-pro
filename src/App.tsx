import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, RouteObject, Outlet } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { MaterialYouThemeProvider } from "./contexts/MaterialYouThemeContext";
import { LayoutPerformanceProvider } from "./components/performance/PerformanceMonitor";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingFallback } from "./components/LoadingFallback";
import { AssistantProvider } from "./components/assistant/AssistantProvider";

// Pages critiques (chargées immédiatement)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Pages avec lazy loading (code splitting)
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const Settings = lazy(() => import("./pages/Settings"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const RecipesPage = lazy(() => import("./pages/RecipesPage"));
const SmartShoppingList = lazy(() => import("./pages/SmartShoppingList"));
const InsightsPage = lazy(() => import("./pages/InsightsPage"));
const AssistantAI = lazy(() => import("./pages/AssistantAI"));
const RecipeDetail = lazy(() => import("./pages/RecipeDetail"));
const RecipeEdit = lazy(() => import("./pages/RecipeEdit"));
const MealPlanningPage = lazy(() => import("./pages/MealPlanningPage"));
const ShareTarget = lazy(() => import("./pages/ShareTarget"));

// Dashboards hiérarchiques (lazy)
const PantryDashboard = lazy(() => import("./pages/pantry/PantryDashboard"));
const KitchenDashboard = lazy(() => import("./pages/kitchen/KitchenDashboard"));
const ShoppingDashboard = lazy(() => import("./pages/shopping/ShoppingDashboard"));
const AssistantDashboard = lazy(() => import("./pages/assistant/AssistantDashboard"));

// Composants de navigation
import LegacyRedirect from "./components/navigation/LegacyRedirect";

// Helper pour wrapper les composants lazy avec Suspense
const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<LoadingFallback />}>
    <Component />
  </Suspense>
);

const queryClient = new QueryClient();

// Create router with new hierarchical structure + legacy support
const baseRoutes: RouteObject[] = [
  // Pages critiques (pas de lazy loading)
  { path: "/", element: <Index /> },
  { path: "/auth", element: <Auth /> },

  // PWA Web Share Target landing (PRP-220.18). Captures the shared
  // URL and bounces to the inbox.
  { path: "/share-target", element: withSuspense(ShareTarget) },

  // Pages avec lazy loading
  { path: "/onboarding", element: withSuspense(OnboardingPage) },

  // === NOUVELLE STRUCTURE HIÉRARCHIQUE PRP-040.1 ===

  // Pantry Section
  { path: "/pantry", element: withSuspense(PantryDashboard) },
  { path: "/pantry/inventory", element: withSuspense(InventoryPage) },
  { path: "/pantry/scanner", element: withSuspense(InventoryPage) },
  { path: "/pantry/alerts", element: withSuspense(InventoryPage) },

  // Kitchen Section
  { path: "/kitchen", element: withSuspense(KitchenDashboard) },
  { path: "/kitchen/recipes", element: withSuspense(RecipesPage) },
  { path: "/kitchen/recipes/:id", element: withSuspense(RecipeDetail) },
  { path: "/kitchen/recipes/:id/edit", element: withSuspense(RecipeEdit) },
  { path: "/kitchen/meal-planning", element: withSuspense(MealPlanningPage) },
  { path: "/kitchen/favorites", element: withSuspense(RecipesPage) },

  // Shopping Section
  { path: "/shopping", element: withSuspense(ShoppingDashboard) },
  { path: "/shopping/list", element: withSuspense(SmartShoppingList) },
  { path: "/shopping/store-mode", element: withSuspense(SmartShoppingList) },
  { path: "/shopping/history", element: withSuspense(SmartShoppingList) },

  // Assistant Section
  { path: "/assistant", element: withSuspense(AssistantDashboard) },
  { path: "/assistant/chat", element: withSuspense(AssistantAI) },
  { path: "/assistant/suggestions", element: withSuspense(AssistantAI) },
  { path: "/assistant/nutrition", element: withSuspense(AssistantAI) },

  // Insights Section
  { path: "/insights", element: withSuspense(InsightsPage) },
  { path: "/insights/analytics", element: withSuspense(InsightsPage) },
  { path: "/insights/waste", element: withSuspense(InsightsPage) },
  { path: "/insights/goals", element: withSuspense(InsightsPage) },

  // Games Section (Mode Famille)
  { path: "/games", element: withSuspense(RecipesPage) },
  { path: "/games/memory", element: withSuspense(RecipesPage) },
  { path: "/games/nutrition", element: withSuspense(RecipesPage) },
  { path: "/games/recipes", element: withSuspense(RecipesPage) },

  // === PARAMÈTRES ET CONFIGURATION ===
  { path: "/settings", element: withSuspense(Settings) },
  { path: "/settings/family", element: withSuspense(Settings) },
  { path: "/settings/parental", element: withSuspense(Settings) },
  { path: "/settings/appearance", element: withSuspense(Settings) },
];

// Dev-only legacy redirects
if (import.meta.env.DEV) {
  baseRoutes.push(
    // Legacy compatibility
    { path: "/inventory", element: <><LegacyRedirect />{withSuspense(InventoryPage)}</> },
    { path: "/recipes", element: <><LegacyRedirect />{withSuspense(RecipesPage)}</> },
    { path: "/shopping-legacy", element: withSuspense(SmartShoppingList) },
  );
}

// 404 - must be last
baseRoutes.push({ path: "*", element: <NotFound /> });

// PRP-221: wrap every route under a layout that mounts the global
// voice-assistant FAB + dialog. The FAB self-hides on /auth and when
// the user is not signed in, so this is safe across the entire app.
const RootLayout = () => (
  <AssistantProvider>
    <Outlet />
  </AssistantProvider>
);

const router = createBrowserRouter(
  [
    {
      element: <RootLayout />,
      children: baseRoutes,
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <LayoutPerformanceProvider enableAutoOptimizations={true}>
        <ThemeProvider>
          <MaterialYouThemeProvider>
            <RouterProvider router={router} />
          </MaterialYouThemeProvider>
        </ThemeProvider>
      </LayoutPerformanceProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
