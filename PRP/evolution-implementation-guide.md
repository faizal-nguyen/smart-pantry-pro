# 🛠️ GUIDE D'IMPLÉMENTATION TECHNIQUE - ÉVOLUTION SMART PANTRY

## 📁 Structure des Nouveaux Fichiers à Créer

### 1. Services IA
```bash
api/ai/
├── chat-assistant.ts          # Assistant conversationnel principal
├── vision-recognition.ts      # Reconnaissance visuelle (frigo, produits)
├── social-parser.ts          # Extraction Instagram/TikTok
├── cache-manager.ts          # Gestion cache intelligent
└── streaming-handler.ts      # Réponses streaming type ChatGPT
```

### 2. Composants React
```bash
src/components/ai/
├── AIAssistantChat.tsx       # Interface chat principale
├── MessageBubble.tsx         # Bulles de conversation
├── InputMultiModal.tsx       # Input text/voice/photo
├── StreamingMessage.tsx      # Messages avec typing effect
└── QuickActions.tsx          # Actions rapides contextuelles

src/components/scanner/
├── SmartScanner.tsx          # Scanner multi-usage
├── CameraView.tsx            # Vue caméra optimisée
├── BarcodeScanner.tsx        # Scan codes-barres (existant)
└── VisionPreview.tsx         # Preview reconnaissance visuelle

src/components/family/
├── FamilyDashboard.tsx       # Dashboard collaboratif
├── ActivityFeed.tsx          # Flux temps réel famille
├── MemberPresence.tsx        # Qui est en ligne
└── SharedMealPlanner.tsx     # Planning partagé
```

### 3. Hooks Spécialisés
```bash
src/hooks/
├── useAIAssistant.ts         # Hook principal IA
├── useStreamingResponse.ts   # Gestion streaming
├── useVisionRecognition.ts   # Hook reconnaissance visuelle
├── useSocialParser.ts        # Hook parsing social
├── useRealtimeSync.ts        # Sync famille temps réel
└── useVoiceInput.ts          # Input vocal
```

## 💻 Code d'Implémentation Détaillé

### 1. Assistant IA avec Streaming

```typescript
// api/ai/chat-assistant.ts
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import { streamToResponse } from './streaming-handler';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(req: Request) {
  try {
    const { message, userId, context } = await req.json();
    
    // Récupérer le contexte utilisateur enrichi
    const userContext = await enrichUserContext(userId, context);
    
    // Créer le prompt système intelligent
    const systemPrompt = createSmartSystemPrompt(userContext);
    
    // Streaming response comme ChatGPT
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...userContext.conversationHistory,
        { role: 'user', content: message }
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 1000
    });
    
    // Sauvegarder la conversation en parallèle
    saveConversation(userId, message, stream);
    
    // Retourner le stream au client
    return streamToResponse(stream);
    
  } catch (error) {
    console.error('AI Assistant Error:', error);
    return new Response(
      JSON.stringify({ error: 'Assistant temporarily unavailable' }),
      { status: 500 }
    );
  }
}

async function enrichUserContext(userId: string, baseContext: any) {
  // Récupérer toutes les données pertinentes en parallèle
  const [inventory, recipes, preferences, season, trends] = await Promise.all([
    getInventoryWithExpiry(userId),
    getUserRecipes(userId),
    getUserPreferences(userId),
    getSeasonalContext(),
    getTrendingRecipes()
  ]);
  
  return {
    ...baseContext,
    inventory,
    recipes,
    preferences,
    season,
    trends,
    conversationHistory: await getRecentConversation(userId)
  };
}

function createSmartSystemPrompt(context: any): string {
  return `Tu es un assistant culinaire expert, amical et proactif. 
  
**Contexte actuel:**
- Inventaire: ${context.inventory.length} produits (${context.inventory.filter(i => i.expires_soon).length} expirent bientôt)
- Saison: ${context.season.name} (privilégier: ${context.season.ingredients.join(', ')})
- Préférences: ${context.preferences.dietary.join(', ')}
- Tendances: ${context.trends.slice(0, 3).map(t => t.name).join(', ')}

**Instructions:**
1. Sois conversationnel et amical
2. Suggère proactivement basé sur l'inventaire
3. Alerte sur les produits qui expirent
4. Propose des substitutions intelligentes
5. Mentionne les tendances si pertinent

