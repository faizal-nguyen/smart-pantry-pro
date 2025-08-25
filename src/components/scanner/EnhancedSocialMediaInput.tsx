import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Link, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  Instagram,
  Youtube,
  Globe,
  ChefHat,
  Languages
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { YouTubeVideoParser } from '@/services/video/youtubeVideoParser';
import { useSocialRecipeParser } from '@/hooks/useSocialRecipeParser';
import { toast } from 'sonner';

interface EnhancedSocialMediaInputProps {
  onRecipeExtracted: (recipe: any) => void;
  settings: any;
}

export function EnhancedSocialMediaInput({ onRecipeExtracted, settings }: EnhancedSocialMediaInputProps) {
  const [url, setUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedRecipe, setExtractedRecipe] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('auto');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const youtubeParser = new YouTubeVideoParser();
  const { parseRecipeFromSocialEnhanced } = useSocialRecipeParser();

  const isYouTubeUrl = (url: string) => {
    return youtubeParser.isYouTubeUrl(url);
  };

  const supportedLanguages = [
    { code: 'auto', name: '🌐 Auto-detect', flag: '🌐' },
    { code: 'en', name: '🇬🇧 English', flag: '🇬🇧' },
    { code: 'fr', name: '🇫🇷 Français', flag: '🇫🇷' },
    { code: 'hi', name: '🇮🇳 हिन्दी', flag: '🇮🇳' },
    { code: 'ta', name: '🇮🇳 தமிழ்', flag: '🇮🇳' }
  ];

  const handleExtract = async () => {
    if (!url.trim()) {
      toast.error('Veuillez entrer une URL');
      return;
    }

    setIsExtracting(true);
    setError(null);
    setExtractedRecipe(null);
    setProgress(0);

    try {
      let result;
      
      if (isYouTubeUrl(url)) {
        // Use YouTube-specific parser with language support
        console.log('🎬 Using YouTube parser with language:', language);
        
        const videoRecipe = await youtubeParser.parseYouTubeRecipe(url, {
          language: language as any,
          autoDetectLanguage: language === 'auto',
          onProgress: (prog) => setProgress(prog),
          quality: 'high'
        });

        // Convert to standard recipe format
        result = {
          success: true,
          data: {
            name: videoRecipe.title,
            description: videoRecipe.description,
            ingredients: videoRecipe.ingredients.map(ing => ({
              name: ing.name,
              quantity: parseFloat(ing.amount) || 0,
              unit: ing.unit || '',
              notes: ''
            })),
            instructions: videoRecipe.instructions.map(inst => inst.description),
            prepTime: videoRecipe.nutritionalInfo?.cookingTime ? 
              parseInt(videoRecipe.nutritionalInfo.cookingTime) : 0,
            cookTime: 0,
            servings: videoRecipe.nutritionalInfo?.servings || 4,
            difficulty: videoRecipe.nutritionalInfo?.difficulty,
            tags: [`youtube`, language !== 'auto' ? language : 'auto-detected'],
            imageUrl: videoRecipe.metadata.thumbnail?.url,
            videoUrl: url,
            author: videoRecipe.metadata.author
          },
          platform: 'youtube',
          confidence: videoRecipe.metadata.confidence,
          extractionMethod: `youtube-${language}`,
          metadata: {
            language: videoRecipe.metadata.language || language,
            duration: videoRecipe.metadata.duration,
            processingTime: videoRecipe.metadata.processingTime
          }
        };
      } else {
        // Use standard social media parser for other platforms
        result = await parseRecipeFromSocialEnhanced(url, '', {
          enableCache: true,
          enhancedAI: true,
          includeMetadata: true
        });
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Impossible d\'extraire la recette');
      }

      setExtractedRecipe({
        ...result,
        recipe: result.data,
        timestamp: new Date().toISOString()
      });

      toast.success(`Recette extraite avec succès !`);
      
      if (result.platform === 'youtube' && result.metadata?.language) {
        toast.info(`Langue détectée : ${result.metadata.language}`, {
          icon: '🌐'
        });
      }

    } catch (error: any) {
      console.error('Extraction error:', error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setIsExtracting(false);
      setProgress(0);
    }
  };

  const handleAddRecipe = () => {
    if (extractedRecipe?.recipe) {
      onRecipeExtracted(extractedRecipe.recipe);
      
      // Clear form
      setUrl('');
      setExtractedRecipe(null);
      setLanguage('auto');
      
      toast.success('Recette ajoutée à votre collection !');
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return <Youtube className="h-5 w-5" />;
      case 'instagram':
        return <Instagram className="h-5 w-5" />;
      default:
        return <Globe className="h-5 w-5" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return 'bg-red-600';
      case 'instagram':
        return 'bg-gradient-to-r from-purple-500 to-pink-500';
      case 'tiktok':
        return 'bg-black';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">
              Importer une recette depuis les réseaux sociaux
            </h3>
            <p className="text-sm text-muted-foreground">
              YouTube, Instagram, TikTok et plus - avec support multilingue pour YouTube
            </p>
          </div>

          {/* URL Input with language selector */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="https://www.youtube.com/watch?v=... ou instagram.com/reel/..."
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    // Show language selector for YouTube URLs
                    setShowLanguageSelector(isYouTubeUrl(e.target.value));
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleExtract()}
                  className="w-full"
                />
              </div>
              
              {/* Language selector for YouTube */}
              <AnimatePresence>
                {showLanguageSelector && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                  >
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="w-[180px]">
                        <Languages className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {supportedLanguages.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            <span className="flex items-center gap-2">
                              <span>{lang.flag}</span>
                              <span>{lang.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button
              onClick={handleExtract}
              disabled={isExtracting || !url.trim()}
              className="w-full gap-2"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extraction... {progress > 0 && `${progress}%`}
                </>
              ) : (
                <>
                  <Link className="h-4 w-4" />
                  Extraire la recette
                </>
              )}
            </Button>

            {/* Progress bar for YouTube extraction */}
            {isExtracting && progress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-primary h-2 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut' }}
                />
              </div>
            )}
          </div>

          {/* Platform indicators */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Plateformes supportées :</span>
            <div className="flex gap-2">
              <Badge variant="secondary" className="gap-1">
                <Youtube className="h-3 w-3" />
                YouTube (Multi-langue)
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Instagram className="h-3 w-3" />
                Instagram
              </Badge>
              <Badge variant="secondary">TikTok</Badge>
              <Badge variant="secondary">Pinterest</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Extracted recipe preview */}
      <AnimatePresence>
        {extractedRecipe && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="overflow-hidden">
              <div className={`p-4 text-white ${getPlatformColor(extractedRecipe.platform)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getPlatformIcon(extractedRecipe.platform)}
                    <div>
                      <p className="font-semibold">
                        {extractedRecipe.recipe.author?.name || 'Auteur inconnu'}
                      </p>
                      {extractedRecipe.metadata?.language && (
                        <p className="text-xs opacity-90">
                          Langue : {extractedRecipe.metadata.language}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    Confiance: {Math.round((extractedRecipe.confidence || 0.8) * 100)}%
                  </Badge>
                </div>
              </div>

              {/* Recipe thumbnail for YouTube */}
              {extractedRecipe.recipe.imageUrl && (
                <div className="relative aspect-video w-full">
                  <img 
                    src={extractedRecipe.recipe.imageUrl} 
                    alt={extractedRecipe.recipe.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <ChefHat className="h-5 w-5" />
                    {extractedRecipe.recipe.name}
                  </h3>
                  {extractedRecipe.recipe.description && (
                    <p className="text-muted-foreground mt-2">
                      {extractedRecipe.recipe.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-muted-foreground">Préparation</p>
                    <p className="font-semibold">
                      {extractedRecipe.recipe.prepTime || '?'} min
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Portions</p>
                    <p className="font-semibold">
                      {extractedRecipe.recipe.servings || 4}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Difficulté</p>
                    <p className="font-semibold capitalize">
                      {extractedRecipe.recipe.difficulty || 'Moyenne'}
                    </p>
                  </div>
                </div>

                {/* Ingredients preview */}
                {extractedRecipe.recipe.ingredients?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">
                      Ingrédients ({extractedRecipe.recipe.ingredients.length})
                    </h4>
                    <div className="text-sm text-muted-foreground">
                      {extractedRecipe.recipe.ingredients.slice(0, 3).map((ing: any, i: number) => (
                        <p key={i}>• {ing.quantity} {ing.unit} {ing.name}</p>
                      ))}
                      {extractedRecipe.recipe.ingredients.length > 3 && (
                        <p className="italic">
                          ... et {extractedRecipe.recipe.ingredients.length - 3} autres
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {extractedRecipe.recipe.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {extractedRecipe.recipe.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setExtractedRecipe(null)}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleAddRecipe}
                    className="flex-1 gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Ajouter à mes recettes
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips */}
      {!extractedRecipe && !error && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <div className="space-y-2">
            <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold">
              💡 Conseils d'utilisation :
            </p>
            <ul className="text-sm text-blue-900 dark:text-blue-100 list-disc list-inside space-y-1">
              <li>Pour YouTube : Sélectionnez la langue de la vidéo pour une meilleure précision</li>
              <li>Langues supportées : Français, Anglais, Hindi (Deepgram) et Tamil (Whisper)</li>
              <li>La détection automatique analyse le titre et la description</li>
              <li>Instagram, TikTok et autres plateformes utilisent l'extraction standard</li>
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
}