import React from 'react';
import { motion } from 'framer-motion';
import { InsightsDashboard } from '@/components/insights';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { AdaptiveHeroViewport } from '@/components/layout/AdaptiveHeroViewport';
import { LayoutPerformanceProvider } from '@/components/performance/PerformanceMonitor';
import { BarChart3 } from 'lucide-react';

const InsightsPage: React.FC = () => {
  // PRP-238 PR2 — AuthenticatedLayout garantit l'auth.
  const user = useAuthenticatedUser();
  void user;

  // P1 polish: removed the mock dashboardStats (€127 économies, 3/5
  // objectifs, 92% score — all fabricated). The hero used to render
  // them above InsightsDashboard. Until a real useInsightsData hook
  // exists, drop the hero stats grid entirely; InsightsDashboard
  // below renders the actual user data.

  return (
    <LayoutPerformanceProvider>
      {/* Enhanced Hero Section with Golden Ratio */}
      <AdaptiveHeroViewport
          content={{ density: 'medium', hasImages: false }}
          context={{ mode: 'browsing' }}
          performanceMode="balanced"
          enableParallax={true}
          className="mb-8"
        >
          <motion.div
            className="hero-title-container"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.4, 0.0, 0.2, 1] }}
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <BarChart3 className="w-8 h-8 text-white" />
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                Insights Dashboard
              </h1>
            </div>
            <p className="text-lg md:text-xl text-white/90">
              Découvrez vos habitudes alimentaires et optimisez vos achats
            </p>
          </motion.div>
          
          {/* P1 polish: hero stats grid removed (was driven by mock
              dashboardStats — see comment above). InsightsDashboard
              below renders the real user data. */}
      </AdaptiveHeroViewport>

      {/* Main Dashboard Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="container-primary app-content"
      >
        <InsightsDashboard />
      </motion.div>
    </LayoutPerformanceProvider>
  );
};

export default InsightsPage;