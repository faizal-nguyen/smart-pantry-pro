import { useState, useCallback, useEffect } from 'react';
import { voiceService } from '@/services/voice/enhancedVoiceService';
import { useToast } from '@/hooks/use-toast';

interface UseEnhancedVoiceReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  parsedInput: any | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  capabilities: any;
}

export const useEnhancedVoice = (): UseEnhancedVoiceReturn => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedInput, setParsedInput] = useState<any>(null);
  const [capabilities, setCapabilities] = useState<any>({});
  const { toast } = useToast();

  // Vérifier les capacités au montage
  useEffect(() => {
    const checkCapabilities = async () => {
      const caps = await voiceService.getCapabilities();
      setCapabilities(caps);
      setIsSupported(caps.isSupported);
      
      if (!caps.isSupported) {
        console.warn('🎤 Voice recognition not supported in this browser');
      }
    };
    
    checkCapabilities();
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: "Non supporté",
        description: "La reconnaissance vocale n'est pas supportée par votre navigateur",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsListening(true);
      setTranscript('');
      setParsedInput(null);
      
      const result = await voiceService.startListening();
      setTranscript(result);
      
      if (result) {
        const parsed = voiceService.parseVoiceInput(result);
        setParsedInput(parsed);
        
        // Feedback visuel selon la confiance
        if (parsed.confidence > 0.7) {
          toast({
            title: "Compris !",
            description: `${parsed.action === 'add' ? 'Ajout' : parsed.action === 'remove' ? 'Suppression' : 'Recherche'}: ${parsed.product}`
          });
        } else {
          toast({
            title: "Compris partiellement",
            description: "Veuillez répéter plus clairement",
            variant: "destructive"
          });
        }
      }
    } catch (error: any) {
      console.error('Voice error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la reconnaissance vocale",
        variant: "destructive"
      });
    } finally {
      setIsListening(false);
    }
  }, [isSupported, toast]);

  const stopListening = useCallback(() => {
    voiceService.stopListening();
    setIsListening(false);
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    parsedInput,
    startListening,
    stopListening,
    capabilities
  };
};