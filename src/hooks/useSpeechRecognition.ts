import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SpeechRecognitionResult {
  text: string;
  confidence: number;
}

interface UseSpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

interface SpeechRecognitionHook {
  isListening: boolean;
  transcript: string;
  confidence: number;
  error: string | null;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
    SpeechRecognition: new () => SpeechRecognition;
  }
}

export const useSpeechRecognition = (
  options: UseSpeechRecognitionOptions = {}
): SpeechRecognitionHook => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  const {
    language = 'fr-FR',
    continuous = false,
    interimResults = true
  } = options;

  // Check if speech recognition is supported
  const isSupported = typeof window !== 'undefined' && 
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const initializeRecognition = useCallback(() => {
    if (!isSupported) return null;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
          setConfidence(result[0].confidence || 0);
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript.trim());
      } else if (interimResults) {
        setTranscript(interimTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      let errorMessage = 'Erreur de reconnaissance vocale';
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'Aucune parole détectée. Réessayez.';
          break;
        case 'audio-capture':
          errorMessage = 'Problème avec le microphone.';
          break;
        case 'not-allowed':
          errorMessage = 'Permission microphone refusée.';
          break;
        case 'network':
          errorMessage = 'Problème de connexion réseau.';
          break;
        default:
          errorMessage = `Erreur: ${event.error}`;
      }
      
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Erreur de reconnaissance vocale",
        description: errorMessage
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return recognition;
  }, [language, continuous, interimResults, isSupported, toast]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      toast({
        variant: "destructive",
        title: "Non supporté",
        description: "La reconnaissance vocale n'est pas supportée par votre navigateur."
      });
      return;
    }

    if (isListening) return;

    setError(null);
    setTranscript('');
    setConfidence(0);

    recognitionRef.current = initializeRecognition();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setError('Impossible de démarrer la reconnaissance vocale');
      }
    }
  }, [isSupported, isListening, initializeRecognition, toast]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setConfidence(0);
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    confidence,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript
  };
};