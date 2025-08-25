/**
 * Contextual Theme Hook
 * Provides theme adjustments based on user context and activity
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMaterialYouTheme, ThemeContext } from '@/contexts/MaterialYouThemeContext';
import { useLocation } from 'react-router-dom';

export interface ContextualThemeConfig {
  autoDetect: boolean;
  userPreference?: ThemeContext;
  timeBasedSwitching: boolean;
  activityBasedSwitching: boolean;
  locationBasedSwitching: boolean;
}

export interface ThemeRecommendation {
  context: ThemeContext;
  reason: string;
  confidence: number;
}

export function useContextualTheme(config: Partial<ContextualThemeConfig> = {}) {
  const { theme, setThemeContext } = useMaterialYouTheme();
  const location = useLocation();
  const user = null; // Mock user for now - can be implemented later with auth
  
  const [currentActivity, setCurrentActivity] = useState<string>('browsing');
  const [recommendations, setRecommendations] = useState<ThemeRecommendation[]>([]);
  
  // Memoize options with stable reference
  const options = useMemo<ContextualThemeConfig>(() => ({
    autoDetect: true,
    timeBasedSwitching: true,
    activityBasedSwitching: true,
    locationBasedSwitching: false,
    ...config,
  }), [
    config.autoDetect,
    config.userPreference,
    config.timeBasedSwitching,
    config.activityBasedSwitching,
    config.locationBasedSwitching,
  ]);
  
  // Detect current activity based on route
  useEffect(() => {
    const path = location.pathname;
    
    if (path.includes('/scanner')) {
      setCurrentActivity('scanning');
    } else if (path.includes('/recipes')) {
      setCurrentActivity('browsing-recipes');
    } else if (path.includes('/shopping')) {
      setCurrentActivity('shopping');
    } else if (path.includes('/inventory')) {
      setCurrentActivity('managing-inventory');
    } else if (path.includes('/cooking') || path.includes('/meal')) {
      setCurrentActivity('cooking');
    } else {
      setCurrentActivity('browsing');
    }
  }, [location.pathname]);
  
  // Generate theme recommendations with stable callback
  const generateRecommendations = useCallback((): ThemeRecommendation[] => {
    const recs: ThemeRecommendation[] = [];
    const hour = new Date().getHours();
    
    // Time-based recommendations
    if (options.timeBasedSwitching) {
      if (hour >= 5 && hour < 11) {
        recs.push({
          context: 'breakfast',
          reason: 'Morning time - energizing breakfast theme',
          confidence: 0.9,
        });
      } else if (hour >= 11 && hour < 14) {
        recs.push({
          context: 'lunch',
          reason: 'Lunch time - balanced midday theme',
          confidence: 0.9,
        });
      } else if (hour >= 17 && hour < 21) {
        recs.push({
          context: 'dinner',
          reason: 'Evening time - relaxing dinner theme',
          confidence: 0.9,
        });
      } else if ((hour >= 14 && hour < 17) || (hour >= 21 && hour < 23)) {
        recs.push({
          context: 'snack',
          reason: 'Snack time - playful theme',
          confidence: 0.7,
        });
      }
    }
    
    // Activity-based recommendations
    if (options.activityBasedSwitching) {
      switch (currentActivity) {
        case 'scanning':
        case 'shopping':
          recs.push({
            context: 'shopping',
            reason: 'Shopping activity - focused theme',
            confidence: 0.8,
          });
          break;
        case 'cooking':
          recs.push({
            context: 'cooking',
            reason: 'Cooking mode - active theme',
            confidence: 0.8,
          });
          break;
        case 'browsing-recipes':
          // Recommend based on time if browsing recipes
          if (hour < 14) {
            recs.push({
              context: 'lunch',
              reason: 'Browsing recipes for lunch',
              confidence: 0.6,
            });
          } else {
            recs.push({
              context: 'dinner',
              reason: 'Browsing recipes for dinner',
              confidence: 0.6,
            });
          }
          break;
      }
    }
    
    // User preference overrides
    if (options.userPreference) {
      recs.unshift({
        context: options.userPreference,
        reason: 'User preference',
        confidence: 1.0,
      });
    }
    
    // Sort by confidence
    return recs.sort((a, b) => b.confidence - a.confidence);
  }, [options.timeBasedSwitching, options.activityBasedSwitching, options.userPreference, currentActivity]);
  
  // Auto-apply theme based on recommendations
  useEffect(() => {
    if (!options.autoDetect) return;
    
    const recs = generateRecommendations();
    setRecommendations(recs);
    
    // Apply highest confidence recommendation
    if (recs.length > 0 && recs[0].confidence >= 0.6) {
      const newContext = recs[0].context;
      // Only update if context actually changed to prevent infinite loops
      setThemeContext(prevContext => {
        if (prevContext !== newContext) {
          return newContext;
        }
        return prevContext;
      });
    }
  }, [options.autoDetect, generateRecommendations]); // Remove setThemeContext from deps
  
  // Manual theme override
  const overrideTheme = useCallback((context: ThemeContext) => {
    setThemeContext(context);
    // Store user preference
    if (user) {
      localStorage.setItem(`theme-preference-${user.id}`, context);
    }
  }, [setThemeContext, user]);
  
  // Get theme-specific UI adjustments
  const getThemeAdjustments = useCallback(() => {
    const adjustments = {
      breakfast: {
        iconStyle: 'rounded',
        spacing: 'relaxed',
        animations: 'energetic',
        emphasis: 'warm',
      },
      lunch: {
        iconStyle: 'sharp',
        spacing: 'balanced',
        animations: 'smooth',
        emphasis: 'fresh',
      },
      dinner: {
        iconStyle: 'rounded',
        spacing: 'comfortable',
        animations: 'gentle',
        emphasis: 'sophisticated',
      },
      snack: {
        iconStyle: 'rounded',
        spacing: 'compact',
        animations: 'playful',
        emphasis: 'fun',
      },
      shopping: {
        iconStyle: 'sharp',
        spacing: 'efficient',
        animations: 'quick',
        emphasis: 'focused',
      },
      cooking: {
        iconStyle: 'sharp',
        spacing: 'functional',
        animations: 'responsive',
        emphasis: 'active',
      },
      default: {
        iconStyle: 'rounded',
        spacing: 'balanced',
        animations: 'smooth',
        emphasis: 'neutral',
      },
    };
    
    return adjustments[theme.currentContext] || adjustments.default;
  }, [theme.currentContext]);
  
  // Get contextual color overrides
  const getContextualColors = useCallback(() => {
    const contextColors = theme.colors.contextual[theme.currentContext];
    
    if (!contextColors || theme.currentContext === 'default') {
      return null;
    }
    
    return {
      primary: contextColors.primary,
      secondary: contextColors.secondary,
      surface: contextColors.surface,
      background: contextColors.background,
      accent: contextColors.accent,
      mood: contextColors.mood,
    };
  }, [theme]);
  
  // Get animation duration multiplier based on context
  const getAnimationSpeed = useCallback((): number => {
    const speeds = {
      breakfast: 0.9,   // Slightly faster
      lunch: 1.0,       // Normal
      dinner: 1.2,      // Slightly slower
      snack: 0.8,       // Faster, playful
      shopping: 0.7,    // Quick, efficient
      cooking: 0.8,     // Responsive
      default: 1.0,     // Normal
    };
    
    return speeds[theme.currentContext] || 1.0;
  }, [theme.currentContext]);
  
  return {
    theme,
    currentContext: theme.currentContext,
    currentActivity,
    recommendations,
    overrideTheme,
    getThemeAdjustments,
    getContextualColors,
    getAnimationSpeed,
    isAutoDetecting: options.autoDetect,
  };
}