import { ShoppingTextBody } from '@smart/shared';
import type { ShoppingTextBodyT } from '@smart/shared';
import { InternalServerError } from '../utils/errors.js';

async function importLegacy() {
  const candidates = [
    '../../../../api/shopping/parse-text.js',
    '../../../api/shopping/parse-text.js',
  ];
  let lastErr: any;
  for (const p of candidates) {
    try {
      const mod = await import(p as string);
      return (mod as any).default || mod;
    } catch (err) { lastErr = err; }
  }
  throw new InternalServerError('Failed to load legacy shopping parser', 'LEGACY_MODULE_LOAD_FAILED');
}

function invoke(handler: Function, body: any) {
  return new Promise((resolve) => {
    const req = { method: 'POST', body } as any;
    let statusCode = 200;
    const res = {
      setHeader: (_k: string, _v: string) => {},
      status: (code: number) => { statusCode = code; return res; },
      json: (payload: any) => resolve({ statusCode, ...payload }),
      end: () => resolve({ statusCode })
    } as any;
    Promise.resolve(handler(req, res)).catch(() => resolve({ statusCode: 500, success: false }));
  });
}

// Use shared type to keep contracts consistent across client/server

export async function parseShoppingText(input: ShoppingTextBodyT) {
  try {
    const handler = await importLegacy();
    const resp: any = await invoke(handler, input);
    // Normalisation de la réponse legacy
    if (resp && resp.success === true && Array.isArray(resp.items)) {
      return {
        items: resp.items,
        originalText: input.text,
        demo: false
      };
    }
    throw new InternalServerError('Legacy handler returned invalid payload', 'INVALID_LEGACY_RESPONSE');
  } catch (error: any) {
    // Fallback clair en mode démo (ne pas prétendre un succès du service sous-jacent)
    return {
      items: [
        { productName: 'tomates', quantity: 2, unit: 'kg', category: 'Légumes', storeSection: 'Fruits et Légumes', confidence: 0.9 },
        { productName: 'lait', quantity: 1, unit: 'L', category: 'Produits laitiers', storeSection: 'Crémerie', confidence: 0.8 }
      ],
      originalText: input.text,
      demo: true,
      error: error?.message
    } as const;
  }
}
