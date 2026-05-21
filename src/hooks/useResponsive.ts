/**
 * PRP-238 PR1 etape (b) — Hook public consommateur de ResponsiveContext.
 *
 * Throw si appele en dehors d'un ResponsiveProvider. Tous les hooks
 * responsive legacy (`useViewport`, `useBreakpoints`, `useResponsiveZones`,
 * `useAdaptiveHero`, `useHybridGrid`, etc.) doivent passer par celui-ci
 * au lieu d'installer leur propre listener resize.
 */
import { useContext } from 'react';
import { ResponsiveContext, type ResponsiveContextValue } from '@/contexts/ResponsiveContext';

export function useResponsive(): ResponsiveContextValue {
  const ctx = useContext(ResponsiveContext);
  if (!ctx) {
    throw new Error('useResponsive must be used inside <ResponsiveProvider>');
  }
  return ctx;
}
