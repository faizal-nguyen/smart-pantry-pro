import { VercelRequest, VercelResponse } from '@vercel/node';
import { ImageAnnotatorClient } from '@google-cloud/vision';

// Google Vision OCR API endpoint pour recettes premium (pattern Cipher)
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
    // Check if Google Vision is configured
    if (!process.env.GOOGLE_CLOUD_PROJECT_ID || !process.env.GOOGLE_CLOUD_PRIVATE_KEY) {
      // Fallback to Tesseract OCR
      return await fallbackToTesseract(req, res);
    }

    // Extract image from form data (same logic as ocr-recipe.ts)
    const contentType = req.headers['content-type'] || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Multipart form data required' });
    }

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
    const boundary = contentType.split('boundary=')[1];
    
    if (!boundary) {
      return res.status(400).json({ error: 'Invalid form data' });
    }

    const imageBuffer = extractImageFromMultipart(buffer, boundary);
    
    if (!imageBuffer) {
      return res.status(400).json({ error: 'No image found in request' });
    }

    console.log('🔍 Processing with Google Vision API...');

    // Process with Google Vision API
    const visionResult = await processWithGoogleVision(imageBuffer);
    
    // Parse recipe from OCR text
    const parsedRecipe = parseRecipeFromText(visionResult.text);
    
    const result = {
      text: visionResult.text,
      confidence: visionResult.confidence,
      parsedRecipe: parsedRecipe.success ? parsedRecipe.recipe : null,
      processingTime: visionResult.processingTime,
      engine: 'google-vision'
    };

    console.log(`✅ Google Vision OCR completed: ${result.text.length} chars, confidence: ${Math.round(result.confidence * 100)}%`);

    res.status(200).json(result);

  } catch (error) {
    console.error('Google Vision OCR error:', error);
    
    // Fallback to Tesseract on Google Vision failure
    console.log('🔄 Falling back to Tesseract OCR...');
    return await fallbackToTesseract(req, res);
  }
}

// Google Vision API processing
async function processWithGoogleVision(imageBuffer: Buffer) {
  const startTime = Date.now();

  try {
    // Initialize Google Vision client with credentials
    const credentials = {
      project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
      private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    };

    const client = new ImageAnnotatorClient({
      credentials,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });

    // Perform text detection with enhanced features for recipes
    const [result] = await client.documentTextDetection({
      image: {
        content: imageBuffer.toString('base64'),
      },
      features: [
        {
          type: 'DOCUMENT_TEXT_DETECTION',
          maxResults: 1,
        }
      ],
      imageContext: {
        languageHints: ['fr', 'en'], // French and English for recipes
        textDetectionParams: {
          enableTextDetectionConfidenceScore: true,
        }
      }
    });

    const detections = result.textAnnotations || [];
    const fullTextAnnotation = result.fullTextAnnotation;

    if (!detections.length || !fullTextAnnotation) {
      throw new Error('No text detected in image');
    }

    // Extract text and confidence
    const text = fullTextAnnotation.text || '';
    
    // Calculate average confidence from all detected text blocks
    const textBlocks = fullTextAnnotation.pages?.[0]?.blocks || [];
    let totalConfidence = 0;
    let confidenceCount = 0;

    textBlocks.forEach(block => {
      block.paragraphs?.forEach(paragraph => {
        paragraph.words?.forEach(word => {
          if (word.confidence !== undefined) {
            totalConfidence += word.confidence;
            confidenceCount++;
          }
        });
      });
    });

    const confidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0.8;
    const processingTime = Date.now() - startTime;

    return {
      text: text.trim(),
      confidence,
      processingTime
    };

  } catch (error) {
    console.error('Google Vision processing error:', error);
    throw error;
  }
}

