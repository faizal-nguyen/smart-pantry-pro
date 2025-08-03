import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Package, ChefHat, ShoppingCart, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from '@supabase/supabase-js';
import Inventory from "@/pages/Inventory";
import Recipes from "@/pages/Recipes";
import ShoppingList from "@/pages/ShoppingList";

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

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

          <TabsList className="fixed bottom-0 left-0 right-0 h-16 grid w-full grid-cols-3 bg-card border-t rounded-none">
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
          </TabsList>
        </Tabs>
      </main>
    </div>
  );
};

export default Layout;