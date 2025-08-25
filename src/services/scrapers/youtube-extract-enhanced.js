/**
 * YouTube Recipe Extraction API - Enhanced Version
 * Handles real extraction with audio transcription using yt-dlp and Deepgram/OpenAI
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import OpenAI from 'openai';

const execAsync = promisify(exec);

export default async function handler(req, res) {
  console.log('🎬 [API] YouTube extraction enhanced started');
  
  // Apply CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let tempAudioPath = null;

  try {
    const { videoUrl, language = 'auto' } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    console.log('🔍 [API] Processing YouTube URL:', videoUrl);
    console.log('🌐 [API] Language:', language);

    // Extract video ID
    const videoIdMatch = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (!videoIdMatch) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const videoId = videoIdMatch[1];
    console.log('📝 [API] Video ID:', videoId);

    // Get metadata using oEmbed
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const metadataResponse = await fetch(oembedUrl);
    
    if (!metadataResponse.ok) {
      console.error('❌ [API] Failed to fetch metadata');
      return res.status(500).json({ error: 'Failed to fetch video metadata' });
    }

    const metadata = await metadataResponse.json();
    console.log('✅ [API] Metadata fetched:', metadata.title);

    // Check if we have necessary API keys
    const openaiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    
    if (!openaiKey) {
      console.warn('⚠️ [API] Missing OpenAI API key, using basic simulation mode');
      
      // Return a basic simulated recipe
      const simulatedRecipe = await generateEnhancedSimulatedRecipe({...metadata, videoId}, language, null);
      
      return res.status(200).json({
        success: true,
        recipe: simulatedRecipe,
        source: videoUrl,
        message: "Mode simulation - Configurez OPENAI_API_KEY pour l'extraction complète"
      });
    }

    // Check if yt-dlp is installed
    try {
      await execAsync('which yt-dlp');
    } catch (error) {
      console.warn('⚠️ [API] yt-dlp not found, installing...');
      try {
        await execAsync('pip install yt-dlp');
      } catch (installError) {
        console.error('❌ [API] Failed to install yt-dlp');
        // Fall back to enhanced simulation
        const simulatedRecipe = await generateEnhancedSimulatedRecipe({...metadata, videoId}, language, openaiKey);
        return res.status(200).json({
          success: true,
          recipe: simulatedRecipe,
          source: videoUrl,
          message: "yt-dlp non disponible - Mode simulation amélioré"
        });
      }
    }

    // Extract audio using yt-dlp
    console.log('🎵 [API] Extracting audio with yt-dlp...');
    const tempDir = os.tmpdir();
    const tempFileName = `youtube_${videoId}_${Date.now()}`;
    tempAudioPath = path.join(tempDir, `${tempFileName}.mp3`);
    
    try {
      // Use optimized extraction settings with better error handling
      const ytdlpCommand = `yt-dlp -x --audio-format mp3 --audio-quality 5 --no-playlist --no-warnings --force-generic-extractor --extract-audio --prefer-free-formats -o "${path.join(tempDir, tempFileName)}.%(ext)s" "${videoUrl}"`;
      
      console.log('🎬 [API] Running yt-dlp command...');
      const { stdout, stderr } = await execAsync(ytdlpCommand, { 
        timeout: 180000,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      if (stderr && stderr.includes('ERROR')) {
        console.warn('⚠️ [API] yt-dlp warnings:', stderr);
      }
      
      console.log('✅ [API] Audio extracted successfully');
    } catch (ytdlpError) {
      console.error('❌ [API] yt-dlp extraction failed:', ytdlpError);
      // Don't return immediately, try to find existing transcription
      console.log('🔍 [API] Will check for existing transcription...');
    }

    // Check if any transcription already exists for this video
    let transcriptionText = null;
    let existingTranscriptionPath = tempAudioPath ? tempAudioPath.replace('.mp3', '_transcription.txt') : null;
    
    // Look for any existing transcription for this video ID
    console.log('🔍 [API] Looking for any existing transcription for video:', videoId);
    const tempDirFiles = await fs.readdir(tempDir);
    console.log('📁 [API] Files in temp directory:', tempDirFiles.filter(f => f.includes(videoId)).slice(0, 5));
    
    const transcriptionFiles = tempDirFiles.filter(f => 
      f.includes(`youtube_${videoId}_`) && f.endsWith('_transcription.txt')
    );
    
    console.log('📄 [API] Found transcription files:', transcriptionFiles);
    
    if (transcriptionFiles.length > 0) {
      // Find the best transcription (longest and contains English text)
      let bestTranscription = null;
      let bestScore = 0;
      
      for (const filename of transcriptionFiles) {
        const transcriptionPath = path.join(tempDir, filename);
        try {
          const content = await fs.readFile(transcriptionPath, 'utf-8');
          // Score transcription based on length and English content
          const englishWords = (content.match(/\b[a-zA-Z]{3,}\b/g) || []).length;
          const score = content.length * 0.1 + englishWords * 2;
          
          console.log(`📊 [API] Transcription ${filename}: length=${content.length}, englishWords=${englishWords}, score=${score}`);
          
          if (score > bestScore) {
            bestScore = score;
            bestTranscription = { content, path: transcriptionPath };
          }
        } catch (readError) {
          console.error('❌ [API] Failed to read transcription file:', filename, readError);
        }
      }
      
      if (bestTranscription) {
        transcriptionText = bestTranscription.content;
        console.log('🏆 [API] Using best transcription from:', bestTranscription.path);
        console.log('📄 [API] Transcription length:', transcriptionText.length);
        console.log('📄 [API] Transcription preview:', transcriptionText.substring(0, 200) + '...');
      }
    }
    
    if (!transcriptionText && tempAudioPath) {
      // Only try Whisper if we have an audio file
      try {
        await fs.access(tempAudioPath);
        console.log('🎤 [API] Audio file exists, using OpenAI Whisper...');
        
        // Transcribe audio using OpenAI Whisper
        const openai = new OpenAI({ apiKey: openaiKey });
        
        // Read the audio file
        console.log('🎤 [API] Reading audio file for Whisper...');
        const audioBuffer = await fs.readFile(tempAudioPath);
        
        // Use OpenAI SDK directly with toFile utility
        console.log('🎤 [API] Sending to Whisper API...');
        const transcription = await openai.audio.transcriptions.create({
          file: await OpenAI.toFile(audioBuffer, 'audio.mp3'),
          model: 'whisper-1'
          // Don't specify language to let Whisper auto-detect
        });

        console.log('✅ [API] Whisper transcription complete, length:', transcription.text.length);
        transcriptionText = transcription.text;
        
        // Save transcription to temp file for debugging
        if (existingTranscriptionPath) {
          await fs.writeFile(existingTranscriptionPath, transcriptionText);
          console.log('📝 [API] Transcription saved to:', existingTranscriptionPath);
        }
      } catch (error) {
        console.error('❌ [API] Audio file not found or transcription failed:', error.message);
      }
    }
    
    // If still no transcription, use simulation mode
    if (!transcriptionText) {
      console.log('⚠️ [API] No transcription available, using enhanced simulation mode');
      const simulatedRecipe = await generateEnhancedSimulatedRecipe({...metadata, videoId}, language, openaiKey);
      return res.status(200).json({
        success: true,
        recipe: simulatedRecipe,
        source: videoUrl,
        message: "Mode simulation amélioré - Transcription non disponible"
      });
    }
    
    // Generate detailed recipe using GPT-4
    const recipe = await generateDetailedRecipe({...metadata, videoId}, transcriptionText, language, openaiKey);

      // Clean up temp file if it exists
      if (tempAudioPath) {
        try {
          await fs.access(tempAudioPath);
          await fs.unlink(tempAudioPath);
          console.log('🗑️ [API] Cleaned up temp audio file');
        } catch (e) {
          // File doesn't exist, no need to clean up
        }
      }

      return res.status(200).json({
        success: true,
        recipe: recipe,
        source: videoUrl,
        message: transcriptionText.length > 1000 ? "Extraction complète avec transcription audio" : "Extraction avec transcription existante"
      });

  } catch (error) {
    console.error('❌ [API] Error:', error);
    
    // Clean up temp file if exists
    if (tempAudioPath) {
      await fs.unlink(tempAudioPath).catch(() => {});
    }
    
    return res.status(500).json({
      error: 'Failed to extract YouTube recipe',
      details: error.message
    });
  }
}

async function generateDetailedRecipe(metadata, transcription, language, apiKey) {
  const openai = new OpenAI({ apiKey });
  
  // Extract video ID from metadata
  const videoId = metadata.videoId || metadata.video_id || 'unknown';
  
  // Determine the target language
  const targetLanguage = language === 'auto' ? 'fr' : language;
  const languageInstruction = {
    'fr': 'Réponds entièrement en français',
    'en': 'Respond entirely in English', 
    'ta': 'Respond entirely in Tamil',
    'hi': 'Respond entirely in Hindi'
  }[targetLanguage] || 'Réponds entièrement en français';
  
  console.log('🤖 [API] Generating detailed recipe with GPT-4...');
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: `Tu es un expert culinaire multilingue qui extrait des recettes EXACTEMENT comme elles sont présentées dans les vidéos.
        ${languageInstruction}.
        
        RÈGLES CRITIQUES :
        1. Extrais UNIQUEMENT ce qui est RÉELLEMENT mentionné dans la transcription
        2. N'invente JAMAIS d'ingrédients ou d'étapes non mentionnés
        3. Utilise les MÊMES quantités, temps et techniques que dans la vidéo
        4. Si la transcription est dans une autre langue (hindi, tamil, etc.), TRADUIS les ingrédients et instructions
        5. Respecte l'ordre EXACT des étapes de la vidéo
        6. Inclus TOUS les détails, même s'ils semblent mineurs
        7. Pour les instructions, sois TRÈS DÉTAILLÉ - inclus:
           - Les températures exactes mentionnées
           - Les durées précises de cuisson
           - Les techniques spécifiques (comment couper, comment mélanger)
           - Les indicateurs visuels (couleur, texture, etc.)
           - Les astuces et conseils donnés pendant chaque étape
        8. Si tu ne trouves PAS d'ingrédients ou d'instructions clairs, retourne des tableaux vides
        
        Format JSON requis:
        {
          "title": "Titre exact de la recette",
          "description": "Description basée sur la vidéo",
          "servings": nombre ou null si non mentionné,
          "prepTime": "temps exact ou estimation basée sur la vidéo",
          "cookTime": "temps exact mentionné",
          "totalTime": "temps total",
          "ingredients": [
            {"name": "nom exact de l'ingrédient", "amount": "quantité exacte", "unit": "unité", "notes": "précisions mentionnées"}
          ],
          "instructions": [
            {
              "step": 1, 
              "description": "description TRÈS DÉTAILLÉE de ce qui est fait, incluant toutes les techniques, températures, durées et indicateurs visuels mentionnés", 
              "duration": "temps exact mentionné pour cette étape",
              "temperature": "température si mentionnée",
              "tips": "tous les conseils et astuces donnés pour cette étape",
              "visualCues": "indicateurs visuels mentionnés (couleur, texture, etc.)"
            }
          ],
          "tips": ["conseils et astuces RÉELLEMENT donnés"],
          "tags": ["tags pertinents"],
          "cuisine": "type de cuisine",
          "difficulty": "easy|medium|hard",
          "equipment": ["équipements RÉELLEMENT utilisés"],
          "videoNotes": "Notes sur des éléments visuels importants non capturés dans la transcription"
        }
        
        IMPORTANT: Pour chaque instruction, fournis une description COMPLÈTE et DÉTAILLÉE avec tous les détails mentionnés dans la vidéo.`
      },
      {
        role: "user",
        content: `Extrais la recette EXACTEMENT comme présentée dans cette vidéo.
        
        Titre: "${metadata.title}"
        Auteur: ${metadata.author_name}
        
        TRANSCRIPTION COMPLÈTE À ANALYSER:
        """
        ${transcription}
        """
        
        INSTRUCTIONS CRITIQUES:
        1. Lis attentivement TOUTE la transcription
        2. Identifie TOUS les ingrédients mentionnés avec leurs quantités exactes
        3. Pour les INSTRUCTIONS, décompose CHAQUE grande étape en PLUSIEURS sous-étapes détaillées:
           - Divise les étapes complexes en 3-4 sous-étapes simples
           - Inclus TOUTES les techniques précises (température, durée, indicateurs visuels)
           - Explique le POURQUOI de chaque action importante
           - Donne des conseils pratiques mentionnés dans la vidéo
        4. TRADUIS TOUS les termes techniques en français:
           - "brista/birista" = "oignons frits croustillants"
           - "dum" = "cuisson vapeur/à l'étouffée"
           - "masala" = "mélange d'épices"
           - "tadka" = "tempérage d'épices"
           - "bhuna" = "faire revenir"
        5. Si la transcription est en hindi/tamil, TRADUIS tout en ${targetLanguage === 'fr' ? 'français' : targetLanguage}
        
        VOCABULAIRE HINDI/ANGLAIS À TRADUIRE:
        - brista/birista → oignons frits croustillants
        - dum → cuisson à l'étouffée
        - masala → mélange d'épices
        - ghee → beurre clarifié
        - jeera → cumin
        - dhania → coriandre
        - pudina → menthe
        - elaichi → cardamome
        - dalchini → cannelle
        - cloves → clous de girofle
        - bay leaves → feuilles de laurier
        - shah jeera → cumin noir
        
        Pour les INSTRUCTIONS, utilise ce format TRÈS DÉTAILLÉ:
        
        EXEMPLE D'INSTRUCTION DÉTAILLÉE:
        Au lieu de: "Faire les oignons frits"
        Écris: 
        - "Étape 1a: Éplucher et couper 500g d'oignons en fines lamelles de 3mm d'épaisseur"
        - "Étape 1b: Séparer délicatement les couches d'oignon (important pour une friture uniforme)"
        - "Étape 1c: Chauffer l'huile à exactement 135°C (pas plus chaud sinon ça brûle)"
        - "Étape 1d: Frire les oignons 15-20 minutes en remuant jusqu'à couleur dorée claire"
        - "Étape 1e: Retirer rapidement et égoutter sur papier absorbant (ils continuent à cuire avec la chaleur résiduelle)"
        
        RÈGLE IMPORTANTE: Chaque instruction doit être ACTIONNABLE et PRÉCISE avec:
        - Durée exacte
        - Température si mentionnée  
        - Indicateurs visuels de réussite
        - Conseils pour éviter les erreurs
        
        Génère le JSON de la recette en français avec des instructions TRÈS DÉTAILLÉES et BIEN TRADUITES.`
      }
    ],
    temperature: 0.3, // Lower temperature for more accurate extraction
    response_format: { type: "json_object" }
  });

  const extractedRecipe = JSON.parse(completion.choices[0].message.content);
  console.log('✅ [API] Detailed recipe generated successfully');
  console.log('🔍 [API] Ingredients type:', typeof extractedRecipe.ingredients, Array.isArray(extractedRecipe.ingredients) ? 'array' : 'object');

  // Flatten ingredients if they are grouped
  let flatIngredients = [];
  if (Array.isArray(extractedRecipe.ingredients)) {
    flatIngredients = extractedRecipe.ingredients;
    console.log('📋 [API] Ingredients are already an array, length:', flatIngredients.length);
  } else if (typeof extractedRecipe.ingredients === 'object' && extractedRecipe.ingredients !== null) {
    console.log('📦 [API] Ingredients are grouped, flattening...');
    // If ingredients are grouped by category, flatten them
    Object.entries(extractedRecipe.ingredients).forEach(([category, items]) => {
      if (Array.isArray(items)) {
        items.forEach(item => {
          if (typeof item === 'string') {
            // Parse string format like "300g de riz basmati" or "2 cuillères à soupe d'huile"
            const patterns = [
              // Pattern for "number unit de/d' name" (e.g., "500 g de poulet")
              /^(\d+(?:[,\.]\d+)?)\s*([a-zA-Zà-ÿÀ-ÿ]+(?:\s+[a-zA-Zà-ÿÀ-ÿ]+)*)\s*(?:de|d')\s+(.+)$/,
              // Pattern for fractions like "1/2 tasse de..."
              /^(\d+\/\d+)\s*([a-zA-Zà-ÿÀ-ÿ]+(?:\s+[a-zA-Zà-ÿÀ-ÿ]+)*)\s*(?:de|d')\s+(.+)$/,
              // Pattern for compound amounts like "1-2 cuillères"
              /^(\d+\s*[-–]\s*\d+)\s*([a-zA-Zà-ÿÀ-ÿ]+(?:\s+[a-zA-Zà-ÿÀ-ÿ]+)*)\s*(?:de|d')\s+(.+)$/,
              // Pattern for "number name" (like "2 oignons")
              /^(\d+(?:[,\.]\d+)?)\s+(.+)$/
            ];
            
            let parsed = false;
            for (const pattern of patterns) {
              const match = item.match(pattern);
              if (match) {
                if (match.length === 3) {
                  // Pattern without unit (like "2 oignons")
                  flatIngredients.push({
                    name: match[2],
                    amount: match[1],
                    unit: '',
                    notes: category
                  });
                } else if (match.length === 4) {
                  // Pattern with unit
                  flatIngredients.push({
                    name: match[3],
                    amount: match[1],
                    unit: match[2] || '',
                    notes: category
                  });
                }
                parsed = true;
                break;
              }
            }
            
            if (!parsed) {
              // If no pattern matches, just use the whole string as name
              flatIngredients.push({
                name: item,
                amount: '',
                unit: '',
                notes: category
              });
            }
          } else {
            flatIngredients.push({
              ...item,
              notes: item.notes ? `${category} - ${item.notes}` : category
            });
          }
        });
      }
    });
    console.log('✅ [API] Flattened ingredients count:', flatIngredients.length);
  }

  // Format the response
  return {
    title: extractedRecipe.title || metadata.title,
    description: extractedRecipe.description || `Recette extraite de ${metadata.author_name}`,
    videoId: videoId,
    thumbnail: {
      url: metadata.thumbnail_url,
      width: metadata.thumbnail_width,
      height: metadata.thumbnail_height
    },
    author: {
      name: metadata.author_name,
      url: metadata.author_url
    },
    servings: extractedRecipe.servings,
    prepTime: extractedRecipe.prepTime,
    cookTime: extractedRecipe.cookTime,
    totalTime: extractedRecipe.totalTime,
    ingredients: flatIngredients,
    instructions: extractedRecipe.instructions || [],
    tips: extractedRecipe.tips || [],
    equipment: extractedRecipe.equipment || [],
    tags: extractedRecipe.tags || [],
    cuisine: extractedRecipe.cuisine,
    difficulty: extractedRecipe.difficulty,
    nutritionalInfo: extractedRecipe.nutritionalInfo,
    metadata: {
      language: targetLanguage,
      extractionMethod: 'full-audio-transcription',
      processingTime: Date.now(),
      confidence: 0.95,
      transcriptionLength: transcription.length,
      transcriptionPreview: transcription.substring(0, 500) + '...' // First 500 chars for debugging
    },
    videoNotes: extractedRecipe.videoNotes
  };
}

async function generateEnhancedSimulatedRecipe(metadata, language, apiKey) {
  if (!apiKey) {
    // Return basic simulated recipe without GPT-4
    return {
      title: metadata.title,
      description: `Recette extraite de YouTube par ${metadata.author_name}`,
      videoId: metadata.videoId,
      thumbnail: {
        url: metadata.thumbnail_url,
        width: metadata.thumbnail_width,
        height: metadata.thumbnail_height
      },
      author: {
        name: metadata.author_name,
        url: metadata.author_url
      },
      ingredients: [
        { name: "Ingrédients non disponibles", amount: "N/A", unit: "" }
      ],
      instructions: [
        { step: 1, description: "Instructions non disponibles sans transcription audio", duration: "N/A" }
      ],
      metadata: {
        language: language,
        extractionMethod: 'metadata-only',
        processingTime: Date.now(),
        confidence: 0.1
      }
    };
  }

  // Use GPT-4 to generate a plausible recipe based on title
  const openai = new OpenAI({ apiKey });
  const targetLanguage = language === 'auto' ? 'fr' : language;
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: `Tu es un expert culinaire. Génère une recette plausible et détaillée basée sur le titre de la vidéo.
        Langue: ${targetLanguage === 'fr' ? 'Français' : targetLanguage}.
        Format JSON avec title, description, ingredients, instructions détaillées, etc.`
      },
      {
        role: "user",
        content: `Génère une recette détaillée pour: "${metadata.title}". 
        Inclus des ingrédients réalistes avec quantités, et des instructions étape par étape détaillées.`
      }
    ],
    temperature: 0.7,
    response_format: { type: "json_object" }
  });

  const recipe = JSON.parse(completion.choices[0].message.content);
  
  // Flatten ingredients if they are grouped
  let flatIngredients = [];
  if (Array.isArray(recipe.ingredients)) {
    flatIngredients = recipe.ingredients;
  } else if (typeof recipe.ingredients === 'object' && recipe.ingredients !== null) {
    Object.entries(recipe.ingredients).forEach(([category, items]) => {
      if (Array.isArray(items)) {
        items.forEach(item => {
          if (typeof item === 'string') {
            const patterns = [
              /^(\d+(?:[,\.]\d+)?)\s*([a-zA-Zà-ÿÀ-ÿ]+(?:\s+[a-zA-Zà-ÿÀ-ÿ]+)*)\s*(?:de|d')\s+(.+)$/,
              /^(\d+\/\d+)\s*([a-zA-Zà-ÿÀ-ÿ]+(?:\s+[a-zA-Zà-ÿÀ-ÿ]+)*)\s*(?:de|d')\s+(.+)$/,
              /^(\d+\s*[-–]\s*\d+)\s*([a-zA-Zà-ÿÀ-ÿ]+(?:\s+[a-zA-Zà-ÿÀ-ÿ]+)*)\s*(?:de|d')\s+(.+)$/,
              /^(\d+(?:[,\.]\d+)?)\s+(.+)$/
            ];
            
            let parsed = false;
            for (const pattern of patterns) {
              const match = item.match(pattern);
              if (match) {
                if (match.length === 3) {
                  flatIngredients.push({
                    name: match[2],
                    amount: match[1],
                    unit: '',
                    notes: category
                  });
                } else if (match.length === 4) {
                  flatIngredients.push({
                    name: match[3],
                    amount: match[1],
                    unit: match[2] || '',
                    notes: category
                  });
                }
                parsed = true;
                break;
              }
            }
            
            if (!parsed) {
              flatIngredients.push({
                name: item,
                amount: '',
                unit: '',
                notes: category
              });
            }
          } else {
            flatIngredients.push({
              ...item,
              notes: item.notes ? `${category} - ${item.notes}` : category
            });
          }
        });
      }
    });
  }
  
  return {
    ...recipe,
    ingredients: flatIngredients,
    videoId: metadata.videoId,
    thumbnail: {
      url: metadata.thumbnail_url,
      width: metadata.thumbnail_width,
      height: metadata.thumbnail_height
    },
    author: {
      name: metadata.author_name,
      url: metadata.author_url
    },
    metadata: {
      language: targetLanguage,
      extractionMethod: 'enhanced-simulation',
      processingTime: Date.now(),
      confidence: 0.6,
      note: "Recette générée sans transcription audio - Installez yt-dlp pour une extraction complète"
    }
  };
}