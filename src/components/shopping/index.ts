// Core shopping components
export { default as InStoreShopping } from './InStoreShopping';
export { default as ShoppingSection } from './ShoppingSection';
export { default as InStoreItem } from './InStoreItem';
export { default as StoreLayoutManager } from './StoreLayoutManager';

// Existing components (re-export for compatibility)
export { default as AddShoppingItemDialog } from './AddShoppingItemDialog';
export { default as EditShoppingItemDialog } from './EditShoppingItemDialog';
export { default as ShoppingItemCard } from './ShoppingItemCard';

// Error handling and loading states
export { 
  ShoppingListErrorBoundary, 
  useErrorHandler 
} from './ShoppingListErrorBoundary';

export { 
  ShoppingListSkeleton,
  InStoreShoppingSkeleton,
  ShoppingSectionSkeleton,
  ShoppingListItemSkeleton,
  ShoppingListHeaderSkeleton,
  ShoppingListSearchSkeleton
} from './ShoppingListSkeleton';

// Enhanced shopping list page
export { default as EnhancedShoppingList } from '../pages/EnhancedShoppingList';