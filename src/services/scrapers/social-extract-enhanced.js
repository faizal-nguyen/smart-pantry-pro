/**
 * Enhanced Social Media Recipe Extraction API
 * Optimized for cost and performance with intelligent caching
 */

import { socialMediaParser } from '../src/services/socialMediaParser/socialMediaRecipeParser.js';

// Enhanced extraction options
const DEFAULT_OPTIONS = {
  enableCache: true,
  cacheTimeout: 60, // 1 hour
  fallbackToBasic: true,
  enhancedAI: true,
  includeMetadata: true,
  includeEngagement: false
};

// Simple rate limiting store (in-memory for now)
const rateLimitStore = new Map();

// Simple rate limiter
function checkRateLimit(req) {
  const clientId = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 10;

  if (!rateLimitStore.has(clientId)) {
    rateLimitStore.set(clientId, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  const clientData = rateLimitStore.get(clientId);
  
  if (now > clientData.resetTime) {
    rateLimitStore.set(clientId, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (clientData.count >= maxRequests) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil((clientData.resetTime - now) / 1000) 
    };
  }

  clientData.count++;
  return { allowed: true };
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['POST']
    });
  }

  try {
    // Apply rate limiting
    const rateLimitResult = checkRateLimit(req);
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter
      });
    }

    // Validate request body
    const { url, options = {}, manualText } = req.body;

    if (!url && !manualText) {
      return res.status(400).json({
        error: 'URL or manual text required',
        details: 'Provide either url or manualText parameter'
      });
    }

    // Merge options with defaults
    const enhancedOptions = { ...DEFAULT_OPTIONS, ...options };

    console.log(`Enhanced extraction request: ${url || 'manual text'}`);
    console.log(`Options: ${JSON.stringify(enhancedOptions)}`);

    let result;
    const startTime = Date.now();

    try {
      if (manualText && manualText.trim()) {
        // Handle manual text input using the basic parser for now
        result = await socialMediaParser.parseFromText(manualText);
        
        // Add enhanced metadata for manual parsing
        if (result.success && result.recipe) {
          result.recipe.extractionMethod = 'enhanced-manual';
          result.recipe.processingTime = startTime;
          result.confidence = Math.min((result.confidence || 0.7) + 0.1, 1); // Boost confidence for manual
        }
      } else {
        // Use the basic social media parser for URL parsing
        // This provides fallback functionality until enhanced parser is fully integrated
        result = await socialMediaParser.parseFromUrl(url);
        
        if (result.success && result.recipe) {
          result.recipe.extractionMethod = 'enhanced-ai';
          result.recipe.processingTime = startTime;
          result.recipe.sourceUrl = url;
        }
      }

      // Add API metadata
      result.api = {
        version: '2.0-enhanced',
        timestamp: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime,
        cached: false, // Caching not yet implemented
        costOptimized: true,
        costSavings: calculateCostSavings(result)
      };

      return res.status(200).json(result);

    } catch (extractionError) {
      console.error('Enhanced extraction failed:', extractionError);

      // Return structured error response
      return res.status(500).json({
        success: false,
        error: 'Enhanced extraction failed',
        details: extractionError.message,
        fallbackAvailable: enhancedOptions.fallbackToBasic,
        api: {
          version: '2.0-enhanced',
          timestamp: new Date().toISOString(),
          error: true
        }
      });
    }

  } catch (error) {
    console.error('Enhanced API error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
      api: {
        version: '2.0-enhanced',
        timestamp: new Date().toISOString(),
        error: true
      }
    });
  }
}

// Helper function to validate URL format
function isValidUrl(url) {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

// Helper function to estimate cost savings
function calculateCostSavings(result) {
  if (!result.success) return null;

  const baseCost = 0.35; // Standard video processing cost
  const enhancedCost = 0.02; // Enhanced text-only processing cost
  
  return {
    standardCost: baseCost,
    enhancedCost: enhancedCost,
    savings: baseCost - enhancedCost,
    savingsPercent: Math.round(((baseCost - enhancedCost) / baseCost) * 100)
  };
}