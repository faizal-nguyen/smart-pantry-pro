import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Instagram, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Video,
  Clock,
  Users,
  ChefHat,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInstagramThumbnail } from '@/hooks/useInstagramThumbnail';

interface Recipe {
  title: string;
  description: string;
  ingredients: Array<{
    name: string;
    amount: string;
    unit: string;
  }>;
  instructions: Array<{
    step: number;
    description: string;
  }>;
  metadata: {
    duration?: string;
    servings?: number;
    confidence: number;
    processingTime: number;
    platform: string;
    extractionMethod: string;
    thumbnail?: {
      url: string;
      width?: number;
      height?: number;
    };
    author?: {
      name: string;
      url?: string;
    };
  };
}

interface InstagramVideoExtractorProps {
  onRecipeExtracted: (recipe: Recipe & { processingTime: string }, sourceUrl: string) => void;
  onError: (error: { message: string }) => void;
}

export const InstagramVideoExtractor: React.FC<InstagramVideoExtractorProps> = ({
  onRecipeExtracted,
  onError
}) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [extractedRecipe, setExtractedRecipe] = useState<Recipe | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const { extractThumbnail, loading: thumbnailLoading } = useInstagramThumbnail();
  
  const isValidInstagramUrl = (url: string) => {
    const instagramRegex = /^https?:\/\/(www\.)?instagram\.com\/(p|reel)\/[a-zA-Z0-9_-]+/;
    return instagramRegex.test(url);
  };

  const extractRecipe = async () => {
    // Logs très visibles
    console.log("%c🎬 DÉBUT EXTRACTION INSTAGRAM", "color: #ff0066; font-size: 20px; font-weight: bold;");
    console.log("%c📍 URL: " + url, "color: #0099ff; font-size: 16px;");
    console.log("%c🔧 Port: " + window.location.port, "color: #00cc66; font-size: 16px;");
    
    console.log("🎬 [InstagramVideoExtractor] Début de l'extraction pour URL:", url);
    console.log("📍 [InstagramVideoExtractor] Window location:", window.location.href);
    console.log("🔧 [InstagramVideoExtractor] Environment:", process.env.NODE_ENV);
    
    if (!url.trim()) {
      console.error("❌ [InstagramVideoExtractor] URL vide");
      onError({ message: 'Veuillez entrer une URL Instagram valide.' });
      return;
    }

    if (!isValidInstagramUrl(url)) {
      console.error("❌ [InstagramVideoExtractor] URL invalide:", url);
      onError({ message: 'URL Instagram invalide. Utilisez une URL de post ou de reel Instagram.' });
      return;
    }

    console.log("✅ [InstagramVideoExtractor] URL valide, début de l'extraction...");
    setLoading(true);
    setExtractedRecipe(null);

    try {
      // En développement, utiliser l'URL directe du serveur API si le proxy ne fonctionne pas
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3003/api/parse-video-recipe'
        : '/api/parse-video-recipe';
      
      console.log("🌐 [InstagramVideoExtractor] Appel API vers:", apiUrl);
      console.log("📤 [InstagramVideoExtractor] Données envoyées:", { videoUrl: url, platform: 'instagram' });
      
      // Test rapide de disponibilité de l'API en développement - désactivé temporairement
      // if (process.env.NODE_ENV !== 'production') {
      //   try {
      //     const healthCheck = await fetch('/api/health', { 
      //       method: 'GET',
      //       signal: AbortSignal.timeout(2000) // Timeout de 2 secondes
      //     }).catch(() => null);
      //     
      //     if (!healthCheck || !healthCheck.ok) {
      //       console.error("❌ Serveur API local non disponible");
      //       throw new Error(
      //         'Le serveur API local n\'est pas démarré. Exécutez "npm run api" dans un terminal séparé pour activer l\'extraction vidéo.'
      //       );
      //     }
      //   } catch (healthError) {
      //     if (healthError instanceof Error && healthError.message.includes('serveur API local')) {
      //       throw healthError;
      //     }
      //   }
      // }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          videoUrl: url,
          platform: 'instagram'
        }),
        // Augmenter le timeout pour les extractions longues
        signal: AbortSignal.timeout(60000) // 60 secondes
      });

      console.log("📡 Réponse reçue:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Erreur HTTP:", response.status, errorText);
        throw new Error(`Erreur HTTP: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("%c📦 DONNÉES REÇUES DE L'API", "color: #ff6600; font-size: 18px; font-weight: bold;");
      console.log("📦 Données reçues:", data);
      console.log("🔍 Structure complète:", JSON.stringify(data, null, 2));

      if (!data.success) {
        console.error("❌ Extraction échouée:", data.message);
        throw new Error(data.message || 'Échec de l\'extraction de la recette');
      }

      const recipe = data.data;
      const processingTime = data.processingTime || `${recipe.metadata.processingTime}ms`;
      
      console.log("✅ Recette extraite:", recipe);
      console.log("⏱️ Temps de traitement:", processingTime);
      console.log("📸 Métadonnées:", recipe.metadata);
      console.log("🖼️ Thumbnail:", recipe.metadata?.thumbnail);
      
      // Log détaillé de la structure
      if (recipe.metadata?.thumbnail) {
        console.log("✅ Thumbnail trouvée:", {
          type: typeof recipe.metadata.thumbnail,
          value: recipe.metadata.thumbnail,
          hasUrl: recipe.metadata.thumbnail?.url !== undefined
        });
      } else {
        console.log("❌ Pas de thumbnail dans les métadonnées");
      }

      setExtractedRecipe(recipe);
      
      // Récupérer la vignette séparément si elle n'est pas dans les métadonnées
      if (!recipe.metadata?.thumbnail?.url && !recipe.metadata?.thumbnail_base64) {
        console.log("🖼️ Récupération séparée de la vignette...");
        const thumbnailData = await extractThumbnail(url);
        if (thumbnailData) {
          // Vérifier si on a une image en base64
          if (thumbnailData.thumbnail_base64) {
            console.log("✅ Image base64 reçue");
            // Utiliser directement le base64 sans proxy
            setThumbnailUrl(thumbnailData.thumbnail_base64);
            recipe.metadata.thumbnail = {
              url: thumbnailData.thumbnail_base64
            };
          } else if (thumbnailData.thumbnail_url) {
            // Pour les URLs externes, vérifier si c'est déjà une data URL
            if (thumbnailData.thumbnail_url.startsWith('data:')) {
              setThumbnailUrl(thumbnailData.thumbnail_url);
              recipe.metadata.thumbnail = {
                url: thumbnailData.thumbnail_url
              };
            } else {
              // Utiliser le proxy seulement pour les URLs HTTP/HTTPS
              const proxyBaseUrl = process.env.NODE_ENV === 'development' 
                ? 'http://localhost:3003/api/proxy/image'
                : '/api/proxy/image';
              const proxiedUrl = `${proxyBaseUrl}?url=${encodeURIComponent(thumbnailData.thumbnail_url)}`;
              setThumbnailUrl(proxiedUrl);
              recipe.metadata.thumbnail = {
                url: proxiedUrl
              };
            }
          }
        }
      } else if (recipe.metadata?.thumbnail_base64) {
        console.log("✅ Image base64 trouvée dans les métadonnées");
        setThumbnailUrl(recipe.metadata.thumbnail_base64);
      } else if (recipe.metadata?.thumbnail?.url || recipe.metadata?.thumbnail) {
        const thumbnailUrl = recipe.metadata.thumbnail.url || recipe.metadata.thumbnail;
        // Vérifier si c'est une data URL
        if (typeof thumbnailUrl === 'string' && thumbnailUrl.startsWith('data:')) {
          setThumbnailUrl(thumbnailUrl);
        } else if (typeof thumbnailUrl === 'string') {
          // Utiliser le proxy pour éviter les problèmes CORS
          const proxyBaseUrl = process.env.NODE_ENV === 'development' 
            ? 'http://localhost:3003/api/proxy/image'
            : '/api/proxy/image';
          const proxiedUrl = `${proxyBaseUrl}?url=${encodeURIComponent(thumbnailUrl)}`;
          setThumbnailUrl(proxiedUrl);
          recipe.metadata.thumbnail = {
            url: proxiedUrl
          };
        }
      }
      
      onRecipeExtracted({
        ...recipe,
        processingTime
      }, url);

    } catch (error) {
      console.error('❌ Erreur lors de l\'extraction:', error);
      
      // Message d'erreur amélioré pour le développement local
      let errorMessage = error instanceof Error ? error.message : 'Erreur inconnue lors de l\'extraction';
      
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        errorMessage = 'Impossible de contacter le serveur API. En développement local, lancez "npm run api" dans un terminal séparé.';
      }
      
      onError({
        message: errorMessage
      });
    } finally {
      console.log("🏁 Fin du processus d'extraction");
      setLoading(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    setExtractedRecipe(null);
  };

  const clearExtraction = () => {
    setUrl('');
    setExtractedRecipe(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Instagram className="w-5 h-5 text-pink-500" />
          Extraction de Recettes Instagram
          <Badge variant="secondary" className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
            IA Ultra-Rapide
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* URL Input */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={handleUrlChange}
              placeholder="https://www.instagram.com/reel/..."
              disabled={loading}
              className="flex-1"
            />
            <Button 
              onClick={extractRecipe}
              disabled={loading || !url.trim()}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Extraction...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Extraire
                </>
              )}
            </Button>
          </div>
          
          {url && !isValidInstagramUrl(url) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Veuillez entrer une URL Instagram valide (post ou reel).
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border rounded-lg p-4 bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-pink-500" />
              <div>
                <p className="font-medium">Extraction en cours...</p>
                <p className="text-sm text-muted-foreground">
                  Analyse de la vidéo Instagram avec l'IA • ~15 secondes
                </p>
              </div>
            </div>
            <div className="mt-3 w-full bg-muted rounded-full h-2">
              <motion.div 
                className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 15, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        )}

        {/* Success State */}
        {extractedRecipe && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border rounded-lg p-4 bg-green-50 border-green-200"
          >
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div className="flex-1">
                {/* Thumbnail et informations */}
                <div className="flex gap-4 mb-3">
                  {(thumbnailUrl || extractedRecipe.metadata.thumbnail) && (
                    <div className="relative">
                      <img 
                        src={thumbnailUrl || extractedRecipe.metadata.thumbnail?.url || (typeof extractedRecipe.metadata.thumbnail === 'string' ? extractedRecipe.metadata.thumbnail : '')} 
                        alt={extractedRecipe.title}
                        className="w-24 h-24 object-cover rounded-lg shadow-md"
                        onError={(e) => {
                          console.error('❌ Erreur chargement image:', e.currentTarget.src);
                          // Remplacer l'image par une div avec icône Instagram
                          const imgElement = e.currentTarget;
                          const parentDiv = imgElement.parentElement;
                          if (parentDiv) {
                            parentDiv.innerHTML = `
                              <div class="w-24 h-24 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-lg flex items-center justify-center shadow-md">
                                <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                </svg>
                              </div>
                            `;
                          }
                          console.log('🔄 Image remplacée par icône Instagram');
                        }}
                      />
                      {thumbnailLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                          <Loader2 className="w-6 h-6 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                  )}
                  {!thumbnailUrl && !extractedRecipe.metadata.thumbnail && !thumbnailLoading && (
                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-800">{extractedRecipe.title}</h3>
                    <p className="text-sm text-green-700">{extractedRecipe.description}</p>
                    {extractedRecipe.metadata.author && (
                      <p className="text-xs text-green-600 mt-1">
                        Par {extractedRecipe.metadata.author.name}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {extractedRecipe.metadata.servings && (
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      <Users className="w-3 h-3 mr-1" />
                      {extractedRecipe.metadata.servings} portions
                    </Badge>
                  )}
                  {extractedRecipe.metadata.duration && (
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      <Clock className="w-3 h-3 mr-1" />
                      {extractedRecipe.metadata.duration}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    <ChefHat className="w-3 h-3 mr-1" />
                    {extractedRecipe.ingredients.length} ingrédients
                  </Badge>
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    Confiance {Math.round(extractedRecipe.metadata.confidence * 100)}%
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-green-800 mb-1">Ingrédients:</h4>
                    <ul className="text-green-700 space-y-0.5">
                      {extractedRecipe.ingredients.slice(0, 3).map((ing, i) => (
                        <li key={i}>• {ing.amount} {ing.unit} {ing.name}</li>
                      ))}
                      {extractedRecipe.ingredients.length > 3 && (
                        <li>• ... et {extractedRecipe.ingredients.length - 3} autres</li>
                      )}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-green-800 mb-1">Instructions:</h4>
                    <ol className="text-green-700 space-y-0.5">
                      {extractedRecipe.instructions.slice(0, 2).map((inst, i) => (
                        <li key={i}>{inst.step}. {(inst.description || '').substring(0, 50)}...</li>
                      ))}
                      {extractedRecipe.instructions.length > 2 && (
                        <li>... et {extractedRecipe.instructions.length - 2} autres étapes</li>
                      )}
                    </ol>
                  </div>
                </div>
                
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={clearExtraction} variant="outline">
                    Nouvelle extraction
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 <strong>Astuce:</strong> Copiez l'URL d'un reel ou post Instagram contenant une recette</p>
          <p>⚡ L'IA extrait automatiquement le titre, ingrédients et instructions en ~15 secondes</p>
          {process.env.NODE_ENV !== 'production' && (
            <>
              <p>🔧 <strong>Dev:</strong> Assurez-vous que le serveur API est lancé avec <code className="bg-muted px-1 py-0.5 rounded">npm run api</code></p>
              <div className="mt-2 space-x-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setUrl('https://www.instagram.com/reel/DKe6odxIRRr/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==')}
                >
                  Remplir URL test
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/health');
                      const data = await response.json();
                      console.log('🏥 Health check:', data);
                      alert('API Health: ' + JSON.stringify(data));
                    } catch (error) {
                      console.error('❌ Health check failed:', error);
                      alert('Health check failed: ' + error.message);
                    }
                  }}
                >
                  Test API
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};