# Material You Integration Guide for Smart Pantry Pro

This guide explains how to integrate and use the new Material You design system in Smart Pantry Pro.

## Overview

Material You (Material Design 3) brings dynamic, personalized theming to Smart Pantry Pro. The system adapts colors based on user preferences, food images, and contextual activities.

## Installation

1. Install the required dependency:
```bash
npm install @material/material-color-utilities
```

2. Import Material You CSS in your main app file:
```typescript
import '@/styles/material-you.css';
```

3. Wrap your app with the Material You theme provider:
```tsx
import { MaterialYouThemeProvider } from '@/contexts/MaterialYouThemeContext';

function App() {
  return (
    <MaterialYouThemeProvider>
      {/* Your app content */}
    </MaterialYouThemeProvider>
  );
}
```

## Usage

### Basic Theme Usage

```tsx
import { useMaterialYouTheme } from '@/contexts/MaterialYouThemeContext';

function MyComponent() {
  const { theme } = useMaterialYouTheme();
  
  return (
    <div style={{ 
      backgroundColor: theme.colorScheme?.styles.light.surface,
      color: theme.colorScheme?.styles.light.onSurface 
    }}>
      Content with Material You colors
    </div>
  );
}
```

### Material You Components

#### Button Component

```tsx
import { MaterialButton } from '@/components/ui/material/Button';
import { ShoppingCart } from 'lucide-react';

function Example() {
  return (
    <>
      {/* Elevated button */}
      <MaterialButton variant="elevated">
        Elevated Button
      </MaterialButton>
      
      {/* Filled button with icon */}
      <MaterialButton 
        variant="filled" 
        icon={<ShoppingCart className="w-4 h-4" />}
      >
        Add to Cart
      </MaterialButton>
      
      {/* Tonal button */}
      <MaterialButton variant="tonal" fullWidth>
        Full Width Tonal
      </MaterialButton>
      
      {/* Outlined button */}
      <MaterialButton variant="outlined">
        Outlined
      </MaterialButton>
      
      {/* Text button */}
      <MaterialButton variant="text">
        Text Only
      </MaterialButton>
    </>
  );
}
```

#### Card Component

```tsx
import { 
  MaterialCard, 
  MaterialCardHeader,
  MaterialCardContent,
  MaterialCardActions,
  FoodCard 
} from '@/components/ui/material/Card';

function RecipeCard() {
  return (
    <MaterialCard variant="elevated" interactive>
      <MaterialCardHeader>
        <h3>Delicious Recipe</h3>
      </MaterialCardHeader>
      <MaterialCardContent>
        <p>Recipe content here...</p>
      </MaterialCardContent>
      <MaterialCardActions>
        <MaterialButton variant="text">View</MaterialButton>
        <MaterialButton variant="filled">Cook Now</MaterialButton>
      </MaterialCardActions>
    </MaterialCard>
  );
}

// Food-specific card with status indicators
function InventoryItem() {
  return (
    <FoodCard 
      foodImage="/path/to/food.jpg"
      fresh={true}
    >
      <MaterialCardContent>
        <h4>Fresh Tomatoes</h4>
        <p>Expires in 3 days</p>
      </MaterialCardContent>
    </FoodCard>
  );
}
```

### Dynamic Color Extraction

Extract colors from food images to personalize the theme:

```tsx
import { useMaterialYouTheme } from '@/contexts/MaterialYouThemeContext';

function FoodImageUploader() {
  const { extractColorFromImage, isLoading } = useMaterialYouTheme();
  
  const handleImageSelect = async (imageUrl: string) => {
    await extractColorFromImage(imageUrl);
    // Theme will automatically update with extracted colors
  };
  
  return (
    <div>
      <input 
        type="file" 
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              handleImageSelect(e.target?.result as string);
            };
            reader.readAsDataURL(file);
          }
        }}
      />
      {isLoading && <p>Extracting colors...</p>}
    </div>
  );
}
```

### Contextual Themes

The theme automatically adapts based on time of day and user activity:

```tsx
import { useContextualTheme } from '@/hooks/useContextualTheme';

function ContextAwareComponent() {
  const { 
    currentContext, 
    overrideTheme,
    getContextualColors,
    recommendations 
  } = useContextualTheme();
  
  // Get context-specific colors
  const colors = getContextualColors();
  
  return (
    <div>
      <p>Current context: {currentContext}</p>
      
      {/* Show theme recommendations */}
      {recommendations.map((rec) => (
        <button
          key={rec.context}
          onClick={() => overrideTheme(rec.context)}
        >
          {rec.context} - {rec.reason}
        </button>
      ))}
      
      {/* Use contextual colors */}
      {colors && (
        <div style={{ backgroundColor: colors.accent }}>
          Contextual accent color
        </div>
      )}
    </div>
  );
}
```

