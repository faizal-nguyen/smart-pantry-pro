"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MealType, RecipeWithDetails } from '@/services/planning/types';

export function useMealPlanningRecipes() {
  const [catalogRecipes, setCatalogRecipes] = useState<RecipeWithDetails[]>([]);
  const [userRecipes, setUserRecipes] = useState<RecipeWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load all recipes from the catalog
  const loadCatalogRecipes = async (limit = 50) => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setCatalogRecipes(data || []);
    } catch (error) {
      console.error('Error loading catalog recipes:', error);
    }
  };

  // Load user's personal recipe library
  const loadUserRecipes = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserRecipes(data || []);
    } catch (error) {
      console.error('Error loading user recipes:', error);
    }
  };

  // Search in both catalog and user recipes
  const searchRecipes = async (
    query: string, 
    filters?: {
      maxCost?: number;
      maxTime?: number;
      difficulty?: number;
      tags?: string[];
      mealType?: MealType;
    }
  ) => {
    setIsLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      let queryBuilder = supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user.user.id); // Filtrer seulement les recettes de l'utilisateur

      // Add search filter
      if (query) {
        queryBuilder = queryBuilder.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
      }

      // Add other filters
      if (filters?.difficulty) {
        queryBuilder = queryBuilder.eq('difficulty', filters.difficulty);
      }

      if (filters?.tags && filters.tags.length > 0) {
        queryBuilder = queryBuilder.contains('tags', filters.tags);
      }

      const { data, error } = await queryBuilder
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching recipes:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Get recipe by ID
  const getRecipeById = async (recipeId: string): Promise<RecipeWithDetails | null> => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipeId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error loading recipe:', error);
      return null;
    }
  };

  // Get recipes suitable for a specific meal type
  const getRecipesByMealType = async (mealType: MealType): Promise<RecipeWithDetails[]> => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading recipes by meal type:', error);
      return [];
    }
  };

  // Get popular recipes (prioritize user's recipes)
  const getPopularRecipes = async (limit = 20): Promise<RecipeWithDetails[]> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      // D'abord, récupérer les recettes de l'utilisateur
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading popular recipes:', error);
      return [];
    }
  };

  // Get user's favorite recipes
  const getFavoriteRecipes = async (): Promise<RecipeWithDetails[]> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading favorite recipes:', error);
      return [];
    }
  };

  // Initialize data on mount
  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([
        loadCatalogRecipes(),
        loadUserRecipes()
      ]);
    };

    initializeData();
  }, []);

  return {
    catalogRecipes,
    userRecipes,
    isLoading,
    searchRecipes,
    getRecipeById,
    getRecipesByMealType,
    getPopularRecipes,
    getFavoriteRecipes,
    refreshCatalog: loadCatalogRecipes,
    refreshUserRecipes: loadUserRecipes
  };
}