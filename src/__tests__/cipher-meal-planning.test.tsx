import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import CipherMealPlanningPage from '@/pages/CipherMealPlanningPage';
import { useCipherMealPlanning } from '@/hooks/useCipherMealPlanning';

// Mock the hooks
jest.mock('@/hooks/useCipherMealPlanning');
// Router context for react-router-dom
import { MemoryRouter } from 'react-router-dom';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
  from: jest.fn(),
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const mockCipherMealPlanning = {
  currentPlan: {
    id: 'test-plan-1',
    weekStartDate: new Date('2025-01-06'),
    meals: [
      {
        id: 'meal-1',
        day: 0,
        mealType: 'lunch',
        recipeId: 'recipe-1',
        recipeName: 'Salade César',
        servings: 4,
        estimatedCost: 12.50,
        nutritionalInfo: {
          calories: 450,
          protein: 25,
          carbs: 30,
          fat: 20,
        },
      },
    ],
    totalEstimatedCost: 85.00,
    nutritionalSummary: {
      averageCalories: 2000,
      proteinPercentage: 20,
      carbsPercentage: 50,
      fatPercentage: 30,
      varietyScore: 8,
      healthScore: 9,
    },
    shoppingList: {
      items: [],
      totalCost: 85.00,
      storeOptimization: [],
    },
    alternativeOptions: [],
    status: 'active',
  },
  userPreferences: {
    budgetConstraints: {
      weeklyBudget: 100,
      strictMode: false,
    },
    nutritionalGoals: {
      targetCalories: 2000,
    },
  },
  encryptedPlanId: null,
  isEncrypting: false,
  isDecrypting: false,
  securityStatus: {
    isEncrypted: false,
    encryptionVersion: '1.0',
  },
  isFamilyModeActive: false,
  currentProfile: null,
  availableProfiles: [],
  familyAdaptations: {},
  navigationSuggestions: [],
  generateWeeklyPlan: jest.fn(),
  encryptMealPlan: jest.fn(),
  decryptMealPlan: jest.fn(),
  optimizeShoppingList: jest.fn(),
  switchFamilyProfile: jest.fn(),
  getFamilyAdaptedSuggestions: jest.fn(),
  handleSmartNavigation: jest.fn(),
  updateNavigationSuggestions: jest.fn(),
  isSecure: false,
  canEncrypt: true,
  hasFamilyAdaptations: false,
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionContextProvider supabaseClient={mockSupabaseClient as any}>
        <MemoryRouter initialEntries={["/"]}>{component}</MemoryRouter>
      </SessionContextProvider>
    </QueryClientProvider>
  );
};