**Format de réponse:**
- Utilise des emojis pour rendre la conversation vivante
- Structure les recettes avec titre, temps, ingrédients
- Sois concis mais informatif`;
}
```

### 2. Reconnaissance Visuelle Intelligente

```typescript
// api/ai/vision-recognition.ts
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { createClient } from '@supabase/supabase-js';

const vision = new ImageAnnotatorClient();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface VisionRequest {
  image: string; // base64
  type: 'fridge' | 'receipt' | 'dish' | 'product';
  userId: string;
}

export default async function handler(req: Request) {
  const { image, type, userId }: VisionRequest = await req.json();
  
  try {
    // Analyse adaptée au type
    const analysis = await analyzeByType(image, type);
    
    // Enrichissement avec base de données produits
    const enrichedItems = await enrichWithDatabase(analysis.items);
    
    // Suggestions intelligentes basées sur la reconnaissance
    const suggestions = await generateSmartSuggestions(enrichedItems, userId);
    
    // Mise à jour automatique de l'inventaire si pertinent
    if (type === 'fridge' || type === 'receipt') {
      await updateInventoryFromVision(userId, enrichedItems);
    }
    
    return new Response(JSON.stringify({
      success: true,
      recognized: enrichedItems,
      suggestions,
      confidence: analysis.confidence,
      stats: {
        items_found: enrichedItems.length,
        processing_time_ms: analysis.processingTime
      }
    }));
    
  } catch (error) {
    console.error('Vision Recognition Error:', error);
    return new Response(
      JSON.stringify({ error: 'Recognition failed' }),
      { status: 500 }
    );
  }
}

async function analyzeByType(image: string, type: string) {
  const startTime = Date.now();
  
  switch (type) {
    case 'fridge':
      return analyzeFridgeContents(image);
    case 'receipt':
      return analyzeReceipt(image);
    case 'dish':
      return analyzeDish(image);
    case 'product':
      return analyzeProduct(image);
    default:
      throw new Error('Invalid vision type');
  }
}

async function analyzeFridgeContents(image: string) {
  // Utiliser Google Vision pour détecter les objets
  const [result] = await vision.objectLocalization({
    image: { content: image }
  });
  
  // Filtrer et catégoriser les aliments détectés
  const foodItems = result.localizedObjectAnnotations
    ?.filter(obj => isFoodItem(obj.name))
    .map(obj => ({
      name: translateToFrench(obj.name),
      confidence: obj.score,
      boundingBox: obj.boundingPoly,
      category: categorizeFood(obj.name)
    })) || [];
  
  // Utiliser l'IA pour affiner la reconnaissance
  const refinedItems = await refineWithAI(image, foodItems);
  
  return {
    items: refinedItems,
    confidence: calculateAverageConfidence(refinedItems),
    processingTime: Date.now() - startTime
  };
}

async function refineWithAI(image: string, initialItems: any[]) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Analyse cette photo de frigo. Objets détectés: ${JSON.stringify(initialItems)}. 
                 Corrige et complète la liste des aliments visibles. Format JSON avec: name, quantity_estimate, freshness_state.`
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${image}` }
        }
      ]
    }],
    max_tokens: 500
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

### 3. Parser Social Media Intelligent

```typescript
// api/ai/social-parser.ts
import { chromium } from 'playwright';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface SocialParseRequest {
  url: string;
  platform?: 'instagram' | 'tiktok' | 'youtube';
  userId: string;
}

export default async function handler(req: Request) {
  const { url, platform, userId }: SocialParseRequest = await req.json();
  
  try {
    // Détection automatique de la plateforme
    const detectedPlatform = platform || detectPlatform(url);
    
    // Extraction du contenu selon la plateforme
    const content = await extractSocialContent(url, detectedPlatform);
    
    // Parsing intelligent avec GPT-4
    const recipe = await parseRecipeFromSocial(content, detectedPlatform);
    
    // Enrichissement et validation
    const enrichedRecipe = await enrichRecipe(recipe, userId);
    
    // Sauvegarde avec source
    await saveRecipeWithSource(enrichedRecipe, url, detectedPlatform, userId);
    
    return new Response(JSON.stringify({
      success: true,
      recipe: enrichedRecipe,
      source: {
        platform: detectedPlatform,
        url,
        author: content.author
      }
    }));
    
  } catch (error) {
    console.error('Social Parser Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to parse social content' }),
      { status: 500 }
    );
  }
}

