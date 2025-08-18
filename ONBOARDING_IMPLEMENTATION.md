# Onboarding & Personalization Implementation (PRP-008)

## Overview

This implementation provides a comprehensive onboarding and personalization system for Smart Pantry Pro, following the specifications in PRP-008. The system includes a multi-step onboarding flow, interactive tutorial overlay, and personalization data management.

## Features Implemented

### ✅ Onboarding Flow
- **Welcome splash screen** with animated icons
- **Household setup** with family configuration questions
- **Dietary preferences** multi-select interface
- **Cooking level assessment** with interactive slider
- **Goals priority ranking** with drag-and-drop interface
- **Optional initial inventory scan** with camera integration
- **Smooth animations** using Framer Motion
- **Progress indicator** showing completion status
- **Skip options** where appropriate

### ✅ Interactive Tutorial
- **Overlay system** with element highlighting
- **Contextual tooltips** with gesture indicators
- **Progressive guidance** through key features
- **Skip and replay** functionality
- **Auto-trigger** after onboarding completion

### ✅ Personalization System
- **Persistent storage** of user preferences
- **Smart defaults** based on selections
- **Settings management** for updating preferences
- **Integration hooks** for consuming preferences across the app

## File Structure

```
src/
├── components/onboarding/
│   ├── OnboardingFlow.tsx          # Main orchestrator
│   ├── OnboardingStep.tsx          # Base step component
│   ├── SplashStep.tsx             # Welcome screens
│   ├── InteractiveStep.tsx        # Q&A interactions
│   ├── MultiSelectStep.tsx        # Multiple choice selections
│   ├── SliderStep.tsx             # Skill level assessment
│   ├── PriorityRankingStep.tsx    # Goal prioritization
│   ├── QuickScanStep.tsx          # Inventory scanning
│   ├── InteractiveTutorial.tsx    # Tutorial overlay
│   ├── TutorialTrigger.tsx        # Tutorial prompt
│   └── index.ts                   # Exports
├── components/settings/
│   └── PersonalizationSettings.tsx # Settings management
├── hooks/
│   ├── useOnboarding.ts           # Onboarding state management
│   ├── usePersonalization.ts      # User preferences
│   └── useTutorial.ts             # Tutorial state
├── types/
│   └── onboarding.ts              # TypeScript interfaces
├── config/
│   └── onboarding.ts              # Configuration & steps
└── pages/
    └── OnboardingPage.tsx         # Route handler
```

## Usage

### 1. Starting Onboarding

New users are automatically redirected to `/onboarding` when they first log in. The flow can also be restarted from settings:

```typescript
import { useOnboarding } from '@/hooks/useOnboarding';

const { restartOnboarding } = useOnboarding();
// This will clear all onboarding data and restart the flow
restartOnboarding();
```

### 2. Accessing Personalization Data

Use the personalization hook throughout the app to access user preferences:

```typescript
import { usePersonalization } from '@/hooks/usePersonalization';

const MyComponent = () => {
  const { 
    getHouseholdSize,
    getDietaryPreferences, 
    getCookingLevel,
    isVegetarian,
    hasCompletedOnboarding 
  } = usePersonalization();

  if (!hasCompletedOnboarding()) {
    // Handle non-personalized state
    return <div>Please complete onboarding</div>;
  }

  const cookingLevel = getCookingLevel(); // 0-1 scale
  const isVeg = isVegetarian(); // boolean
  
  return (
    <div>
      <p>Household: {getHouseholdSize()}</p>
      <p>Vegetarian: {isVeg ? 'Yes' : 'No'}</p>
    </div>
  );
};
```

### 3. Managing Tutorials

The tutorial system automatically shows after onboarding completion, but can be controlled programmatically:

```typescript
import { useTutorial } from '@/hooks/useTutorial';

const { startTutorial, shouldShowTutorial } = useTutorial();

// Start tutorial manually
startTutorial();

// Check if user needs tutorial
if (shouldShowTutorial()) {
  // Show tutorial trigger UI
}
```

### 4. Adding Tutorial Highlights

To make elements discoverable by the tutorial system, add the `data-tutorial` attribute:

```jsx
<button data-tutorial="add-product-button">
  Add Product
</button>
```

