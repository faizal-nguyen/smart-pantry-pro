import { Router, type Request, type Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { userRateLimit } from '../middleware/userRateLimit.js';
import { logError } from '../config/logger.js';

const Body = z.object({
  message: z.string().min(1).max(4000),
  // Kept: the live social-recipe parser sends its JSON-extraction prompt
  // here. The route now requires a real signed-in user and a per-user
  // limit, so it is no longer an anonymous GPT proxy.
  systemPrompt: z.string().max(8000).optional(),
  context: z.record(z.any()).optional(),
  mode: z.enum(['text','voice','visual']).optional(),
  stream: z.boolean().optional()
});

function writeEvent(res: Response, data: unknown) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * `POST /stream`: server-side OpenAI streaming for signed-in users.
 *
 * Auth goes through `createAuthMiddleware` (Supabase `auth.getUser`):
 * the previous local `jwt.verify` also accepted the public anon key's
 * JWT, which is signed with the same secret.
 */
export function createAssistantStreamRouter(adminClient: SupabaseClient<any, any, any>): Router {
  const router = Router();
  router.post(
    '/stream',
    createAuthMiddleware(adminClient as any),
    userRateLimit({ key: 'assistant.stream', freeMax: 30, premiumMax: 300, windowMs: 3_600_000 }),
    assistantStreamHandler,
  );
  return router;
}

export async function assistantStreamHandler(req: Request, res: Response) {
  const check = Body.safeParse(req.body);
  if (!check.success) {
    return res.status(400).json({ success: false, error: 'Invalid request body', code: 'INVALID_BODY', issues: check.error.issues });
  }

  // For now, always stream a simulated response to avoid leaking keys client-side
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const { message } = check.data;

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  // Simulation fallback if no server key configured
  if (!apiKey) {
    try {
      const chunks = [
        'Bonjour! 👋 ',
        "Je suis ton assistant cuisine. ",
        'Voici une idée rapide basée sur ton inventaire: ',
        'pâtes à la tomate et basilic. ',
        'Souhaites-tu la recette détaillée?'
      ];
      for (const text of chunks) {
        writeEvent(res, { choices: [{ delta: { content: text } }] });
        await new Promise(r => setTimeout(r, 120));
      }
      res.write('data: [DONE]\n\n');
      return res.end();
    } catch (e: any) {
      writeEvent(res, { error: e?.message || 'Stream error', code: 'FALLBACK_SIMULATION' });
      res.write('data: [DONE]\n\n');
      return res.end();
    }
  }

  // Real streaming via OpenAI (server-side)
  try {
    const sys = check.data.systemPrompt ?? buildSystemPrompt(check.data.context);
    const reqBody = {
      model,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: check.data.message }
      ],
      temperature: 0.7,
      max_tokens: 1200,
      stream: true
    } as any;

    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(reqBody)
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => '');
      logError(new Error(`OpenAI upstream ${upstream.status}`), { endpoint: '/assistant/stream', detail: text.slice(0, 500) });
      writeEvent(res, { error: 'Assistant temporarily unavailable', code: 'UPSTREAM_ERROR' });
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      res.write(chunk);
    }
    return res.end();
  } catch (e: any) {
    logError(e instanceof Error ? e : new Error(String(e)), { endpoint: '/assistant/stream' });
    writeEvent(res, { error: 'Assistant temporarily unavailable', code: 'OPENAI_ERROR' });
    res.write('data: [DONE]\n\n');
    return res.end();
  }
}

function buildSystemPrompt(context: any = {}): string {
  try {
    const inventory = Array.isArray(context.inventory) ? context.inventory : [];
    const recipes = Array.isArray(context.recipes) ? context.recipes : [];
    const expiry = Array.isArray(context.expiryAlerts) ? context.expiryAlerts : [];
    const season = context.season || 'toutes saisons';
    const invText = inventory.slice(0, 30).map((i: any) => {
      const name = i?.product?.name || i?.name || 'Ingrédient';
      const qty = i?.quantity ? `${i.quantity} ${i.unit || ''}`.trim() : '';
      return `- ${name}${qty ? ` (${qty})` : ''}`;
    }).join('\n');
    const recText = recipes.slice(0, 20).map((r: any) => `- ${r?.name || r?.title || 'Recette'}`).join('\n');
    const expText = expiry.map((e: any) => `- ${e.product || e.name}: ${e.daysUntil}j`).join('\n');
    return `Tu es un assistant culinaire expert français.\n\nInventaire:\n${invText || '- (vide)'}\n\nRecettes:\n${recText || '- (aucune)'}\n\nProduits à consommer rapidement:\n${expText || '- aucun'}\n\nSaison: ${season}.\n\nRègles:\n1) Priorise les produits qui expirent\n2) Liste ingrédients manquants\n3) Donne des instructions claires et concises.`;
  } catch {
    return 'Tu es un assistant culinaire expert français. Donne des conseils pratiques et des recettes adaptées à l\'inventaire.';
  }
}