async function extractSocialContent(url: string, platform: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    
    switch (platform) {
      case 'instagram':
        return extractInstagramContent(page);
      case 'tiktok':
        return extractTikTokContent(page);
      case 'youtube':
        return extractYouTubeContent(page);
      default:
        throw new Error('Unsupported platform');
    }
  } finally {
    await browser.close();
  }
}

async function extractInstagramContent(page: any) {
  // Attendre le chargement du contenu
  await page.waitForSelector('article', { timeout: 10000 });
  
  // Extraire le texte du post
  const postText = await page.$eval(
    'article div[style*="flex-grow"] span',
    el => el?.textContent || ''
  );
  
  // Extraire les images
  const images = await page.$$eval(
    'article img[srcset]',
    imgs => imgs.map(img => img.src)
  );
  
  // Extraire les informations de l'auteur
  const author = await page.$eval(
    'header a[href^="/"]',
    el => el?.textContent || 'Unknown'
  );
  
  // Pour les Reels, extraire la transcription
  const videoTranscript = await extractVideoTranscript(page);
  
  return {
    text: postText,
    images,
    author,
    videoTranscript,
    platform: 'instagram'
  };
}

async function parseRecipeFromSocial(content: any, platform: string) {
  const prompt = `Analyse ce contenu ${platform} et extrais une recette complète.
  
Contenu:
${content.text}
${content.videoTranscript ? `Transcription: ${content.videoTranscript}` : ''}

Instructions:
1. Extrais tous les ingrédients avec quantités
2. Reconstitue les étapes de préparation
3. Estime les temps de préparation/cuisson
4. Identifie le type de cuisine et difficulté
5. Traduis tout en français si nécessaire

Format JSON attendu:
{
  "name": "nom de la recette",
  "ingredients": [{"name": "...", "quantity": ..., "unit": "..."}],
  "instructions": ["étape 1", "étape 2"],
  "prep_time": minutes,
  "cook_time": minutes,
  "servings": nombre,
  "difficulty": "easy|medium|hard",
  "tags": ["tag1", "tag2"]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Tu es un expert en extraction de recettes depuis les réseaux sociaux.' },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' }
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

### 4. Composant Chat IA Principal

```typescript
// src/components/ai/AIAssistantChat.tsx
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { MessageBubble } from './MessageBubble';
import { InputMultiModal } from './InputMultiModal';
import { QuickActions } from './QuickActions';
import { StreamingMessage } from './StreamingMessage';

export function AIAssistantChat() {
  const {
    messages,
    sendMessage,
    isStreaming,
    streamingMessage,
    quickActions
  } = useAIAssistant();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputMode, setInputMode] = useState<'text' | 'voice' | 'photo'>('text');
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);
  
  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[800px] bg-white rounded-xl shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center">
            <span className="text-white text-xl">👨‍🍳</span>
          </div>
          <div>
            <h3 className="font-semibold">Chef Assistant</h3>
            <p className="text-sm text-gray-500">Toujours là pour vous aider</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-gray-500">En ligne</span>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <MessageBubble message={message} />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Streaming message */}
        {isStreaming && streamingMessage && (
          <StreamingMessage content={streamingMessage} />
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <QuickActions
          actions={quickActions}
          onSelect={(action) => sendMessage({ text: action.text })}
        />
      )}
      
      {/* Input Area */}
      <InputMultiModal
        mode={inputMode}
        onModeChange={setInputMode}
        onSend={sendMessage}
        disabled={isStreaming}
      />
    </div>
  );
}
```

### 5. Hook Principal avec Intelligence

```typescript
// src/hooks/useAIAssistant.ts
import { useState, useCallback, useEffect } from 'react';
import { useInventory } from './useInventory';
import { useRecipes } from './useRecipes';
import { useUserPreferences } from './useUserPreferences';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    images?: string[];
    suggestions?: any[];
    recipe?: any;
  };
}

