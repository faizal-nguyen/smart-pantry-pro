/**
 * Material You Theme Customizer
 * Allows users to customize their theme
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Camera, Sparkles, Check } from 'lucide-react';
import { useMaterialYouTheme, ThemeContext } from '@/contexts/MaterialYouThemeContext';
import { MaterialButton } from './Button';
import { MaterialCard, MaterialCardHeader, MaterialCardContent } from './Card';
import { cn } from '@/lib/utils';

export interface ThemeCustomizerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  allowImageUpload?: boolean;
  showContextSelector?: boolean;
}

const PRESET_COLORS = [
  { name: 'Fresh Teal', value: '#2DD4BF', mood: 'energetic' },
  { name: 'Warm Orange', value: '#F59E0B', mood: 'cozy' },
  { name: 'Berry Pink', value: '#EC4899', mood: 'playful' },
  { name: 'Ocean Blue', value: '#3B82F6', mood: 'calm' },
  { name: 'Forest Green', value: '#10B981', mood: 'natural' },
  { name: 'Sunset Purple', value: '#8B5CF6', mood: 'creative' },
  { name: 'Tomato Red', value: '#EF4444', mood: 'bold' },
  { name: 'Lemon Yellow', value: '#EAB308', mood: 'cheerful' },
];

const THEME_CONTEXTS: { value: ThemeContext; label: string; icon: string }[] = [
  { value: 'default', label: 'Auto', icon: '🎨' },
  { value: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { value: 'lunch', label: 'Lunch', icon: '☀️' },
  { value: 'dinner', label: 'Dinner', icon: '🌙' },
  { value: 'snack', label: 'Snack', icon: '🍿' },
  { value: 'shopping', label: 'Shopping', icon: '🛒' },
  { value: 'cooking', label: 'Cooking', icon: '👨‍🍳' },
];

export function ThemeCustomizer({
  open = false,
  onOpenChange,
  allowImageUpload = true,
  showContextSelector = true,
}: ThemeCustomizerProps) {
  const { 
    theme, 
    setSourceColor, 
    extractColorFromImage,
    setThemeContext,
    resetTheme,
    isLoading,
    error 
  } = useMaterialYouTheme();
  
  const [selectedTab, setSelectedTab] = useState<'colors' | 'image' | 'context'>('colors');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  const handleColorSelect = useCallback((color: string) => {
    setSourceColor(color);
  }, [setSourceColor]);
  
  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageUrl = e.target?.result as string;
      setUploadedImage(imageUrl);
      await extractColorFromImage(imageUrl);
    };
    reader.readAsDataURL(file);
  }, [extractColorFromImage]);
  
  const handleContextSelect = useCallback((context: ThemeContext) => {
    setThemeContext(context);
  }, [setThemeContext]);
  
  return (
    <>
      {/* Floating Action Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring' }}
      >
        <MaterialButton
          variant="filled"
          size="lg"
          icon={<Palette className="w-5 h-5" />}
          onClick={() => onOpenChange?.(!open)}
          className="rounded-full shadow-lg"
          style={{
            width: '56px',
            height: '56px',
            padding: 0,
          }}
        />
      </motion.div>
      
      {/* Customizer Panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onOpenChange?.(false)}
            />
            
            {/* Panel */}
            <motion.div
              className="fixed right-0 top-0 bottom-0 w-96 max-w-full bg-background z-50 shadow-2xl"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-6 border-b">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-primary" />
                    Material You Theme
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Personalize your Smart Pantry experience
                  </p>
                </div>
                
                {/* Tabs */}
                <div className="flex border-b">
                  <button
                    className={cn(
                      'flex-1 py-3 px-4 text-sm font-medium transition-colors',
                      selectedTab === 'colors' 
                        ? 'text-primary border-b-2 border-primary' 
                        : 'text-muted-foreground'
                    )}
                    onClick={() => setSelectedTab('colors')}
                  >
                    Colors
                  </button>
                  {allowImageUpload && (
                    <button
                      className={cn(
                        'flex-1 py-3 px-4 text-sm font-medium transition-colors',
                        selectedTab === 'image' 
                          ? 'text-primary border-b-2 border-primary' 
                          : 'text-muted-foreground'
                      )}
                      onClick={() => setSelectedTab('image')}
                    >
                      From Image
                    </button>
                  )}
                  {showContextSelector && (
                    <button
                      className={cn(
                        'flex-1 py-3 px-4 text-sm font-medium transition-colors',
                        selectedTab === 'context' 
                          ? 'text-primary border-b-2 border-primary' 
                          : 'text-muted-foreground'
                      )}
                      onClick={() => setSelectedTab('context')}
                    >
                      Context
                    </button>
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <AnimatePresence mode="wait">
                    {selectedTab === 'colors' && (
                      <motion.div
                        key="colors"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                      >
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Choose a color
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          {PRESET_COLORS.map((preset) => (
                            <motion.button
                              key={preset.value}
                              className={cn(
                                'relative p-4 rounded-lg border-2 transition-all',
                                theme.colors.source === preset.value
                                  ? 'border-primary'
                                  : 'border-transparent'
                              )}
                              onClick={() => handleColorSelect(preset.value)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-12 h-12 rounded-full shadow-sm"
                                  style={{ backgroundColor: preset.value }}
                                />
                                <div className="text-left">
                                  <div className="font-medium text-sm">
                                    {preset.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {preset.mood}
                                  </div>
                                </div>
                              </div>
                              {theme.colors.source === preset.value && (
                                <motion.div
                                  className="absolute top-2 right-2"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                >
                                  <Check className="w-4 h-4 text-primary" />
                                </motion.div>
                              )}
                            </motion.button>
                          ))}
                        </div>
                        
                        {/* Custom color picker */}
                        <div className="pt-4">
                          <label className="text-sm font-medium text-muted-foreground">
                            Custom color
                          </label>
                          <div className="mt-2 flex items-center gap-3">
                            <input
                              type="color"
                              value={theme.colors.source}
                              onChange={(e) => handleColorSelect(e.target.value)}
                              className="w-full h-12 rounded-lg cursor-pointer"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                    
                    {selectedTab === 'image' && allowImageUpload && (
                      <motion.div
                        key="image"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                      >
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Extract theme from your favorite food photo
                        </h3>
                        
                        {/* Upload area */}
                        <label className="relative block">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="sr-only"
                          />
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
                            <Camera className="w-12 h-12 mx-auto text-muted-foreground/50" />
                            <p className="mt-2 text-sm text-muted-foreground">
                              Click to upload an image
                            </p>
                            <p className="text-xs text-muted-foreground/75 mt-1">
                              PNG, JPG up to 10MB
                            </p>
                          </div>
                        </label>
                        
                        {/* Preview */}
                        {uploadedImage && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative rounded-lg overflow-hidden"
                          >
                            <img
                              src={uploadedImage}
                              alt="Theme source"
                              className="w-full h-48 object-cover"
                            />
                            {isLoading && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <div className="text-white text-sm">
                                  Extracting colors...
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                        
                        {error && (
                          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                            {error}
                          </div>
                        )}
                      </motion.div>
                    )}
                    
                    {selectedTab === 'context' && showContextSelector && (
                      <motion.div
                        key="context"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                      >
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Choose theme context
                        </h3>
                        <div className="space-y-2">
                          {THEME_CONTEXTS.map((context) => (
                            <motion.button
                              key={context.value}
                              className={cn(
                                'w-full p-3 rounded-lg border-2 text-left transition-all',
                                theme.currentContext === context.value
                                  ? 'border-primary bg-primary/5'
                                  : 'border-transparent hover:border-muted'
                              )}
                              onClick={() => handleContextSelect(context.value)}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{context.icon}</span>
                                  <span className="font-medium">{context.label}</span>
                                </div>
                                {theme.currentContext === context.value && (
                                  <Check className="w-4 h-4 text-primary" />
                                )}
                              </div>
                            </motion.button>
                          ))}
                        </div>
                        
                        <div className="pt-4 text-sm text-muted-foreground">
                          <p>
                            Themes adapt to your activity, providing the perfect ambiance 
                            for every moment of your culinary journey.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Footer */}
                <div className="p-6 border-t space-y-3">
                  <MaterialButton
                    variant="tonal"
                    fullWidth
                    onClick={resetTheme}
                  >
                    Reset to default
                  </MaterialButton>
                  <MaterialButton
                    variant="filled"
                    fullWidth
                    onClick={() => onOpenChange?.(false)}
                  >
                    Done
                  </MaterialButton>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default ThemeCustomizer;