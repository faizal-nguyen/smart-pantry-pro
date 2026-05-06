import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { logSecurityEvent, logError } from '../config/logger.js';

export const assistantRouter = Router();

const Body = z.object({
  message: z.string().min(1).max(4000),
  systemPrompt: z.string().max(8000).optional(),
  context: z.record(z.any()).optional(),
  mode: z.enum(['text','voice','visual']).optional(),
  stream: z.boolean().optional()
});

function writeEvent(res: Response, data: unknown) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function authGuard(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const secret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;

  // CRITICAL: Never bypass authentication, even in dev mode
  if (!secret) {
    logSecurityEvent('JWT_SECRET_MISSING', undefined, {
      endpoint: '/assistant',
      severity: 'critical',
    });
    return res.status(500).json({
      success: false,
      error: 'Server misconfigured - authentication not available',
      code: 'NO_JWT_SECRET'
    });
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - no token provided',
      code: 'UNAUTHORIZED'
    });
  }

  try {
    const decoded = jwt.verify(token, secret);
    (req as any).user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
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
      writeEvent(res, { error: `Upstream error ${upstream.status}`, detail: text });
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
    writeEvent(res, { error: e?.message || 'Upstream failure', code: 'OPENAI_ERROR' });
    res.write('data: [DONE]\n\n');
    return res.end();
  }
}

assistantRouter.post('/stream', authGuard, assistantStreamHandler);

// Temporary compatibility router for legacy path `/api/ai-assistant-enhanced`
export const assistantCompatRouter = Router();
assistantCompatRouter.post('/', authGuard, assistantStreamHandler);

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
