'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Mic, Share2, Bot, Sparkles, ArrowRight,
  ChevronRight, Zap, TrendingUp, Shield, Globe,
  Brain, Heart, Leaf, BarChart3, Users, Wifi
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { VoiceCommandInterface } from '@/components/voice/VoiceCommandInterface';
import { SocialImportCard } from '@/components/social/SocialImportCard';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  category: 'ai' | 'community' | 'analytics' | 'evolution';
  status: 'active' | 'beta' | 'coming';
  action: () => void;
}

interface FeatureShowcaseProps {
  variant?: 'grid' | 'carousel' | 'hero';
  className?: string;
  showAllFeatures?: boolean;
}

export const FeatureShowcase: React.FC<FeatureShowcaseProps> = ({
  variant = 'grid',
  className,
  showAllFeatures = false
}) => {
  const navigate = useNavigate();
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showVoiceCommands, setShowVoiceCommands] = useState(false);
  const [showSocialImport, setShowSocialImport] = useState(false);

  // Features principales avec patterns Cipher
  const mainFeatures: Feature[] = [
    {
      id: 'voice-commands',
      title: 'Commandes Vocales',
      description: '"Ajoute 2 kg de tomates à ma liste"',
      icon: <Mic className="h-8 w-8" />,
      gradient: 'from-blue-500 to-cyan-500',
      category: 'ai',
      status: 'active',
      action: () => {
        setShowVoiceCommands(true);
      }
    },
    {
      id: 'social-import',
      title: 'Import Social',
      description: 'Instagram, TikTok, YouTube',
      icon: <Share2 className="h-8 w-8" />,
      gradient: 'from-orange-500 to-red-500',
      category: 'ai',
      status: 'active',
      action: () => {
        setShowSocialImport(true);
      }
    },
    {
      id: 'ai-assistant',
      title: 'Assistant Chef',
      description: 'IA culinaire personnalisée',
      icon: <Bot className="h-8 w-8" />,
      gradient: 'from-green-500 to-emerald-500',
      category: 'ai',
      status: 'active',
      action: () => {
        navigate('/assistant');
      }
    }
  ];

  // Features Evolution V2
  const evolutionFeatures: Feature[] = [
    {
      id: 'nutritional-ai',
      title: 'Nutritionniste IA',
      description: 'Analyse nutritionnelle personnalisée',
      icon: <Heart className="h-8 w-8" />,
      gradient: 'from-red-500 to-pink-500',
      category: 'evolution',
      status: 'active',
      action: () => {
        navigate('/health');
      }
    },
    {
      id: 'meal-planner',
      title: 'Planificateur Intelligent',
      description: 'Plans de repas optimisés par IA',
      icon: <Brain className="h-8 w-8" />,
      gradient: 'from-purple-500 to-indigo-500',
      category: 'evolution',
      status: 'beta',
      action: () => {
        toast.info('Planificateur de repas (Beta)');
      }
    },
    {
      id: 'community-hub',
      title: 'Communauté',
      description: 'Partagez vos recettes',
      icon: <Users className="h-8 w-8" />,
      gradient: 'from-yellow-500 to-orange-500',
      category: 'community',
      status: 'beta',
      action: () => {
        toast.info('Hub communautaire (Beta)');
      }
    },
    {
      id: 'waste-analytics',
      title: 'Zéro Gaspillage',
      description: 'Réduisez votre impact',
      icon: <Leaf className="h-8 w-8" />,
      gradient: 'from-green-500 to-teal-500',
      category: 'analytics',
      status: 'coming',
      action: () => {
        toast.info('Bientôt disponible');
      }
    },
    {
      id: 'iot-integration',
      title: 'Appareils Connectés',
      description: 'Intégration IoT cuisine',
      icon: <Wifi className="h-8 w-8" />,
      gradient: 'from-blue-500 to-purple-500',
      category: 'evolution',
      status: 'coming',
      action: () => {
        toast.info('Bientôt disponible');
      }
    }
  ];

  const allFeatures = showAllFeatures 
    ? [...mainFeatures, ...evolutionFeatures]
    : mainFeatures;

  // Filtrage par catégorie
  const filteredFeatures = activeCategory === 'all' 
    ? allFeatures 
    : allFeatures.filter(f => f.category === activeCategory);

  // Animation container
  const containerAnimation = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // Animation item
  const itemAnimation = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // Rendu Hero
  if (variant === 'hero') {
    return (
      <div className={cn("relative overflow-hidden", className)}>
        {/* Background gradient animé */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10 animate-gradient" />
        
        <div className="relative z-10 text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 mb-6"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Evolution V2 disponible</span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            Découvrez les <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">super-pouvoirs</span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Smart Pantry Pro réinvente votre expérience culinaire avec l'IA
          </motion.p>
        </div>

        {/* Features en grille hero */}
        <motion.div
          variants={containerAnimation}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {mainFeatures.map((feature) => (
            <motion.div
              key={feature.id}
              variants={itemAnimation}
              whileHover={{ scale: 1.05, y: -5 }}
              onHoverStart={() => setHoveredFeature(feature.id)}
              onHoverEnd={() => setHoveredFeature(null)}
              className="relative group cursor-pointer"
              onClick={feature.action}
            >
              <div className={cn(
                "relative overflow-hidden rounded-2xl p-6",
                "bg-gradient-to-br",
                feature.gradient,
                "text-white shadow-xl hover:shadow-2xl",
                "transition-all duration-300"
              )}>
                {/* Effet de brillance au hover */}
                <AnimatePresence>
                  {hoveredFeature === feature.id && (
                    <motion.div
                      initial={{ x: '-100%', opacity: 0 }}
                      animate={{ x: '100%', opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8 }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    />
                  )}
                </AnimatePresence>
                
                {/* Badge de statut */}
                {feature.status !== 'active' && (
                  <Badge 
                    className="absolute top-4 right-4 bg-white/20 backdrop-blur text-white border-white/30"
                    variant="secondary"
                  >
                    {feature.status === 'beta' ? 'Beta' : 'Bientôt'}
                  </Badge>
                )}
                
                <div className="relative z-10">
                  <div className="mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm opacity-90 mb-4">{feature.description}</p>
                  
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>Découvrir</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA pour voir plus */}
        {!showAllFeatures && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-12"
          >
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/features')}
              className="gap-2"
            >
              Explorer toutes les fonctionnalités
              <ChevronRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </div>
    );
  }

  // Rendu Grid (par défaut)
  return (
    <div className={cn("space-y-8", className)}>
      {/* Filtres de catégorie */}
      {showAllFeatures && (
        <div className="flex items-center gap-2 flex-wrap">
          {['all', 'ai', 'evolution', 'community', 'analytics'].map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(cat)}
              className="capitalize"
            >
              {cat === 'all' ? 'Toutes' : cat}
              {cat !== 'all' && (
                <Badge variant="secondary" className="ml-2">
                  {allFeatures.filter(f => f.category === cat).length}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      )}

      {/* Grille de features */}
      <motion.div
        variants={containerAnimation}
        initial="hidden"
        animate="show"
        className={cn(
          "grid gap-6",
          showAllFeatures
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
        )}
      >
        {filteredFeatures.map((feature) => (
          <motion.div
            key={feature.id}
            variants={itemAnimation}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className={cn(
                "relative overflow-hidden h-full cursor-pointer",
                "hover:shadow-lg transition-all duration-300",
                "bg-gradient-to-br from-background to-muted/20"
              )}
              onClick={feature.action}
            >
              {/* Header avec gradient */}
              <div className={cn(
                "h-32 relative overflow-hidden",
                "bg-gradient-to-br",
                feature.gradient
              )}>
                <div className="absolute inset-0 bg-black/10" />
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  {feature.icon}
                </div>
                
                {/* Badge de statut */}
                {feature.status !== 'active' && (
                  <Badge 
                    className="absolute top-3 right-3 bg-white/20 backdrop-blur text-white border-white/30"
                    variant="secondary"
                  >
                    {feature.status === 'beta' ? 'Beta' : 'Bientôt'}
                  </Badge>
                )}
                
                {/* Particules animées */}
                <div className="absolute inset-0">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute h-1 w-1 bg-white/30 rounded-full"
                      animate={{
                        y: [-20, -100],
                        x: [0, (i - 1) * 30],
                        opacity: [0, 1, 0]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: i * 0.5
                      }}
                      style={{
                        left: `${30 + i * 20}%`,
                        bottom: 0
                      }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {feature.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {feature.status === 'active' && (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <Zap className="h-3 w-3" />
                        <span>Disponible</span>
                      </div>
                    )}
                    {feature.status === 'beta' && (
                      <div className="flex items-center gap-1 text-xs text-yellow-600">
                        <TrendingUp className="h-3 w-3" />
                        <span>Beta</span>
                      </div>
                    )}
                  </div>
                  
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Stats Evolution V2 */}
      {showAllFeatures && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">12+</div>
              <div className="text-sm text-muted-foreground">Features IA</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">95%</div>
              <div className="text-sm text-muted-foreground">Précision</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">5K+</div>
              <div className="text-sm text-muted-foreground">Recettes</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">24/7</div>
              <div className="text-sm text-muted-foreground">Assistant</div>
            </div>
          </div>
        </motion.div>
      )}


      <Dialog open={showVoiceCommands} onOpenChange={setShowVoiceCommands}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Commandes Vocales</DialogTitle>
            <DialogDescription>
              Utilisez votre voix pour ajouter des produits à votre inventaire
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <VoiceCommandInterface />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSocialImport} onOpenChange={setShowSocialImport}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import depuis les Réseaux Sociaux</DialogTitle>
            <DialogDescription>
              Importez des recettes depuis Instagram, TikTok et YouTube
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <SocialImportCard />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};