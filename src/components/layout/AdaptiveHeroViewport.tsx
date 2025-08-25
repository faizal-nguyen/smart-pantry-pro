/**
 * Adaptive Hero Viewport Component
 * Implements intelligent content density awareness with golden ratio proportions
 * Based on PRP-022-Layout-Optimization specification
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdaptiveHero } from '@/hooks/useResponsiveZones';
import { cn } from '@/lib/utils';

export interface ContentDensity {
  density: 'low' | 'medium' | 'high';
  itemCount?: number;
  hasImages?: boolean;
  hasVideo?: boolean;
}

export interface UserContext {
  mode: 'cooking' | 'shopping' | 'browsing';
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
  previousActions?: string[];
}

interface AdaptiveHeroProps {
  content: ContentDensity;
  context: UserContext;
  performanceMode?: 'high' | 'balanced' | 'low';
  children: React.ReactNode;
  enableParallax?: boolean;
  className?: string;
}

interface ConditionalParallaxProps {
  enabled: boolean;
  children: React.ReactNode;
}

const ConditionalParallax: React.FC<ConditionalParallaxProps> = ({ enabled, children }) => {
  const [scrollY, setScrollY] = useState(0);
  
  useEffect(() => {
    if (!enabled) return;
    
    const updateScrollY = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', updateScrollY, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollY);
  }, [enabled]);
  
  if (!enabled) {
    return <div className="hero-background">{children}</div>;
  }
  
  return (
    <motion.div
      className="hero-background"
      style={{
        transform: `translateY(${scrollY * 0.5}px)`,
      }}
      transition={{ type: 'tween', ease: 'linear' }}
    >
      {children}
    </motion.div>
  );
};

interface ResponsiveTitleProps {
  ratio: number;
  title?: string;
  subtitle?: string;
}

const ResponsiveTitle: React.FC<ResponsiveTitleProps> = ({ 
  ratio, 
  title = "Smart Pantry Pro",
  subtitle 
}) => {
  // Scale title size based on hero height ratio
  const titleScale = Math.max(0.8, Math.min(1.2, ratio * 1.5));
  
  return (
    <motion.div
      className="hero-title-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0.0, 0.2, 1] }}
    >
      <motion.h1
        className="hero-title text-4xl md:text-5xl lg:text-6xl font-bold text-white"
        style={{
          transform: `scale(${titleScale})`,
          transformOrigin: 'center top',
        }}
      >
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p
          className="hero-subtitle text-lg md:text-xl text-white/90 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
};

interface AdaptiveStatsProps {
  density: 'low' | 'medium' | 'high';
  stats?: Array<{ label: string; value: string | number; icon?: React.ReactNode }>;
}

const AdaptiveStats: React.FC<AdaptiveStatsProps> = ({ density, stats = [] }) => {
  // Adjust stats display based on content density
  const maxStatsToShow = {
    low: 4,
    medium: 3,
    high: 2,
  }[density];
  
  const visibleStats = stats.slice(0, maxStatsToShow);
  
  if (visibleStats.length === 0) return null;
  
  return (
    <motion.div
      className={cn(
        "hero-stats grid gap-4 mt-6",
        density === 'low' && "grid-cols-2 md:grid-cols-4",
        density === 'medium' && "grid-cols-1 md:grid-cols-3",
        density === 'high' && "grid-cols-1 md:grid-cols-2"
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.6, ease: [0.4, 0.0, 0.2, 1] }}
    >
      {visibleStats.map((stat, index) => (
        <motion.div
          key={`stat-${index}`}
          className="stat-card bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 0.8 + index * 0.1,
            duration: 0.4,
            ease: [0.4, 0.0, 0.2, 1]
          }}
        >
          {stat.icon && (
            <div className="stat-icon text-white/80 mb-1 flex justify-center">
              {stat.icon}
            </div>
          )}
          <div className="stat-value text-lg font-semibold text-white">
            {stat.value}
          </div>
          <div className="stat-label text-sm text-white/70">
            {stat.label}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export const AdaptiveHeroViewport: React.FC<AdaptiveHeroProps> = ({
  content,
  context,
  performanceMode = 'balanced',
  children,
  enableParallax = false,
  className,
}) => {
  const { heroHeight, heroHeightVh, heroClassName } = useAdaptiveHero(
    content.density,
    context.mode,
    performanceMode
  );
  
  // Determine if parallax should be enabled based on performance mode and user preferences
  const shouldEnableParallax = enableParallax && performanceMode === 'high' && 
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  return (
    <motion.section
      className={cn(
        "adaptive-hero-viewport relative overflow-hidden",
        "bg-gradient-to-br from-primary via-primary/90 to-secondary",
        heroClassName,
        className
      )}
      style={{
        height: heroHeightVh,
        minHeight: `${Math.max(200, heroHeight * 0.8)}px`, // Ensure minimum usable height
      }}
      data-density={content.density}
      data-context={context.mode}
      data-performance={performanceMode}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.4, 0.0, 0.2, 1] }}
    >
      {/* Progressive enhancement for parallax */}
      <ConditionalParallax enabled={shouldEnableParallax}>
        <div className="hero-background-layer absolute inset-0">
          {/* Food-themed background pattern */}
          <div className="hero-pattern absolute inset-0 opacity-10">
            <svg width="100%" height="100%" viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <pattern id="food-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="10" cy="10" r="2" fill="currentColor" opacity="0.3" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#food-pattern)" />
            </svg>
          </div>
        </div>
      </ConditionalParallax>
      
      {/* Content Layer */}
      <div className="hero-content-layer relative z-10 h-full flex flex-col justify-center items-center text-center px-6">
        {children}
      </div>
      
      {/* Context-aware gradient overlay */}
      <div 
        className={cn(
          "hero-overlay absolute inset-0 pointer-events-none",
          context.mode === 'cooking' && "bg-gradient-to-t from-orange-500/20 to-transparent",
          context.mode === 'shopping' && "bg-gradient-to-t from-blue-500/20 to-transparent",
          context.mode === 'browsing' && "bg-gradient-to-t from-purple-500/20 to-transparent"
        )}
      />
    </motion.section>
  );
};