// Fallback to Tesseract when Google Vision fails or isn't configured
async function fallbackToTesseract(req: VercelRequest, res: VercelResponse) {
  try {
    // Import Tesseract dynamically to avoid bundle size issues
    const { createWorker } = await import('tesseract.js');
    
    // Re-extract image buffer (simplified version)
    const chunks: Buffer[] = [];
    
    req.on('data', (chunk) => {
      chunks.push(chunk);
    });
    
    await new Promise((resolve) => {
      req.on('end', resolve);
    });

    const buffer = Buffer.concat(chunks);
    const contentType = req.headers['content-type'] || '';
    const boundary = contentType.split('boundary=')[1];
    const imageBuffer = extractImageFromMultipart(buffer, boundary);

    if (!imageBuffer) {
      throw new Error('No image found');
    }

    console.log('📚 Processing with Tesseract fallback...');

    const startTime = Date.now();
    
    const worker = await createWorker('fra', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`Tesseract Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    // Optimize for recipe text
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ .,;:!?()-\'\"°/\\n',
      tessedit_pageseg_mode: 6, // Uniform block of text
    });

    const { data: { text, confidence } } = await worker.recognize(imageBuffer);
    await worker.terminate();

    const processingTime = Date.now() - startTime;
    
    // Parse recipe from text
    const parsedRecipe = parseRecipeFromText(text);
    
    const result = {
      text: text.trim(),
      confidence: confidence / 100,
      parsedRecipe: parsedRecipe.success ? parsedRecipe.recipe : null,
      processingTime,
      engine: 'tesseract-fallback'
    };

    console.log(`✅ Tesseract fallback completed: ${result.text.length} chars`);

    res.status(200).json(result);

  } catch (error) {
    console.error('Tesseract fallback error:', error);
    
    res.status(500).json({
      error: 'All OCR engines failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper functions (shared with ocr-recipe.ts)
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

// Enhanced recipe parsing for Google Vision results
function parseRecipeFromText(text: string): { success: boolean; recipe?: any } {
  try {
    // Clean and normalize text (better for Google Vision structured output)
    const cleanText = text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\sàâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ.,;:!?()\-'\"°/]/g, '')
      .trim();

    if (cleanText.length < 50) {
      return { success: false };
    }

    // Enhanced patterns for Google Vision's better text structure
    const namePatterns = [
      /^(.+?)(?:\n|\r)/,
      /(?:recette|recipe)\s*:?\s*(.+?)(?:\n|\r)/i,
      /^([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ][^.!?\n\r]*?)(?:[.!?]|\n|\r)/,
      // Handle titles that span multiple lines from OCR
      /^([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ][^\n\r]*?)(?:\n|\r)(?:\s*[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ][^\n\r]*?)?\s*(?:\n|\r)/
    ];

    let recipeName = '';
    for (const pattern of namePatterns) {
      const match = cleanText.match(pattern);
      if (match && match[1].trim().length > 3 && match[1].trim().length < 80) {
        recipeName = match[1].trim();
        break;
      }
    }

    // Enhanced ingredient extraction with Google Vision's better structure
    const ingredientPatterns = [
      /(?:ingrédients?|ingredients?)\s*:?\s*(.*?)(?=(?:préparation|preparation|instructions?|étapes?|steps?|méthode|method)|$)/is,
      /(?:pour\s+\d+\s+personnes?)\s*:?\s*(.*?)(?=(?:préparation|preparation|instructions?)|$)/is,
      // Handle bulleted or numbered ingredient lists better
      /(?:•|\*|\-|\d+\.)\s*([^\n\r•\*\-]+(?:\n\r?(?:•|\*|\-|\d+\.)\s*[^\n\r•\*\-]+)*)/gis
    ];

    let ingredientsText = '';
    for (const pattern of ingredientPatterns) {
      const match = cleanText.match(pattern);
      if (match && match[1].trim().length > 10) {
        ingredientsText = match[1].trim();
        break;
      }
    }

    // Parse individual ingredients with better structure detection
    const ingredients = parseIngredientsList(ingredientsText);

    // Enhanced instruction extraction
    const instructionPatterns = [
      /(?:préparation|preparation|instructions?|étapes?|méthode|method)\s*:?\s*(.*)/is,
      /(?:1\.|\d+\)\s+)(.+)/is,
      // Handle step-by-step instructions better
      /(?:\d+\.\s+.*?(?=\d+\.|$))/gis
    ];

    let instructions = '';
    for (const pattern of instructionPatterns) {
      const match = cleanText.match(pattern);
      if (match && match[1].trim().length > 20) {
        instructions = match[1].trim();
        break;
      }
    }

    // Enhanced time and serving extraction
    const cookTimeMatch = cleanText.match(/(?:cuisson|cooking)\s*:?\s*(\d+)\s*(?:min|minutes?|h|heures?)/i);
    const prepTimeMatch = cleanText.match(/(?:préparation|prep)\s*:?\s*(\d+)\s*(?:min|minutes?|h|heures?)/i);
    const servingsMatch = cleanText.match(/(?:pour|serves?)\s*(\d+)\s*(?:personnes?|people|portions?)/i);

    // Build enhanced recipe object
    const recipe = {
      name: recipeName || 'Recette scannée',
      ingredients,
      instructions: instructions || cleanText,
      cookTime: cookTimeMatch ? cookTimeMatch[1] + ' min' : undefined,
      prepTime: prepTimeMatch ? prepTimeMatch[1] + ' min' : undefined,
      servings: servingsMatch ? parseInt(servingsMatch[1]) : undefined,
      // Additional metadata from Google Vision
      confidence: ingredients.length >= 2 ? 0.9 : 0.6,
      source: 'ocr-scan'
    };

    // Enhanced success criteria
    const success = recipeName.length > 3 && ingredients.length >= 2 && instructions.length > 20;

    return { success, recipe: success ? recipe : undefined };

  } catch (error) {
    console.error('Enhanced recipe parsing error:', error);
    return { success: false };
  }
}

// Enhanced ingredient list parsing
function parseIngredientsList(text: string): string[] {
  if (!text) return [];

  const ingredients: string[] = [];
  
  // Split by various delimiters including OCR artifacts
  const lines = text.split(/[\n\r•\-\*\d+\.\)]/);
  
  for (const line of lines) {
    const cleaned = line.trim();
    
    // Skip empty lines or very short ones
    if (cleaned.length < 3) continue;
    
    // Skip lines that don't look like ingredients
    if (cleaned.match(/^(?:préparation|instructions?|étapes?|method|cooking|preparation)/i)) continue;
    
    // Enhanced cleaning for Google Vision artifacts
    const ingredient = cleaned
      .replace(/^[^\w\sàâäéèêëïîôùûüÿç]+/, '') // Remove leading punctuation
      .replace(/[.]{2,}.*$/, '') // Remove trailing dots and text
      .replace(/^\d+\s*[.\)]\s*/, '') // Remove numbering
      .replace(/^[•\-\*]\s*/, '') // Remove bullet points
      .trim();
    
    if (ingredient.length > 2 && ingredient.length < 100) {
      ingredients.push(ingredient);
    }
  }
  
  return ingredients.slice(0, 25); // Limit to reasonable number
}

// Configuration for Vercel
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '10mb',
  },
  maxDuration: 60, // Allow up to 60 seconds for Google Vision processing
};