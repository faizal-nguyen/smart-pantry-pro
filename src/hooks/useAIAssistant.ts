import { useState, useCallback, useRef } from 'react';
// import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { useInventory } from './useInventory';
import { useRecipes } from './useRecipes';
import { voiceRecognition, FrenchVoiceRecognitionService } from '@/services/voice/frenchVoiceRecognition';
import { findFoodByName, extractQuantityAndUnit } from '@/data/frenchFoodVocabulary';
import { API_RATE_LIMITS, SECURITY_ERROR_MESSAGES } from '@/config/security';
import { toast } from 'sonner';

export interface ExpiryAlert {
  product: string | undefined;
  daysUntil: number;
  type: 'expired' | 'critical' | 'warning';
}

export interface MessageMetadata {
  confidence?: number;
  audioUrl?: string;
  imageUrl?: string;
  expiryAlerts?: ExpiryAlert[];
  originalTranscript?: string;
  extracted?: { quantity: number; unit: string; product: string };
  foodMatch?: { name: string; category?: string };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  mode?: 'text' | 'voice' | 'visual';
  metadata?: MessageMetadata;
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
  // const supabase = useSupabaseClient();
  // const user = useUser();
  const user = null; // Temporarily disabled for testing
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

  const currentStreamMessage = useRef<Message | null>(null);
  

  /**
   * Send a message to the AI assistant
   */
  const sendMessage = useCallback(async (
    content: string,
    mode: 'text' | 'voice' | 'visual' = 'text',
    metadata?: MessageMetadata
  ) => {
    // Temporarily disabled user check for testing
    // if (!user) {
    //   toast.error(SECURITY_ERROR_MESSAGES.UNAUTHORIZED);
    //   return;
    // }

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
      // Temporarily skip session check for testing
      // if (!session) throw new Error('No session');

      // Prepare context
      const context = prepareContext();

      // Call AI assistant endpoint
      const apiUrl = '/api/v1/assistant/stream';
        
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session ? `Bearer ${session.access_token}` : '',
          'X-Request-Id': crypto.randomUUID()
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

    } catch (error: unknown) {
      console.error('AI Assistant error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      toast.error(errorMessage || SECURITY_ERROR_MESSAGES.SERVER_ERROR);
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
    if (!FrenchVoiceRecognitionService.isSupported()) {
      toast.error('La reconnaissance vocale n\'est pas supportée sur ce navigateur');
      return;
    }

    const hasPermission = await FrenchVoiceRecognitionService.requestPermission();
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
    // Client-side cancellation of fetch streams is not wired here; just reset UI state
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
      inventory: inventory, // Send full inventory
      recipes: recipes, // Send all recipes
      expiryAlerts,
      season: getCurrentSeason(),
      language: 'fr-FR',
      totalInventoryItems: inventory?.length || 0,
      totalRecipes: recipes?.length || 0
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
    hasVoiceSupport: FrenchVoiceRecognitionService.isSupported()
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
