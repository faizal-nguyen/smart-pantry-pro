import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Package, ChefHat, ShoppingCart, LogOut, Loader2, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from '@supabase/supabase-js';
import Inventory from "@/pages/Inventory";
import Recipes from "@/pages/Recipes";
import ShoppingList from "@/pages/ShoppingList";
import RecipeAssistant from "@/pages/RecipeAssistant";
import { FloatingVideoButton } from "@/components/ui/FloatingVideoButton";

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine active tab based on current route
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/inventory') return 'inventory';
    if (path === '/recipes') return 'recipes';
    if (path === '/shopping') return 'shopping';
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
        
        // Redirect logic
        if (event === 'SIGNED_IN' && location.pathname === '/auth') {
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
      
      // Initial redirect logic
      if (!session && location.pathname !== '/auth') {
        navigate('/auth', { replace: true });
      } else if (session && location.pathname === '/auth') {
        navigate('/', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

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
  if (loading) {
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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold text-primary">Smart Grocery</h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-transparent hover:bg-muted rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="pb-20">
        {children}
      </main>

      {/* Floating Video Import Button */}
      <FloatingVideoButton />

      {/* Simple navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card/80 backdrop-blur-md border-t shadow-lg">
        <div className="grid grid-cols-4 h-full">
          <button
            onClick={() => navigate('/inventory')}
            className={`flex flex-col items-center justify-center gap-1 text-xs transition-colors ${
              location.pathname === '/inventory' 
                ? 'text-primary bg-primary/10' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="w-5 h-5" />
            Inventaire
          </button>
          
          <button
            onClick={() => navigate('/recipes')}
            className={`flex flex-col items-center justify-center gap-1 text-xs transition-colors ${
              location.pathname === '/recipes' 
                ? 'text-primary bg-primary/10' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ChefHat className="w-5 h-5" />
            Recettes
          </button>
          
          <button
            onClick={() => navigate('/shopping')}
            className={`flex flex-col items-center justify-center gap-1 text-xs transition-colors ${
              location.pathname === '/shopping' 
                ? 'text-primary bg-primary/10' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            Courses
          </button>
          
          <button
            onClick={() => navigate('/assistant')}
            className={`flex flex-col items-center justify-center gap-1 text-xs transition-colors ${
              location.pathname === '/assistant' 
                ? 'text-primary bg-primary/10' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bot className="w-5 h-5" />
            Assistant
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Layout;