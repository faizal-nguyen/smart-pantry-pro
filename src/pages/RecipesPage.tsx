import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import AppNavigation from '@/components/navigation/AppNavigation';
import { PageLoader } from '@/components/layout/PageLoader';
import Recipes from "./Recipes";

const RecipesPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };
    getUser();
  }, []);

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AppNavigation user={user}>
      <Recipes />
    </AppNavigation>
  );
};

export default RecipesPage;