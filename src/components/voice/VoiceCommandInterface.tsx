'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Volume2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface VoiceCommand {
  action: string;
  params: string;
  confidence: number;
}

interface VoiceCommandInterfaceProps {
  className?: string;
  onCommand?: (command: VoiceCommand) => void;
  enableFeedback?: boolean;
}

export const VoiceCommandInterface: React.FC<VoiceCommandInterfaceProps> = ({
  className,
  onCommand,
  enableFeedback = true
}) => {
  const {
    isListening,
    transcript,
    confidence,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition();

  const [command, setCommand] = useState<VoiceCommand | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Patterns de commandes françaises
  const commandPatterns = [
    { regex: /ajoute(?:r)?\s+(.+)/i, action: 'add_product', label: 'Ajouter produit' },
    { regex: /montre(?:r)?\s+(?:mes\s+)?recettes/i, action: 'show_recipes', label: 'Voir recettes' },
    { regex: /qu'?est-ce que je peux cuisiner/i, action: 'suggest_recipes', label: 'Suggestions' },
    { regex: /lance(?:r)?\s+le\s+scanner/i, action: 'open_scanner', label: 'Scanner' },
    { regex: /cherche(?:r)?\s+(.+)/i, action: 'search', label: 'Rechercher' },
    { regex: /liste\s+(?:de\s+)?courses/i, action: 'shopping_list', label: 'Liste courses' },
    { regex: /aide|help/i, action: 'help', label: 'Aide' }
  ];

  // Analyse de la commande
  useEffect(() => {
    if (transcript && isListening) {
      for (const pattern of commandPatterns) {
        const match = transcript.match(pattern.regex);
        if (match) {
          const newCommand: VoiceCommand = {
            action: pattern.action,
            params: match[1] || '',
            confidence: confidence
          };
          setCommand(newCommand);
          setIsProcessing(true);
          
          // Feedback haptique (mobile)
          if ('vibrate' in navigator) {
            navigator.vibrate(50);
          }
          
          // Exécuter la commande
          setTimeout(() => {
            if (onCommand) {
              onCommand(newCommand);
            }
            if (enableFeedback) {
              toast.success(`Commande: ${pattern.label}`, {
                description: newCommand.params || 'Exécution en cours...'
              });
            }
            setIsProcessing(false);
            resetTranscript();
          }, 500);
          
          break;
        }
      }
    }
  }, [transcript, isListening, confidence, onCommand, enableFeedback, resetTranscript]);

  // Simulation du niveau audio
  useEffect(() => {
    if (isListening) {
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setAudioLevel(0);
    }
  }, [isListening]);

  // Vérification du support
  if (!isSupported) {
    return (
      <Card className="p-4 bg-destructive/10 border-destructive/20">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">
            Reconnaissance vocale non supportée sur ce navigateur
          </span>
        </div>
      </Card>
    );
  }

  return (
    <>
      {/* Bouton flottant pour mobile */}
      <motion.div
        className={cn(
          "fixed bottom-24 right-6 z-40 md:hidden",
          className
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          onClick={isListening ? stopListening : startListening}
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full shadow-lg",
            isListening
              ? "bg-gradient-to-r from-red-500 to-red-600"
              : "bg-gradient-to-r from-blue-500 to-cyan-500"
          )}
        >
          <AnimatePresence mode="wait">
            {isListening ? (
              <motion.div
                key="listening"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <MicOff className="h-6 w-6 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Mic className="h-6 w-6 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
        
        {/* Indicateur de pulsation */}
        {isListening && (
          <motion.div
            className="absolute inset-0 rounded-full bg-red-500/30"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0, 0.5]
            }}
            transition={{
              repeat: Infinity,
              duration: 1.5
            }}
          />
        )}
      </motion.div>

      {/* Interface overlay */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed bottom-20 left-4 right-4 z-50 max-w-lg mx-auto"
          >
            <Card className={cn(
              "bg-black/90 backdrop-blur-xl border-white/20 text-white p-6",
              "shadow-2xl"
            )}>
              <div className="space-y-4">
                {/* En-tête */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Mic className="h-8 w-8" />
                      <motion.div
                        className="absolute inset-0 rounded-full bg-red-500/50"
                        animate={{
                          scale: [1, 1.3, 1],
                          opacity: [0.5, 0.2, 0.5]
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.5
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-sm opacity-70">En écoute...</p>
                      <p className="text-xs opacity-50">Dites une commande</p>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={stopListening}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Visualiseur audio */}
                <div className="relative h-16 bg-white/10 rounded-lg overflow-hidden">
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500/50 to-cyan-500/50"
                    animate={{
                      height: `${audioLevel}%`
                    }}
                    transition={{ duration: 0.1 }}
                  />
                  
                  {/* Barres d'équaliseur */}
                  <div className="absolute inset-0 flex items-center justify-center gap-1">
                    {[...Array(20)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-white/30 rounded-full"
                        animate={{
                          height: isListening ? `${20 + Math.random() * 60}%` : '20%'
                        }}
                        transition={{
                          duration: 0.2,
                          delay: i * 0.02
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Transcription */}
                <div className="min-h-[60px] bg-white/5 rounded-lg p-3">
                  <p className="text-lg font-medium">
                    {transcript || (
                      <span className="opacity-50 italic">
                        En attente de votre commande...
                      </span>
                    )}
                  </p>
                  
                  {confidence > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={confidence * 100} className="h-1 flex-1" />
                      <span className="text-xs opacity-70">
                        {Math.round(confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Commande détectée */}
                {command && !isProcessing && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 p-3 bg-green-500/20 rounded-lg"
                  >
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Commande détectée</p>
                      <p className="text-xs opacity-70">
                        {command.action}: {command.params}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Suggestions de commandes */}
                <div className="grid grid-cols-2 gap-2">
                  {commandPatterns.slice(0, 4).map((pattern) => (
                    <Badge
                      key={pattern.action}
                      variant="secondary"
                      className="bg-white/10 text-white border-white/20 text-xs py-1"
                    >
                      <Volume2 className="h-3 w-3 mr-1" />
                      {pattern.label}
                    </Badge>
                  ))}
                </div>

                {/* Erreur */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/20 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Version desktop (intégrée dans l'UI) */}
      <div className="hidden md:block">
        <Button
          onClick={isListening ? stopListening : startListening}
          variant={isListening ? "destructive" : "default"}
          className={cn(
            "gap-2",
            !isListening && "bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0"
          )}
        >
          {isListening ? (
            <>
              <MicOff className="h-4 w-4" />
              Arrêter l'écoute
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              Commande vocale
            </>
          )}
        </Button>
      </div>
    </>
  );
};