/**
 * Pre-built hero components for common use cases
 */
export const HeroVariants = {
  Dashboard: ({ stats }: { stats?: AdaptiveStatsProps['stats'] }) => (
    <AdaptiveHeroViewport
      content={{ density: 'medium' }}
      context={{ mode: 'browsing' }}
      enableParallax={true}
    >
      <ResponsiveTitle 
        ratio={0.618}
        title="Smart Pantry Pro"
        subtitle="Gérez votre cuisine intelligemment"
      />
      <AdaptiveStats density="medium" stats={stats} />
    </AdaptiveHeroViewport>
  ),
  
  Cooking: ({ recipe }: { recipe?: { name: string; duration: string } }) => (
    <AdaptiveHeroViewport
      content={{ density: 'high', hasImages: true }}
      context={{ mode: 'cooking' }}
      performanceMode="balanced"
    >
      <ResponsiveTitle 
        ratio={0.9}
        title={recipe?.name || "Mode Cuisine"}
        subtitle={recipe?.duration || "Prêt à cuisiner"}
      />
    </AdaptiveHeroViewport>
  ),
  
  Shopping: ({ listCount }: { listCount?: number }) => (
    <AdaptiveHeroViewport
      content={{ density: 'medium' }}
      context={{ mode: 'shopping' }}
    >
      <ResponsiveTitle 
        ratio={1.0}
        title="Liste de Courses"
        subtitle={listCount ? `${listCount} articles à acheter` : "Organisez vos achats"}
      />
    </AdaptiveHeroViewport>
  ),
};

export default AdaptiveHeroViewport;