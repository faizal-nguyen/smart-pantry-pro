import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceInputProps {
  onTranscript: (transcript: string) => void;
  onStop?: () => void;
  className?: string;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscript,
  onStop,
  className
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
      }
      setInterimTranscript(interimTranscript);
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognitionRef.current = recognition;
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript('');
      setInterimTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      
      const finalText = transcript + interimTranscript;
      if (finalText.trim()) {
        onTranscript(finalText.trim());
      }
      
      setTranscript('');
      setInterimTranscript('');
      
      if (onStop) {
        onStop();
      }
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
  };

  return (
    <div className={cn("relative", className)}>
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 -z-10"
          >
            {/* PRP-237 PR3 — ping rings en accent-ai (assistant presence). */}
            <div className="absolute inset-0 bg-accent-ai/20 rounded-full animate-ping" />
            <div className="absolute inset-0 bg-accent-ai/10 rounded-full animate-ping animation-delay-200" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col items-center gap-4">
        <Button
          size="lg"
          variant={isListening ? "destructive" : "default"}
          className={cn(
            "h-20 w-20 rounded-full transition-all",
            isListening && "scale-110"
          )}
          onClick={toggleListening}
        >
          {isListening ? (
            <MicOff className="w-8 h-8" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </Button>

        {(transcript || interimTranscript) && (
          <Card className="w-full max-w-md p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm">
                  <span className="text-foreground">{transcript}</span>
                  <span className="text-muted-foreground italic">{interimTranscript}</span>
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={clearTranscript}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        <div className="text-center">
          <p className="text-sm font-medium">
            {isListening ? "Je vous écoute..." : "Appuyez pour parler"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isListening 
              ? "Appuyez à nouveau pour arrêter" 
              : "Maintenez pour une écoute continue"
            }
          </p>
        </div>
      </div>
    </div>
  );
};