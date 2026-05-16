/**
 * PageWrapper - Wrapper Réutilisable pour Pages avec AppNavigation
 * Simplifie la migration de Layout vers AppNavigation
 *
 * PRP-236 Commit 3 — conservation justifiée :
 *  - Consommé uniquement par `src/pages/InventoryPage.tsx`.
 * Suppression scopée PRP-234 quand `InventoryPage` sera migrée vers
 * `AppNavigation` directement.
 */

import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from '@supabase/supabase-js';
import { Loader2 } from "lucide-react";
import AppNavigation from "./AppNavigation";

interface PageWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const PageWrapper: React.FC<PageWrapperProps> = ({ 
  children, 
  requireAuth = true 
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si l'authentification n'est pas requise ou si pas d'utilisateur
  if (!requireAuth || !user) {
    return <>{children}</>;
  }

  return (
    <AppNavigation user={user}>
      {children}
    </AppNavigation>
  );
};

export default PageWrapper;