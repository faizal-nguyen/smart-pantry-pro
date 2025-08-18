// Enhanced shopping list hooks
export { useEnhancedShoppingList } from '../useEnhancedShoppingList';
export { useShoppingListRealtime } from '../useShoppingListRealtime';
export { useShoppingPatterns } from '../useShoppingPatterns';
export { useStoreLayout } from '../useStoreLayoutLocal';
export { useHapticFeedback } from '../useHapticFeedback';

// Re-export original hook for backward compatibility
export { useShoppingList } from '../useShoppingList';

// Types
export type {
  ShoppingListItem,
  SharedShoppingList,
  StoreLayout,
  StoreSection,
  InStoreModeConfig,
  ShoppingPattern,
  LiveIndicator,
  ShoppingListRealtimeEvent,
  DEFAULT_STORE_SECTIONS,
  DEFAULT_IN_STORE_CONFIG
} from '../../types/shopping-list';