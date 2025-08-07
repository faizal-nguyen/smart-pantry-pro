/**
 * Streaming AI Service for Smart Pantry Pro
 * Implements OpenAI streaming responses with proper error handling
 */

import { API_TIMEOUTS, API_RATE_LIMITS } from '@/config/security';

export interface StreamingConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streamCallback: (chunk: string) => void;
  errorCallback?: (error: Error) => void;
  completeCallback?: () => void;
}

export interface AIContext {
  inventory: any[];
  recipes: any[];
  preferences?: any;
  season?: string;
  expiryAlerts?: any[];
  language?: string;
}

export class StreamingAIService {
  private apiKey: string;
  private model: string;
  private abortController: AbortController | null = null;

  constructor(apiKey: string, model: string = 'gpt-4') {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Stream chat completion
   */
  async streamChat(
    systemPrompt: string,
    userMessage: string,
    onChunk: (chunk: any) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    this.abortController = new AbortController();
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: this.abortController.signal,
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7,
          max_tokens: 1500,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      await this.processStream(response, onChunk);
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream cancelled');
      } else {
        console.error('Streaming error:', error);
        onError?.(error);
      }
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Non-streaming chat completion
   */
  async chat(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Stream AI response with context
   */
  async streamResponse(
    message: string,
    context: AIContext,
    config: Partial<StreamingConfig>
  ): Promise<void> {
    // Create abort controller for cancellation
    this.abortController = new AbortController();
    
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: this.abortController.signal,
        body: JSON.stringify({
          model: config.model || this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: config.temperature || 0.7,
          max_tokens: config.maxTokens || 1500,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      // Process streaming response
      await this.processStream(response, config.streamCallback || (() => {}));
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream cancelled by user');
      } else {
        console.error('Streaming error:', error);
        config.errorCallback?.(error);
      }
    } finally {
      this.abortController = null;
      config.completeCallback?.();
    }
  }

  /**
   * Process SSE stream from OpenAI
   */
  private async processStream(
    response: Response,
    onChunk: (chunk: any) => void
  ): Promise<void> {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) {
      throw new Error('No response body');
    }

    let buffer = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              return;
            }
            
            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              
              if (content) {
                onChunk(json);
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
              console.warn('Parse error:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Build system prompt with context
   */
  private buildSystemPrompt(context: AIContext): string {
    const { inventory, recipes, preferences, season, expiryAlerts } = context;
    
    // Format inventory with expiry alerts
    const inventoryText = this.formatInventory(inventory, expiryAlerts);
    
    // Format available recipes
    const recipesText = this.formatRecipes(recipes);
    
    return `Tu es un assistant culinaire expert français avec accès à l'inventaire et aux recettes de l'utilisateur.

**Inventaire actuel:**
${inventoryText}

**Recettes disponibles:**
${recipesText}

**Saison actuelle:** ${season || 'toutes saisons'}

**Règles importantes:**
1. TOUJOURS prioriser les produits qui expirent bientôt
2. Proposer des recettes réalisables avec l'inventaire actuel
3. Indiquer clairement les ingrédients manquants avec quantités
4. Respecter les préférences alimentaires et allergies
5. Utiliser un langage conversationnel et amical
6. Donner des conseils pratiques et astuces
7. Suggérer des alternatives pour les ingrédients manquants

Formate tes réponses avec:
📍 **Nom de la recette**
⏱️ **Temps**: X min
👥 **Portions**: X
✅ **Ingrédients disponibles**
❌ **Ingrédients manquants**
📝 **Instructions claires**
💡 **Astuce du chef**`;
  }

  /**
   * Format inventory with expiry alerts
   */
  private formatInventory(inventory: any[], expiryAlerts?: any[]): string {
    if (!inventory || inventory.length === 0) {
      return 'Inventaire vide';
    }

    const alertsMap = new Map(
      expiryAlerts?.map(alert => [alert.productId, alert]) || []
    );

    return inventory
      .map(item => {
        const alert = alertsMap.get(item.id);
        const alertEmoji = alert?.type === 'critical' ? '🚨' : alert?.type === 'warning' ? '⚠️' : '';
        
        return `${alertEmoji} ${item.quantity} ${item.unit} de ${item.name}${
          alert ? ` (expire dans ${alert.daysUntilExpiry} jours)` : ''
        }`;
      })
      .join('\n');
  }

  /**
   * Format recipes for context
   */
  private formatRecipes(recipes: any[]): string {
    if (!recipes || recipes.length === 0) {
      return 'Aucune recette disponible';
    }

    return recipes
      .slice(0, 20) // Limit to 20 recipes for context size
      .map(recipe => {
        const ingredients = recipe.ingredients
          ?.map((ing: any) => `${ing.quantity || ''} ${ing.unit || ''} ${ing.name}`.trim())
          .join(', ') || 'Ingrédients non spécifiés';
        
        return `- ${recipe.name} (${recipe.cuisine || 'Non catégorisé'}, ${recipe.totalTime || '?'} min): ${ingredients}`;
      })
      .join('\n');
  }

  /**
   * Cancel ongoing stream
   */
  cancelStream(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Validate and compress context to fit token limits
   */
  compressContext(context: AIContext): AIContext {
    const compressed = { ...context };
    
    // Limit inventory items (prioritize expiring)
    if (compressed.inventory && compressed.inventory.length > 30) {
      compressed.inventory = compressed.inventory
        .sort((a, b) => {
          // Sort by days until expiry
          const aDays = this.getDaysUntilExpiry(a.expiryDate);
          const bDays = this.getDaysUntilExpiry(b.expiryDate);
          return aDays - bDays;
        })
        .slice(0, 30);
    }
    
    // Limit recipes
    if (compressed.recipes && compressed.recipes.length > 20) {
      compressed.recipes = compressed.recipes.slice(0, 20);
    }
    
    return compressed;
  }

  /**
   * Calculate days until expiry
   */
  private getDaysUntilExpiry(expiryDate: string | Date): number {
    if (!expiryDate) return Infinity;
    
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }
}

// Export singleton instance
let streamingAIInstance: StreamingAIService | null = null;

export function getStreamingAIService(apiKey: string): StreamingAIService {
  if (!streamingAIInstance || streamingAIInstance['apiKey'] !== apiKey) {
    streamingAIInstance = new StreamingAIService(apiKey);
  }
  return streamingAIInstance;
}