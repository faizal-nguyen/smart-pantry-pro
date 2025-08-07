/**
 * Comprehensive test suite for AI Assistant implementation
 * Tests expiry alerts, context preparation, and core functionality
 */

import { renderHook, act } from '@testing-library/react';
import { useAIAssistant } from '../useAIAssistant';
import { useInventory } from '../useInventory';
import { useRecipes } from '../useRecipes';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('../useInventory');
jest.mock('../useRecipes');
jest.mock('@supabase/auth-helpers-react');
jest.mock('sonner');
jest.mock('@/services/ai/streamingAIService');
jest.mock('@/services/voice/frenchVoiceRecognition');

const mockUseInventory = useInventory as jest.MockedFunction<typeof useInventory>;
const mockUseRecipes = useRecipes as jest.MockedFunction<typeof useRecipes>;
const mockUseSupabaseClient = useSupabaseClient as jest.MockedFunction<typeof useSupabaseClient>;
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;
const mockToast = toast as jest.MockedFunction<typeof toast>;

// Mock fetch globally
global.fetch = jest.fn();

describe('useAIAssistant - Expiry Alerts Validation', () => {
  const mockSupabaseClient = {
    auth: {
      getSession: jest.fn()
    }
  };

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSupabaseClient.mockReturnValue(mockSupabaseClient as any);
    mockUseUser.mockReturnValue(mockUser as any);
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } }
    });
  });

  describe('Expiry Detection System', () => {
    it('should correctly identify expired products', () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // Yesterday

      const mockInventory = [
        {
          id: '1',
          product: { name: 'Lait' },
          quantity: 1,
          unit: 'L',
          expiry_date: expiredDate.toISOString()
        }
      ];

      mockUseInventory.mockReturnValue({
        inventory: mockInventory,
        loading: false,
        error: null
      } as any);

      mockUseRecipes.mockReturnValue({
        recipes: [],
        loading: false,
        error: null
      } as any);

      const { result } = renderHook(() => useAIAssistant());
      
      // Access the prepareContext function through sendMessage
      const context = (result.current as any).prepareContext();
      
      expect(context.expiryAlerts).toHaveLength(1);
      expect(context.expiryAlerts[0]).toEqual({
        product: 'Lait',
        daysUntil: -1,
        type: 'expired'
      });
    });

    it('should correctly identify critically expiring products (≤1 day)', () => {
      const criticalDate = new Date();
      criticalDate.setDate(criticalDate.getDate() + 1); // Tomorrow

      const mockInventory = [
        {
          id: '1',
          product: { name: 'Yaourt' },
          quantity: 4,
          unit: 'unités',
          expiry_date: criticalDate.toISOString()
        }
      ];

      mockUseInventory.mockReturnValue({
        inventory: mockInventory,
        loading: false,
        error: null
      } as any);

      mockUseRecipes.mockReturnValue({
        recipes: [],
        loading: false,
        error: null
      } as any);

      const { result } = renderHook(() => useAIAssistant());
      const context = (result.current as any).prepareContext();
      
      expect(context.expiryAlerts).toHaveLength(1);
      expect(context.expiryAlerts[0]).toEqual({
        product: 'Yaourt',
        daysUntil: 1,
        type: 'critical'
      });
    });

    it('should correctly identify warning products (2-3 days)', () => {
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() + 3); // In 3 days

      const mockInventory = [
        {
          id: '1',
          product: { name: 'Fromage' },
          quantity: 200,
          unit: 'g',
          expiry_date: warningDate.toISOString()
        }
      ];

      mockUseInventory.mockReturnValue({
        inventory: mockInventory,
        loading: false,
        error: null
      } as any);

      mockUseRecipes.mockReturnValue({
        recipes: [],
        loading: false,
        error: null
      } as any);

      const { result } = renderHook(() => useAIAssistant());
      const context = (result.current as any).prepareContext();
      
      expect(context.expiryAlerts).toHaveLength(1);
      expect(context.expiryAlerts[0]).toEqual({
        product: 'Fromage',
        daysUntil: 3,
        type: 'warning'
      });
    });

    it('should filter out products with expiry > 3 days', () => {
      const farFutureDate = new Date();
      farFutureDate.setDate(farFutureDate.getDate() + 7); // In 1 week

      const mockInventory = [
        {
          id: '1',
          product: { name: 'Conserve' },
          quantity: 1,
          unit: 'boîte',
          expiry_date: farFutureDate.toISOString()
        }
      ];

      mockUseInventory.mockReturnValue({
        inventory: mockInventory,
        loading: false,
        error: null
      } as any);

      mockUseRecipes.mockReturnValue({
        recipes: [],
        loading: false,
        error: null
      } as any);

      const { result } = renderHook(() => useAIAssistant());
      const context = (result.current as any).prepareContext();
      
      expect(context.expiryAlerts).toHaveLength(0);
    });

    it('should handle products without expiry dates', () => {
      const mockInventory = [
        {
          id: '1',
          product: { name: 'Farine' },
          quantity: 500,
          unit: 'g',
          expiry_date: null
        }
      ];

      mockUseInventory.mockReturnValue({
        inventory: mockInventory,
        loading: false,
        error: null
      } as any);

      mockUseRecipes.mockReturnValue({
        recipes: [],
        loading: false,
        error: null
      } as any);

      const { result } = renderHook(() => useAIAssistant());
      const context = (result.current as any).prepareContext();
      
      expect(context.expiryAlerts).toHaveLength(0);
    });

    it('should prioritize multiple expiry alerts by urgency', () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);
      
      const criticalDate = new Date();
      criticalDate.setDate(criticalDate.getDate() + 1);
      
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() + 2);

      const mockInventory = [
        {
          id: '1',
          product: { name: 'Lait expiré' },
          quantity: 1,
          unit: 'L',
          expiry_date: expiredDate.toISOString()
        },
        {
          id: '2',
          product: { name: 'Yaourt critique' },
          quantity: 1,
          unit: 'pot',
          expiry_date: criticalDate.toISOString()
        },
        {
          id: '3',
          product: { name: 'Fromage attention' },
          quantity: 1,
          unit: 'portion',
          expiry_date: warningDate.toISOString()
        }
      ];

      mockUseInventory.mockReturnValue({
        inventory: mockInventory,
        loading: false,
        error: null
      } as any);

      mockUseRecipes.mockReturnValue({
        recipes: [],
        loading: false,
        error: null
      } as any);

      const { result } = renderHook(() => useAIAssistant());
      const context = (result.current as any).prepareContext();
      
      expect(context.expiryAlerts).toHaveLength(3);
      
      // Check that all types are correctly identified
      const alertTypes = context.expiryAlerts.map((alert: any) => alert.type);
      expect(alertTypes).toContain('expired');
      expect(alertTypes).toContain('critical');
      expect(alertTypes).toContain('warning');
    });
  });

  describe('Context Preparation', () => {
    it('should limit inventory items to 30 for context size', () => {
      // Create 35 inventory items
      const mockInventory = Array.from({ length: 35 }, (_, i) => ({
        id: `${i + 1}`,
        product: { name: `Product ${i + 1}` },
        quantity: 1,
        unit: 'piece'
      }));

      mockUseInventory.mockReturnValue({
        inventory: mockInventory,
        loading: false,
        error: null
      } as any);

      mockUseRecipes.mockReturnValue({
        recipes: [],
        loading: false,
        error: null
      } as any);

      const { result } = renderHook(() => useAIAssistant());
      const context = (result.current as any).prepareContext();
      
      expect(context.inventory).toHaveLength(30);
    });

    it('should limit recipes to 20 for context size', () => {
      // Create 25 recipes
      const mockRecipes = Array.from({ length: 25 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Recipe ${i + 1}`,
        cuisine: 'Française'
      }));

      mockUseInventory.mockReturnValue({
        inventory: [],
        loading: false,
        error: null
      } as any);

      mockUseRecipes.mockReturnValue({
        recipes: mockRecipes,
        loading: false,
        error: null
      } as any);

      const { result } = renderHook(() => useAIAssistant());
      const context = (result.current as any).prepareContext();
      
      expect(context.recipes).toHaveLength(20);
    });

    it('should include current season in context', () => {
      mockUseInventory.mockReturnValue({
        inventory: [],
        loading: false,
        error: null
      } as any);

      mockUseRecipes.mockReturnValue({
        recipes: [],
        loading: false,
        error: null
      } as any);

      const { result } = renderHook(() => useAIAssistant());
      const context = (result.current as any).prepareContext();
      
      expect(context.season).toBeDefined();
      expect(['Printemps', 'Été', 'Automne', 'Hiver']).toContain(context.season);
    });

    it('should include French language preference', () => {
      mockUseInventory.mockReturnValue({
        inventory: [],
        loading: false,
        error: null
      } as any);

      mockUseRecipes.mockReturnValue({
        recipes: [],
        loading: false,
        error: null
      } as any);

      const { result } = renderHook(() => useAIAssistant());
      const context = (result.current as any).prepareContext();
      
      expect(context.language).toBe('fr-FR');
    });
  });

  describe('Error Handling', () => {
    it('should show error toast when user is not authenticated', async () => {
      mockUseUser.mockReturnValue(null);

      const { result } = renderHook(() => useAIAssistant());
      
      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      expect(mockToast.error).toHaveBeenCalledWith('Vous n\'êtes pas autorisé à effectuer cette action.');
    });

    it('should handle session errors gracefully', async () => {
      mockSupabaseClient.auth.getSession.mockRejectedValue(new Error('No session'));

      const { result } = renderHook(() => useAIAssistant());
      
      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      expect(result.current.error).toBe('No session');
    });

    it('should handle rate limiting responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        headers: {
          get: jest.fn().mockReturnValue('1640995200')
        }
      });

      const { result } = renderHook(() => useAIAssistant());
      
      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      expect(result.current.error).toContain('Trop de requêtes IA');
    });
  });
});

describe('useAIAssistant - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send correct context with expiry alerts to API', async () => {
    const criticalDate = new Date();
    criticalDate.setDate(criticalDate.getDate() + 1);

    const mockInventory = [
      {
        id: '1',
        product: { name: 'Lait critique' },
        quantity: 1,
        unit: 'L',
        expiry_date: criticalDate.toISOString()
      }
    ];

    mockUseInventory.mockReturnValue({
      inventory: mockInventory,
      loading: false,
      error: null
    } as any);

    mockUseRecipes.mockReturnValue({
      recipes: [{ id: '1', name: 'Pancakes', cuisine: 'Française' }],
      loading: false,
      error: null
    } as any);

    // Mock successful streaming response
    const mockReadableStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Bonjour!"}}]}\n\n'));
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      }
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: mockReadableStream
    });

    const { result } = renderHook(() => useAIAssistant());
    
    await act(async () => {
      await result.current.sendMessage('Que puis-je cuisiner?');
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/ai-assistant-enhanced', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: expect.stringContaining('"expiryAlerts"')
    });

    // Parse the body to check expiry alerts
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    
    expect(requestBody.context.expiryAlerts).toHaveLength(1);
    expect(requestBody.context.expiryAlerts[0]).toEqual({
      product: 'Lait critique',
      daysUntil: 1,
      type: 'critical'
    });
  });
});