import { useState, useCallback, useRef, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { useInventory } from './useInventory';
import { useRecipes } from './useRecipes';
import { getStreamingAIService } from '@/services/ai/streamingAIService';
import { voiceRecognition } from '@/services/voice/frenchVoiceRecognition';
import { findFoodByName, extractQuantityAndUnit } from '@/data/frenchFoodVocabulary';
import { API_RATE_LIMITS, SECURITY_ERROR_MESSAGES } from '@/config/security';
import { toast } from 'sonner';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  mode?: 'text' | 'voice' | 'visual';
  metadata?: {
    confidence?: number;
    audioUrl?: string;
    imageUrl?: string;
    expiryAlerts?: any[];
  };
}

export interface AIAssistantState {
  messages: Message[];
  isLoading: boolean;
  isListening: boolean;
  isStreaming: boolean;
  error: string | null;
  inputMode: 'text' | 'voice' | 'visual';
}

export function useAIAssistant() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const { inventory } = useInventory();
  const { recipes } = useRecipes();
  
  const [state, setState] = useState<AIAssistantState>({
    messages: [],
    isLoading: false,
    isListening: false,
    isStreaming: false,
    error: null,
    inputMode: 'text'
  });

  const streamingService = useRef<ReturnType<typeof getStreamingAIService> | null>(null);
  const currentStreamMessage = useRef<Message | null>(null);

  // Initialize streaming service
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (apiKey) {
      streamingService.current = getStreamingAIService(apiKey);
    }
  }, []);

  /**
   * Send a message to the AI assistant
   */
  const sendMessage = useCallback(async (
    content: string,
    mode: 'text' | 'voice' | 'visual' = 'text',
    metadata?: any
  ) => {
    if (!user) {
      toast.error(SECURITY_ERROR_MESSAGES.UNAUTHORIZED);
      return;
    }

    // Create user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
      mode,
      metadata
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null
    }));

    try {
      // Get user token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      // Prepare context
      const context = prepareContext();

      // Call AI assistant endpoint
      const response = await fetch('/api/ai-assistant-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message: content,
          context,
          mode,
          stream: true
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          const resetTime = response.headers.get('X-RateLimit-Reset');
          throw new Error(API_RATE_LIMITS.OPENAI.message);
        }
        throw new Error(`Error: ${response.status}`);
      }

      // Handle streaming response
      await handleStreamingResponse(response);

    } catch (error: any) {
      console.error('AI Assistant error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
      toast.error(error.message || SECURITY_ERROR_MESSAGES.SERVER_ERROR);
    }
  }, [user, supabase, inventory, recipes]);

  /**
   * Handle streaming response from AI
   */
  const handleStreamingResponse = async (response: Response) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    // Create assistant message
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };

    currentStreamMessage.current = assistantMessage;

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, assistantMessage],
      isStreaming: true,
      isLoading: false
    }));

    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              setState(prev => ({ ...prev, isStreaming: false }));
              currentStreamMessage.current = null;
              return;
            }

            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              
              if (content && currentStreamMessage.current) {
                currentStreamMessage.current.content += content;
                
                setState(prev => ({
                  ...prev,
                  messages: prev.messages.map(msg => 
                    msg.id === currentStreamMessage.current?.id
                      ? { ...msg, content: currentStreamMessage.current.content }
                      : msg
                  )
                }));
              }
            } catch (e) {
              console.warn('Parse error:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
      setState(prev => ({ ...prev, isStreaming: false, isLoading: false }));
    }
  };

  /**
   * Start voice recognition
   */
  const startListening = useCallback(async () => {
    if (!voiceRecognition.isSupported()) {
      toast.error('La reconnaissance vocale n\'est pas supportée sur ce navigateur');
      return;
    }

    const hasPermission = await voiceRecognition.requestPermission();
    if (!hasPermission) {
      toast.error('Accès au microphone refusé');
      return;
    }

    setState(prev => ({ ...prev, isListening: true, inputMode: 'voice' }));

    try {
      await voiceRecognition.startListening(
        (result) => {
          if (result.isFinal && result.confidence > 0.7) {
            // Process voice command
            processVoiceCommand(result.transcript);
          }
        },
        (error) => {
          console.error('Voice recognition error:', error);
          toast.error('Erreur de reconnaissance vocale');
          setState(prev => ({ ...prev, isListening: false }));
        }
      );
    } catch (error) {
      console.error('Failed to start listening:', error);
      setState(prev => ({ ...prev, isListening: false }));
    }
  }, []);

  /**
   * Stop voice recognition
   */
  const stopListening = useCallback(() => {
    voiceRecognition.stopListening();
    setState(prev => ({ ...prev, isListening: false }));
  }, []);

  /**
   * Process voice command
   */
  const processVoiceCommand = useCallback((transcript: string) => {
    // Extract quantity and product from voice input
    const extracted = extractQuantityAndUnit(transcript);
    
    if (extracted) {
      const food = findFoodByName(extracted.product);
      
      if (food) {
        // Send structured command to AI
        const command = `Ajouter ${extracted.quantity} ${extracted.unit} de ${food.name} à mon inventaire`;
        sendMessage(command, 'voice', { 
          originalTranscript: transcript,
          extracted,
          foodMatch: food
        });
      } else {
        // Send raw transcript if no food match
        sendMessage(transcript, 'voice', { originalTranscript: transcript });
      }
    } else {
      // Send raw transcript
      sendMessage(transcript, 'voice', { originalTranscript: transcript });
    }
    
    stopListening();
  }, [sendMessage, stopListening]);

  /**
   * Cancel streaming response
   */
  const cancelStreaming = useCallback(() => {
    if (streamingService.current) {
      streamingService.current.cancelStream();
    }
    setState(prev => ({ ...prev, isStreaming: false, isLoading: false }));
  }, []);

  /**
   * Clear conversation
   */
  const clearMessages = useCallback(() => {
    setState(prev => ({ ...prev, messages: [] }));
  }, []);

  /**
   * Set input mode
   */
  const setInputMode = useCallback((mode: 'text' | 'voice' | 'visual') => {
    setState(prev => ({ ...prev, inputMode: mode }));
  }, []);

  /**
   * Prepare context for AI
   */
  const prepareContext = useCallback(() => {
    // Calculate expiry alerts
    const expiryAlerts = inventory
      ?.map(item => {
        if (!item.expiry_date) return null;
        
        const daysUntil = Math.ceil(
          (new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysUntil <= 3) {
          return {
            product: item.product?.name,
            daysUntil,
            type: daysUntil <= 0 ? 'expired' : daysUntil <= 1 ? 'critical' : 'warning'
          };
        }
        return null;
      })
      .filter(Boolean);

    return {
      inventory: inventory?.slice(0, 30), // Limit for context size
      recipes: recipes?.slice(0, 20),
      expiryAlerts,
      season: getCurrentSeason(),
      language: 'fr-FR'
    };
  }, [inventory, recipes]);

  return {
    // State
    messages: state.messages,
    isLoading: state.isLoading,
    isListening: state.isListening,
    isStreaming: state.isStreaming,
    error: state.error,
    inputMode: state.inputMode,
    
    // Actions
    sendMessage,
    startListening,
    stopListening,
    cancelStreaming,
    clearMessages,
    setInputMode,
    
    // Helpers
    hasVoiceSupport: voiceRecognition.isSupported()
  };
}

// Helper function
function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'Printemps';
  if (month >= 5 && month <= 7) return 'Été';
  if (month >= 8 && month <= 10) return 'Automne';
  return 'Hiver';
}