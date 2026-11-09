# Smart Shopping List (PRP-004) - Usage Guide

This document explains how to use the new Smart Shopping List feature implemented according to the PRP-004 specification.

## Overview

The Smart Shopping List feature transforms your regular shopping list into an intelligent, collaborative, and mobile-optimized shopping companion. It includes:

- **In-Store Shopping Mode** with large buttons, voice control, and haptic feedback
- **Store Section Organization** with automatic item sorting by store layout
- **Real-time Collaboration** for shared shopping lists
- **Smart Reordering** based on your shopping patterns
- **Progress Tracking** with visual indicators and statistics

## Quick Start

### 1. Using the Enhanced Shopping List

```tsx
import { EnhancedShoppingList } from '@/components/shopping';

function ShoppingPage() {
  return <EnhancedShoppingList />;
}
```

### 2. Activating In-Store Mode

1. Open your shopping list
2. Click the "Mode Magasin" button
3. The interface will switch to large buttons and touch-friendly controls
4. Use voice commands by tapping the microphone icon

### 3. Store Configuration

1. Click "Magasins" button in the header
2. Create custom store layouts or use the default template
3. Drag and drop sections to match your preferred shopping flow
4. Assign store sections to your items

## Components

### InStoreShopping

The main in-store shopping interface with mobile optimization.

```tsx
import { InStoreShopping } from '@/components/shopping';

<InStoreShopping
  items={shoppingItems}
  sections={storeSections}
  checkedItems={checkedItemsSet}
  config={inStoreConfig}
  collaborators={liveUsers}
  onItemCheck={handleItemCheck}
  onItemQuantityChange={handleQuantityChange}
  onExit={handleExitInStoreMode}
  onConfigChange={handleConfigUpdate}
/>
```

**Features:**
- Sticky header with progress tracking
- Large touch-friendly buttons
- Voice control integration
- Haptic feedback
- Real-time collaboration indicators
- Smart section navigation

### ShoppingSection

Organizes items by store sections with progress tracking.

```tsx
import { ShoppingSection } from '@/components/shopping';

<ShoppingSection
  section={storeSection}
  checkedItems={checkedItemsSet}
  inStoreMode={true}
  showPrices={true}
  currentSection={currentSectionId}
  onItemCheck={handleItemCheck}
  onSectionEnter={handleSectionEnter}
  onSectionExit={handleSectionExit}
/>
```

### InStoreItem

Individual shopping item optimized for in-store use.

```tsx
import { InStoreItem } from '@/components/shopping';

<InStoreItem
  item={shoppingItem}
  isChecked={isItemChecked}
  inStoreMode={true}
  showPrices={true}
  onCheck={handleItemCheck}
  onQuantityChange={handleQuantityChange}
  onVoiceCommand={handleVoiceCommand}
/>
```

### StoreLayoutManager

Configuration interface for managing store layouts and sections.

```tsx
import { StoreLayoutManager } from '@/components/shopping';

<StoreLayoutManager
  open={isManagerOpen}
  onOpenChange={setIsManagerOpen}
  onLayoutSelect={handleLayoutSelect}
/>
```

## Hooks

### useEnhancedShoppingList

Main hook for enhanced shopping list functionality.

```tsx
import { useEnhancedShoppingList } from '@/hooks/shopping';

const {
  shoppingList,
  sharedLists,
  activeList,
  inStoreMode,
  checkedItems,
  inStoreConfig,
  addToShoppingList,
  togglePurchased,
  toggleInStoreMode,
  updateInStoreConfig,
  getOptimalShoppingOrder,
  shareList,
  getTotalEstimatedCost,
  getSessionStats
} = useEnhancedShoppingList();
```

### useShoppingListRealtime

Real-time synchronization for collaborative shopping.

```tsx
import { useShoppingListRealtime } from '@/hooks/shopping';

const {
  liveUsers,
  isConnected,
  joinSession,
  leaveSession,
  updateCurrentSection,
  broadcastItemUpdate
} = useShoppingListRealtime({
  shoppingListId: activeList.id,
  onItemUpdate: handleItemUpdate,
  onUserJoined: handleUserJoined
});
```

### useShoppingPatterns

Smart reordering based on shopping behavior.

```tsx
import { useShoppingPatterns } from '@/hooks/shopping';

const {
  patterns,
  getOptimalOrder,
  recordSectionVisit,
  getUserShoppingFlow
} = useShoppingPatterns();
```

### useStoreLayout

Store configuration management.

```tsx
import { useStoreLayout } from '@/hooks/shopping';

const {
  layouts,
  activeLayout,
  createLayout,
  updateLayout,
  setDefaultLayout,
  addSection,
  updateSection
} = useStoreLayout();
```

### useHapticFeedback

Haptic feedback for mobile devices.

```tsx
import { useHapticFeedback } from '@/hooks/shopping';

const {
  vibrate,
  itemChecked,
  itemUnchecked,
  listCompleted,
  error
} = useHapticFeedback();
```

## Voice Commands

When in in-store mode with voice control enabled:

### Global Commands
- "suivant" / "next" - Move to next section
- "précédent" / "previous" - Move to previous section

### Item Commands
- "coché" / "acheté" / "pris" - Check/uncheck item
- "plus" / "+" - Increase quantity
- "moins" / "-" - Decrease quantity