describe('CipherMealPlanningPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCipherMealPlanning as any).mockReturnValue(mockCipherMealPlanning);
  });

  test('renders meal planning page with basic elements', () => {
    renderWithProviders(<CipherMealPlanningPage />);
    
    expect(screen.getByText('Planification des Repas Intelligente')).toBeInTheDocument();
    expect(screen.getByText('Plan non chiffré')).toBeInTheDocument();
    expect(screen.getByText('Générer Plan')).toBeInTheDocument();
  });

  test('displays current meal plan information', () => {
    renderWithProviders(<CipherMealPlanningPage />);
    
    expect(screen.getByText('6 janv.')).toBeInTheDocument();
    expect(screen.getByText('85.00€')).toBeInTheDocument();
    expect(screen.getByText('/100€')).toBeInTheDocument();
  });

  test('shows security status correctly when not encrypted', () => {
    renderWithProviders(<CipherMealPlanningPage />);
    
    expect(screen.getByText('Plan non chiffré')).toBeInTheDocument();
    expect(screen.getByText('Non sécurisé')).toBeInTheDocument();
    expect(screen.getByText('Sécuriser')).toBeInTheDocument();
  });

  test('shows security status correctly when encrypted', () => {
    const encryptedMock = {
      ...mockCipherMealPlanning,
      isSecure: true,
      encryptedPlanId: 'encrypted_meal_plan_12345',
      securityStatus: {
        isEncrypted: true,
        lastEncrypted: new Date('2025-01-05T10:00:00'),
        encryptionVersion: '1.0',
      },
    };
    
    (useCipherMealPlanning as any).mockReturnValue(encryptedMock);
    renderWithProviders(<CipherMealPlanningPage />);
    
    expect(screen.getByText('Plan sécurisé avec Cipher')).toBeInTheDocument();
    expect(screen.getByText('Chiffré')).toBeInTheDocument();
    expect(screen.getByText('Mettre à jour')).toBeInTheDocument();
  });

  test('handles plan generation', async () => {
    renderWithProviders(<CipherMealPlanningPage />);
    
    const generateButton = screen.getByText('Générer Plan');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(mockCipherMealPlanning.generateWeeklyPlan).toHaveBeenCalled();
    });
  });

  test('handles plan encryption', async () => {
    renderWithProviders(<CipherMealPlanningPage />);
    
    const encryptButton = screen.getByText('Sécuriser');
    fireEvent.click(encryptButton);
    
    await waitFor(() => {
      expect(mockCipherMealPlanning.encryptMealPlan).toHaveBeenCalled();
    });
  });

  test('displays family mode when active', () => {
    const familyMock = {
      ...mockCipherMealPlanning,
      isFamilyModeActive: true,
      currentProfile: {
        id: 'profile-1',
        name: 'Marie',
        type: 'parent' as const,
        age: 35,
        preferences: {},
        restrictions: {
          allowedSections: ['kitchen', 'pantry', 'shopping'],
          blockedFeatures: [],
          requiresApproval: [],
          allergenAlerts: [],
        },
      },
      availableProfiles: [
        {
          id: 'profile-1',
          name: 'Marie',
          type: 'parent' as const,
          age: 35,
          preferences: {},
          restrictions: {
            allowedSections: ['kitchen', 'pantry', 'shopping'],
            blockedFeatures: [],
            requiresApproval: [],
            allergenAlerts: [],
          },
        },
        {
          id: 'profile-2',
          name: 'Lucas',
          type: 'child' as const,
          age: 8,
          preferences: {},
          restrictions: {
            allowedSections: ['kitchen'],
            blockedFeatures: ['shopping'],
            requiresApproval: ['recipes'],
            allergenAlerts: ['nuts'],
          },
        },
      ],
    };
    
    (useCipherMealPlanning as any).mockReturnValue(familyMock);
    renderWithProviders(<CipherMealPlanningPage />);
    
    expect(screen.getByText('Mode Famille')).toBeInTheDocument();
    expect(screen.getByText('Marie')).toBeInTheDocument();
    expect(screen.getByText('Lucas')).toBeInTheDocument();
  });

  test('handles family profile switching', async () => {
    const familyMock = {
      ...mockCipherMealPlanning,
      isFamilyModeActive: true,
      currentProfile: {
        id: 'profile-1',
        name: 'Marie',
        type: 'parent' as const,
        age: 35,
        preferences: {},
        restrictions: {
          allowedSections: ['kitchen', 'pantry', 'shopping'],
          blockedFeatures: [],
          requiresApproval: [],
          allergenAlerts: [],
        },
      },
      availableProfiles: [
        {
          id: 'profile-1',
          name: 'Marie',
          type: 'parent' as const,
          age: 35,
          preferences: {},
          restrictions: {
            allowedSections: ['kitchen', 'pantry', 'shopping'],
            blockedFeatures: [],
            requiresApproval: [],
            allergenAlerts: [],
          },
        },
        {
          id: 'profile-2',
          name: 'Lucas',
          type: 'child' as const,
          age: 8,
          preferences: {},
          restrictions: {
            allowedSections: ['kitchen'],
            blockedFeatures: ['shopping'],
            requiresApproval: ['recipes'],
            allergenAlerts: ['nuts'],
          },
        },
      ],
    };
    
    (useCipherMealPlanning as any).mockReturnValue(familyMock);
    renderWithProviders(<CipherMealPlanningPage />);
    
    const lucasButton = screen.getByRole('button', { name: /Lucas/i });
    fireEvent.click(lucasButton);
    
    await waitFor(() => {
      expect(mockCipherMealPlanning.switchFamilyProfile).toHaveBeenCalledWith('profile-2');
    });
  });

  test('displays navigation suggestions when available', () => {
    const suggestionsMock = {
      ...mockCipherMealPlanning,
      navigationSuggestions: [
        {
          type: 'reminder' as const,
          suggestion: 'C\'est le moment idéal pour planifier la semaine!',
          icon: '📅',
          priority: 9,
          action: jest.fn(),
        },
        {
          type: 'action' as const,
          suggestion: 'Générer la liste de courses pour votre plan',
          icon: '🛒',
          priority: 8,
          action: jest.fn(),
        },
      ],
    };
    
    (useCipherMealPlanning as any).mockReturnValue(suggestionsMock);
    renderWithProviders(<CipherMealPlanningPage />);
    
    expect(screen.getByText('C\'est le moment idéal pour planifier la semaine!')).toBeInTheDocument();
    expect(screen.getByText('Générer la liste de courses pour votre plan')).toBeInTheDocument();
    expect(screen.getByText('Priorité: 9/10')).toBeInTheDocument();
    expect(screen.getByText('Priorité: 8/10')).toBeInTheDocument();
  });

  test('handles navigation suggestion clicks', async () => {
    const action = jest.fn();
    const suggestionsMock = {
      ...mockCipherMealPlanning,
      navigationSuggestions: [
        {
          type: 'reminder' as const,
          suggestion: 'Test suggestion',
          icon: '📅',
          priority: 9,
          action,
        },
      ],
    };
    
    (useCipherMealPlanning as any).mockReturnValue(suggestionsMock);
    renderWithProviders(<CipherMealPlanningPage />);
    
    const suggestionCard = screen.getByText('Test suggestion').closest('.cursor-pointer');
    fireEvent.click(suggestionCard!);
    
    await waitFor(() => {
      expect(action).toHaveBeenCalled();
      expect(mockCipherMealPlanning.handleSmartNavigation).toHaveBeenCalled();
    });
  });

  test('displays family adaptations when available', () => {
    const adaptationsMock = {
      ...mockCipherMealPlanning,
      hasFamilyAdaptations: true,
      familyAdaptations: {
        portion_multiplier: 1.5,
        excluded_ingredients: ['nuts', 'shellfish'],
        cooking_time_limit: 30,
      },
    };
    
    (useCipherMealPlanning as any).mockReturnValue(adaptationsMock);
    renderWithProviders(<CipherMealPlanningPage />);
    
    expect(screen.getByText('Adaptations Famille')).toBeInTheDocument();
    expect(screen.getByText('portion multiplier')).toBeInTheDocument();
    expect(screen.getByText('excluded ingredients')).toBeInTheDocument();
    expect(screen.getByText('cooking time limit')).toBeInTheDocument();
  });

  test('displays child-friendly UI when child profile is active', () => {
    const childMock = {
      ...mockCipherMealPlanning,
      currentProfile: {
        id: 'profile-2',
        name: 'Lucas',
        type: 'child' as const,
        age: 8,
        preferences: {},
        restrictions: {
          allowedSections: ['kitchen'],
          blockedFeatures: ['shopping'],
          requiresApproval: ['recipes'],
          allergenAlerts: ['nuts'],
        },
      },
    };
    
    (useCipherMealPlanning as any).mockReturnValue(childMock);
    renderWithProviders(<CipherMealPlanningPage />);
    
    expect(screen.getByText('Salut Lucas! Planifions des super repas ensemble!')).toBeInTheDocument();
    expect(screen.getByText('Créer la Magie!')).toBeInTheDocument();
  });
});
