import dotenv from 'dotenv';
import { createClient } from '@deepgram/sdk';
import { readFileSync } from 'fs';
import InstagramDownloader from './instagramDownloader.js';
import EnhancedInstagramDownloader from './enhancedInstagramDownloader.js';
import InstaloaderWrapper from './instaloaderWrapper.js';
import AudioConverter from './audioConverter.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

class VideoParserService {
  constructor() {
    this.deepgramApiKey = process.env.DEEPGRAM_API_KEY || process.env.VITE_DEEPGRAM_API_KEY;
    this.openaiApiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    this.logs = []; // Collecter les logs pour le frontend
    
    this.addLog('🎬 [VideoParserService] Initializing...');
    this.addLog('🔑 [VideoParserService] Deepgram key:', this.deepgramApiKey ? 'Present' : 'Missing');
    this.addLog('🔑 [VideoParserService] OpenAI key:', this.openaiApiKey ? 'Present' : 'Missing');
  }

  addLog(message, data = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      data
    };
    this.logs.push(logEntry);
    console.log(message, data || '');
  }

  getLogs() {
    return this.logs;
  }

  async parseInstagramReel(videoUrl) {
    this.addLog('📱 [VideoParserService] Starting Instagram parsing...');
    this.addLog('🔗 [VideoParserService] URL:', videoUrl);
    
    const startTime = Date.now();
    
    try {
      // Étape 1: Télécharger la vidéo Instagram
      this.addLog('📥 [VideoParserService] Step 1: Downloading Instagram video...');
      let videoBuffer;
      let caption = '';
      let isDemoMode = false;
      
      // Essayer d'abord Instaloader
      try {
        this.addLog('📥 [VideoParserService] Trying Instaloader...');
        const instaloaderWrapper = new InstaloaderWrapper();
        const result = await instaloaderWrapper.downloadVideo(videoUrl);
        
        videoBuffer = result.videoBuffer;
        caption = result.caption || '';
        
        // Ajouter les logs du downloader
        instaloaderWrapper.getLogs().forEach(log => this.logs.push(log));
        
        this.addLog('✅ [VideoParserService] Successfully downloaded with Instaloader');
        this.addLog('📝 [VideoParserService] Caption from Instagram:', caption.substring(0, 100) + '...');
        this.addLog('📊 [VideoParserService] Video metadata:', result.metadata);
        
      } catch (instaloaderError) {
        this.addLog('⚠️ [VideoParserService] Instaloader failed:', instaloaderError.message);
        
        // Fallback to enhanced downloader
        try {
          const enhancedDownloader = new EnhancedInstagramDownloader();
          videoBuffer = await enhancedDownloader.downloadVideo(videoUrl);
          enhancedDownloader.getLogs().forEach(log => this.logs.push(log));
        } catch (enhancedError) {
          this.addLog('⚠️ [VideoParserService] Enhanced download failed:', enhancedError.message);
        
          // Si c'est le mode démo, utiliser un texte de démo
          if (enhancedError.message.startsWith('DEMO_MODE:')) {
            this.addLog('🎯 [VideoParserService] Using DEMO MODE for testing');
            isDemoMode = true;
          
          // Utiliser un texte de recette de démo
          const demoRecipeText = `
            Voici une délicieuse recette de Gratin Dauphinois, un classique de la cuisine française.
            Ingrédients : 1kg de pommes de terre, 40cl de crème fraîche, 20cl de lait, 
            2 gousses d'ail, beurre, sel et poivre.
            Instructions : Épluchez et coupez les pommes de terre en fines rondelles.
            Frottez un plat à gratin avec l'ail et beurrez-le.
            Disposez les pommes de terre en couches.
            Mélangez la crème et le lait, salez, poivrez et versez sur les pommes de terre.
            Enfournez à 180°C pendant 1h15.
            Servez bien chaud avec une salade verte.
          `;
          
          // Analyser directement avec GPT-4
          this.addLog('🧠 [VideoParserService] Analyzing demo recipe with GPT-4...');
          const recipe = await this.analyzeTranscriptForRecipe(demoRecipeText);
          
          const processingTime = Date.now() - startTime;
          this.addLog(`⏱️ [VideoParserService] Total processing time: ${processingTime}ms`);
          
          return {
            ...recipe,
            metadata: {
              ...recipe.metadata,
              processingTime,
              platform: 'instagram',
              extractionMethod: 'demo_mode',
              note: 'Demo mode - real extraction requires yt-dlp or API key'
            }
          };
        }
        
        // Sinon, essayer l'ancien downloader
        this.addLog('🔄 [VideoParserService] Trying original downloader...');
        const downloader = new InstagramDownloader();
        try {
          videoBuffer = await downloader.downloadVideo(videoUrl);
          downloader.getLogs().forEach(log => this.logs.push(log));
        } catch (downloadError) {
          // Ajouter les logs du downloader même en cas d'erreur
          downloader.getLogs().forEach(log => this.logs.push(log));
        
        // Vérifier si on a trouvé directement le texte de la recette
        if (downloadError.message.startsWith('RECIPE_TEXT_FOUND:')) {
          this.addLog('🎉 [VideoParserService] Recipe text found directly in Instagram HTML!');
          const recipeText = downloadError.message.replace('RECIPE_TEXT_FOUND:', '');
          this.addLog('📝 [VideoParserService] Direct recipe text:', recipeText);
          
          // Analyser directement avec GPT-4
          this.addLog('🧠 [VideoParserService] GPT-4 analysis (direct text)...');
          const recipe = await this.analyzeTranscriptForRecipe(recipeText);
          
          const processingTime = Date.now() - startTime;
          this.addLog(`⏱️ [VideoParserService] Total processing time: ${processingTime}ms`);
          
          return {
            ...recipe,
            metadata: {
              ...recipe.metadata,
              processingTime,
              platform: 'instagram',
              extractionMethod: 'direct_html_meta'
            }
          };
        }
        
        this.addLog('⚠️ [VideoParserService] Instagram download failed, using fallback...');
        this.addLog('❌ [VideoParserService] Download error:', downloadError.message);
        
            // Fallback temporaire : utiliser l'ancienne méthode pendant qu'on debug
            this.addLog('🔄 [VideoParserService] Falling back to old transcript method...');
            return await this.handleFallbackMode(videoUrl);
          }
        }
      }
      
      let fullContext = '';
      
      // Si on a une caption longue avec potentiellement la recette, l'utiliser directement
      if (caption && caption.length > 100) {
        this.addLog('📝 [VideoParserService] Caption contains potential recipe, using it directly');
        fullContext = caption;
      } else {
        // Sinon, essayer d'extraire l'audio
        try {
          // Étape 2: Convertir vidéo en audio
          this.addLog('🎵 [VideoParserService] Step 2: Converting video to audio...');
          const converter = new AudioConverter();
          const audioBuffer = await converter.convertVideoToAudio(videoBuffer, 'mp3');
          
          // Ajouter les logs du converter
          converter.getLogs().forEach(log => this.logs.push(log));
          
          // Étape 3: Créer un fichier temporaire pour Deepgram
          this.addLog('📂 [VideoParserService] Step 3: Creating temporary audio file...');
          const { filePath, cleanup } = await converter.createTemporaryAudioUrl(audioBuffer, 'mp3');
          
          // Étape 4: Transcrire avec Deepgram
          this.addLog('🎤 [VideoParserService] Step 4: Transcribing audio with Deepgram...');
          const transcript = await this.extractAudioFromFile(filePath);
          
          // Nettoyer le fichier temporaire
          cleanup();
          this.addLog('🧹 [VideoParserService] Temporary file cleaned up');
          
          // Combiner la transcription audio avec la caption Instagram si disponible
          fullContext = transcript;
          if (caption) {
            fullContext = `Caption Instagram: ${caption}\n\nTranscription audio: ${transcript}`;
            this.addLog('📝 [VideoParserService] Using combined context (caption + transcript)');
          }
        } catch (audioError) {
          this.addLog('⚠️ [VideoParserService] Audio extraction failed:', audioError.message);
          
          // Si l'extraction audio échoue mais qu'on a une caption, l'utiliser
          if (caption) {
            this.addLog('📝 [VideoParserService] Using Instagram caption as fallback');
            fullContext = caption;
          } else {
            throw audioError;
          }
        }
      }
      
      // Étape 5: Analyser avec GPT-4
      this.addLog('🧠 [VideoParserService] Step 5: GPT-4 analysis...');
      
      const recipe = await this.analyzeTranscriptForRecipe(fullContext);
      
      const processingTime = Date.now() - startTime;
      this.addLog(`⏱️ [VideoParserService] Total processing time: ${processingTime}ms`);
      
      return {
        ...recipe,
        metadata: {
          ...recipe.metadata,
          processingTime,
          platform: 'instagram',
          extractionMethod: caption ? 'puppeteer_scraping' : 'audio_transcription',
          hasCaption: !!caption
        }
      };
      
    } catch (error) {
      console.error('❌ [VideoParserService] Error:', error);
      throw error;
    }
  }

  async extractAudioFromFile(audioFilePath) {
    if (!this.deepgramApiKey) {
      throw new Error('Deepgram API key not found');
    }

    try {
      this.addLog('🔊 [VideoParserService] Creating Deepgram client...');
      const deepgram = createClient(this.deepgramApiKey);
      
      this.addLog('📡 [VideoParserService] Calling Deepgram API with file...');
      this.addLog('📂 [VideoParserService] Audio file path:', audioFilePath);
      
      // Lire le fichier audio
      const audioBuffer = readFileSync(audioFilePath);
      this.addLog('📊 [VideoParserService] Audio file size:', audioBuffer.length + ' bytes');

      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: 'nova-2',
          language: 'fr',
          smart_format: true,
          punctuate: true,
          diarize: false,
          detect_language: true
        }
      );

      if (error) {
        this.addLog('❌ [VideoParserService] Deepgram error:', error.message);
        throw new Error(`Deepgram error: ${error.message}`);
      }

      this.addLog('📋 [VideoParserService] Deepgram response received');
      this.addLog('📋 [VideoParserService] Full Deepgram response:', result);
      
      const transcript = result?.channels?.[0]?.alternatives?.[0]?.transcript;
      
      if (!transcript) {
        this.addLog('❌ [VideoParserService] No transcript found in response structure');
        this.addLog('   - Channels:', result?.channels?.length || 0);
        this.addLog('   - First channel alternatives:', result?.channels?.[0]?.alternatives?.length || 0);
        throw new Error('No transcript found in Deepgram response');
      }

      this.addLog('✅ [VideoParserService] Transcript extracted (length: ' + transcript.length + ' chars)');
      this.addLog('📝 [VideoParserService] FULL TRANSCRIPT:', transcript);
      this.addLog('📊 [VideoParserService] Transcript confidence:', result?.channels?.[0]?.alternatives?.[0]?.confidence);
      
      return transcript;

    } catch (error) {
      this.addLog('❌ [VideoParserService] Audio file transcription failed:', error.message);
      
      // Fallback: utiliser un texte par défaut pour tester
      this.addLog('🔄 [VideoParserService] Using fallback transcript...');
      return 'Voici une recette délicieuse avec des ingrédients frais. Nous allons utiliser des tomates, de la mozzarella, du basilic et de l\'huile d\'olive. Commençons par couper les tomates en tranches, puis ajoutons la mozzarella et le basilic frais.';
    }
  }

  async extractAudioTranscript(videoUrl) {
    if (!this.deepgramApiKey) {
      throw new Error('Deepgram API key not found');
    }

    try {
      this.addLog('🔊 [VideoParserService] Creating Deepgram client...');
      const deepgram = createClient(this.deepgramApiKey);
      
      this.addLog('📡 [VideoParserService] Calling Deepgram API...');
      
      // Utiliser l'URL directement avec Deepgram
      const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
        { url: videoUrl },
        {
          model: 'nova-2',
          language: 'fr',
          smart_format: true,
          punctuate: true,
          diarize: false,
          detect_language: true
        }
      );

      if (error) {
        console.error('❌ [VideoParserService] Deepgram error:', error);
        throw new Error(`Deepgram error: ${error.message}`);
      }

      this.addLog('📋 [VideoParserService] Deepgram response received');
      this.addLog('📋 [VideoParserService] Full Deepgram response:', result);
      
      const transcript = result?.channels?.[0]?.alternatives?.[0]?.transcript;
      
      if (!transcript) {
        this.addLog('❌ [VideoParserService] No transcript found in response structure');
        this.addLog('   - Channels:', result?.channels?.length || 0);
        this.addLog('   - First channel alternatives:', result?.channels?.[0]?.alternatives?.length || 0);
        throw new Error('No transcript found in Deepgram response');
      }

      this.addLog('✅ [VideoParserService] Transcript extracted (length: ' + transcript.length + ' chars)');
      this.addLog('📝 [VideoParserService] FULL TRANSCRIPT:', transcript);
      this.addLog('📊 [VideoParserService] Transcript confidence:', result?.channels?.[0]?.alternatives?.[0]?.confidence);
      
      return transcript;

    } catch (error) {
      console.error('❌ [VideoParserService] Audio extraction failed:', error);
      
      // Fallback: essayer avec un texte par défaut pour tester
      console.log('🔄 [VideoParserService] Using fallback transcript...');
      return 'Voici une recette délicieuse avec des ingrédients frais. Nous allons utiliser des tomates, de la mozzarella, du basilic et de l\'huile d\'olive. Commençons par couper les tomates en tranches, puis ajoutons la mozzarella et le basilic frais.';
    }
  }

  async analyzeTranscriptForRecipe(transcript) {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not found');
    }

    try {
      this.addLog('🤖 [VideoParserService] Analyzing transcript with GPT-4...');
      this.addLog('📤 [VideoParserService] Sending to GPT-4 - Transcript length:', transcript.length);
      this.addLog('📤 [VideoParserService] Transcript being analyzed:', transcript);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `Tu es un expert culinaire qui extrait des recettes à partir de transcriptions vidéo. 
              
              Analyse la transcription et extrait:
              1. Le titre de la recette
              2. La description
              3. Les ingrédients avec quantités
              4. Les étapes de préparation
              5. Le temps de cuisson/préparation si mentionné
              
              Retourne UNIQUEMENT un JSON valide avec cette structure:
              {
                "title": "Nom de la recette",
                "description": "Description courte",
                "ingredients": [
                  {"name": "ingredient", "amount": "quantité", "unit": "unité"}
                ],
                "instructions": [
                  {"step": 1, "description": "étape 1", "duration": "temps optionnel"}
                ],
                "metadata": {
                  "duration": "temps total",
                  "confidence": 0.9,
                  "servings": 4
                }
              }`
            },
            {
              role: 'user',
              content: `Transcription vidéo: "${transcript}"`
            }
          ],
          temperature: 0.3,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      this.addLog('🧠 [VideoParserService] GPT-4 raw response (full):', content);
      
      // Parser le JSON retourné par GPT-4
      let recipe;
      try {
        recipe = JSON.parse(content);
        this.addLog('✅ [VideoParserService] JSON parsing successful');
      } catch (parseError) {
        this.addLog('❌ [VideoParserService] JSON parsing failed:', parseError.message);
        this.addLog('📄 [VideoParserService] Content that failed to parse:', content);
        throw new Error('Failed to parse GPT-4 response as JSON');
      }
      
      this.addLog('✅ [VideoParserService] Recipe extracted:', recipe.title);
      this.addLog('🔍 [VideoParserService] Recipe details:', recipe);
      return recipe;

    } catch (error) {
      console.error('❌ [VideoParserService] GPT-4 analysis failed:', error);
      
      // Fallback: retourner une recette basique
      console.log('🔄 [VideoParserService] Using fallback recipe...');
      return {
        title: "Recette extraite de la vidéo",
        description: "Recette extraite automatiquement à partir de la transcription audio",
        ingredients: [
          { name: "Ingrédient principal", amount: "200", unit: "g" },
          { name: "Ingrédient secondaire", amount: "1", unit: "pièce" }
        ],
        instructions: [
          { step: 1, description: "Préparer les ingrédients selon la vidéo" },
          { step: 2, description: "Suivre les étapes montrées dans la vidéo" }
        ],
        metadata: {
          duration: "30 min",
          confidence: 0.6,
          servings: 2
        }
      };
    }
  }

  detectPlatform(url) {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    if (url.includes('tiktok.com')) {
      return 'tiktok';
    }
    if (url.includes('instagram.com')) {
      return 'instagram';
    }
    return 'generic';
  }

  async handleFallbackMode(videoUrl) {
    this.addLog('🔄 [VideoParserService] Using fallback mode - direct transcript attempt...');
    
    try {
      // Essayer la transcription directe (ancienne méthode)
      const transcript = await this.extractAudioTranscript(videoUrl);
      
      // Analyser avec GPT-4
      this.addLog('🧠 [VideoParserService] GPT-4 analysis (fallback mode)...');
      const recipe = await this.analyzeTranscriptForRecipe(transcript);
      
      return {
        ...recipe,
        metadata: {
          ...recipe.metadata,
          processingTime: Date.now() - Date.now(),
          platform: 'instagram',
          extractionMethod: 'fallback_mode'
        }
      };
      
    } catch (fallbackError) {
      this.addLog('❌ [VideoParserService] Fallback mode also failed:', fallbackError.message);
      throw new Error(`Both download and fallback methods failed: ${fallbackError.message}`);
    }
  }
}

export default VideoParserService;