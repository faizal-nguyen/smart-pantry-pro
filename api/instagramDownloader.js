import fetch from 'node-fetch';
import { writeFileSync } from 'fs';

class InstagramDownloader {
  constructor() {
    this.logs = [];
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

  async downloadVideo(instagramUrl) {
    this.addLog('📥 [InstagramDownloader] Starting video download...');
    this.addLog('🔗 [InstagramDownloader] Instagram URL:', instagramUrl);

    try {
      // Nettoyer l'URL Instagram (enlever les paramètres utm, etc.)
      const cleanUrl = this.cleanInstagramUrl(instagramUrl);
      this.addLog('🧹 [InstagramDownloader] Cleaned URL:', cleanUrl);

      // Méthode 1: Essayer avec une API publique Instagram downloader
      let videoUrl = await this.tryPublicAPI(cleanUrl);
      
      if (!videoUrl) {
        // Méthode 2: Essayer le scraping direct Instagram
        videoUrl = await this.tryDirectScraping(cleanUrl);
      }
      
      if (!videoUrl) {
        // Méthode 3: Essayer avec Instagram Basic Display API (si configuré)
        videoUrl = await this.tryInstagramAPI(cleanUrl);
      }

      if (!videoUrl) {
        throw new Error('Could not extract video URL from Instagram');
      }

      this.addLog('✅ [InstagramDownloader] Video URL extracted:', videoUrl);

      // Télécharger le fichier vidéo
      const videoBuffer = await this.downloadVideoFile(videoUrl);
      this.addLog('✅ [InstagramDownloader] Video downloaded, size:', videoBuffer.length + ' bytes');

      return videoBuffer;

    } catch (error) {
      this.addLog('❌ [InstagramDownloader] Download failed:', error.message);
      throw error;
    }
  }

  cleanInstagramUrl(url) {
    // Enlever les paramètres de tracking
    const urlObj = new URL(url);
    return `https://www.instagram.com${urlObj.pathname}`;
  }

  async tryPublicAPI(instagramUrl) {
    // Essayer plusieurs APIs publiques
    const apis = [
      {
        name: 'SaveIG API',
        url: `https://saveig.app/api/instagram?url=${encodeURIComponent(instagramUrl)}`,
        extractUrl: (data) => data.url || data.download_url || data.video_url
      },
      {
        name: 'InstagramDL API',
        url: `https://api.instagramdl.com/download?url=${encodeURIComponent(instagramUrl)}`,
        extractUrl: (data) => data.video || data.download_link
      },
      {
        name: 'SnapInsta API',
        url: `https://snapinsta.app/api/instagram?url=${encodeURIComponent(instagramUrl)}`,
        extractUrl: (data) => data.video_url || data.media_url
      },
      {
        name: 'RapidAPI Instagram',
        url: `https://instagram-downloader-download-instagram-videos-stories.p.rapidapi.com/index?url=${encodeURIComponent(instagramUrl)}`,
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
          'X-RapidAPI-Host': 'instagram-downloader-download-instagram-videos-stories.p.rapidapi.com'
        },
        extractUrl: (data) => data.video_url || data.media
      }
    ];

    for (const api of apis) {
      try {
        this.addLog(`🌐 [InstagramDownloader] Trying ${api.name}...`);
        this.addLog(`🔗 [InstagramDownloader] API URL:`, api.url);
        
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          ...api.headers
        };
        
        const response = await fetch(api.url, { headers });
        
        this.addLog(`📊 [InstagramDownloader] ${api.name} response status:`, response.status);
        
        if (!response.ok) {
          throw new Error(`${api.name} responded with ${response.status}`);
        }

        const data = await response.json();
        this.addLog(`📦 [InstagramDownloader] ${api.name} response:`, data);
        
        const videoUrl = api.extractUrl(data);
        
        if (videoUrl) {
          this.addLog(`✅ [InstagramDownloader] Video URL found via ${api.name}:`, videoUrl);
          return videoUrl;
        }
        
        this.addLog(`⚠️ [InstagramDownloader] No video URL in ${api.name} response`);

      } catch (error) {
        this.addLog(`❌ [InstagramDownloader] ${api.name} failed:`, error.message);
        continue; // Essayer l'API suivante
      }
    }
    
