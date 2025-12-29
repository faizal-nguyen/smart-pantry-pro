import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { InsightsDashboard } from '@/components/insights';
import AppNavigation from '@/components/navigation/AppNavigation';
import { AdaptiveHeroViewport, HeroVariants } from '@/components/layout/AdaptiveHeroViewport';
import { LayoutPerformanceProvider } from '@/components/performance/PerformanceMonitor';
import { BarChart3, TrendingUp, Target, Award } from 'lucide-react';

const InsightsPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };
    getUser();
  }, []);

  // Mock data for demonstration - would come from useInsightsData hook
  const dashboardStats = [
    { label: 'Économies', value: '€127', icon: <TrendingUp className="w-4 h-4" /> },
    { label: 'Objectifs', value: '3/5', icon: <Target className="w-4 h-4" /> },
    { label: 'Score', value: '92%', icon: <Award className="w-4 h-4" /> },
  ];

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (!user) {
    return <div>Non authentifié</div>;
  }
  
  return (
    <LayoutPerformanceProvider>
      <AppNavigation user={user}>
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
          
          {/* Dashboard Stats */}
          <motion.div
            className="grid gap-4 mt-8"
            style={{
              gridTemplateColumns: dashboardStats.length <= 3 ? 
                `repeat(${dashboardStats.length}, 1fr)` : 
                'repeat(auto-fit, minmax(120px, 1fr))'
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            {dashboardStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="stat-card bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center border border-white/20"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: 0.6 + index * 0.1,
                  duration: 0.4,
                  ease: [0.4, 0.0, 0.2, 1]
                }}
              >
                <div className="flex justify-center mb-2 text-white/80">
                  {stat.icon}
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-white/70">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AdaptiveHeroViewport>
        
        {/* Main Dashboard Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="container-primary pb-20"
        >
          <InsightsDashboard />
        </motion.div>
      </AppNavigation>
    </LayoutPerformanceProvider>
  );
};

export default InsightsPage;