export function useAIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [quickActions, setQuickActions] = useState<any[]>([]);
  
  const { inventory } = useInventory();
  const { recipes } = useRecipes();
  const { preferences } = useUserPreferences();
  
  // Charger l'historique de conversation
  useEffect(() => {
    loadConversationHistory();
  }, []);
  
  // Générer des actions rapides contextuelles
  useEffect(() => {
    generateQuickActions();
  }, [inventory, messages]);
  
  const sendMessage = useCallback(async (input: {
    text?: string;
    image?: string;
    voice?: ArrayBuffer;
  }) => {
    // Créer le message utilisateur
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.text || 'Photo envoyée',
      timestamp: new Date(),
      metadata: input.image ? { images: [input.image] } : undefined
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamingMessage('');
    
    try {
      // Préparer le contexte enrichi
      const context = {
        inventory: inventory.slice(0, 20), // Limiter pour l'API
        recipes: recipes.slice(0, 10),
        preferences,
        recentMessages: messages.slice(-5)
      };
      
      // Appel API avec streaming
      const response = await fetch('/api/ai/chat-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.text,
          image: input.image,
          userId: (await supabase.auth.getUser()).data.user?.id,
          context
        })
      });
      
      // Gérer le streaming de la réponse
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        assistantMessage += chunk;
        setStreamingMessage(assistantMessage);
      }
      
      // Créer le message final de l'assistant
      const finalMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, finalMessage]);
      
      // Sauvegarder la conversation
      await saveConversation(userMessage, finalMessage);
      
    } catch (error) {
      console.error('AI Assistant error:', error);
      // Message d'erreur user-friendly
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Désolé, j'ai rencontré un problème. Pouvez-vous réessayer ?",
        timestamp: new Date()
      }]);
    } finally {
      setIsStreaming(false);
      setStreamingMessage('');
    }
  }, [inventory, recipes, preferences, messages]);
  
  const generateQuickActions = useCallback(() => {
    const actions = [];
    
    // Actions basées sur l'inventaire
    const expiringCount = inventory.filter(item => 
      item.expiry_date && isExpiringSoon(item.expiry_date)
    ).length;
    
    if (expiringCount > 0) {
      actions.push({
        id: 'expiring',
        text: `Que faire avec les ${expiringCount} produits qui expirent ?`,
        icon: '⏰'
      });
    }
    
    // Actions contextuelles basées sur l'heure
    const hour = new Date().getHours();
    if (hour >= 11 && hour <= 13) {
      actions.push({
        id: 'lunch',
        text: "Idées pour le déjeuner ?",
        icon: '🍽️'
      });
    } else if (hour >= 17 && hour <= 20) {
      actions.push({
        id: 'dinner',
        text: "Suggestions pour le dîner",
        icon: '🍝'
      });
    }
    
    // Actions populaires
    actions.push(
      {
        id: 'quick',
        text: "Recette rapide (< 30 min)",
        icon: '⚡'
      },
      {
        id: 'scan',
        text: "Scanner mon frigo",
        icon: '📸'
      }
    );
    
    setQuickActions(actions.slice(0, 4));
  }, [inventory]);
  
  return {
    messages,
    sendMessage,
    isStreaming,
    streamingMessage,
    quickActions
  };
}
```

### 6. Sync Famille Temps Réel

```typescript
// src/hooks/useRealtimeSync.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface FamilyActivity {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  timestamp: Date;
  details?: any;
}

