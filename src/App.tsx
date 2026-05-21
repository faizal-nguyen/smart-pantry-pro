import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, Navigate, RouterProvider, RouteObject, Outlet } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { MaterialYouThemeProvider } from "./contexts/MaterialYouThemeContext";
import { LayoutPerformanceProvider } from "./components/performance/PerformanceMonitor";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingFallback } from "./components/LoadingFallback";
import { AssistantProvider } from "./components/assistant/AssistantProvider";
import { ResponsiveProvider } from "./contexts/ResponsiveContext";
import { AuthSessionProvider } from "./contexts/AuthSessionContext";
import { AuthenticatedLayout } from "./components/layout/AuthenticatedLayout";
import { usePersonalizationMigration } from "./hooks/usePersonalizationMigration";

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

// Perf audit 2026-05-19 — sans defaults, staleTime: 0 partout → chaque
// remontage ou focus de fenêtre déclenche un refetch. Les hooks individuels
// peuvent override localement (useRecipeInventoryAnalysis garde son
// refetchOnWindowFocus: true pour les analyses qui peuvent dériver).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      retry: 1,
    },
  },
});

// PRP-238 PR2 — Routes restructurees en 2 groupes :
//   - publicRoutes : accessibles sans auth (/auth, /onboarding, share-target)
//   - protectedRoutes : enfants de <AuthenticatedLayout> qui :
//       - lit user + isLoading depuis AuthSessionContext
//       - redirige vers /auth si pas connecte
//       - rend <AppNavigation user={user}> UNE SEULE FOIS qui wrappe l'Outlet
//   Les pages enfants n'ont plus besoin de wrapper <AppNavigation> ni
//   d'appeler getSession() — elles utilisent useAuthenticatedUser().

const publicRoutes: RouteObject[] = [
  { path: "/auth", element: <Auth /> },
  { path: "/share-target", element: withSuspense(ShareTarget) },
  { path: "/onboarding", element: withSuspense(OnboardingPage) },
];

const protectedRoutes: RouteObject[] = [
  // Home : Index.tsx fait sa propre redirection. AuthenticatedLayout
  // garantit qu'on est authentifie, donc Index n'a plus besoin de checker.
  { path: "/", element: <Index /> },

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
  { path: "/kitchen/favorites", element: <Navigate to="/kitchen/recipes?tab=library&filter=favorites" replace /> },

  // Shopping
  { path: "/shopping", element: <Navigate to="/shopping/list" replace /> },
  { path: "/shopping/list", element: withSuspense(SmartShoppingList) },

  // Assistant
  { path: "/assistant", element: withSuspense(AssistantDashboard) },
  { path: "/assistant/chat", element: <Navigate to="/assistant" replace /> },

  // Insights
  { path: "/insights", element: withSuspense(InsightsPage) },
  { path: "/insights/waste", element: withSuspense(WasteInsightsPage) },

  // Settings
  { path: "/settings", element: withSuspense(Settings) },
  { path: "/settings/appearance", element: <Navigate to="/settings?section=appearance" replace /> },

  // Redirections legacy
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
if (import.meta.env.DEV) {
  protectedRoutes.push(
    { path: "/inventory", element: <Navigate to="/pantry/inventory" replace /> },
    { path: "/recipes", element: <Navigate to="/kitchen/recipes" replace /> },
    { path: "/shopping-legacy", element: <Navigate to="/shopping/list" replace /> },
  );
}

void LegacyRedirect;

// PRP-221: wrap every route under a layout that mounts the global
// voice-assistant FAB + dialog. The FAB self-hides on /auth and when
// the user is not signed in, so this is safe across the entire app.
//
// PRP-235 backlog 2 : `usePersonalizationMigration` est mounté ici
// pour s'exécuter une fois par app session (no-op si déjà migré ou
// si pas de données legacy à migrer).
const RootLayout = () => {
  usePersonalizationMigration();
  return (
    <AssistantProvider>
      <Outlet />
    </AssistantProvider>
  );
};

const router = createBrowserRouter(
  [
    {
      element: <RootLayout />,
      children: [
        // Routes publiques (Auth, Onboarding, ShareTarget)
        ...publicRoutes,
        // Routes protegees - wrapped in AuthenticatedLayout (PRP-238 PR2)
        {
          element: <AuthenticatedLayout />,
          children: protectedRoutes,
        },
        // 404 catch-all (doit etre le dernier)
        { path: "*", element: <NotFound /> },
      ],
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
      {/* PRP-238 PR1 etape (b) — ResponsiveProvider unique pour partager
          le viewport + breakpoint + navHeight throttled rAF a tous les
          consommateurs (useViewport, useBreakpoints, useHybridGrid...). */}
      <ResponsiveProvider>
        {/* PRP-238 PR2 — AuthSessionProvider monte au top : 1 seul
            appel auth.getSession() pour toute l'app + listen aux
            transitions login/logout via onAuthStateChange. Les pages
            consomment via useAuthenticatedUser(). */}
        <AuthSessionProvider>
          <LayoutPerformanceProvider enableAutoOptimizations={true}>
            <ThemeProvider>
              <MaterialYouThemeProvider>
                <RouterProvider router={router} />
              </MaterialYouThemeProvider>
            </ThemeProvider>
          </LayoutPerformanceProvider>
        </AuthSessionProvider>
      </ResponsiveProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
