import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, RouteObject } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { MaterialYouThemeProvider } from "./contexts/MaterialYouThemeContext";
import { LayoutPerformanceProvider } from "./components/performance/PerformanceMonitor";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingFallback } from "./components/LoadingFallback";

// Pages critiques (chargées immédiatement)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Pages avec lazy loading (code splitting)
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const Settings = lazy(() => import("./pages/Settings"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const RecipesPage = lazy(() => import("./pages/RecipesPage"));
const ShoppingListPage = lazy(() => import("./pages/ShoppingListPage"));
const SmartShoppingList = lazy(() => import("./pages/SmartShoppingList"));
const InsightsPage = lazy(() => import("./pages/InsightsPage"));
const AssistantAI = lazy(() => import("./pages/AssistantAI"));
const RecipeAssistant = lazy(() => import("./pages/RecipeAssistant"));
const RecipeSeeding = lazy(() => import("./pages/RecipeSeeding"));
const RecipeDetail = lazy(() => import("./pages/RecipeDetail"));
const RecipeEdit = lazy(() => import("./pages/RecipeEdit"));
const MealPlanningPage = lazy(() => import("./pages/MealPlanningPage"));
const ShareTarget = lazy(() => import("./pages/ShareTarget"));

// Dashboards hiérarchiques (lazy)
const PantryDashboard = lazy(() => import("./pages/pantry/PantryDashboard"));
const KitchenDashboard = lazy(() => import("./pages/kitchen/KitchenDashboard"));
const ShoppingDashboard = lazy(() => import("./pages/shopping/ShoppingDashboard"));
const AssistantDashboard = lazy(() => import("./pages/assistant/AssistantDashboard"));

// Pages de test (lazy - dev only)
const VideoImportTest = lazy(() => import("./pages/VideoImportTest"));
const MaterialYouDemo = lazy(() => import("./pages/MaterialYouDemo"));
const TestMaterialYou = lazy(() => import("./pages/TestMaterialYou"));
const YouTubeRecipeTest = lazy(() => import("./pages/YouTubeRecipeTest"));
const TestMinimal = lazy(() => import("./pages/TestMinimal"));
const YouTubeTestDirect = lazy(() => import("./pages/YouTubeTestDirect"));
const YouTubeTestWorking = lazy(() => import("./pages/YouTubeTestWorking"));
const Diagnostics = lazy(() => import("./pages/Diagnostics"));

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

// Dev-only routes (legacy + tests)
if (import.meta.env.DEV) {
  baseRoutes.push(
    // Legacy compatibility
    { path: "/inventory", element: <><LegacyRedirect />{withSuspense(InventoryPage)}</> },
    { path: "/recipes", element: <><LegacyRedirect />{withSuspense(RecipesPage)}</> },
    // Many components still navigate to /recipes/:id and
    // /recipes/:id/edit (Recipes.tsx, Inventory.tsx, RecipeCard,
    // CollectionDetail, FloatingVideoButton…). Until those are
    // migrated to /kitchen/recipes/*, alias the legacy paths here so
    // RecipeInbox "Voir la recette" + every legacy navigate keeps
    // working. PRP-220.17 follow-up.
    { path: "/recipes/:id", element: withSuspense(RecipeDetail) },
    { path: "/recipes/:id/edit", element: withSuspense(RecipeEdit) },
    { path: "/shopping-legacy", element: withSuspense(SmartShoppingList) },
    { path: "/shopping-classic", element: withSuspense(ShoppingListPage) },
    { path: "/assistant-old", element: withSuspense(RecipeAssistant) },
    // Test & dev pages
    { path: "/recipe-seeding", element: withSuspense(RecipeSeeding) },
    { path: "/video-test", element: withSuspense(VideoImportTest) },
    { path: "/demo/material-you", element: withSuspense(MaterialYouDemo) },
    { path: "/test-material-you", element: withSuspense(TestMaterialYou) },
    { path: "/test/minimal", element: withSuspense(TestMinimal) },
    { path: "/youtube-test", element: withSuspense(YouTubeTestWorking) },
    { path: "/test/youtube-recipe", element: withSuspense(YouTubeTestDirect) },
    { path: "/test/youtube-recipe-full", element: withSuspense(YouTubeRecipeTest) },
    { path: "/diagnostics", element: withSuspense(Diagnostics) },
  );
}

// 404 - must be last
baseRoutes.push({ path: "*", element: <NotFound /> });

const router = createBrowserRouter(baseRoutes, {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});

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
