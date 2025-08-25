import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { MaterialYouThemeProvider } from "./contexts/MaterialYouThemeContext";
import { LayoutPerformanceProvider } from "./components/performance/PerformanceMonitor";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import OnboardingPage from "./pages/OnboardingPage";
import RecipeAssistant from "./pages/RecipeAssistant";
import AssistantAI from "./pages/AssistantAI";
import RecipeSeeding from "./pages/RecipeSeeding";
import RecipeDetail from "./pages/RecipeDetail";
import RecipeEdit from "./pages/RecipeEdit";
import NotFound from "./pages/NotFound";
import InventoryPage from "./pages/InventoryPage";
import RecipesPage from "./pages/RecipesPage";
import ShoppingListPage from "./pages/ShoppingListPage";
import SmartShoppingList from "./pages/SmartShoppingList";
import VideoImportTest from "./pages/VideoImportTest";
import InsightsPage from "./pages/InsightsPage";
import Settings from "./pages/Settings";
import MaterialYouDemo from "./pages/MaterialYouDemo";
import TestMaterialYou from "./pages/TestMaterialYou";
import YouTubeRecipeTest from "./pages/YouTubeRecipeTest";
import YouTubeRecipeTestSimple from "./pages/YouTubeRecipeTestSimple";
import TestMinimal from "./pages/TestMinimal";
import YouTubeTestDirect from "./pages/YouTubeTestDirect";
import YouTubeTestBasic from "./pages/YouTubeTestBasic";
import YouTubeTestWorking from "./pages/YouTubeTestWorking";

const queryClient = new QueryClient();

// Create router with future flags enabled
const router = createBrowserRouter([
  { path: "/", element: <Index /> },
  { path: "/auth", element: <Auth /> },
  { path: "/onboarding", element: <OnboardingPage /> },
  { path: "/inventory", element: <InventoryPage /> },
  { path: "/recipes", element: <RecipesPage /> },
  { path: "/shopping", element: <SmartShoppingList /> },
  { path: "/shopping-classic", element: <ShoppingListPage /> },
  { path: "/insights", element: <InsightsPage /> },
  { path: "/settings", element: <Settings /> },
  { path: "/assistant", element: <AssistantAI /> },
  { path: "/assistant-old", element: <RecipeAssistant /> },
  { path: "/video-test", element: <VideoImportTest /> },
  { path: "/recipe-seeding", element: <RecipeSeeding /> },
  { path: "/recipes/:id", element: <RecipeDetail /> },
  { path: "/recipes/:id/edit", element: <RecipeEdit /> },
  { path: "/demo/material-you", element: <MaterialYouDemo /> },
  { path: "/test-material-you", element: <TestMaterialYou /> },
  { path: "/test/minimal", element: <TestMinimal /> },
  { path: "/youtube-test", element: <YouTubeTestWorking /> },
  { path: "/test/youtube-recipe", element: <YouTubeTestDirect /> },
  { path: "/test/youtube-recipe-full", element: <YouTubeRecipeTest /> },
  { path: "*", element: <NotFound /> },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LayoutPerformanceProvider enableAutoOptimizations={true}>
      <ThemeProvider>
        <MaterialYouThemeProvider>
          <RouterProvider router={router} />
        </MaterialYouThemeProvider>
      </ThemeProvider>
    </LayoutPerformanceProvider>
  </QueryClientProvider>
);

export default App;
