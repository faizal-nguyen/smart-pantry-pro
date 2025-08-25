# Smart Pantry Pro - Application Routing Map

## Debug Agent Navigation Guide

This document provides a comprehensive map of all routes and pages in the Smart Pantry Pro application for debug agent coordination.

## Primary Application Routes

### Core Pages
- **Home/Index** (`/`) - `src/pages/Index.tsx`
  - Main dashboard and entry point
  - Material You Implementation: ✅ Full integration via MaterialYouThemeProvider
  
- **Authentication** (`/auth`) - `src/pages/Auth.tsx`
  - User login and registration
  - Material You Implementation: ⚠️ Needs verification
  
- **Onboarding** (`/onboarding`) - `src/pages/OnboardingPage.tsx`
  - User setup and preferences
  - Material You Implementation: ⚠️ Needs verification

### Inventory Management
- **Inventory** (`/inventory`) - `src/pages/InventoryPage.tsx`
  - Product inventory management
  - Material You Implementation: ⚠️ Needs verification
  
- **Camera Scanner** (`/inventory/camera`) - `src/pages/inventory/CameraPage.tsx`
  - Camera-based product scanning
  - Material You Implementation: ⚠️ Needs verification

### Recipe Management
- **Recipes List** (`/recipes`) - `src/pages/RecipesPage.tsx`
  - Browse and search recipes
  - Material You Implementation: ⚠️ Needs verification
  
- **Recipe Detail** (`/recipes/:id`) - `src/pages/RecipeDetail.tsx`
  - Individual recipe view
  - Material You Implementation: ⚠️ Needs verification
  
- **Recipe Edit** (`/recipes/:id/edit`) - `src/pages/RecipeEdit.tsx`
  - Recipe editing interface
  - Material You Implementation: ⚠️ Needs verification
  
- **Recipe Seeding** (`/recipe-seeding`) - `src/pages/RecipeSeeding.tsx`
  - Development/admin recipe seeding
  - Material You Implementation: ⚠️ Needs verification

### Shopping
- **Smart Shopping List** (`/shopping`) - `src/pages/SmartShoppingList.tsx`
  - AI-enhanced shopping list
  - Material You Implementation: ⚠️ Needs verification
  
- **Classic Shopping List** (`/shopping-classic`) - `src/pages/ShoppingListPage.tsx`
  - Traditional shopping list
  - Material You Implementation: ⚠️ Needs verification

### AI Assistant
- **AI Assistant** (`/assistant`) - `src/pages/AssistantAI.tsx`
  - Main AI assistant interface
  - Material You Implementation: ⚠️ Needs verification
  
- **Legacy Assistant** (`/assistant-old`) - `src/pages/RecipeAssistant.tsx`
  - Legacy recipe assistant
  - Material You Implementation: ⚠️ Needs verification

### Analytics & Insights
- **Insights Dashboard** (`/insights`) - `src/pages/InsightsPage.tsx`
  - User analytics and insights
  - Material You Implementation: ⚠️ Needs verification

### Settings & Configuration
- **Settings** (`/settings`) - `src/pages/Settings.tsx`
  - Application settings
  - Material You Implementation: ⚠️ Needs verification

### Development & Testing
- **Material You Demo** (`/demo/material-you`) - `src/pages/MaterialYouDemo.tsx`
  - Material You component showcase
  - Material You Implementation: ✅ Full implementation with demo components
  
- **Material You Test** (`/test-material-you`) - `src/pages/TestMaterialYou.tsx`
  - Material You testing page
  - Material You Implementation: ⚠️ Needs verification
  
- **Video Import Test** (`/video-test`) - `src/pages/VideoImportTest.tsx`
  - Video import functionality testing
  - Material You Implementation: ⚠️ Needs verification

### Error Handling
- **404 Not Found** (`*`) - `src/pages/NotFound.tsx`
  - 404 error page
  - Material You Implementation: ⚠️ Needs verification

## Material You Implementation Status

### ✅ Fully Implemented
1. **Root Application** - `App.tsx` wraps entire app with MaterialYouThemeProvider
2. **Material You Demo** - `/demo/material-you` - Complete showcase of Material You components

### ⚠️ Verification Needed
The following pages need to be checked for proper Material You integration:

