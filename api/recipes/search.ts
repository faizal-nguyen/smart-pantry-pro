// API endpoint pour recherche de recettes optimisée <100ms
// Utilise PostgreSQL Full Text Search avec cache Redis

import { supabase } from '@/integrations/supabase/client';
import { Redis } from '@upstash/redis';

// Configuration Redis (ou fallback mémoire locale)
const redis = process.env.UPSTASH_REDIS_REST_URL 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
    })
  : null;

// Cache mémoire local comme fallback
const memoryCache = new Map<string, { data: any, expires: number }>();

export interface SearchFilters {
  dietary?: string[];
  maxTime?: number;
  spiceLevel?: number;
  mealType?: string;
  cuisine?: string;
}

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const startTime = Date.now();
  
  try {
    const { q: query, dietary, maxTime, spiceLevel, mealType, cuisine } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }
    
    // Construire la clé de cache
    const cacheKey = buildCacheKey({ query, dietary, maxTime, spiceLevel, mealType, cuisine });
    
    // 1. Vérifier le cache
    const cached = await getFromCache(cacheKey);
    if (cached) {
      const responseTime = Date.now() - startTime;
      console.log(`✅ Cache hit - Response time: ${responseTime}ms`);
      
      return res.status(200).json({
        success: true,
        recipes: cached,
        cached: true,
        responseTime
      });
    }
    
    // 2. Recherche optimisée dans la base
    const results = await searchRecipesOptimized({
      query,
      filters: {
        dietary: dietary ? dietary.split(',') : undefined,
        maxTime: maxTime ? parseInt(maxTime) : undefined,
        spiceLevel: spiceLevel ? parseInt(spiceLevel) : undefined,
        mealType,
        cuisine
      }
    });
    
    // 3. Mettre en cache pour 1 heure
    await setInCache(cacheKey, results, 3600);
    
    const responseTime = Date.now() - startTime;
    console.log(`🔍 DB search - Response time: ${responseTime}ms`);
    
    // Alerter si > 100ms
    if (responseTime > 100) {
      console.warn(`⚠️ Slow response: ${responseTime}ms for query "${query}"`);
    }
    
    res.status(200).json({
      success: true,
      recipes: results,
      cached: false,
      responseTime
    });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      responseTime: Date.now() - startTime
    });
  }
}

