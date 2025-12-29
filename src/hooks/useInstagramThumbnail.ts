import { useState } from 'react';

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
      
      // En développement, utiliser l'URL directe du serveur API si le proxy ne fonctionne pas
      const apiUrl = '/api/social/instagram/thumbnail';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const raw = await response.json();
      console.log('📦 [useInstagramThumbnail] Réponse:', raw);
      const data = raw?.data ?? raw;

      if (raw.success) {
        console.log('✅ [useInstagramThumbnail] Données trouvées');
        if (data?.thumbnail_base64) {
          console.log('✅ [useInstagramThumbnail] Image base64 disponible');
        }
        return data;
      } else {
        throw new Error(data?.error || 'Aucune vignette trouvée');
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
