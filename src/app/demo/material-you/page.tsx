'use client';

import React, { useState } from 'react';
import { MaterialYouThemeProvider } from '@/contexts/MaterialYouThemeContext';
import { ThemeCustomizer } from '@/components/ui/material/ThemeCustomizer';
import { MaterialButton } from '@/components/ui/material/Button';
import { 
  MaterialCard, 
  MaterialCardHeader, 
  MaterialCardContent, 
  MaterialCardActions,
  FoodCard 
} from '@/components/ui/material/Card';
import { useContextualTheme } from '@/hooks/useContextualTheme';
import { 
  ShoppingCart, 
  ChefHat, 
  Camera, 
  Palette, 
  Sun, 
  Moon, 
  Coffee,
  Utensils,
  Cookie
} from 'lucide-react';

function MaterialYouDemo() {
  const [customizerOpen, setCustomizerOpen] = useState(true);
  
  return (
    <MaterialYouThemeProvider>
      <div className="min-h-screen bg-background">
        <DemoContent />
        <ThemeCustomizer 
          open={customizerOpen}
          onOpenChange={setCustomizerOpen}
        />
      </div>
    </MaterialYouThemeProvider>
  );
}

function DemoContent() {
  const { 
    currentContext, 
    recommendations,
    overrideTheme,
    getContextualColors 
  } = useContextualTheme();
  
  const contextColors = getContextualColors();
  
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">
          Material You Design System
        </h1>
        <p className="text-lg text-muted-foreground">
          Dynamic theming for Smart Pantry Pro
        </p>
      </header>
      
      {/* Current Context Display */}
      <MaterialCard variant="filled" className="mb-8">
        <MaterialCardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Current Theme Context</h3>
              <p className="text-sm text-muted-foreground">
                The theme adapts to your activity and time of day
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold capitalize">{currentContext}</div>
              {contextColors && (
                <div className="flex gap-2 mt-2 justify-end">
                  <div 
                    className="w-6 h-6 rounded-full" 
                    style={{ backgroundColor: contextColors.primary }}
                  />
                  <div 
                    className="w-6 h-6 rounded-full" 
                    style={{ backgroundColor: contextColors.secondary }}
                  />
                  <div 
                    className="w-6 h-6 rounded-full" 
                    style={{ backgroundColor: contextColors.accent }}
                  />
                </div>
              )}
            </div>
          </div>
        </MaterialCardContent>
      </MaterialCard>
      
      {/* Context Recommendations */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Theme Recommendations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendations.slice(0, 3).map((rec) => (
            <MaterialCard 
              key={rec.context}
              variant="outlined"
              interactive
              onClick={() => overrideTheme(rec.context)}
              className="cursor-pointer"
            >
              <MaterialCardContent>
                <div className="flex items-center gap-3 mb-2">
                  {getContextIcon(rec.context)}
                  <h3 className="font-semibold capitalize">{rec.context}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{rec.reason}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Confidence: {Math.round(rec.confidence * 100)}%
                  </span>
                  <MaterialButton variant="text" size="sm">
                    Apply
                  </MaterialButton>
                </div>
              </MaterialCardContent>
            </MaterialCard>
          ))}
        </div>
      </section>
      
      {/* Button Variants */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Button Variants</h2>
        <div className="flex flex-wrap gap-4">
          <MaterialButton variant="elevated">
            Elevated
          </MaterialButton>
          <MaterialButton variant="filled">
            Filled
          </MaterialButton>
          <MaterialButton variant="tonal">
            Tonal
          </MaterialButton>
          <MaterialButton variant="outlined">
            Outlined
          </MaterialButton>
          <MaterialButton variant="text">
            Text
          </MaterialButton>
        </div>
        
        <h3 className="text-lg font-semibold mt-6 mb-4">With Icons</h3>
        <div className="flex flex-wrap gap-4">
          <MaterialButton 
            variant="filled" 
            icon={<ShoppingCart className="w-4 h-4" />}
          >
            Add to Cart
          </MaterialButton>
          <MaterialButton 
            variant="tonal" 
            icon={<ChefHat className="w-4 h-4" />}
          >
            Start Cooking
          </MaterialButton>
          <MaterialButton 
            variant="outlined" 
            icon={<Camera className="w-4 h-4" />}
            iconPosition="end"
          >
            Scan Product
          </MaterialButton>
        </div>
        
        <h3 className="text-lg font-semibold mt-6 mb-4">Sizes</h3>
        <div className="flex flex-wrap items-center gap-4">
          <MaterialButton variant="filled" size="sm">
            Small
          </MaterialButton>
          <MaterialButton variant="filled" size="default">
            Default
          </MaterialButton>
          <MaterialButton variant="filled" size="lg">
            Large
          </MaterialButton>
        </div>
      </section>
      
      {/* Card Examples */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Card Components</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Recipe Card */}
          <MaterialCard variant="elevated" interactive>
            <MaterialCardHeader>
              <h3 className="text-lg font-semibold">Pasta Carbonara</h3>
              <p className="text-sm text-muted-foreground">Italian Classic</p>
            </MaterialCardHeader>
            <MaterialCardContent>
              <img 
                src="https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400&h=200&fit=crop" 
                alt="Pasta"
                className="w-full h-32 object-cover rounded-lg mb-3"
              />
              <p className="text-sm">
                Creamy pasta with bacon, eggs, and parmesan cheese.
              </p>
            </MaterialCardContent>
            <MaterialCardActions>
              <MaterialButton variant="text">View Recipe</MaterialButton>
              <MaterialButton variant="filled">Cook Now</MaterialButton>
            </MaterialCardActions>
          </MaterialCard>
          
          {/* Inventory Item */}
          <FoodCard 
            foodImage="https://images.unsplash.com/photo-1546548970-71785318a17b?w=400&h=200&fit=crop"
            fresh={true}
          >
            <MaterialCardHeader>
              <h3 className="text-lg font-semibold">Fresh Tomatoes</h3>
              <p className="text-sm text-muted-foreground">2 kg remaining</p>
            </MaterialCardHeader>
            <MaterialCardContent>
              <div className="flex justify-between items-center">
                <span className="text-sm">Expires in 3 days</span>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                  Fresh
                </span>
              </div>
            </MaterialCardContent>
          </FoodCard>
          
          {/* Shopping List Item */}
          <MaterialCard variant="outlined">
            <MaterialCardHeader>
              <h3 className="text-lg font-semibold">Shopping List</h3>
              <p className="text-sm text-muted-foreground">12 items</p>
            </MaterialCardHeader>
            <MaterialCardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Milk - 2L</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Bread - 1 loaf</span>
                </li>
                <li className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Eggs - 12 pack</span>
                </li>
              </ul>
            </MaterialCardContent>
            <MaterialCardActions>
              <MaterialButton variant="tonal" fullWidth>
                Go Shopping
              </MaterialButton>
            </MaterialCardActions>
          </MaterialCard>
        </div>
      </section>
      
      {/* Interactive Demo */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Interactive Elements</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MaterialCard variant="filled">
            <MaterialCardContent>
              <h3 className="text-lg font-semibold mb-4">Try Different Contexts</h3>
              <div className="grid grid-cols-2 gap-3">
                <MaterialButton 
                  variant="outlined"
                  icon={<Coffee className="w-4 h-4" />}
                  onClick={() => overrideTheme('breakfast')}
                >
                  Breakfast
                </MaterialButton>
                <MaterialButton 
                  variant="outlined"
                  icon={<Sun className="w-4 h-4" />}
                  onClick={() => overrideTheme('lunch')}
                >
                  Lunch
                </MaterialButton>
                <MaterialButton 
                  variant="outlined"
                  icon={<Moon className="w-4 h-4" />}
                  onClick={() => overrideTheme('dinner')}
                >
                  Dinner
                </MaterialButton>
                <MaterialButton 
                  variant="outlined"
                  icon={<Cookie className="w-4 h-4" />}
                  onClick={() => overrideTheme('snack')}
                >
                  Snack
                </MaterialButton>
                <MaterialButton 
                  variant="outlined"
                  icon={<ShoppingCart className="w-4 h-4" />}
                  onClick={() => overrideTheme('shopping')}
                >
                  Shopping
                </MaterialButton>
                <MaterialButton 
                  variant="outlined"
                  icon={<Utensils className="w-4 h-4" />}
                  onClick={() => overrideTheme('cooking')}
                >
                  Cooking
                </MaterialButton>
              </div>
            </MaterialCardContent>
          </MaterialCard>
          
          <MaterialCard variant="elevated">
            <MaterialCardContent>
              <h3 className="text-lg font-semibold mb-4">Dynamic States</h3>
              <div className="space-y-3">
                <MaterialButton variant="filled" fullWidth disabled>
                  Disabled State
                </MaterialButton>
                <MaterialButton variant="tonal" fullWidth>
                  Hover Me for Effect
                </MaterialButton>
                <MaterialButton variant="elevated" fullWidth>
                  Click for Ripple
                </MaterialButton>
              </div>
            </MaterialCardContent>
          </MaterialCard>
        </div>
      </section>
    </div>
  );
}

function getContextIcon(context: string) {
  const icons = {
    breakfast: <Coffee className="w-5 h-5" />,
    lunch: <Sun className="w-5 h-5" />,
    dinner: <Moon className="w-5 h-5" />,
    snack: <Cookie className="w-5 h-5" />,
    shopping: <ShoppingCart className="w-5 h-5" />,
    cooking: <Utensils className="w-5 h-5" />,
    default: <Palette className="w-5 h-5" />,
  };
  
  return icons[context as keyof typeof icons] || icons.default;
}

export default MaterialYouDemo;