export function useRealtimeSync(familyId: string) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [activities, setActivities] = useState<FamilyActivity[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<string[]>([]);
  
  useEffect(() => {
    if (!familyId) return;
    
    // Créer le channel Supabase
    const newChannel = supabase.channel(`family:${familyId}`, {
      config: {
        presence: { key: 'user_id' }
      }
    });
    
    // Écouter les changements de la base de données
    newChannel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pantry_items',
        filter: `family_id=eq.${familyId}`
      }, handleDatabaseChange)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shopping_list',
        filter: `family_id=eq.${familyId}`
      }, handleDatabaseChange)
      .on('presence', { event: 'sync' }, () => {
        const state = newChannel.presenceState();
        setOnlineMembers(Object.keys(state));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await newChannel.track({
            user_id: (await supabase.auth.getUser()).data.user?.id,
            online_at: new Date().toISOString()
          });
        }
      });
    
    setChannel(newChannel);
    
    return () => {
      newChannel.unsubscribe();
    };
  }, [familyId]);
  
  const handleDatabaseChange = (payload: any) => {
    // Créer une activité pour afficher dans le feed
    const activity: FamilyActivity = {
      id: crypto.randomUUID(),
      user_id: payload.new?.user_id || payload.old?.user_id,
      user_name: 'Membre famille', // À enrichir avec les vraies données
      action: getActionDescription(payload),
      timestamp: new Date(),
      details: payload
    };
    
    setActivities(prev => [activity, ...prev].slice(0, 50));
    
    // Notification toast si action importante
    if (isImportantAction(payload)) {
      showNotification(activity);
    }
  };
  
  const broadcastAction = async (action: string, details?: any) => {
    if (!channel) return;
    
    await channel.send({
      type: 'broadcast',
      event: 'family_action',
      payload: {
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action,
        details,
        timestamp: new Date().toISOString()
      }
    });
  };
  
  return {
    activities,
    onlineMembers,
    broadcastAction,
    isConnected: channel?.state === 'joined'
  };
}
```

## 🔧 Configuration et Variables d'Environnement

```bash
# .env.local
# APIs IA
OPENAI_API_KEY=sk-...
GOOGLE_CLOUD_VISION_KEY=...
CLARIFAI_API_KEY=...

# Cache Redis (optionnel mais recommandé)
REDIS_URL=redis://...

# Limites et Sécurité
MAX_AI_REQUESTS_PER_USER_PER_DAY=100
MAX_VISION_REQUESTS_PER_USER_PER_DAY=50
AI_RESPONSE_TIMEOUT_MS=15000

# Feature Flags
ENABLE_AI_ASSISTANT=true
ENABLE_VISION_RECOGNITION=true
ENABLE_SOCIAL_PARSING=true
ENABLE_FAMILY_SYNC=true
```

## 🚀 Scripts de Migration

```sql
-- Nouvelles tables pour l'évolution
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB[] DEFAULT '{}',
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vision_recognitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT,
  recognition_type TEXT,
  results JSONB,
  confidence FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_family_activities_family_id ON family_activities(family_id);
CREATE INDEX idx_vision_recognitions_user_id ON vision_recognitions(user_id);

-- RLS Policies
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_recognitions ENABLE ROW LEVEL SECURITY;
```

## 📝 Tests Critiques

```typescript
// __tests__/ai-assistant.test.ts
describe('AI Assistant Integration', () => {
  it('should handle streaming responses correctly', async () => {
    const { result } = renderHook(() => useAIAssistant());
    
    await act(async () => {
      await result.current.sendMessage({ text: "Que puis-je faire avec des tomates ?" });
    });
    
    expect(result.current.isStreaming).toBe(true);
    
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1].role).toBe('assistant');
    });
  });
  
  it('should recognize fridge contents from image', async () => {
    const mockImage = await loadTestImage('fridge-test.jpg');
    
    const response = await fetch('/api/ai/vision-recognition', {
      method: 'POST',
      body: JSON.stringify({
        image: mockImage,
        type: 'fridge',
        userId: testUserId
      })
    });
    
    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.recognized).toBeInstanceOf(Array);
    expect(result.confidence).toBeGreaterThan(0.7);
  });
});
```

## 🎯 Checklist de Lancement

### Semaine 1
- [ ] Setup environnement OpenAI avec billing alerts
- [ ] Implémenter chat assistant basique
- [ ] Tester streaming responses
- [ ] Deploy sur environnement de test

### Semaine 2
- [ ] Intégrer vision recognition
- [ ] Créer UI scanner intelligent
- [ ] Tester avec 20 beta users
- [ ] Mesurer performances et coûts

### Semaine 3
- [ ] Développer parser social media
- [ ] Implémenter sync famille temps réel
- [ ] Créer dashboard collaboratif
- [ ] A/B test avec 100 users

### Semaine 4
- [ ] Optimiser performances
- [ ] Finaliser nouveau pricing tier
- [ ] Préparer launch marketing
- [ ] Documentation complète

---

💡 **Note**: Ce guide est conçu pour une implémentation progressive. Commencez par l'assistant IA (Phase 1) qui apportera déjà une valeur énorme, puis ajoutez les features vision et social progressivement.