/**
 * Service pour extraire les métadonnées Instagram incluant la vignette
 * Utilise une approche alternative car l'API oEmbed nécessite maintenant une authentification
 */

export interface InstagramMetadata {
  title?: string;
  description?: string;
  thumbnail_url?: string;
  author_name?: string;
  author_url?: string;
  media_type?: string;
  video_url?: string;
}

export class InstagramMetadataExtractor {
  /**
   * Extrait les métadonnées depuis une URL Instagram
   * Utilise les meta tags Open Graph présents dans la page
   */
  async extractFromUrl(url: string): Promise<InstagramMetadata> {
    console.log('🔍 [InstagramMetadataExtractor] Extracting metadata from:', url);
    
    try {
      // Pour l'instant, on retourne des données par défaut
      // Dans un environnement de production, on pourrait utiliser un service
      // comme Puppeteer ou un proxy qui fait le scraping côté serveur
      
      // Extract post ID from URL
      const postIdMatch = url.match(/\/(p|reel)\/([a-zA-Z0-9_-]+)/);
      const postId = postIdMatch ? postIdMatch[2] : 'unknown';
      
      console.log('📌 [InstagramMetadataExtractor] Post ID:', postId);
      
      // Pour l'instant, utiliser une approche fallback
      // En production, on pourrait:
      // 1. Utiliser un service de scraping dédié
      // 2. Utiliser l'API Instagram Graph (nécessite auth)
      // 3. Utiliser un proxy qui extrait les meta tags
      
      return {
        title: 'Recette Instagram',
        description: 'Recette extraite depuis Instagram',
        // Utiliser une image placeholder ou permettre à l'utilisateur de télécharger manuellement
        thumbnail_url: undefined,
        author_name: 'Instagram User',
        media_type: url.includes('/reel/') ? 'video' : 'image'
      };
      
    } catch (error) {
      console.error('❌ [InstagramMetadataExtractor] Error:', error);
      throw error;
    }
  }
  
  /**
   * Alternative: Extraire les métadonnées depuis le HTML de la page
   * (nécessite un proxy backend pour éviter CORS)
   */
  async extractFromHtml(html: string): Promise<InstagramMetadata> {
    const metadata: InstagramMetadata = {};
    
    // Extraire les meta tags Open Graph
    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    if (ogImageMatch) {
      metadata.thumbnail_url = ogImageMatch[1];
    }
    
    const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    if (ogTitleMatch) {
      metadata.title = ogTitleMatch[1];
    }
    
    const ogDescriptionMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    if (ogDescriptionMatch) {
      metadata.description = ogDescriptionMatch[1];
      
      // Extraire l'auteur depuis la description
      const authorMatch = metadata.description.match(/by @(\w+)/);
      if (authorMatch) {
        metadata.author_name = authorMatch[1];
        metadata.author_url = `https://www.instagram.com/${authorMatch[1]}/`;
      }
    }
    
    const ogVideoMatch = html.match(/<meta property="og:video" content="([^"]+)"/);
    if (ogVideoMatch) {
      metadata.video_url = ogVideoMatch[1];
      metadata.media_type = 'video';
    }
    
    return metadata;
  }
}

export const instagramMetadataExtractor = new InstagramMetadataExtractor();