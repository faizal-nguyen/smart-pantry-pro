import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Package, ChefHat, ShoppingCart, LogOut, Loader2, Bot, BarChart3, Settings, Home } from "lucide-react";
import { MaterialButton } from "@/components/ui/material/Button";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from '@supabase/supabase-js';
import { usePersonalization } from "@/hooks/usePersonalization";
import { InteractiveTutorial } from "@/components/onboarding";
import TutorialTrigger from "@/components/onboarding/TutorialTrigger";
import { useHybridGrid, usePlatformAdaptiveTouch } from "@/hooks/useHybridGrid";
import { useResponsiveZones, useBreakpoints } from "@/hooks/useResponsiveZones";
import { cn } from "@/lib/utils";
import Inventory from "@/pages/Inventory";
import Recipes from "@/pages/Recipes";
import ShoppingList from "@/pages/ShoppingList";
import RecipeAssistant from "@/pages/RecipeAssistant";

// Import enhanced layout styles
import "@/styles/enhanced-layout.css";

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location.pathname);
  const { hasCompletedOnboarding, isLoading: personalizationLoading } = usePersonalization();

  // Keep locationRef in sync with current pathname
  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);
  
  // Enhanced layout hooks
  const { grid, isReady: gridReady } = useHybridGrid({
    mode: location.pathname.includes('/shopping') ? 'shopping' : 
          location.pathname.includes('/recipes') ? 'cooking' : 'browsing',
    density: 'medium',
    performanceMode: 'balanced',
  });
  const { zones } = useResponsiveZones();
  const { isMobile, isTablet, isDesktop } = useBreakpoints();
  const touchZones = usePlatformAdaptiveTouch();
  
  // Determine active tab based on current route
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/inventory') return 'inventory';
    if (path === '/recipes') return 'recipes';
    if (path === '/shopping') return 'shopping';
    if (path === '/insights') return 'insights';
    if (path === '/assistant') return 'assistant';
    return 'inventory'; // default
  };
  
  const [activeTab, setActiveTab] = useState(getActiveTab());

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth event:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Redirect logic - use ref to get current pathname (avoids stale closure)
        const currentPath = locationRef.current;
        if (event === 'SIGNED_IN' && currentPath === '/auth') {
          navigate('/', { replace: true });
        } else if (event === 'SIGNED_OUT') {
          navigate('/auth', { replace: true });
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Initial redirect logic - use ref for current pathname
      const currentPath = locationRef.current;
      if (!session && currentPath !== '/auth') {
        navigate('/auth', { replace: true });
      } else if (session && currentPath === '/auth') {
        navigate('/', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Check for onboarding status when user is authenticated
  useEffect(() => {
    if (user && !personalizationLoading && !hasCompletedOnboarding() && 
        location.pathname !== '/onboarding' && location.pathname !== '/auth') {
      navigate('/onboarding', { replace: true });
    }
  }, [user, personalizationLoading, hasCompletedOnboarding, location.pathname, navigate]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Erreur de déconnexion:", error.message);
      } else {
        console.log("Déconnexion réussie");
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };


  // Show loading spinner while checking auth
  if (loading || personalizationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return children;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card safe-area-inset-top">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 
            className="text-xl font-bold text-primary cursor-pointer flex items-center gap-2" 
            onClick={() => navigate('/insights')}
          >
            <Home className="w-5 h-5" />
            Smart Pantry Pro
          </h1>
          <div className="flex items-center gap-2">
            <MaterialButton
              variant="text"
              size="sm"
              icon={<Settings className="w-4 h-4" />}
              onClick={() => navigate('/settings')}
            >
              <span className="hidden sm:inline">Paramètres</span>
            </MaterialButton>
            <MaterialButton
              variant="text"
              size="sm"
              icon={<LogOut className="w-4 h-4" />}
              onClick={handleSignOut}
            >
              <span className="hidden sm:inline">Déconnexion</span>
            </MaterialButton>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20">
        <div className="w-full">
          {children}
        </div>
      </main>

      {/* Enhanced Material You navigation bar */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t shadow-lg safe-area-inset-bottom",
        isMobile && "mobile-navigation-zone",
        isTablet && "tablet-navigation-zone",
        isDesktop && "desktop-navigation-zone"
      )} style={{ height: zones.navigation.height }}>        
        <div className={cn(
          "h-full",
          "grid grid-cols-5"
        )}>
          <MaterialButton
            variant={location.pathname === '/inventory' ? 'tonal' : 'text'}
            size="sm"
            onClick={() => navigate('/inventory')}
            data-tutorial="add-product-button"
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg transition-all touch-zone-minimum",
              "flex-col text-xs h-full"
            )}
          >
            <Package className="w-5 h-5" />
            <span className="text-xs">Inventaire</span>
          </MaterialButton>
          
          <MaterialButton
            variant={location.pathname === '/recipes' ? 'tonal' : 'text'}
            size="sm"
            onClick={() => navigate('/recipes')}
            data-tutorial="recipe-suggestions"
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg transition-all touch-zone-minimum",
              "flex-col text-xs h-full"
            )}
          >
            <ChefHat className="w-5 h-5" />
            <span className="text-xs">Recettes</span>
          </MaterialButton>
          
          <MaterialButton
            variant={location.pathname === '/shopping' ? 'tonal' : 'text'}
            size="sm"
            onClick={() => navigate('/shopping')}
            data-tutorial="shopping-list"
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg transition-all touch-zone-minimum",
              "flex-col text-xs h-full"
            )}
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="text-xs">Courses</span>
          </MaterialButton>
          
          <MaterialButton
            variant={location.pathname === '/insights' ? 'tonal' : 'text'}
            size="sm"
            onClick={() => navigate('/insights')}
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg transition-all touch-zone-minimum",
              "flex-col text-xs h-full"
            )}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs">Insights</span>
          </MaterialButton>
          
          <MaterialButton
            variant={location.pathname === '/assistant' ? 'tonal' : 'text'}
            size="sm"
            onClick={() => navigate('/assistant')}
            data-tutorial="ai-assistant"
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg transition-all touch-zone-minimum",
              "flex-col text-xs h-full"
            )}
          >
            <Bot className="w-5 h-5" />
            <span className="text-xs">Assistant</span>
          </MaterialButton>
        </div>
      </nav>

      {/* Interactive Tutorial Overlay */}
      <InteractiveTutorial />
      
      {/* Tutorial Trigger */}
      <TutorialTrigger autoStart={true} />
    </div>
  );
};

export default Layout;