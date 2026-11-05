import { useState } from 'react';
import { apiPost } from '@/lib/api';

export const useInstagramThumbnail = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractThumbnail = async (url: string): Promise<any> => {
    setLoading(true);
    setError(null);

    try {
      // Validate URL with shared schema
      try {
        const { UrlBody } = await import('@smart/shared');
        (UrlBody as any).parse({ url });
      } catch {
        throw new Error('URL invalide');
      }
      console.log('🔍 [useInstagramThumbnail] Extraction de la vignette pour:', url);
      
      // The API requires the signed-in user's token (apiPost adds it).
      const data = await apiPost<any>('/social/instagram/thumbnail', { url });
      console.log('📦 [useInstagramThumbnail] Réponse:', data);

      if (data) {
        console.log('✅ [useInstagramThumbnail] Données trouvées');
        if (data?.thumbnail_base64) {
          console.log('✅ [useInstagramThumbnail] Image base64 disponible');
        }
        return data;
      } else {
        throw new Error('Aucune vignette trouvée');
      }
    } catch (err) {
      console.error('❌ [useInstagramThumbnail] Erreur:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    extractThumbnail,
    loading,
    error
  };
};
