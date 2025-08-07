import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/auth';
import { rateLimiter } from '@/lib/rateLimiter';
import { validateCORS } from '@/lib/cors';
import { API_RATE_LIMITS, SECURITY_ERROR_MESSAGES } from '@/config/security';

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS validation
  if (!validateCORS(req, res)) {
    return;
  }

  // Method validation
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract and verify token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ 
        error: SECURITY_ERROR_MESSAGES.UNAUTHORIZED 
      });
    }

    // Verify user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ 
        error: SECURITY_ERROR_MESSAGES.UNAUTHORIZED 
      });
    }

    // Rate limiting
    const rateLimitKey = `vision_${user.id}`;
    const allowed = await rateLimiter.checkLimit(rateLimitKey, API_RATE_LIMITS.VISION);
    
    if (!allowed) {
      const resetTime = await rateLimiter.getResetTime(rateLimitKey);
      res.setHeader('X-RateLimit-Reset', resetTime.toString());
      return res.status(429).json({ 
        error: API_RATE_LIMITS.VISION.message,
        resetTime 
      });
    }

    const { image, mode = 'product_recognition' } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Process based on mode
    let result;
    
    switch (mode) {
      case 'product_recognition':
        result = await recognizeProduct(image);
        break;
        
      case 'barcode_scan':
        result = await scanBarcode(image);
        break;
        
      case 'text_extraction':
        result = await extractText(image);
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid mode' });
    }

    // Log usage
    await logVisionUsage(user.id, mode);

    return res.json(result);

  } catch (error: any) {
    console.error('Vision API error:', error);
    return res.status(500).json({ 
      error: SECURITY_ERROR_MESSAGES.SERVER_ERROR 
    });
  }
}

/**
 * Recognize product using OpenAI Vision
 */
async function recognizeProduct(base64Image: string) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en reconnaissance de produits alimentaires.
Analyse l'image et retourne les informations du produit au format JSON:
{
  "name": "nom du produit en français",
  "brand": "marque (si visible)",
  "barcode": "code barre (si visible)",
  "category": "catégorie du produit",
  "unit": "unité suggérée (kg, L, unité, etc.)",
  "confidence": 0.0-1.0
}
Si tu ne peux pas identifier le produit, retourne {"error": "Produit non reconnu"}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'low' // Use 'low' for faster processing and lower cost
                }
              }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI Vision API error');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    try {
      const product = JSON.parse(content);
      
      if (product.error) {
        return { success: false, error: product.error };
      }

      return {
        success: true,
        product,
        confidence: product.confidence || 0.8
      };
    } catch (e) {
      return { success: false, error: 'Failed to parse product data' };
    }

  } catch (error) {
    console.error('Product recognition error:', error);
    return { success: false, error: 'Recognition failed' };
  }
}

/**
 * Scan barcode from image
 */
async function scanBarcode(base64Image: string) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'system',
            content: 'Extract only the barcode number from the image. Return just the numeric code, nothing else.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'low'
                }
              }
            ]
          }
        ],
        max_tokens: 50,
        temperature: 0
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI Vision API error');
    }

    const data = await response.json();
    const barcode = data.choices[0].message.content.trim();

    // Validate barcode format
    if (/^\d{8,13}$/.test(barcode)) {
      return { success: true, barcode };
    }

    return { success: false, error: 'Invalid barcode format' };

  } catch (error) {
    console.error('Barcode scan error:', error);
    return { success: false, error: 'Barcode scan failed' };
  }
}

/**
 * Extract text from image
 */
async function extractText(base64Image: string) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'system',
            content: 'Extract all readable text from the image. Focus on product names, ingredients, and nutritional information.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'low'
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI Vision API error');
    }

    const data = await response.json();
    const text = data.choices[0].message.content;

    return { success: true, text };

  } catch (error) {
    console.error('Text extraction error:', error);
    return { success: false, error: 'Text extraction failed' };
  }
}

/**
 * Log vision API usage
 */
async function logVisionUsage(userId: string, mode: string) {
  try {
    await supabaseAdmin.from('vision_usage').insert({
      user_id: userId,
      mode,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log vision usage:', error);
  }
}

// Export config for larger body size (base64 images)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb'
    }
  }
};