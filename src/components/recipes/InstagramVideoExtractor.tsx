import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Instagram, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Video,
  Clock,
  Users,
  ChefHat
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  
  const isValidInstagramUrl = (url: string) => {
    const instagramRegex = /^https?:\/\/(www\.)?instagram\.com\/(p|reel)\/[a-zA-Z0-9_-]+/;
    return instagramRegex.test(url);
  };

  const extractRecipe = async () => {
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
      // Utiliser l'URL relative pour que le proxy Vite fonctionne en dev
      const apiUrl = '/api/parse-video-recipe';
      
      console.log("🌐 [InstagramVideoExtractor] Appel API vers:", apiUrl);
      console.log("📤 [InstagramVideoExtractor] Données envoyées:", { videoUrl: url, platform: 'instagram' });
      
      // Test rapide de disponibilité de l'API en développement
      if (process.env.NODE_ENV !== 'production') {
        try {
          const healthCheck = await fetch('/api/health', { 
            method: 'GET',
            signal: AbortSignal.timeout(2000) // Timeout de 2 secondes
          }).catch(() => null);
          
          if (!healthCheck || !healthCheck.ok) {
            console.error("❌ Serveur API local non disponible");
            throw new Error(
              'Le serveur API local n\'est pas démarré. Exécutez "npm run api" dans un terminal séparé pour activer l\'extraction vidéo.'
            );
          }
        } catch (healthError) {
          if (healthError instanceof Error && healthError.message.includes('serveur API local')) {
            throw healthError;
          }
        }
      }
      
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
      console.log("📦 Données reçues:", data);

      if (!data.success) {
        console.error("❌ Extraction échouée:", data.message);
        throw new Error(data.message || 'Échec de l\'extraction de la recette');
      }

      const recipe = data.data;
      const processingTime = data.processingTime || `${recipe.metadata.processingTime}ms`;
      
      console.log("✅ Recette extraite:", recipe);
      console.log("⏱️ Temps de traitement:", processingTime);

      setExtractedRecipe(recipe);
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
                <h3 className="font-semibold text-green-800">{extractedRecipe.title}</h3>
                <p className="text-sm text-green-700 mb-3">{extractedRecipe.description}</p>
                
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
                        <li key={i}>{inst.step}. {inst.description.substring(0, 50)}...</li>
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
                  onClick={() => setUrl('https://www.instagram.com/reel/DJ63290I7L8/')}
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