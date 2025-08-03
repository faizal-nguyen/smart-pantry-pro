import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Package, ChefHat, ShoppingCart, LogOut, Loader2, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from '@supabase/supabase-js';
import { useToast } from "@/hooks/use-toast";
import Inventory from "@/pages/Inventory";
import Recipes from "@/pages/Recipes";
import ShoppingList from "@/pages/ShoppingList";
import RecipeAssistant from "@/pages/RecipeAssistant";

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

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
        toast({
          variant: "destructive",
          title: "Erreur de déconnexion",
          description: error.message
        });
      } else {
        toast({
          title: "Déconnexion réussie",
          description: "Vous avez été déconnecté avec succès."
        });
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
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </header>

      <main className="pb-20">
        <Tabs defaultValue="inventory" className="w-full">
          <TabsContent value="inventory">
            <Inventory />
          </TabsContent>
          <TabsContent value="recipes">
            <Recipes />
          </TabsContent>
          <TabsContent value="shopping">
            <ShoppingList />
          </TabsContent>
          <TabsContent value="assistant">
            <RecipeAssistant />
          </TabsContent>

          <TabsList className="fixed bottom-0 left-0 right-0 h-16 grid w-full grid-cols-4 bg-card border-t rounded-none">
            <TabsTrigger 
              value="inventory" 
              className="flex flex-col gap-1 h-full text-xs"
            >
              <Package className="w-5 h-5" />
              Inventaire
            </TabsTrigger>
            <TabsTrigger 
              value="recipes" 
              className="flex flex-col gap-1 h-full text-xs"
            >
              <ChefHat className="w-5 h-5" />
              Recettes
            </TabsTrigger>
            <TabsTrigger 
              value="shopping" 
              className="flex flex-col gap-1 h-full text-xs"
            >
              <ShoppingCart className="w-5 h-5" />
              Courses
            </TabsTrigger>
            <TabsTrigger 
              value="assistant" 
              className="flex flex-col gap-1 h-full text-xs"
            >
              <Bot className="w-5 h-5" />
              Assistant
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </main>
    </div>
  );
};

export default Layout;