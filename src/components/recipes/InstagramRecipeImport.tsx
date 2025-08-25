import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Instagram, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Video,
  Image as ImageIcon,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

interface InstagramRecipe {
  title: string;
  description: string;
  ingredients: Array<{
    name: string;
    amount: string;
    unit?: string;
  }>;
  instructions: Array<{
    step: number;
    description: string;
  }>;
  metadata: {
    thumbnail?: {
      url: string;
      width?: number;
      height?: number;
    };
    author?: {
      name: string;
      url?: string;
    };
    confidence: number;
  };
}

interface InstagramRecipeImportProps {
  onRecipeImported: (recipe: InstagramRecipe) => void;
  onCancel: () => void;
}

export const InstagramRecipeImport: React.FC<InstagramRecipeImportProps> = ({
  onRecipeImported,
  onCancel
}) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<InstagramRecipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useThumbnailAsCover, setUseThumbnailAsCover] = useState(true);
  
  const isValidInstagramUrl = (url: string) => {
    const instagramRegex = /^https?:\/\/(www\.)?instagram\.com\/(p|reel)\/[a-zA-Z0-9_-]+/;
    return instagramRegex.test(url);
  };

  const extractRecipe = async () => {
    if (!url.trim() || !isValidInstagramUrl(url)) {
      setError('Veuillez entrer une URL Instagram valide.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/parse-video-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          videoUrl: url,
          platform: 'instagram'
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Échec de l\'extraction');
      }

      setRecipe(data.data);

    } catch (error) {
      console.error('Erreur extraction:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors de l\'extraction');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (!recipe) return;

    // Si l'utilisateur veut utiliser la thumbnail comme image de couverture
    if (useThumbnailAsCover && recipe.metadata.thumbnail) {
      // Ajouter l'URL de la thumbnail comme image_url de la recette
      const recipeWithCover = {
        ...recipe,
        image_url: recipe.metadata.thumbnail.url
      };
      onRecipeImported(recipeWithCover);
    } else {
      onRecipeImported(recipe);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Instagram className="w-5 h-5 text-pink-500" />
          Import Instagram avec Vignette
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* URL Input */}
        <div className="space-y-2">
          <Label>URL Instagram</Label>
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              placeholder="https://www.instagram.com/reel/..."
              disabled={loading}
              className="flex-1"
            />
            <Button 
              onClick={extractRecipe}
              disabled={loading || !url.trim()}
              className="bg-gradient-to-r from-pink-500 to-purple-500"
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
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Recipe Preview */}
        {recipe && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex gap-4">
                {/* Thumbnail Preview */}
                {recipe.metadata.thumbnail && (
                  <div className="space-y-2">
                    <img 
                      src={recipe.metadata.thumbnail.url} 
                      alt={recipe.title}
                      className="w-32 h-32 object-cover rounded-lg shadow-md"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="use-thumbnail"
                        checked={useThumbnailAsCover}
                        onChange={(e) => setUseThumbnailAsCover(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="use-thumbnail" className="text-sm cursor-pointer">
                        Utiliser comme image de couverture
                      </Label>
                    </div>
                  </div>
                )}
                
                {/* Recipe Info */}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{recipe.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{recipe.description}</p>
                  
                  {recipe.metadata.author && (
                    <p className="text-sm mb-2">
                      <span className="text-muted-foreground">Par</span>{' '}
                      <a 
                        href={recipe.metadata.author.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-pink-500 hover:underline"
                      >
                        {recipe.metadata.author.name}
                      </a>
                    </p>
                  )}
                  
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary">
                      {recipe.ingredients.length} ingrédients
                    </Badge>
                    <Badge variant="secondary">
                      {recipe.instructions.length} étapes
                    </Badge>
                    <Badge variant="outline">
                      Confiance {Math.round(recipe.metadata.confidence * 100)}%
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* Quick Preview */}
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-1">Ingrédients principaux:</h4>
                  <ul className="text-muted-foreground space-y-0.5">
                    {recipe.ingredients.slice(0, 3).map((ing, i) => (
                      <li key={i}>• {ing.amount} {ing.unit} {ing.name}</li>
                    ))}
                    {recipe.ingredients.length > 3 && (
                      <li>• ... et {recipe.ingredients.length - 3} autres</li>
                    )}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-1">Aperçu des étapes:</h4>
                  <ol className="text-muted-foreground space-y-0.5">
                    {recipe.instructions.slice(0, 2).map((inst, i) => (
                      <li key={i}>{inst.step}. {inst.description.substring(0, 50)}...</li>
                    ))}
                    {recipe.instructions.length > 2 && (
                      <li>... et {recipe.instructions.length - 2} autres étapes</li>
                    )}
                  </ol>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onCancel}>
                Annuler
              </Button>
              <Button onClick={handleImport}>
                <Download className="w-4 h-4 mr-2" />
                Importer la recette
                {useThumbnailAsCover && recipe.metadata.thumbnail && ' avec vignette'}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 La vignette Instagram est automatiquement récupérée via l'API oEmbed</p>
          <p>📸 Vous pouvez choisir d'utiliser cette vignette comme image de couverture de votre recette</p>
        </div>
      </CardContent>
    </Card>
  );
};