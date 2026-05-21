// PRP-238 PR2 — auth check + AppNavigation sont geres par
// AuthenticatedLayout (cf. App.tsx). Cette page rend uniquement
// le composant Recipes.
import React from 'react';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import Recipes from "./Recipes";

const RecipesPage = () => {
  const user = useAuthenticatedUser();
  void user;

  return <Recipes />;
};

export default RecipesPage;
