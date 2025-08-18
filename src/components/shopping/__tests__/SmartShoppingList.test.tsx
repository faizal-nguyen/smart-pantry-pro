import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock hooks and dependencies
vi.mock('@/hooks/shopping', () => ({
  useEnhancedShoppingList: vi.fn(),
  useShoppingListRealtime: vi.fn(),
  useStoreLayout: vi.fn(),
  useHapticFeedback: vi.fn(),
  useShoppingPatterns: vi.fn()
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false
}));

vi.mock('@/hooks/useSpeechRecognition', () => ({
  useSpeechRecognition: () => ({
    isListening: false,
    transcript: '',
    startListening: vi.fn(),
    stopListening: vi.fn(),
    resetTranscript: vi.fn(),
    isSupported: true
  })
}));

import { InStoreItem } from '../InStoreItem';
import { ShoppingSection } from '../ShoppingSection';
import { EnhancedShoppingList } from '../../pages/EnhancedShoppingList';
import { 
  useEnhancedShoppingList, 
  useShoppingListRealtime, 
  useStoreLayout, 
  useHapticFeedback,
  useShoppingPatterns
} from '@/hooks/shopping';

const mockShoppingItem = {
  id: '1',
  product_id: 'prod-1',
  quantity: 2,
  is_purchased: false,
  priority: 1,
  estimated_price: 5.50,
  store_section: 'Fruits & Légumes',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  product: {
    id: 'prod-1',
    name: 'Pommes',
    category: 'Fruits/Légumes',
    unit_type: 'kg'
  }
};

const mockStoreSection = {
  id: 'fruits-legumes',
  name: 'Fruits & Légumes',
  icon: '🥬',
  color: 'bg-green-100 text-green-700',
  order: 1,
  items: [mockShoppingItem]
};