// Recherche optimisée avec Full Text Search
async function searchRecipesOptimized({ query, filters }: {
  query: string;
  filters: SearchFilters;
}): Promise<any[]> {
  // Préparer la requête de recherche pour FTS
  const searchQuery = prepareSearchQuery(query);
  
  // Construire la requête SQL dynamiquement
  let sqlQuery = `
    SELECT 
      id,
      name,
      translated_title,
      translated_description,
      cuisine_type,
      indian_cuisine_type,
      meal_type,
      meal_timing,
      prep_time,
      cook_time,
      total_time,
      servings,
      difficulty,
      dietary_tags,
      spice_level,
      allergen_warnings,
      image_url,
      ts_rank(
        to_tsvector('french', COALESCE(translated_title, '') || ' ' || COALESCE(translated_description, '')),
        to_tsquery('french', $1)
      ) AS rank
    FROM recipes
    WHERE to_tsvector('french', COALESCE(translated_title, '') || ' ' || COALESCE(translated_description, '')) 
          @@ to_tsquery('french', $1)
  `;
  
  const params: any[] = [searchQuery];
  let paramIndex = 2;
  
  // Ajouter les filtres
  if (filters.dietary && filters.dietary.length > 0) {
    sqlQuery += ` AND dietary_tags && $${paramIndex}::text[]`;
    params.push(filters.dietary);
    paramIndex++;
  }
  
  if (filters.maxTime) {
    sqlQuery += ` AND total_time <= $${paramIndex}`;
    params.push(filters.maxTime);
    paramIndex++;
  }
  
  if (filters.spiceLevel) {
    sqlQuery += ` AND spice_level <= $${paramIndex}`;
    params.push(filters.spiceLevel);
    paramIndex++;
  }
  
  if (filters.mealType) {
    sqlQuery += ` AND (meal_type = $${paramIndex} OR meal_timing = $${paramIndex})`;
    params.push(filters.mealType);
    paramIndex++;
  }
  
  if (filters.cuisine) {
    sqlQuery += ` AND (cuisine_type ILIKE $${paramIndex} OR indian_cuisine_type ILIKE $${paramIndex})`;
    params.push(`%${filters.cuisine}%`);
    paramIndex++;
  }
  
  // Ordonner par pertinence et limiter
  sqlQuery += `
    ORDER BY rank DESC, spice_level ASC
    LIMIT 20
  `;
  
  // Exécuter la requête directement avec Supabase
  // Pour l'instant, on utilise une approche simplifiée sans SQL raw
  let query = supabase
    .from('recipes')
    .select('*')
    .textSearch('translated_title', searchQuery);
  
  // Ajouter les filtres
  if (filters.dietary && filters.dietary.length > 0) {
    query = query.contains('dietary_tags', filters.dietary);
  }
  
  if (filters.maxTime) {
    query = query.lte('total_time', filters.maxTime);
  }
  
  if (filters.spiceLevel) {
    query = query.lte('spice_level', filters.spiceLevel);
  }
  
  if (filters.mealType) {
    query = query.or(`meal_type.eq.${filters.mealType},meal_timing.eq.${filters.mealType}`);
  }
  
  if (filters.cuisine) {
    query = query.or(`cuisine_type.ilike.%${filters.cuisine}%,indian_cuisine_type.ilike.%${filters.cuisine}%`);
  }
  
  // Limiter et ordonner
  query = query.limit(20);
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Search query error:', error);
    throw error;
  }
  
  return data || [];
}

// Préparer la requête pour Full Text Search
function prepareSearchQuery(query: string): string {
  // Nettoyer et préparer la requête
  const cleaned = query
    .trim()
    .toLowerCase()
    .replace(/[^\w\s\u00C0-\u017F]/g, ' ') // Garder les caractères français
    .replace(/\s+/g, ' ')
    .trim();
  
  // Séparer les mots et les joindre avec &
  const words = cleaned.split(' ').filter(w => w.length > 1);
  
  // Construire la requête tsquery
  // Utiliser OR pour plus de flexibilité
  return words.map(w => `${w}:*`).join(' | ');
}

// Gestion du cache
async function getFromCache(key: string): Promise<any> {
  try {
    // Essayer Redis d'abord
    if (redis) {
      const cached = await redis.get(key);
      if (cached) return cached;
    }
    
    // Fallback sur cache mémoire
    const memoryCached = memoryCache.get(key);
    if (memoryCached && memoryCached.expires > Date.now()) {
      return memoryCached.data;
    }
    
    return null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

async function setInCache(key: string, data: any, ttlSeconds: number): Promise<void> {
  try {
    // Mettre dans Redis si disponible
    if (redis) {
      await redis.set(key, data, { ex: ttlSeconds });
    }
    
    // Toujours mettre dans le cache mémoire comme backup
    memoryCache.set(key, {
      data,
      expires: Date.now() + (ttlSeconds * 1000)
    });
    
    // Nettoyer le cache mémoire si trop gros
    if (memoryCache.size > 100) {
      const now = Date.now();
      for (const [k, v] of memoryCache.entries()) {
        if (v.expires < now) {
          memoryCache.delete(k);
        }
      }
    }
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

// Construire une clé de cache unique
function buildCacheKey(params: any): string {
  const parts = ['recipe_search'];
  
  if (params.query) parts.push(params.query.toLowerCase());
  if (params.dietary) parts.push(`diet:${params.dietary}`);
  if (params.maxTime) parts.push(`time:${params.maxTime}`);
  if (params.spiceLevel) parts.push(`spice:${params.spiceLevel}`);
  if (params.mealType) parts.push(`meal:${params.mealType}`);
  if (params.cuisine) parts.push(`cuisine:${params.cuisine}`);
  
  return parts.join(':');
}