Configure the highlight in `/src/config/onboarding.ts`:

```typescript
{
  element: 'add-product-button',
  message: "Click here to add products to your inventory",
  gesture: 'tap',
  position: 'bottom'
}
```

## Configuration

### Onboarding Steps

Steps are configured in `/src/config/onboarding.ts`. Each step has:

- **type**: 'splash' | 'interactive' | 'multi-select' | 'slider' | 'priority-ranking' | 'quick-scan'
- **content**: Step-specific configuration
- **skipable**: Whether the step can be skipped
- **validation**: Custom validation logic

### Tutorial Highlights

Tutorial highlights are defined with:

- **element**: CSS selector or data-tutorial attribute value
- **message**: Guidance text to display
- **gesture**: Visual indicator ('tap', 'point', 'pulse', 'swipe')
- **position**: Tooltip placement ('top', 'bottom', 'left', 'right', 'center')

## Data Storage

### LocalStorage Keys

- `smart-pantry-onboarding`: Onboarding state and progress
- `smart-pantry-personalization`: User preferences and settings
- `smart-pantry-tutorial`: Tutorial completion status

### Data Format

```typescript
// Personalization Data
{
  householdSize: string;
  dietaryPreferences: string[];
  cookingLevel: number; // 0-1 scale
  goals: string[]; // Priority ordered
  initialInventoryScan?: boolean;
  onboardingCompletedAt: Date;
}

// Onboarding State
{
  currentStepIndex: number;
  answers: OnboardingAnswer[];
  isCompleted: boolean;
  hasStarted: boolean;
}
```

## Integration Points

### With Existing Features

1. **Recipe Filtering**: Use dietary preferences to filter recipes
2. **Household Size**: Adjust portion calculations
3. **Cooking Level**: Filter complexity of suggested recipes
4. **Goals**: Prioritize features (waste reduction, savings, etc.)

### Example Integration

```typescript
// In a recipe component
const { getDietaryPreferences, getCookingLevel } = usePersonalization();

const filteredRecipes = recipes.filter(recipe => {
  const prefs = getDietaryPreferences();
  const level = getCookingLevel();
  
  // Filter by dietary restrictions
  if (prefs.includes('vegetarian') && !recipe.isVegetarian) {
    return false;
  }
  
  // Filter by cooking complexity
  if (level < 0.33 && recipe.difficulty > 2) {
    return false;
  }
  
  return true;
});
```

## Styling & Animations

The onboarding system uses:

- **Framer Motion** for smooth transitions and animations
- **Tailwind CSS** for responsive design
- **shadcn/ui** components for consistency
- **Custom gradients** for visual appeal

### Key Animation Features

- Step transitions with slide effects
- Progress indicators with smooth updates
- Gesture animations for tutorial highlights
- Loading states with spinners
- Interactive hover effects

## Accessibility

- **Keyboard navigation** support
- **Screen reader** compatible
- **Focus management** during flows
- **Skip options** for all non-essential steps
- **High contrast** mode support

## Testing

The system includes comprehensive testing for:

- Onboarding flow completion
- Personalization data persistence
- Tutorial highlight positioning
- Navigation and routing
- Local storage management

## Future Enhancements

1. **Advanced Analytics**: Track completion rates and drop-off points
2. **A/B Testing**: Test different onboarding flows
3. **Dynamic Content**: Personalized based on usage patterns
4. **Social Integration**: Share preferences with family members
5. **Voice Guidance**: Audio instructions for accessibility

## Troubleshooting

### Common Issues

1. **Onboarding loops**: Clear localStorage keys if state becomes corrupted
2. **Tutorial not showing**: Check data-tutorial attributes on target elements
3. **Styling issues**: Ensure Framer Motion CSS is loaded
4. **Performance**: Lazy load heavy animation assets

### Debug Commands

```javascript
// Clear all onboarding data
localStorage.removeItem('smart-pantry-onboarding');
localStorage.removeItem('smart-pantry-personalization');
localStorage.removeItem('smart-pantry-tutorial');

// Force restart onboarding
window.location.href = '/onboarding';
```

This implementation provides a solid foundation for user onboarding and personalization, enhancing the overall user experience of Smart Pantry Pro while collecting valuable data to customize the app experience.