    this.addLog('❌ [InstagramDownloader] All public APIs failed');
    return null;
  }

  async tryDirectScraping(instagramUrl) {
    try {
      this.addLog('🕷️ [InstagramDownloader] Trying direct scraping...');
      
      // First, try method 1 to get the HTML and save it
      let sharedHtml = null;
      try {
        this.addLog('📡 [InstagramDownloader] Fetching HTML for sharing...');
        const response = await fetch(instagramUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          }
        });
        sharedHtml = await response.text();
        this.addLog('📄 [InstagramDownloader] Shared HTML received, length:', sharedHtml.length);
        
        // Save for debugging
        writeFileSync('instagram-live-response.html', sharedHtml);
        this.addLog('💾 [InstagramDownloader] HTML saved to instagram-live-response.html for debugging');
      } catch (fetchError) {
        this.addLog('❌ [InstagramDownloader] Failed to fetch shared HTML:', fetchError.message);
      }
      
      // Now try all scraping methods with the shared HTML
      const methods = [
        { name: 'method1', fn: () => this.scrapingMethod1(instagramUrl, sharedHtml) },
        { name: 'method2', fn: () => this.scrapingMethod2(instagramUrl, sharedHtml) },
        { name: 'embed', fn: () => this.extractFromEmbed(instagramUrl) }
      ];
      
      for (const method of methods) {
        try {
          this.addLog(`🔧 [InstagramDownloader] Trying ${method.name}...`);
          const result = await method.fn();
          if (result) {
            this.addLog('✅ [InstagramDownloader] Direct scraping successful');
            return result;
          }
        } catch (error) {
          // Check if it's a recipe found error
          if (error.message.startsWith('RECIPE_TEXT_FOUND:')) {
            throw error; // Re-throw recipe found errors
          }
          this.addLog(`⚠️ [InstagramDownloader] ${method.name} failed:`, error.message);
          continue;
        }
      }
      
      this.addLog('❌ [InstagramDownloader] All scraping methods failed');
      return null;
      
    } catch (error) {
      this.addLog('❌ [InstagramDownloader] Direct scraping error:', error.message);
      
      // Re-throw recipe found errors so they can be caught by VideoParserService
      if (error.message.startsWith('RECIPE_TEXT_FOUND:')) {
        throw error;
      }
      
      return null;
    }
  }

  async scrapingMethod1(instagramUrl, sharedHtml = null) {
    this.addLog('🔍 [InstagramDownloader] Scraping method 1: HTML parsing...');
    
    let html;
    if (sharedHtml) {
      this.addLog('🔄 [InstagramDownloader] Using shared HTML');
      html = sharedHtml;
    } else {
      this.addLog('📡 [InstagramDownloader] Fetching HTML...');
      const response = await fetch(instagramUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });
      
      html = await response.text();
      this.addLog('📄 [InstagramDownloader] HTML received, length:', html.length);
      
      // Save the HTML for debugging (remove after testing)
      writeFileSync('instagram-live-response.html', html);
      this.addLog('💾 [InstagramDownloader] HTML saved to instagram-live-response.html for debugging');
    }
    
    // Chercher les patterns video_url
    const videoPatterns = [
      /"video_url":"([^"]+)"/g,
      /"src":"([^"]+\.mp4[^"]*?)"/g,
      /video_url":\s*"([^"]+)"/g,
      /"videoUrl":"([^"]+)"/g
    ];
    
    for (const pattern of videoPatterns) {
      const matches = [...html.matchAll(pattern)];
      for (const match of matches) {
        if (match[1] && match[1].includes('.mp4')) {
          const videoUrl = match[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
          this.addLog('🎬 [InstagramDownloader] Video URL found in HTML:', videoUrl);
          return videoUrl;
        }
      }
    }
    
    return null;
  }

  async scrapingMethod2(instagramUrl, sharedHtml = null) {
    this.addLog('🔍 [InstagramDownloader] Scraping method 2: JSON extraction...');
    
    let html;
    if (sharedHtml) {
      this.addLog('🔄 [InstagramDownloader] Using shared HTML from method 1');
      html = sharedHtml;
    } else {
      this.addLog('📡 [InstagramDownloader] Fetching HTML (method 2)...');
      const response = await fetch(instagramUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      html = await response.text();
    }
    
    // IMMEDIATE check right after receiving HTML
    this.addLog('🔍 [InstagramDownloader] IMMEDIATE check - HTML length:', html.length);
    this.addLog('🔍 [InstagramDownloader] IMMEDIATE check - contains og:description:', html.includes('og:description') ? 'TRUE' : 'FALSE');
    this.addLog('🔍 [InstagramDownloader] IMMEDIATE check - contains meta description:', html.includes('name="description"') ? 'TRUE' : 'FALSE');
    
    // Chercher window._sharedData
    const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.+?});/);
    if (sharedDataMatch) {
      try {
        const sharedData = JSON.parse(sharedDataMatch[1]);
        this.addLog('📊 [InstagramDownloader] Shared data found');
        
        // Navigation dans la structure JSON Instagram
        const media = sharedData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
        if (media?.video_url) {
          this.addLog('🎬 [InstagramDownloader] Video URL in shared data:', media.video_url);
          return media.video_url;
        }
      } catch (error) {
        this.addLog('❌ [InstagramDownloader] JSON parsing failed:', error.message);
      }
    }
    
    // Méthode alternative : extraire depuis le texte de la recette
    // On a trouvé que la vraie recette est visible dans le HTML
    this.addLog('🍳 [InstagramDownloader] Found recipe content, using alternative approach...');
    
    // Au lieu de chercher la vidéo, on peut directement utiliser le texte de la recette
    // Recherche spécifique dans og:description qui contient souvent les recettes Instagram
    this.addLog('🔍 [InstagramDownloader] Searching for og:description in HTML...');
    
    // First, let's check if ANY og:description exists
    const anyOgDescription = html.includes('property="og:description"');
    this.addLog('🔍 [InstagramDownloader] HTML contains og:description property:', anyOgDescription ? 'TRUE' : 'FALSE');
    
    // Also check for standard meta description
    const hasMetaDescription = html.includes('name="description"');
    this.addLog('🔍 [InstagramDownloader] HTML contains meta description:', hasMetaDescription ? 'TRUE' : 'FALSE');
    
    // Additional debugging
    this.addLog('🔍 [InstagramDownloader] HTML type:', typeof html);
    this.addLog('🔍 [InstagramDownloader] HTML length check:', html.length);
    
    // Try multiple patterns for og:description
    let ogDescriptionMatch = html.match(/<meta property="og:description" content="([^"]*)"/i);
    if (!ogDescriptionMatch) {
      ogDescriptionMatch = html.match(/<meta property='og:description' content='([^']*)'/i);
    }
    if (!ogDescriptionMatch) {
      ogDescriptionMatch = html.match(/property="og:description"[^>]*content="([^"]*)"/i);
    }
    
    this.addLog('🔍 [InstagramDownloader] og:description search result:', ogDescriptionMatch ? 'Found' : 'Not found');
    
    if (ogDescriptionMatch) {
      this.addLog('📏 [InstagramDownloader] og:description length:', ogDescriptionMatch[1].length);
      this.addLog('📄 [InstagramDownloader] og:description preview:', ogDescriptionMatch[1].substring(0, 200) + '...');
    } else {
      // If og:description not found, try standard meta description
      const metaDescMatch = html.match(/<meta name="description" content="([^"]*)"/i);
      if (metaDescMatch) {
        this.addLog('🔍 [InstagramDownloader] Found meta description instead');
        this.addLog('📏 [InstagramDownloader] meta description length:', metaDescMatch[1].length);
        this.addLog('📄 [InstagramDownloader] meta description preview:', metaDescMatch[1].substring(0, 200) + '...');
        ogDescriptionMatch = metaDescMatch; // Use it as fallback
      }
    }
    
    if (ogDescriptionMatch && ogDescriptionMatch[1].length > 200) {
      const rawContent = ogDescriptionMatch[1];
      
      // Vérifier si c'est bien du contenu de recette en cherchant des mots-clés
      const recipeKeywords = /(?:ingrédient|cuisson|recette|taillez|ajoutez|disposez|faites|revenir|cuisiner|préparation|mélangez|chauffez|laissez|servez)/i;
      this.addLog('🔍 [InstagramDownloader] Testing recipe keywords on content...');
      
      if (recipeKeywords.test(rawContent)) {
        // Décoder les entités HTML
        const recipeText = rawContent
          .replace(/&#x([0-9A-F]+);/gi, (match, code) => String.fromCharCode(parseInt(code, 16)))
          .replace(/&#([0-9]+);/g, (match, code) => String.fromCharCode(parseInt(code, 10)))
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&apos;/g, "'")
          .replace(/&nbsp;/g, ' ');
        
        this.addLog('✅ [InstagramDownloader] Recipe text found in og:description:', recipeText.substring(0, 150) + '...');
        this.addLog('📏 [InstagramDownloader] Recipe text length:', recipeText.length + ' characters');
        
        // Retourner un objet spécial indiquant qu'on a trouvé le texte
        throw new Error('RECIPE_TEXT_FOUND:' + recipeText);
      } else {
        this.addLog('⚠️ [InstagramDownloader] og:description found but no recipe keywords detected');
      }
    } else {
      this.addLog('⚠️ [InstagramDownloader] No suitable og:description content found');
    }
    
    // Fallback: chercher dans n'importe quel content avec des mots-clés de recette
    const recipeMatch = html.match(/content="([^"]*(?:recette|ingrédient|cuisson|taillez|ajoutez|disposez)[^"]*)"/i);
    if (recipeMatch && recipeMatch[1].length > 100) {
      this.addLog('✅ [InstagramDownloader] Recipe text found in HTML meta:', recipeMatch[1].substring(0, 100) + '...');
      
      // Retourner un objet spécial indiquant qu'on a trouvé le texte
      throw new Error('RECIPE_TEXT_FOUND:' + recipeMatch[1]);
    }
    
    // Chercher d'autres patterns JSON
    const jsonPattern = /<script[^>]*type="application\/ld\+json"[^>]*>([^<]+)<\/script>/g;
    const jsonMatches = [...html.matchAll(jsonPattern)];
    
    for (const match of jsonMatches) {
      try {
        const jsonData = JSON.parse(match[1]);
        if (jsonData.video?.contentUrl) {
          this.addLog('🎬 [InstagramDownloader] Video URL in JSON-LD:', jsonData.video.contentUrl);
          return jsonData.video.contentUrl;
        }
      } catch (error) {
        continue;
      }
    }
    
    return null;
  }

  async tryInstagramAPI(instagramUrl) {
    // TODO: Implémenter avec Instagram Basic Display API si nécessaire
    this.addLog('⚠️ [InstagramDownloader] Instagram API not implemented yet');
    return null;
  }

  async downloadVideoFile(videoUrl) {
    this.addLog('⬇️ [InstagramDownloader] Downloading video file...');
    this.addLog('🔗 [InstagramDownloader] Video URL:', videoUrl);

    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status}`);
    }

    const videoBuffer = await response.buffer();
    return videoBuffer;
  }

  // Méthode alternative: extraire le JSON embed d'Instagram
  async extractFromEmbed(instagramUrl) {
    try {
      this.addLog('🔍 [InstagramDownloader] Trying embed extraction...');
      
      const embedUrl = `${instagramUrl}embed/`;
      const response = await fetch(embedUrl);
      const html = await response.text();
      
      // Chercher les données JSON dans le HTML
      const scriptRegex = /window\._sharedData\s*=\s*({.+?});/;
      const match = html.match(scriptRegex);
      
      if (match) {
        const data = JSON.parse(match[1]);
        this.addLog('📋 [InstagramDownloader] Embed data extracted');
        
        // Naviguer dans la structure JSON pour trouver l'URL vidéo
        const media = data?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
        const videoUrl = media?.video_url;
        
        if (videoUrl) {
          this.addLog('✅ [InstagramDownloader] Video URL found via embed');
          return videoUrl;
        }
      }
      
    } catch (error) {
      this.addLog('❌ [InstagramDownloader] Embed extraction failed:', error.message);
    }
    
    return null;
  }
}

export default InstagramDownloader;