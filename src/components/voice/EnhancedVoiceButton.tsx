import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEnhancedVoice } from '@/hooks/useEnhancedVoice';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface EnhancedVoiceButtonProps {
  onVoiceInput?: (parsed: any) => void;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  showTranscript?: boolean;
}

export const EnhancedVoiceButton: React.FC<EnhancedVoiceButtonProps> = ({
  onVoiceInput,
  className,
  size = 'default',
  showTranscript = true
}) => {
  const {
    isListening,
    isSupported,
    transcript,
    parsedInput,
    startListening,
    stopListening,
    capabilities
  } = useEnhancedVoice();

  const [permissionStatus, setPermissionStatus] = useState<string>('prompt');

  // Vérifier les permissions au montage
  useEffect(() => {
    const checkPermissions = async () => {
      if (capabilities.hasPermission) {
        const permission = await capabilities.hasPermission;
        setPermissionStatus(permission.state);
      }
    };
    checkPermissions();
  }, [capabilities]);

  // Traiter l'input vocal
  useEffect(() => {
    if (parsedInput && onVoiceInput) {
      onVoiceInput(parsedInput);
    }
  }, [parsedInput, onVoiceInput]);

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size={size}
              disabled
              className={cn("gap-2", className)}
            >
              <MicOff className="w-4 h-4" />
              <span className="hidden sm:inline">Non supporté</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>La reconnaissance vocale n'est pas supportée par votre navigateur</p>
            <p className="text-xs text-muted-foreground mt-1">
              Essayez Chrome, Edge ou Safari
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="relative">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isListening ? "destructive" : "outline"}
              size={size}
              onClick={handleClick}
              className={cn(
                "gap-2 transition-all duration-200",
                isListening && "animate-pulse",
                className
              )}
            >
              <AnimatePresence mode="wait">
                {isListening ? (
                  <motion.div
                    key="listening"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Écoute...</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Mic className="w-4 h-4" />
                    <span className="hidden sm:inline">Dicter</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-2">
              <p className="font-medium">
                {isListening ? "Cliquez pour arrêter" : "Cliquez pour dicter"}
              </p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Exemples :</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>"Ajoute 2 kg de tomates"</li>
                  <li>"Enlève le lait"</li>
                  <li>"Recette avec poulet"</li>
                </ul>
              </div>
              {permissionStatus === 'denied' && (
                <div className="flex items-center gap-1 text-destructive">
                  <AlertCircle className="w-3 h-3" />
                  <span className="text-xs">Permission microphone refusée</span>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Visualisation audio */}
      {isListening && (
        <div className="absolute -inset-1 -z-10">
          <div className="absolute inset-0 bg-primary/20 rounded-lg animate-ping" />
          <div className="absolute inset-0 bg-primary/10 rounded-lg animate-ping animation-delay-200" />
        </div>
      )}

      {/* Affichage du transcript */}
      {showTranscript && transcript && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-full mb-2 left-0 right-0 min-w-[200px]"
          >
            <div className="bg-popover border rounded-lg p-3 shadow-lg">
              <p className="text-sm font-medium mb-1">Vous avez dit :</p>
              <p className="text-sm text-muted-foreground italic">"{transcript}"</p>
              
              {parsedInput && (
                <div className="mt-2 pt-2 border-t space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Action :</span>
                    <Badge variant={parsedInput.action === 'add' ? 'default' : 'secondary'}>
                      {parsedInput.action === 'add' ? 'Ajout' : 
                       parsedInput.action === 'remove' ? 'Suppression' : 
                       parsedInput.action === 'search' ? 'Recherche' : 'Inconnu'}
                    </Badge>
                  </div>
                  {parsedInput.quantity && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Quantité :</span>
                      <span className="text-xs font-medium">
                        {parsedInput.quantity} {parsedInput.unit}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Produit :</span>
                    <span className="text-xs font-medium">{parsedInput.product}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Confiance :</span>
                    <div className="flex items-center gap-1">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-300",
                            parsedInput.confidence > 0.7 ? "bg-success" : 
                            parsedInput.confidence > 0.5 ? "bg-warning" : 
                            "bg-destructive"
                          )}
                          style={{ width: `${parsedInput.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs">{Math.round(parsedInput.confidence * 100)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};