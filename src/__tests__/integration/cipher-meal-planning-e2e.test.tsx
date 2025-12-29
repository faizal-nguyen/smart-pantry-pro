import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import App from '@/App';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com'
            }
          }
        }
      }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
      signInWithEmail: jest.fn().mockResolvedValue({
        data: {
          user: { id: 'test-user-id', email: 'test@example.com' },
          session: { access_token: 'test-token' }
        },
        error: null
      })
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          dietary_restrictions: ['vegetarian'],
          family_size: 4,
          weekly_budget: 100
        }
      }),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockResolvedValue({ error: null })
    }))
  }
}));

// Mock crypto for encryption
global.crypto = {
  getRandomValues: jest.fn((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }),
  subtle: {
    encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
    decrypt: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
    generateKey: jest.fn().mockResolvedValue({}),
    digest: jest.fn().mockResolvedValue(new ArrayBuffer(32))
  }
} as any;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderApp = () => {
  const mockSupabaseClient = (supabase as any);
  
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionContextProvider supabaseClient={mockSupabaseClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SessionContextProvider>
    </QueryClientProvider>
  );
};

describe('Cipher Meal Planning E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset localStorage
    localStorage.clear();
  });

  test('complete meal planning flow with cipher encryption', async () => {
    renderApp();

    // Navigate to meal planning
    const mealPlanningLink = await screen.findByText(/Planification/i);
    fireEvent.click(mealPlanningLink);

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText(/Planification des Repas/i)).toBeInTheDocument();
    });

    // Check security status - should show not encrypted initially
    expect(screen.getByText(/Plan non chiffré/i)).toBeInTheDocument();

    // Generate a meal plan
    const generateButton = screen.getByRole('button', { name: /Générer Plan/i });
    fireEvent.click(generateButton);

    // Mock successful plan generation
    await waitFor(() => {
      expect(screen.queryByText(/Génération/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    // Encrypt the plan
    const encryptButton = screen.getByRole('button', { name: /Sécuriser/i });
    fireEvent.click(encryptButton);

    // Wait for encryption to complete
    await waitFor(() => {
      expect(screen.getByText(/Plan sécurisé avec Cipher/i)).toBeInTheDocument();
    });

    // Verify UI shows encrypted state
    expect(screen.getByText(/Chiffré/i)).toBeInTheDocument();
  });

  test('family mode integration with meal planning', async () => {
    // Mock family profiles
    const mockFamilyProfiles = [
      {
        id: 'parent-1',
        name: 'Marie',
        type: 'parent',
        age: 35,
        preferences: {},
        restrictions: {
          allowedSections: ['kitchen', 'pantry', 'shopping'],
          blockedFeatures: [],
          requiresApproval: [],
          allergenAlerts: []
        }
      },
      {
        id: 'child-1',
        name: 'Lucas',
        type: 'child',
        age: 8,
        preferences: {},
        restrictions: {
          allowedSections: ['kitchen'],
          blockedFeatures: ['shopping'],
          requiresApproval: ['recipes'],
          allergenAlerts: ['nuts']
        }
      }
    ];

    // Set family mode active in localStorage
    localStorage.setItem('family_mode_active', 'true');
    localStorage.setItem('family_profiles', JSON.stringify(mockFamilyProfiles));
    localStorage.setItem('current_profile', JSON.stringify(mockFamilyProfiles[0]));

    renderApp();

    // Navigate to meal planning
    const mealPlanningLink = await screen.findByText(/Planification/i);
    fireEvent.click(mealPlanningLink);

    // Wait for page with family mode
    await waitFor(() => {
      expect(screen.getByText(/Mode Famille/i)).toBeInTheDocument();
    });

    // Verify family profiles are shown
    expect(screen.getByText('Marie')).toBeInTheDocument();
    expect(screen.getByText('Lucas')).toBeInTheDocument();

    // Switch to child profile
    const lucasButton = screen.getByRole('button', { name: /Lucas/i });
    fireEvent.click(lucasButton);

    // Verify UI adapts for child
    await waitFor(() => {
      expect(screen.getByText(/Salut Lucas!/i)).toBeInTheDocument();
    });

    // Check child-friendly button text
    expect(screen.getByRole('button', { name: /Créer la Magie!/i })).toBeInTheDocument();
  });

  test('navigation intelligence suggestions', async () => {
    // Set time to Sunday evening for meal planning suggestion
    const mockDate = new Date('2025-01-05T18:00:00'); // Sunday 6 PM
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

    renderApp();

    // Navigate to meal planning
    const mealPlanningLink = await screen.findByText(/Planification/i);
    fireEvent.click(mealPlanningLink);

    // Wait for navigation suggestions
    await waitFor(() => {
      expect(screen.getByText(/C'est le moment idéal pour planifier/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Verify suggestion has priority indicator
    expect(screen.getByText(/Priorité: 9\/10/i)).toBeInTheDocument();

    // Click on suggestion
    const suggestionCard = screen.getByText(/C'est le moment idéal pour planifier/i).closest('[class*="cursor-pointer"]');
    if (suggestionCard) {
      fireEvent.click(suggestionCard);
    }

    // Restore Date
    jest.restoreAllMocks();
  });

  test('security panel interactions', async () => {
    renderApp();

    // Navigate to meal planning
    const mealPlanningLink = await screen.findByText(/Planification/i);
    fireEvent.click(mealPlanningLink);

    await waitFor(() => {
      expect(screen.getByText(/Planification des Repas/i)).toBeInTheDocument();
    });

    // Click on Security tab
    const securityTab = screen.getByRole('tab', { name: /Sécurité/i });
    fireEvent.click(securityTab);

    // Verify security content
    await waitFor(() => {
      expect(screen.getByText(/Sécurité Cipher/i)).toBeInTheDocument();
    });

    // Check encryption status message
    expect(screen.getByText(/Activez le chiffrement pour sécuriser vos données/i)).toBeInTheDocument();

    // Generate and encrypt a plan
    const contextTab = screen.getByRole('tab', { name: /Contexte/i });
    fireEvent.click(contextTab);

    const generateButton = screen.getByRole('button', { name: /Générer Plan/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      const encryptButton = screen.getByRole('button', { name: /Sécuriser/i });
      fireEvent.click(encryptButton);
    });

    // Go back to security tab
    fireEvent.click(securityTab);

    // Verify encrypted status
    await waitFor(() => {
      expect(screen.getByText(/Vos données sont chiffrées avec AES-256-GCM/i)).toBeInTheDocument();
    });
  });

  test('family adaptations display', async () => {
    // Set up family mode with adaptations
    localStorage.setItem('family_mode_active', 'true');
    localStorage.setItem('family_adaptations', JSON.stringify({
      portion_multiplier: 1.5,
      excluded_ingredients: ['nuts', 'shellfish'],
      cooking_time_limit: 30
    }));

    renderApp();

    // Navigate to meal planning
    const mealPlanningLink = await screen.findByText(/Planification/i);
    fireEvent.click(mealPlanningLink);

    // Generate a plan to trigger adaptations
    await waitFor(() => {
      const generateButton = screen.getByRole('button', { name: /Générer Plan/i });
      fireEvent.click(generateButton);
    });

    // Check for adaptations panel
    await waitFor(() => {
      expect(screen.getByText(/Adaptations Famille/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Verify adaptation details
    expect(screen.getByText(/portion multiplier/i)).toBeInTheDocument();
    expect(screen.getByText(/excluded ingredients/i)).toBeInTheDocument();
    expect(screen.getByText(/cooking time limit/i)).toBeInTheDocument();
  });

  test('shopping list generation from encrypted plan', async () => {
    renderApp();

    // Navigate to meal planning
    const mealPlanningLink = await screen.findByText(/Planification/i);
    fireEvent.click(mealPlanningLink);

    await waitFor(() => {
      expect(screen.getByText(/Planification des Repas/i)).toBeInTheDocument();
    });

    // Generate and encrypt a plan
    const generateButton = screen.getByRole('button', { name: /Générer Plan/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      const encryptButton = screen.getByRole('button', { name: /Sécuriser/i });
      fireEvent.click(encryptButton);
    });

    // Navigate to shopping tab
    const shoppingTab = screen.getByRole('tab', { name: /Courses/i });
    fireEvent.click(shoppingTab);

    // Verify shopping list preview
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Exporter vers la liste/i })).toBeInTheDocument();
    });

    // Click export button
    const exportButton = screen.getByRole('button', { name: /Exporter vers la liste/i });
    fireEvent.click(exportButton);

    // Should navigate to shopping page
    await waitFor(() => {
      expect(window.location.pathname).toContain('/shopping');
    });
  });
});