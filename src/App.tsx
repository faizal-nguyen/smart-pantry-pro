import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/shopping" element={<SmartShoppingList />} />
        <Route path="/shopping-classic" element={<ShoppingListPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/assistant" element={<AssistantAI />} />
        <Route path="/assistant-old" element={<RecipeAssistant />} />
        <Route path="/video-test" element={<VideoImportTest />} />
        <Route path="/recipe-seeding" element={<RecipeSeeding />} />
        <Route path="/recipes/:id" element={<RecipeDetail />} />
        <Route path="/recipes/:id/edit" element={<RecipeEdit />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
