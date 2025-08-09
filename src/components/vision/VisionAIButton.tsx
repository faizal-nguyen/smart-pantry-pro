'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, Scan } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMultiProductScanner } from '@/hooks/useMultiProductScanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface VisionAIButtonProps {
  variant?: 'default' | 'hero' | 'compact';
  className?: string;
  onScanComplete?: (products: any[]) => void;
}

export const VisionAIButton: React.FC<VisionAIButtonProps> = ({
  variant = 'default',
  className,
  onScanComplete
}) => {
  const { startScanning, isScanning, detectedProducts } = useMultiProductScanner();

  const handleClick = async () => {
    const products = await startScanning();
    if (products && onScanComplete) {
      onScanComplete(products);
    }
  };

  // Animation présets Cipher
  const scanningAnimation = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { 
      scale: [1, 1.1, 1],
      opacity: 1,
      transition: {
        scale: {
          repeat: Infinity,
          duration: 2,
          ease: "easeInOut"
        }
      }
    },
    exit: { scale: 0.8, opacity: 0 }
  };

  // Rendu selon la variante
  if (variant === 'hero') {
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-2xl shadow-xl",
          "hover:shadow-2xl transition-all duration-300",
          "text-white font-semibold text-lg",
          "min-h-[120px] w-full md:w-auto md:min-w-[280px]",
          className
        )}
        onClick={handleClick}
        disabled={isScanning}
      >
        {/* Effet de brillance Cipher */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-200%] animate-[shimmer_3s_infinite]" />
        
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-2xl" />
        
        <div className="relative z-10 flex flex-col items-center justify-center gap-2">
          <AnimatePresence mode="wait">
            {isScanning ? (
              <motion.div
                key="scanning"
                {...scanningAnimation}
                className="relative"
              >
                <Scan className="h-10 w-10" />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-white/50"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0, 0.5]
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ scale: 1 }}
                animate={{ scale: 1 }}
                className="relative"
              >
                <Camera className="h-10 w-10" />
                <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-300" />
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="text-center">
            <div className="font-bold text-xl">Scanner IA</div>
            <div className="text-sm opacity-90">Multi-produits instantané</div>
          </div>
          
          {detectedProducts.length > 0 && !isScanning && (
            <Badge className="absolute top-2 right-2 bg-green-500 text-white">
              {detectedProducts.length} détectés
            </Badge>
          )}
        </div>
      </motion.button>
    );
  }

  if (variant === 'compact') {
    return (
      <Button
        onClick={handleClick}
        disabled={isScanning}
        className={cn(
          "relative group",
          "bg-gradient-to-r from-purple-500 to-pink-500",
          "hover:from-purple-600 hover:to-pink-600",
          "text-white border-0",
          className
        )}
        size="lg"
      >
        <AnimatePresence mode="wait">
          {isScanning ? (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Scan className="h-5 w-5 animate-pulse" />
              <span>Scan en cours...</span>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Camera className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span>Scanner IA</span>
              <Sparkles className="h-4 w-4 text-yellow-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          )}
        </AnimatePresence>
      </Button>
    );
  }

  // Variante par défaut
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn("relative", className)}
    >
      <Button
        onClick={handleClick}
        disabled={isScanning}
        className={cn(
          "relative overflow-hidden",
          "bg-gradient-to-r from-purple-500 to-pink-500",
          "hover:from-purple-600 hover:to-pink-600",
          "text-white border-0 shadow-lg hover:shadow-xl",
          "h-auto py-4 px-6",
          "transition-all duration-300"
        )}
      >
        {/* Animation de scan en arrière-plan */}
        {isScanning && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{
              x: ['-100%', '100%']
            }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: "linear"
            }}
          />
        )}
        
        <div className="relative flex items-center gap-3">
          <div className="relative">
            {isScanning ? (
              <Scan className="h-6 w-6 animate-pulse" />
            ) : (
              <>
                <Camera className="h-6 w-6" />
                <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-300 animate-pulse" />
              </>
            )}
          </div>
          
          <div className="text-left">
            <div className="font-semibold">Scanner plusieurs produits</div>
            <div className="text-xs opacity-90">
              {isScanning ? 'Analyse en cours...' : 'Détection IA instantanée'}
            </div>
          </div>
        </div>
        
        {detectedProducts.length > 0 && !isScanning && (
          <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-xs">
            {detectedProducts.length}
          </Badge>
        )}
      </Button>
    </motion.div>
  );
};

// Animation CSS pour l'effet shimmer
const shimmerKeyframes = `
  @keyframes shimmer {
    to {
      transform: translateX(200%) skewX(-12deg);
    }
  }
`;

// Injection des styles d'animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = shimmerKeyframes;
  document.head.appendChild(style);
}