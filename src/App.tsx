import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, Navigate, RouterProvider, RouteObject, Outlet } from "react-router-dom";
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
// PRP-233 PR1: AssistantAI no longer routed (/assistant/chat redirects to
// /assistant). Source file preserved for PRP-224 reference; the lazy import
// is dropped to silence the unused-symbol warning.
const RecipeDetail = lazy(() => import("./pages/RecipeDetail"));
const RecipeEdit = lazy(() => import("./pages/RecipeEdit"));
const MealPlanningPage = lazy(() => import("./pages/MealPlanningPage"));
const ShareTarget = lazy(() => import("./pages/ShareTarget"));

// Dashboards hiérarchiques (lazy)
const PantryDashboard = lazy(() => import("./pages/pantry/PantryDashboard"));
const KitchenDashboard = lazy(() => import("./pages/kitchen/KitchenDashboard"));
const WasteInsightsPage = lazy(() => import("./pages/WasteInsightsPage"));
// PRP-230 Commit 2: ShoppingDashboard no longer routed (/shopping redirects
// to /shopping/list). File preserved for PRP-234 Today resurrection if needed.
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

// PRP-222 PR1 — Navigation diet : seulement les routes coeur produit V1.
const baseRoutes: RouteObject[] = [
  { path: "/", element: <Index /> },
  { path: "/auth", element: <Auth /> },
  { path: "/share-target", element: withSuspense(ShareTarget) },
  { path: "/onboarding", element: withSuspense(OnboardingPage) },

  // Pantry
  { path: "/pantry", element: withSuspense(PantryDashboard) },
  { path: "/pantry/inventory", element: withSuspense(InventoryPage) },

  // Kitchen
  { path: "/kitchen", element: withSuspense(KitchenDashboard) },
  { path: "/kitchen/recipes", element: withSuspense(RecipesPage) },
  { path: "/kitchen/recipes/:id", element: withSuspense(RecipeDetail) },
  { path: "/kitchen/recipes/:id/edit", element: withSuspense(RecipeEdit) },
  { path: "/kitchen/meal-planning", element: withSuspense(MealPlanningPage) },
  // PRP-232 PR3 : favoris URL canonique = `?tab=library&filter=favorites`.
  // Le redirect legacy `/kitchen/favorites` pointe désormais vers cette
  // URL complète (au lieu du fallback `/kitchen/recipes` sans filtre).
  { path: "/kitchen/favorites", element: <Navigate to="/kitchen/recipes?tab=library&filter=favorites" replace /> },

  // Shopping — PRP-230 Commit 2 : `/shopping` redirige vers la liste, qui
  // est l'expérience principale (dashboard reporté à PRP-234 Today).
  { path: "/shopping", element: <Navigate to="/shopping/list" replace /> },
  { path: "/shopping/list", element: withSuspense(SmartShoppingList) },

  // Assistant — PRP-233 PR1 : `/assistant/chat` redirige vers la surface
  // principale `/assistant` (legacy chat UI déprécié, PRP-224 reprendra).
  { path: "/assistant", element: withSuspense(AssistantDashboard) },
  { path: "/assistant/chat", element: <Navigate to="/assistant" replace /> },

  // Insights
  { path: "/insights", element: withSuspense(InsightsPage) },
  { path: "/insights/waste", element: withSuspense(WasteInsightsPage) },

  // Settings — PRP-235 PR1 : `/settings` est désormais sectionné via
  // `?section=...` (geré par `useSettingsSection`). L'ancien lien
  // `/settings/appearance` redirige vers la section Apparence pour
  // préserver les favoris utilisateurs.
  { path: "/settings", element: withSuspense(Settings) },
  { path: "/settings/appearance", element: <Navigate to="/settings?section=appearance" replace /> },

  // Redirections vers routes coeur. /games/* et /shopping/store-mode étaient
  // exposées dans la nav avant PRP-222 — on garde un redirect minimal pour
  // ne pas casser les favoris utilisateurs.
  { path: "/games", element: <Navigate to="/kitchen/recipes" replace /> },
  { path: "/games/*", element: <Navigate to="/kitchen/recipes" replace /> },
  { path: "/shopping/store-mode", element: <Navigate to="/shopping/list" replace /> },
  { path: "/shopping/history", element: <Navigate to="/shopping/list" replace /> },
  { path: "/pantry/scanner", element: <Navigate to="/pantry/inventory" replace /> },
  { path: "/pantry/alerts", element: <Navigate to="/pantry/inventory" replace /> },
  { path: "/assistant/suggestions", element: <Navigate to="/assistant" replace /> },
  { path: "/assistant/nutrition", element: <Navigate to="/assistant" replace /> },
  { path: "/insights/analytics", element: <Navigate to="/insights" replace /> },
  { path: "/insights/goals", element: <Navigate to="/insights" replace /> },
  { path: "/settings/family", element: <Navigate to="/settings" replace /> },
  { path: "/settings/parental", element: <Navigate to="/settings" replace /> },
];

// Dev-only redirects pour anciennes routes /inventory et /recipes.
// Fix PRP-222 : /recipes pointait vers /kitchen via LegacyRedirect — on
// redirige directement vers /kitchen/recipes pour éviter le saut indirect.
if (import.meta.env.DEV) {
  baseRoutes.push(
    { path: "/inventory", element: <Navigate to="/pantry/inventory" replace /> },
    { path: "/recipes", element: <Navigate to="/kitchen/recipes" replace /> },
    { path: "/shopping-legacy", element: <Navigate to="/shopping/list" replace /> },
  );
}

void LegacyRedirect;

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
