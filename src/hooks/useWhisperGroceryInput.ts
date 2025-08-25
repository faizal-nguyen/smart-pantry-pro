import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';

interface ParsedGroceryItem {
  productName: string;
  quantity: number;
  unit: string;
  category: string;
  storeSection: string;
  confidence: number;
  estimatedPrice?: number;
}

interface UseWhisperGroceryInputReturn {
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string;
  parsedItems: ParsedGroceryItem[];
  recordingTime: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  confirmItems: () => Promise<boolean>;
  editParsedItem: (index: number, updates: Partial<ParsedGroceryItem>) => void;
  removeParsedItem: (index: number) => void;
  clearParsedItems: () => void;
}

export const useWhisperGroceryInput = (): UseWhisperGroceryInputReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedGroceryItem[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Démarrer l'enregistrement
  const startRecording = useCallback(async () => {
    try {
      // Vérifier le support de getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices non supporté par ce navigateur');
      }

      // Demander permission microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });

      // Vérifier le support de MediaRecorder
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder non supporté par ce navigateur');
      }

      // Déterminer le format MIME supporté
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/mpeg',
        'audio/wav'
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error('Aucun format audio supporté trouvé');
      }

      // Créer MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: selectedMimeType
      });

      audioChunksRef.current = [];
      setRecordingTime(0);
      setIsRecording(true);
      setTranscript('');
      setParsedItems([]);

      // Gérer les événements MediaRecorder
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log('🎤 MediaRecorder stopped');
        setIsRecording(false);
        
        // Arrêter le timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        // Arrêter le stream
        stream.getTracks().forEach(track => track.stop());
        
        // Traiter l'audio enregistré
        if (audioChunksRef.current.length > 0) {
          await processRecording();
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error('🎤 MediaRecorder error:', event);
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      // Démarrer l'enregistrement
      mediaRecorderRef.current.start(1000); // Collecte data toutes les secondes

      // Timer pour le temps d'enregistrement
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) { // Limite à 60 secondes
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      toast({
        title: "🎤 Enregistrement démarré",
        description: "Dictez votre liste de courses"
      });

    } catch (error: any) {
      console.error('Erreur démarrage enregistrement:', error);
      setIsRecording(false);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de démarrer l'enregistrement",
        variant: "destructive"
      });
    }
  }, []);

  // Arrêter l'enregistrement
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Force l'arrêt de l'état recording
    setIsRecording(false);
  }, []);

  // Traiter l'enregistrement avec Whisper
  const processRecording = useCallback(async () => {
    if (audioChunksRef.current.length === 0) return;

    setIsProcessing(true);

    try {
      // Pour le moment, on simule avec un texte de test
      // TODO: Implémenter la vraie transcription Whisper
      const transcribedText = "2 kilos de tomates, 1 litre de lait, du pain complet";
      
      console.log('🎤 Transcription simulée:', transcribedText);
      setTranscript(transcribedText);

      if (!transcribedText.trim()) {
        toast({
          title: "Aucun texte détecté",
          description: "Essayez de parler plus clairement",
          variant: "destructive"
        });
        return;
      }

      // Parser le texte transcrit
      const parseResponse = await fetch('/api/shopping/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcribedText })
      });

      if (!parseResponse.ok) {
        throw new Error('Erreur lors du parsing');
      }

      const parseData = await parseResponse.json();
      
      if (parseData.items && parseData.items.length > 0) {
        setParsedItems(parseData.items);
        toast({
          title: "✅ Analyse terminée",
          description: `${parseData.items.length} produits détectés`
        });
      } else {
        toast({
          title: "Aucun produit détecté",
          description: "Essayez de reformuler votre liste",
          variant: "destructive"
        });
      }

    } catch (error: any) {
      console.error('Erreur traitement audio:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors du traitement audio",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Confirmer et ajouter les items
  const confirmItems = useCallback(async () => {
    if (parsedItems.length === 0) return false;

    try {
      const response = await fetch('/api/shopping/items/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: parsedItems })
      });

      if (!response.ok) throw new Error('Erreur ajout items');

      toast({
        title: "✅ Produits ajoutés",
        description: `${parsedItems.length} produits ajoutés à votre liste`
      });

      // Clear state
      setParsedItems([]);
      setTranscript('');
      setRecordingTime(0);
      
      return true;

    } catch (error) {
      console.error('Erreur confirmation items:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter les produits",
        variant: "destructive"
      });
      return false;
    }
  }, [parsedItems]);

  // Éditer un item parsé
  const editParsedItem = useCallback((index: number, updates: Partial<ParsedGroceryItem>) => {
    setParsedItems(prev => prev.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    ));
  }, []);

  // Supprimer un item parsé
  const removeParsedItem = useCallback((index: number) => {
    setParsedItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Clear tous les items
  const clearParsedItems = useCallback(() => {
    setParsedItems([]);
    setTranscript('');
    setRecordingTime(0);
  }, []);

  // Cleanup au démontage du composant
  useEffect(() => {
    return () => {
      // Arrêter l'enregistrement si en cours
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      // Nettoyer le timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    isRecording,
    isProcessing,
    transcript,
    parsedItems,
    recordingTime,
    startRecording,
    stopRecording,
    confirmItems,
    editParsedItem,
    removeParsedItem,
    clearParsedItems
  };
};