1. **Authentication Flow**
   - `/auth` - Auth.tsx
   - `/onboarding` - OnboardingPage.tsx

2. **Core Functionality**
   - `/` - Index.tsx (Home)
   - `/inventory` - InventoryPage.tsx
   - `/inventory/camera` - CameraPage.tsx
   - `/recipes` - RecipesPage.tsx
   - `/recipes/:id` - RecipeDetail.tsx
   - `/recipes/:id/edit` - RecipeEdit.tsx
   - `/shopping` - SmartShoppingList.tsx
   - `/shopping-classic` - ShoppingListPage.tsx

3. **AI & Insights**
   - `/assistant` - AssistantAI.tsx
   - `/assistant-old` - RecipeAssistant.tsx
   - `/insights` - InsightsPage.tsx

4. **Settings & Admin**
   - `/settings` - Settings.tsx
   - `/recipe-seeding` - RecipeSeeding.tsx

5. **Testing & Development**
   - `/test-material-you` - TestMaterialYou.tsx
   - `/video-test` - VideoImportTest.tsx

6. **Error Pages**
   - `*` (404) - NotFound.tsx

## Material You Components Available

### Core Components
- `MaterialButton` - `/src/components/ui/material/Button.tsx`
- `MaterialCard` - `/src/components/ui/material/Card.tsx`
- `ThemeCustomizer` - `/src/components/ui/material/ThemeCustomizer.tsx`
- `SimpleButton` - `/src/components/ui/material/SimpleButton.tsx`

### Context & Hooks
- `MaterialYouThemeProvider` - `/src/contexts/MaterialYouThemeContext.tsx`
- `useContextualTheme` - `/src/hooks/useContextualTheme.ts`
- `useMaterialYouTheme` - Available from MaterialYouThemeContext

### Services
- `DynamicColorEngine` - `/src/services/color/DynamicColorEngine.ts`
- `ColorExtractor` - `/src/services/color/ColorExtractor.ts`

## Bug Report Status

### ✅ Fixed Issues
1. **Button Functionality** - Material You buttons now have proper fallbacks and error handling
2. **Color Extraction Error** - Fixed hex color validation to handle 8-digit ARGB colors
3. **API Server Error** - Created missing parse-video-recipe.js file
4. **React Router Warning** - v7_startTransition flag properly configured

### 🔍 Next Steps
1. Systematic verification of Material You implementation across all pages
2. Ensure consistent theme application
3. Test contextual theme switching
4. Verify button functionality on all pages

## Debug Agent Coordination

### High Priority Pages to Verify
1. `/` - Home/Dashboard (most used)
2. `/inventory` - Core functionality
3. `/recipes` - Core functionality
4. `/shopping` - Core functionality
5. `/assistant` - AI features

### Medium Priority Pages
1. `/settings` - User preferences
2. `/insights` - Analytics
3. `/auth` - Authentication
4. `/onboarding` - User setup

### Low Priority Pages
1. Test and development pages
2. Legacy components
3. Admin tools

## Expected Material You Features

Each page should have:
1. **Theme Provider Wrapping** - Already handled at App.tsx level
2. **Material You Components** - Use MaterialButton, MaterialCard, etc.
3. **Contextual Theme Support** - Respond to meal time/activity context
4. **Dynamic Color Adaptation** - Support image-based color extraction
5. **Proper Fallbacks** - Graceful degradation if theme fails
6. **Accessibility** - High contrast support
7. **Motion** - Material 3 motion patterns

## Testing Checklist

For each page, verify:
- [ ] Material You theme is applied
- [ ] Buttons are clickable and responsive
- [ ] Colors adapt to context (breakfast/lunch/dinner/etc.)
- [ ] No console errors related to theming
- [ ] Proper fallbacks for missing theme properties
- [ ] Animations work correctly
- [ ] Theme customizer integration works

## Notes for Debug Agents

1. **Start with high-priority pages** for maximum impact
2. **Check console for errors** related to Material You components
3. **Test contextual theme switching** using the theme customizer
4. **Verify responsive behavior** on different screen sizes
5. **Test color extraction** from food images
6. **Ensure accessibility** features work properly

Last Updated: 2025-08-21
Status: In Progress - Systematic verification needed