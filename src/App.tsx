import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, RouteObject, Outlet } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingFallback } from "./components/LoadingFallback";
import { ResponsiveProvider } from "./contexts/ResponsiveContext";
import { AuthSessionProvider } from "./contexts/AuthSessionContext";
import { AuthenticatedLayout } from "./components/layout/AuthenticatedLayout";
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import NewVersionBanner from "./components/layout/NewVersionBanner";
import RouteError from "./components/RouteError";
import { useNewVersion } from "./hooks/useNewVersion";

// Pages critiques (chargées immédiatement)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Pages avec lazy loading (code splitting)
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const Settings = lazy(() => import("./pages/Settings"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Recipes = lazy(() => import("./pages/Recipes"));
const SmartShoppingList = lazy(() => import("./pages/SmartShoppingList"));
const WeekShoppingPage = lazy(() => import("./pages/shopping/WeekShoppingPage"));
const ReceiptScanPage = lazy(() => import("./pages/shopping/ReceiptScanPage"));
const WeekProposalPage = lazy(() => import("./pages/kitchen/WeekProposalPage"));
const InsightsPage = lazy(() => import("./pages/InsightsPage"));
// PRP-233 PR1: AssistantAI no longer routed (/assistant/chat redirects to
// /assistant). Source file preserved for PRP-224 reference; the lazy import
// is dropped to silence the unused-symbol warning.
const RecipeDetail = lazy(() => import("./pages/RecipeDetail"));
const CookingSessionPage = lazy(() => import("./pages/kitchen/CookingSessionPage"));
const RecipeEdit = lazy(() => import("./pages/RecipeEdit"));
const MealPlanningPage = lazy(() => import("./pages/MealPlanningPage"));
const ShareTarget = lazy(() => import("./pages/ShareTarget"));

// Dashboards hiérarchiques (lazy)
const KitchenDashboard = lazy(() => import("./pages/kitchen/KitchenDashboard"));
// PRP-230 Commit 2: ShoppingDashboard no longer routed (/shopping redirects
// to /shopping/list). File preserved for PRP-234 Today resurrection if needed.
const AssistantDashboard = lazy(() => import("./pages/assistant/AssistantDashboard"));

// Composants de navigation
import { legacyRedirectRoutes } from './components/navigation/legacyRedirectRoutes';

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
  { path: "/pantry/inventory", element: withSuspense(Inventory) },

  // Kitchen
  { path: "/kitchen", element: withSuspense(KitchenDashboard) },
  { path: "/kitchen/recipes", element: withSuspense(Recipes) },
  { path: "/kitchen/recipes/:id", element: withSuspense(RecipeDetail) },
  { path: "/kitchen/recipes/:id/edit", element: withSuspense(RecipeEdit) },
  { path: "/kitchen/meal-planning", element: withSuspense(MealPlanningPage) },
  { path: "/kitchen/meal-planning/proposition", element: withSuspense(WeekProposalPage) },
  { path: "/kitchen/cooking/:sessionId", element: withSuspense(CookingSessionPage) },

  // Shopping
  { path: "/shopping/list", element: withSuspense(SmartShoppingList) },
  // V11-01 E2: the week's shopping from the menu, the week in the address.
  { path: "/shopping/week", element: withSuspense(WeekShoppingPage) },
  // V11-01 E5b: a receipt photographed, reviewed against the list, the scan in the address.
  { path: "/shopping/ticket", element: withSuspense(ReceiptScanPage) },

  // Assistant
  { path: "/assistant", element: withSuspense(AssistantDashboard) },

  // Insights
  { path: "/insights", element: withSuspense(InsightsPage) },

  // Settings
  { path: "/settings", element: withSuspense(Settings) },

  // V11-06 E4b (R8): every historical address, one hop to its canonical screen, from the same
  // table as the post-sign-in return (src/lib/legacyRoutes.ts).
  ...legacyRedirectRoutes(),
];

// Voice input lives in the assistant composer; no global floating microphone.
// V10-03: legacy preferences are reviewed explicitly in the versioned profile.
const RootLayout = () => {
  const newVersion = useNewVersion();
  return (
    <>
      <NewVersionBanner available={newVersion} />
      <Outlet />
    </>
  );
};

const router = createBrowserRouter(
  [
    {
      element: <RootLayout />,
      // A page that throws gets a French screen, not React Router's English one.
      errorElement: <RouteError />,
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
          <ThemeProvider>
            <RouterProvider router={router} />
            <Toaster />
            <Sonner position="bottom-right" offset="calc(var(--content-bottom-pad, 0px) + 16px)" />
          </ThemeProvider>
        </AuthSessionProvider>
      </ResponsiveProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