### Theme Customizer

Add the theme customizer to let users personalize their experience:

```tsx
import { ThemeCustomizer } from '@/components/ui/material/ThemeCustomizer';

function App() {
  const [customizerOpen, setCustomizerOpen] = useState(false);
  
  return (
    <>
      <YourAppContent />
      
      <ThemeCustomizer 
        open={customizerOpen}
        onOpenChange={setCustomizerOpen}
        allowImageUpload={true}
        showContextSelector={true}
      />
    </>
  );
}
```

## CSS Variables

Material You tokens are available as CSS variables:

```css
/* Primary colors */
--md-sys-color-primary
--md-sys-color-on-primary
--md-sys-color-primary-container
--md-sys-color-on-primary-container

/* Surface colors */
--md-sys-color-surface
--md-sys-color-on-surface
--md-sys-color-surface-variant
--md-sys-color-on-surface-variant

/* Semantic food colors */
--md-sys-color-fresh
--md-sys-color-warm
--md-sys-color-indulgent

/* Motion tokens */
--md-sys-motion-duration-short4
--md-sys-motion-easing-standard

/* Elevation */
--md-sys-elevation-level1
--md-sys-elevation-level2
/* ... etc */
```

## TypeScript Support

All components and hooks are fully typed:

```typescript
import { MaterialButtonProps } from '@/components/ui/material/Button';
import { ThemeContext } from '@/contexts/MaterialYouThemeContext';
import { ContextualThemeConfig } from '@/hooks/useContextualTheme';
```

## Performance Considerations

1. **Color Extraction**: Color extraction from images is throttled and cached
2. **Theme Switching**: Theme changes use CSS variables for instant updates
3. **Motion**: Respects user's motion preferences automatically
4. **Bundle Size**: Material Color Utilities adds ~30KB to bundle (tree-shakeable)

## Migration from Existing Components

To migrate existing Shadcn/ui components to Material You:

```tsx
// Before
import { Button } from '@/components/ui/button';
<Button variant="default">Click me</Button>

// After
import { MaterialButton } from '@/components/ui/material/Button';
<MaterialButton variant="filled">Click me</MaterialButton>
```

## Best Practices

1. **Use semantic variants**: Choose button and card variants that match their purpose
2. **Leverage contextual themes**: Let the system adapt to user activities
3. **Extract from meaningful images**: Use high-quality food photos for best color extraction
4. **Respect user preferences**: Always provide manual theme controls
5. **Test accessibility**: Ensure color contrasts meet WCAG standards

## Examples

### Recipe Detail Page with Dynamic Theme

```tsx
function RecipeDetail({ recipe }) {
  const { extractColorFromImage } = useMaterialYouTheme();
  
  useEffect(() => {
    if (recipe.imageUrl) {
      extractColorFromImage(recipe.imageUrl);
    }
  }, [recipe.imageUrl]);
  
  return (
    <div className="recipe-detail">
      <img src={recipe.imageUrl} alt={recipe.name} />
      <MaterialCard variant="elevated">
        <MaterialCardHeader>
          <h1>{recipe.name}</h1>
        </MaterialCardHeader>
        <MaterialCardContent>
          {/* Recipe content */}
        </MaterialCardContent>
        <MaterialCardActions>
          <MaterialButton variant="filled">
            Start Cooking
          </MaterialButton>
        </MaterialCardActions>
      </MaterialCard>
    </div>
  );
}
```

### Shopping List with Contextual Theme

```tsx
function ShoppingList() {
  const { setThemeContext } = useMaterialYouTheme();
  
  useEffect(() => {
    // Set shopping context when entering shopping mode
    setThemeContext('shopping');
    
    return () => {
      // Reset to default when leaving
      setThemeContext('default');
    };
  }, []);
  
  return (
    <div className="shopping-list">
      {/* Shopping list UI with shopping-optimized theme */}
    </div>
  );
}
```

## Troubleshooting

### Colors not updating
- Ensure MaterialYouThemeProvider is at the app root
- Check browser console for extraction errors
- Verify image URLs are accessible (CORS)

### Performance issues
- Use lower quality setting for color extraction
- Implement debouncing for rapid theme changes
- Consider server-side color extraction for large images

### TypeScript errors
- Update TypeScript to version 4.5+
- Ensure all Material You types are imported

## Resources

- [Material Design 3 Guidelines](https://m3.material.io/)
- [Material Color Utilities](https://github.com/material-foundation/material-color-utilities)
- [Smart Pantry Design System](/docs/design-system.md)