## Configuration

### In-Store Mode Config

```tsx
const inStoreConfig: InStoreModeConfig = {
  features: {
    largeButtons: true,
    voiceCheck: true,
    hapticFeedback: true,
    keepScreenOn: true,
    progressBar: true,
    smartReorder: true
  },
  display: {
    checkedItems: 'strike-through', // 'hide' | 'move-bottom'
    showPrices: true,
    runningTotal: true
  }
};
```

### Store Sections

```tsx
const customSection: StoreSection = {
  id: 'custom-section',
  name: 'Rayon Custom',
  icon: '🛒',
  color: 'bg-blue-100 text-blue-700',
  order: 5
};
```

## Real-time Collaboration

### Sharing a List

```tsx
// Share with edit permissions
await shareList(listId, 'user@example.com', 'edit');

// Share with view-only permissions
await shareList(listId, 'user@example.com', 'view');

// Share with admin permissions
await shareList(listId, 'user@example.com', 'admin');
```

### Live Session Management

```tsx
// Join live shopping session
useEffect(() => {
  if (inStoreMode && activeList) {
    joinSession();
    return () => leaveSession();
  }
}, [inStoreMode, activeList]);

// Update current section
const handleSectionChange = (sectionId: string) => {
  updateCurrentSection(sectionId);
};

// Broadcast item changes
const handleItemUpdate = (item: ShoppingListItem) => {
  broadcastItemUpdate(item, 'updated');
};
```

## Error Handling

### Error Boundary

```tsx
import { ShoppingListErrorBoundary } from '@/components/shopping';

<ShoppingListErrorBoundary>
  <EnhancedShoppingList />
</ShoppingListErrorBoundary>
```

### Loading States

```tsx
import { ShoppingListSkeleton } from '@/components/shopping';

{loading ? (
  <ShoppingListSkeleton />
) : (
  <EnhancedShoppingList />
)}
```

## Database Setup

Run the migration to set up the enhanced shopping list tables:

```sql
-- Run this migration
supabase/migrations/20250818000001_smart_shopping_list_prp004.sql
```

This creates:
- `shared_shopping_lists` - Enhanced shopping lists with collaboration
- `store_layouts` - Store configuration templates
- `store_sections` - Individual store sections
- `shopping_list_collaborators` - List sharing permissions
- `shopping_patterns` - User shopping behavior data
- `live_shopping_sessions` - Real-time session tracking

## Mobile Optimization

The Smart Shopping List is designed with mobile-first principles:

- Large touch targets (44px minimum)
- Optimized for one-handed use
- Progressive Web App features
- Offline capability
- Wake lock support to keep screen active
- Haptic feedback on supported devices
- Voice control integration

## Accessibility

- ARIA labels for screen readers
- High contrast mode support
- Keyboard navigation
- Voice control as accessibility feature
- Large text and button options

## Performance

- Optimistic updates for instant feedback
- Real-time synchronization with conflict resolution
- Smart caching and offline support
- Lazy loading of components
- Virtualized lists for large shopping lists

## Examples

### Basic Shopping List Setup

```tsx
import React from 'react';
import { EnhancedShoppingList } from '@/components/shopping';
import { ShoppingListErrorBoundary } from '@/components/shopping';

export default function ShoppingPage() {
  return (
    <ShoppingListErrorBoundary>
      <EnhancedShoppingList />
    </ShoppingListErrorBoundary>
  );
}
```

### Custom In-Store Mode

```tsx
import React from 'react';
import { InStoreShopping } from '@/components/shopping';
import { useEnhancedShoppingList } from '@/hooks/shopping';

export default function CustomInStorePage() {
  const {
    shoppingList,
    checkedItems,
    inStoreConfig,
    togglePurchased,
    updateInStoreConfig
  } = useEnhancedShoppingList();

  return (
    <InStoreShopping
      items={shoppingList}
      sections={organizedSections}
      checkedItems={checkedItems}
      config={inStoreConfig}
      onItemCheck={togglePurchased}
      onConfigChange={updateInStoreConfig}
      onExit={() => window.history.back()}
    />
  );
}
```

## Best Practices

1. **Always use error boundaries** around shopping components
2. **Implement loading states** for better UX
3. **Test voice commands** on actual devices
4. **Optimize for offline use** with proper caching
5. **Use haptic feedback sparingly** to avoid fatigue
6. **Keep section names short** for better mobile display
7. **Test real-time features** with multiple users
8. **Implement proper conflict resolution** for shared lists

## Troubleshooting

### Common Issues

1. **Voice control not working**
   - Check browser permissions for microphone
   - Ensure HTTPS connection
   - Test on supported browsers (Chrome, Safari)

2. **Haptic feedback not working**
   - Check device support (iOS Safari, Android Chrome)
   - Ensure user has interacted with the page first

3. **Real-time sync issues**
   - Check network connection
   - Verify Supabase realtime is enabled
   - Check console for WebSocket errors

4. **Store sections not appearing**
   - Verify store layout migration has run
   - Check that items have store_section values
   - Ensure sections are properly configured

## Support

For issues or questions about the Smart Shopping List feature, please:

1. Check this usage guide first
2. Look at the component examples
3. Review the error logs in browser console
4. Submit an issue with detailed reproduction steps