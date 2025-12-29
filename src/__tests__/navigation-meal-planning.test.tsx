/**
 * Test for Meal Planning Navigation Feature
 * Validates that the navigation to meal planning works correctly
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MealPlanningPage from '../pages/MealPlanningPage';
import { getLegacyRedirections, NAVIGATION_CONFIG } from '../components/navigation/NavigationHub';

// Mock the hooks to avoid complex dependencies
vi.mock('../hooks/useMealPlanningAnalysis', () => ({
  useMealPlanningAnalysis: () => ({
    currentPlan: null,
    userPreferences: null,
    optimizedShoppingList: null,
    seasonalRecommendations: [],
    isGeneratingPlan: false,
    isOptimizingList: false,
    isLoadingPreferences: false,
    planningInsights: { healthScore: 0, varietyScore: 0 },
    generateWeeklyPlan: vi.fn(),
    optimizeShoppingList: vi.fn(),
    adaptToBudget: vi.fn(),
    loadUserPreferences: vi.fn(),
    hasPreferences: false,
    canGeneratePlan: false,
    totalWeeklyCost: 0,
    estimatedSavings: 0,
    isWithinBudget: true
  })
}));

describe('Meal Planning Navigation', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('should render meal planning page correctly', () => {
    renderWithProviders(<MealPlanningPage />);
    
    expect(screen.getByText('Planification des Repas')).toBeInTheDocument();
    expect(screen.getByText('Planifiez vos repas de la semaine et optimisez votre budget')).toBeInTheDocument();
  });

  it('should include meal planning route in navigation config', () => {
    const kitchenSection = NAVIGATION_CONFIG.find(item => item.id === 'kitchen');
    expect(kitchenSection).toBeDefined();
    
    const mealPlanningSubItem = kitchenSection?.subItems?.find(item => item.id === 'kitchen-meal-planning');
    expect(mealPlanningSubItem).toBeDefined();
    expect(mealPlanningSubItem?.path).toBe('/kitchen/meal-planning');
    expect(mealPlanningSubItem?.isNew).toBe(true);
  });

  it('should include backward compatibility redirect for meal planning', () => {
    const redirections = getLegacyRedirections();
    expect(redirections['/meal-planning']).toBe('/kitchen/meal-planning');
  });

  it('should have proper age restrictions for meal planning', () => {
    const kitchenSection = NAVIGATION_CONFIG.find(item => item.id === 'kitchen');
    const mealPlanningSubItem = kitchenSection?.subItems?.find(item => item.id === 'kitchen-meal-planning');
    
    expect(mealPlanningSubItem?.minAge).toBe(7);
    expect(mealPlanningSubItem?.childFriendlyName).toBe('Mon planning repas');
  });
});