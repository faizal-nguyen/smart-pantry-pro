/**
 * PRP-238 PR1 etape (b) — Hook public consommateur de ResponsiveContext.
 *
 * Throw si appele en dehors d'un ResponsiveProvider. Les anciens hooks
 * responsive (`useViewport`, `useBreakpoints`, `useResponsiveZones`,
 * `useAdaptiveHero`, `useHybridGrid`) sont retirés : un besoin responsive
 * passe par celui-ci au lieu d'installer son propre listener resize.
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
