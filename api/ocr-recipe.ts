import { VercelRequest, VercelResponse } from '@vercel/node';
import { createWorker } from 'tesseract.js';

// OCR API endpoint pour scanning livres de recettes (pattern Cipher)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract image from form data
    const contentType = req.headers['content-type'] || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Multipart form data required' });
    }

    // Get image buffer from request
    const chunks: Buffer[] = [];
    
    await new Promise((resolve, reject) => {
      req.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      req.on('end', () => {
        resolve(true);
      });
      
      req.on('error', (err) => {
        reject(err);
      });
    });

    const buffer = Buffer.concat(chunks);
    
    // Parse multipart form data to extract image
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return res.status(400).json({ error: 'Invalid form data' });
    }

    // Simple multipart parser for image extraction
    const imageBuffer = extractImageFromMultipart(buffer, boundary);
    
    if (!imageBuffer) {
      return res.status(400).json({ error: 'No image found in request' });
    }

    console.log('📖 Processing OCR for recipe book image...');

    // Process with Tesseract.js (open source OCR)
    const ocrResult = await processWithTesseract(imageBuffer);
    
    // Parse recipe from OCR text if possible
    const parsedRecipe = parseRecipeFromText(ocrResult.text);
    
    const result = {
      text: ocrResult.text,
      confidence: ocrResult.confidence,
      parsedRecipe: parsedRecipe.success ? parsedRecipe.recipe : null,
      processingTime: ocrResult.processingTime
    };

    console.log(`✅ OCR completed: ${result.text.length} chars, confidence: ${Math.round(result.confidence * 100)}%`);

    res.status(200).json(result);

  } catch (error) {
    console.error('OCR processing error:', error);
    
    let errorMessage = 'OCR processing failed';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = 'OCR processing timeout';
        statusCode = 408;
      } else if (error.message.includes('memory')) {
        errorMessage = 'Image too large for processing';
        statusCode = 413;
      }
    }

    res.status(statusCode).json({ 
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Extract image buffer from multipart form data
function extractImageFromMultipart(buffer: Buffer, boundary: string): Buffer | null {
  try {
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const parts = [];
    let start = 0;
    
    while (start < buffer.length) {
      const boundaryIndex = buffer.indexOf(boundaryBuffer, start);
      if (boundaryIndex === -1) break;
      
      if (start > 0) {
        parts.push(buffer.slice(start, boundaryIndex));
      }
      start = boundaryIndex + boundaryBuffer.length;
    }
    
    // Find the part with image data
    for (const part of parts) {
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd === -1) continue;
      
      const headers = part.slice(0, headerEnd).toString();
      if (headers.includes('Content-Type: image/')) {
        const imageData = part.slice(headerEnd + 4);
        // Remove trailing boundary markers
        const cleanImageData = imageData.slice(0, imageData.lastIndexOf('\r\n--'));
        return cleanImageData;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Multipart parsing error:', error);
    return null;
  }
}

// Process image with Tesseract.js OCR
async function processWithTesseract(imageBuffer: Buffer) {
  const startTime = Date.now();
  
  try {
    const worker = await createWorker('fra', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    // Optimize for recipe text recognition
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ .,;:!?()-\'\"°/\\n',
      tessedit_pageseg_mode: '6', // Uniform block of text
    });

    const { data: { text, confidence } } = await worker.recognize(imageBuffer);
    
    await worker.terminate();
    
    const processingTime = Date.now() - startTime;
    
    return {
      text: text.trim(),
      confidence: confidence / 100, // Convert to 0-1 scale
      processingTime
    };
    
  } catch (error) {
    console.error('Tesseract processing error:', error);
    throw new Error('OCR engine failed');
  }
}

// Parse recipe structure from OCR text (pattern Cipher)
function parseRecipeFromText(text: string): { success: boolean; recipe?: any } {
  try {
    // Clean and normalize text
    const cleanText = text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\sàâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ.,;:!?()-'\"°/]/g, '')
      .trim();

    if (cleanText.length < 50) {
      return { success: false };
    }

    // Extract recipe name (usually first line or after "Recette")
    const namePatterns = [
      /^(.+?)(?:\n|\r)/,
      /(?:recette|recipe)\s*:?\s*(.+?)(?:\n|\r)/i,
      /^([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ][^.!?]*?)(?:[.!?]|\n|\r)/
    ];

    let recipeName = '';
    for (const pattern of namePatterns) {
      const match = cleanText.match(pattern);
      if (match && match[1].trim().length > 3) {
        recipeName = match[1].trim();
        break;
      }
    }

    // Extract ingredients section
    const ingredientPatterns = [
      /(?:ingrédients?|ingredients?)\s*:?\s*(.*?)(?=(?:préparation|preparation|instructions?|étapes?|steps?)|$)/is,
      /(?:pour\s+\d+\s+personnes?)\s*:?\s*(.*?)(?=(?:préparation|preparation|instructions?)|$)/is
    ];

    let ingredientsText = '';
    for (const pattern of ingredientPatterns) {
      const match = cleanText.match(pattern);
      if (match && match[1].trim().length > 10) {
        ingredientsText = match[1].trim();
        break;
      }
    }

    // Parse individual ingredients
    const ingredients = parseIngredientsList(ingredientsText);

    // Extract instructions
    const instructionPatterns = [
      /(?:préparation|preparation|instructions?|étapes?|méthode)\s*:?\s*(.*)/is,
      /(?:1\.|\d+\)\s+)(.+)/is
    ];

    let instructions = '';
    for (const pattern of instructionPatterns) {
      const match = cleanText.match(pattern);
      if (match && match[1].trim().length > 20) {
        instructions = match[1].trim();
        break;
      }
    }

    // Extract cooking times and servings
    const cookTimeMatch = cleanText.match(/(?:cuisson|cooking)\s*:?\s*(\d+)\s*(?:min|minutes?|h|heures?)/i);
    const prepTimeMatch = cleanText.match(/(?:préparation|prep)\s*:?\s*(\d+)\s*(?:min|minutes?|h|heures?)/i);
    const servingsMatch = cleanText.match(/(?:pour|serves?)\s*(\d+)\s*(?:personnes?|people|portions?)/i);

    // Build recipe object
    const recipe = {
      name: recipeName || 'Recette scannée',
      ingredients,
      instructions: instructions || cleanText,
      cookTime: cookTimeMatch ? cookTimeMatch[1] + ' min' : undefined,
      prepTime: prepTimeMatch ? prepTimeMatch[1] + ' min' : undefined,
      servings: servingsMatch ? parseInt(servingsMatch[1]) : undefined
    };

    // Success criteria: must have name and at least 2 ingredients
    const success = recipeName.length > 3 && ingredients.length >= 2;

    return { success, recipe: success ? recipe : undefined };

  } catch (error) {
    console.error('Recipe parsing error:', error);
    return { success: false };
  }
}

// Parse ingredients list from text
function parseIngredientsList(text: string): string[] {
  if (!text) return [];

  const ingredients: string[] = [];
  
  // Split by common delimiters
  const lines = text.split(/[\n\r•\-\*\d+\.\)]/);
  
  for (const line of lines) {
    const cleaned = line.trim();
    
    // Skip empty lines or very short ones
    if (cleaned.length < 3) continue;
    
    // Skip lines that don't look like ingredients
    if (cleaned.match(/^(?:préparation|instructions?|étapes?)/i)) continue;
    
    // Clean up the ingredient line
    const ingredient = cleaned
      .replace(/^[^\w\sàâäéèêëïîôùûüÿç]+/, '') // Remove leading punctuation
      .replace(/[.]{2,}.*$/, '') // Remove trailing dots and text
      .trim();
    
    if (ingredient.length > 2) {
      ingredients.push(ingredient);
    }
  }
  
  return ingredients.slice(0, 20); // Limit to reasonable number
}

// Configuration for Vercel
export const config = {
  api: {
    bodyParser: false, // Disable default body parser for multipart
    responseLimit: '10mb',
  },
  maxDuration: 30, // Allow up to 30 seconds for OCR processing
};