/**
 * Streaming AI Service for Smart Pantry Pro.
 *
 * MIGRATED (PRP-220.02): no longer holds an OpenAI key. All requests are
 * proxied through the authenticated `/api/assistant/stream` endpoint
 * (Server-Sent Events), which performs the OpenAI call server-side.
 *
 * Public surface preserved for backwards compatibility with
 * `nutritionalAIService`, `smartMealPlannerService`, and any other
 * consumer that extends/uses this class.
 */

import { supabase } from '@/integrations/supabase/client';

const ASSISTANT_PATH = '/api/assistant/stream';

function resolveAssistantUrl(): string {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
  return `${base}${ASSISTANT_PATH}`;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface StreamingConfig {
  /** @deprecated key is no longer required client-side; ignored. */
  apiKey?: string;
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

interface AssistantBody {
  message: string;
  systemPrompt?: string;
  context?: Record<string, unknown>;
  mode?: 'text' | 'voice' | 'visual';
}

export class StreamingAIService {
  private readonly model: string;
  private abortController: AbortController | null = null;

  constructor(_apiKey?: string, model: string = 'gpt-4o-mini') {
    // apiKey kept for backwards-compatible signature only — never used.
    this.model = model;
  }

  /**
   * Stream chat completion via /api/assistant/stream.
   * Calls onChunk for each delta; legacy callers receive the raw OpenAI
   * delta object so existing extractors keep working.
   */
  async streamChat(
    systemPrompt: string,
    userMessage: string,
    onChunk: (chunk: any) => void,
    onError?: (error: Error) => void,
  ): Promise<void> {
    try {
      await this.requestStream(
        { systemPrompt, message: userMessage },
        (delta) => onChunk(delta.raw),
      );
    } catch (error: unknown) {
      const e = error instanceof Error ? error : new Error(String(error));
      if (e.name !== 'AbortError') {
        console.error('[StreamingAIService] streamChat error:', e);
        onError?.(e);
      }
    }
  }

  /**
   * Non-streaming chat completion. Internally consumes the SSE stream
   * and aggregates deltas into a single string before returning.
   */
  async chat(systemPrompt: string, userMessage: string): Promise<string> {
    let buffer = '';
    await this.requestStream(
      { systemPrompt, message: userMessage },
      (delta) => {
        if (delta.text) buffer += delta.text;
      },
    );
    return buffer;
  }

  /**
   * Stream AI response with full context object.
   */
  async streamResponse(
    message: string,
    context: AIContext,
    config: Partial<StreamingConfig>,
  ): Promise<void> {
    try {
      await this.requestStream(
        { message, context: this.compressContext(context) as Record<string, unknown> },
        (delta) => {
          if (delta.text) config.streamCallback?.(delta.text);
        },
      );
    } catch (error: unknown) {
      const e = error instanceof Error ? error : new Error(String(error));
      if (e.name !== 'AbortError') {
        console.error('[StreamingAIService] streamResponse error:', e);
        config.errorCallback?.(e);
      }
    } finally {
      config.completeCallback?.();
    }
  }

  /**
   * Cancel any ongoing request.
   */
  cancelStream(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  /**
   * Compress context to reduce payload size before sending to the API.
   */
  compressContext(context: AIContext): AIContext {
    const compressed: AIContext = { ...context };
    if (Array.isArray(compressed.inventory) && compressed.inventory.length > 30) {
      compressed.inventory = compressed.inventory
        .slice()
        .sort((a, b) => this.getDaysUntilExpiry(a?.expiryDate) - this.getDaysUntilExpiry(b?.expiryDate))
        .slice(0, 30);
    }
    if (Array.isArray(compressed.recipes) && compressed.recipes.length > 20) {
      compressed.recipes = compressed.recipes.slice(0, 20);
    }
    return compressed;
  }

  private async requestStream(
    body: AssistantBody,
    onDelta: (delta: { text: string; raw: any }) => void,
  ): Promise<void> {
    this.abortController = new AbortController();
    try {
      const response = await fetch(resolveAssistantUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(await authHeaders()),
        },
        signal: this.abortController.signal,
        body: JSON.stringify(body),
      });

      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => '');
        throw new Error(`Assistant API error ${response.status}: ${text || response.statusText}`);
      }

      await this.consumeSse(response, onDelta);
    } finally {
      this.abortController = null;
    }
  }

  private async consumeSse(
    response: Response,
    onDelta: (delta: { text: string; raw: any }) => void,
  ): Promise<void> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;
          if (payload === '[DONE]') return;
          try {
            const json = JSON.parse(payload);
            if (json?.error) {
              throw new Error(`Assistant stream error: ${json.error}`);
            }
            const text: string = json?.choices?.[0]?.delta?.content ?? '';
            onDelta({ text, raw: json });
          } catch (err) {
            // Ignore partial-chunk JSON parse errors; rethrow real errors.
            if (err instanceof Error && err.message.startsWith('Assistant stream error')) {
              throw err;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private getDaysUntilExpiry(expiryDate: string | Date | undefined): number {
    if (!expiryDate) return Infinity;
    const expiry = new Date(expiryDate);
    if (Number.isNaN(expiry.getTime())) return Infinity;
    const diffTime = expiry.getTime() - Date.now();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

let streamingAIInstance: StreamingAIService | null = null;

/**
 * Get the singleton StreamingAIService instance.
 *
 * `apiKey` is accepted for backwards compatibility only and is ignored.
 */
export function getStreamingAIService(_apiKey?: string): StreamingAIService {
  if (!streamingAIInstance) {
    streamingAIInstance = new StreamingAIService();
  }
  return streamingAIInstance;
}