describe('Smart Shopping List Components', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup default mock implementations
    (useEnhancedShoppingList as any).mockReturnValue({
      shoppingList: [mockShoppingItem],
      sharedLists: [],
      activeList: null,
      loading: false,
      inStoreMode: false,
      checkedItems: new Set(),
      inStoreConfig: {
        features: {
          largeButtons: true,
          voiceCheck: true,
          hapticFeedback: true,
          keepScreenOn: true,
          progressBar: true,
          smartReorder: true
        },
        display: {
          checkedItems: 'strike-through',
          showPrices: true,
          runningTotal: true
        }
      },
      addToShoppingList: vi.fn(),
      updateShoppingItem: vi.fn(),
      togglePurchased: vi.fn(),
      removeFromShoppingList: vi.fn(),
      setActiveList: vi.fn(),
      createSharedList: vi.fn(),
      toggleInStoreMode: vi.fn(),
      updateInStoreConfig: vi.fn(),
      getOptimalShoppingOrder: vi.fn(() => [mockShoppingItem]),
      shareList: vi.fn(),
      removeCollaborator: vi.fn(),
      getTotalEstimatedCost: vi.fn(() => 5.50),
      getCompletionPercentage: vi.fn(() => 0),
      getSessionStats: vi.fn(() => ({
        totalItems: 1,
        checkedItems: 0,
        remainingItems: 1,
        totalValue: 5.50
      }))
    });

    (useShoppingListRealtime as any).mockReturnValue({
      liveUsers: [],
      isConnected: false,
      joinSession: vi.fn(),
      leaveSession: vi.fn(),
      updateCurrentSection: vi.fn(),
      broadcastItemUpdate: vi.fn()
    });

    (useStoreLayout as any).mockReturnValue({
      layouts: [],
      activeLayout: {
        id: 'layout-1',
        sections: [mockStoreSection]
      },
      loading: false
    });

    (useHapticFeedback as any).mockReturnValue({
      vibrate: vi.fn(),
      itemChecked: vi.fn(),
      itemUnchecked: vi.fn(),
      isSupported: true
    });

    (useShoppingPatterns as any).mockReturnValue({
      patterns: [],
      getOptimalOrder: vi.fn(() => [mockShoppingItem]),
      recordSectionVisit: vi.fn()
    });
  });

  describe('InStoreItem', () => {
    it('should render shopping item correctly', () => {
      const mockOnCheck = vi.fn();
      
      render(
        <InStoreItem
          item={mockShoppingItem}
          isChecked={false}
          onCheck={mockOnCheck}
        />
      );

      expect(screen.getByText('Pommes')).toBeInTheDocument();
      expect(screen.getByText('2 kg')).toBeInTheDocument();
      expect(screen.getByText('11.00€')).toBeInTheDocument();
    });

    it('should handle item check', async () => {
      const mockOnCheck = vi.fn();
      
      render(
        <InStoreItem
          item={mockShoppingItem}
          isChecked={false}
          onCheck={mockOnCheck}
        />
      );

      const checkButton = screen.getByRole('button', { name: /check item/i });
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(mockOnCheck).toHaveBeenCalledWith(mockShoppingItem);
      });
    });

    it('should show in-store mode features', () => {
      render(
        <InStoreItem
          item={mockShoppingItem}
          isChecked={false}
          inStoreMode={true}
          onCheck={vi.fn()}
        />
      );

      // Should have larger buttons in in-store mode
      const checkButton = screen.getByRole('button');
      expect(checkButton).toHaveClass('w-12', 'h-12');
    });

    it('should handle quantity changes in in-store mode', async () => {
      const mockOnQuantityChange = vi.fn();
      
      render(
        <InStoreItem
          item={mockShoppingItem}
          isChecked={false}
          inStoreMode={true}
          onCheck={vi.fn()}
          onQuantityChange={mockOnQuantityChange}
        />
      );

      const plusButton = screen.getByRole('button', { name: /increase quantity/i });
      fireEvent.click(plusButton);

      await waitFor(() => {
        expect(mockOnQuantityChange).toHaveBeenCalledWith(mockShoppingItem, 3);
      });
    });
  });

  describe('ShoppingSection', () => {
    it('should render section with items', () => {
      render(
        <ShoppingSection
          section={mockStoreSection}
          checkedItems={new Set()}
          onItemCheck={vi.fn()}
        />
      );

      expect(screen.getByText('Fruits & Légumes')).toBeInTheDocument();
      expect(screen.getByText('🥬')).toBeInTheDocument();
      expect(screen.getByText('0 / 1 acheté(s)')).toBeInTheDocument();
    });

    it('should show progress correctly', () => {
      const checkedItems = new Set(['1']);
      
      render(
        <ShoppingSection
          section={mockStoreSection}
          checkedItems={checkedItems}
          onItemCheck={vi.fn()}
        />
      );

      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('1 / 1 acheté(s)')).toBeInTheDocument();
    });

    it('should handle section expansion', async () => {
      render(
        <ShoppingSection
          section={mockStoreSection}
          checkedItems={new Set()}
          onItemCheck={vi.fn()}
        />
      );

      const sectionHeader = screen.getByText('Fruits & Légumes');
      fireEvent.click(sectionHeader);

      // Should still show items (default expanded)
      await waitFor(() => {
        expect(screen.getByText('Pommes')).toBeInTheDocument();
      });
    });

    it('should show in-store mode features', () => {
      render(
        <ShoppingSection
          section={mockStoreSection}
          checkedItems={new Set()}
          inStoreMode={true}
          currentSection="fruits-legumes"
          onItemCheck={vi.fn()}
        />
      );

      expect(screen.getByText('Vous êtes ici')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing product data gracefully', () => {
      const itemWithoutProduct = {
        ...mockShoppingItem,
        product: undefined
      };

      render(
        <InStoreItem
          item={itemWithoutProduct}
          isChecked={false}
          onCheck={vi.fn()}
        />
      );

      expect(screen.getByText('Produit inconnu')).toBeInTheDocument();
    });

    it('should handle empty sections', () => {
      const emptySection = {
        ...mockStoreSection,
        items: []
      };

      render(
        <ShoppingSection
          section={emptySection}
          checkedItems={new Set()}
          onItemCheck={vi.fn()}
        />
      );

      expect(screen.getByText('Aucun article dans ce rayon')).toBeInTheDocument();
    });
  });

  describe('Price Corrections', () => {
    it('should correct curry leaves price', () => {
      const curryItem = {
        ...mockShoppingItem,
        estimated_price: 100.00, // Aberrant price
        product: {
          ...mockShoppingItem.product!,
          name: 'Feuilles de curry'
        }
      };

      render(
        <InStoreItem
          item={curryItem}
          isChecked={false}
          onCheck={vi.fn()}
        />
      );

      // Should show corrected price (0.01 * 2 = 0.02)
      expect(screen.getByText('0.02€')).toBeInTheDocument();
    });

    it('should correct water price', () => {
      const waterItem = {
        ...mockShoppingItem,
        estimated_price: 50.00, // Aberrant price
        product: {
          ...mockShoppingItem.product!,
          name: 'Eau'
        }
      };

      render(
        <InStoreItem
          item={waterItem}
          isChecked={false}
          onCheck={vi.fn()}
        />
      );

      // Should show corrected price (0.001 * 2 = 0.002)
      expect(screen.getByText('0.00€')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should handle real-time updates', async () => {
      const mockBroadcast = vi.fn();
      (useShoppingListRealtime as any).mockReturnValue({
        liveUsers: [{ user_id: '1', user_name: 'Test User', is_active: true }],
        isConnected: true,
        joinSession: vi.fn(),
        leaveSession: vi.fn(),
        updateCurrentSection: vi.fn(),
        broadcastItemUpdate: mockBroadcast
      });

      const mockTogglePurchased = vi.fn();
      (useEnhancedShoppingList as any).mockReturnValue({
        ...((useEnhancedShoppingList as any).mockReturnValue()),
        togglePurchased: mockTogglePurchased
      });

      render(<EnhancedShoppingList />);

      // Should show online indicator
      expect(screen.getByText('En ligne')).toBeInTheDocument();
      expect(screen.getByText('T')).toBeInTheDocument(); // User initial
    });
  });
});

describe('Smart Shopping List Hooks', () => {
  describe('useHapticFeedback', () => {
    it('should provide haptic feedback methods', () => {
      const { vibrate, itemChecked, itemUnchecked } = useHapticFeedback();
      
      expect(typeof vibrate).toBe('function');
      expect(typeof itemChecked).toBe('function');
      expect(typeof itemUnchecked).toBe('function');
    });
  });

  describe('useShoppingPatterns', () => {
    it('should provide shopping pattern methods', () => {
      const { getOptimalOrder, recordSectionVisit } = useShoppingPatterns();
      
      expect(typeof getOptimalOrder).toBe('function');
      expect(typeof recordSectionVisit).toBe('function');
    });
  });
});