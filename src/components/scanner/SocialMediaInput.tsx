import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Link, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  Instagram,
  Youtube,
  Globe,
  ChefHat
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { socialMediaParser } from '@/services/socialMediaParser/socialMediaRecipeParser';
import { useSocialRecipeParser } from '@/hooks/useSocialRecipeParser';
import { toast } from 'sonner';

interface SocialMediaInputProps {
  onRecipeExtracted: (recipe: any) => void;
  settings: any;
}

// Enhanced parsing modes
type ParsingMode = 'enhanced' | 'basic' | 'auto';

// Platform icons mapping
const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-5 w-5" />,
  tiktok: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>,
  youtube: <Youtube className="h-5 w-5" />,
  pinterest: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.49-.09-.8-.17-2.04.04-2.92.19-.79 1.21-5.13 1.21-5.13s-.31-.62-.31-1.54c0-1.44.84-2.52 1.88-2.52.89 0 1.32.67 1.32 1.47 0 .9-.57 2.24-.87 3.48-.25 1.04.52 1.89 1.55 1.89 1.86 0 3.29-1.96 3.29-4.79 0-2.5-1.8-4.25-4.37-4.25-2.98 0-4.73 2.23-4.73 4.54 0 .9.35 1.86.78 2.39.09.1.1.2.07.31l-.29 1.19c-.05.19-.16.23-.36.14-1.31-.61-2.13-2.52-2.13-4.06 0-3.3 2.4-6.33 6.92-6.33 3.63 0 6.45 2.59 6.45 6.05 0 3.61-2.27 6.51-5.43 6.51-1.06 0-2.06-.55-2.4-1.2l-.65 2.49c-.24.91-.88 2.05-1.31 2.75.99.3 2.03.47 3.12.47 5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
  </svg>,
  facebook: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
};

export function SocialMediaInput({ onRecipeExtracted, settings }: SocialMediaInputProps) {
  const [url, setUrl] = useState('');
  const [manualText, setManualText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedRecipe, setExtractedRecipe] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsingMode, setParsingMode] = useState<ParsingMode>('enhanced');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  
  // Enhanced parsing options state
  const [enhancedOptions, setEnhancedOptions] = useState({
    enableCache: true,
    cacheTimeout: 60,
    fallbackToBasic: true,
    enhancedAI: true,
    includeMetadata: true,
    includeEngagement: false
  });
  
  // Use the enhanced hook
  const { parseRecipeFromSocialEnhanced, parseRecipeFromSocial, loading, error: hookError } = useSocialRecipeParser();

  const handleExtract = async () => {
    // Validation
    if (!url.trim() && !manualText.trim()) {
      toast.error('Veuillez entrer une URL ou du texte manuel');
      return;
    }

    // Check privacy settings
    if (!settings.allowImageProcessing && url.trim()) {
      toast.error('Le traitement d\'image est désactivé dans vos paramètres');
      return;
    }

    setIsExtracting(true);
    setError(null);
    setExtractedRecipe(null);

    try {
      let result;
      
      // Choose parsing method based on mode
      if (parsingMode === 'enhanced') {
        result = await parseRecipeFromSocialEnhanced(url, manualText, enhancedOptions);
      } else if (parsingMode === 'basic') {
        result = await parseRecipeFromSocial(url, manualText);
      } else { // auto mode
        // Try enhanced first, fallback to basic on error
        try {
          result = await parseRecipeFromSocialEnhanced(url, manualText, enhancedOptions);
        } catch (enhancedError) {
          console.warn('Enhanced parsing failed, falling back to basic:', enhancedError);
          result = await parseRecipeFromSocial(url, manualText);
        }
      }
      
      if (!result.success) {
        throw new Error(result.error || 'Impossible d\'extraire la recette');
      }

      // Set the extracted recipe with enhanced metadata
      setExtractedRecipe({
        ...result,
        recipe: result.data, // useSocialRecipeParser returns data instead of recipe
        timestamp: new Date().toISOString()
      });

      // Success message with parsing method info
      const methodText = result.extractionMethod === 'enhanced-ai' ? ' (Enhanced V2)' : 
                         result.extractionMethod === 'enhanced-manual' ? ' (Enhanced Manuel)' : '';
      toast.success(`Recette extraite avec succès !${methodText}`);

      // Show cost savings if available
      if (result.costSavings && result.costSavings.savingsPercent > 0) {
        toast.success(`Économie de coût : ${result.costSavings.savingsPercent}%`, {
          description: `Coût réduit de $${result.costSavings.savings.toFixed(3)}`
        });
      }

      // Show cache hit notification
      if (result.cached) {
        toast.info('Résultat récupéré du cache (plus rapide)');
      }
      
      // Save to history if enabled
      if (settings.saveHistory) {
        saveToHistory(result);
      }

    } catch (error: any) {
      console.error('Extraction error:', error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddRecipe = () => {
    if (extractedRecipe?.recipe) {
      onRecipeExtracted(extractedRecipe.recipe);
      
      // Clear form
      setUrl('');
      setExtractedRecipe(null);
      
      toast.success('Recette ajoutée à votre collection !');
    }
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
      tiktok: 'bg-black',
      youtube: 'bg-red-600',
      pinterest: 'bg-red-700',
      facebook: 'bg-blue-600'
    };
    return colors[platform] || 'bg-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Input section */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">
                Importer une recette depuis les réseaux sociaux
              </h3>
              <div className="flex gap-2">
                <Badge 
                  variant={parsingMode === 'enhanced' ? 'default' : 'secondary'}
                  className="text-xs cursor-pointer"
                  onClick={() => setParsingMode('enhanced')}
                >
                  Enhanced V2
                </Badge>
                <Badge 
                  variant={parsingMode === 'basic' ? 'default' : 'secondary'}
                  className="text-xs cursor-pointer"
                  onClick={() => setParsingMode('basic')}
                >
                  Basic
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {parsingMode === 'enhanced' ? 
                'Mode Enhanced V2 : Extraction optimisée avec GPT-4 et cache intelligent (85% moins cher)' :
                'Mode Basic : Extraction standard compatible avec toutes les plateformes'
              }
            </p>
          </div>

          {/* URL Input */}
          {!showManualInput && (
            <div className="flex gap-3">
              <Input
                placeholder="https://www.instagram.com/reel/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleExtract()}
                className="flex-1"
              />
              <Button
                onClick={handleExtract}
                disabled={isExtracting || (!url.trim() && !manualText.trim())}
                className="gap-2"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Extraction...
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4" />
                    Extraire {parsingMode === 'enhanced' ? 'V2' : ''}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Manual Text Input */}
          {showManualInput && (
            <div className="space-y-3">
              <textarea
                placeholder="Collez le texte complet de la recette ici..."
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                className="w-full min-h-[120px] p-3 border rounded-md resize-vertical"
                rows={6}
              />
              <div className="flex gap-3">
                <Button
                  onClick={handleExtract}
                  disabled={isExtracting || !manualText.trim()}
                  className="gap-2 flex-1"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Extraction...
                    </>
                  ) : (
                    <>
                      <ChefHat className="h-4 w-4" />
                      Extraire depuis le texte
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Toggle buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Supporté :</span>
              <div className="flex gap-3">
                {Object.entries(platformIcons).map(([platform, icon]) => (
                  <div key={platform} className="opacity-70 hover:opacity-100 transition-opacity">
                    {icon}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowManualInput(!showManualInput)}
                className="text-xs"
              >
                {showManualInput ? 'Mode URL' : 'Mode Manuel'}
              </Button>
              {parsingMode === 'enhanced' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="text-xs"
                >
                  Options avancées
                </Button>
              )}
            </div>
          </div>

          {/* Advanced Options for Enhanced Mode */}
          <AnimatePresence>
            {showAdvancedOptions && parsingMode === 'enhanced' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t pt-4 mt-4"
              >
                <h4 className="text-sm font-semibold mb-3">Options Enhanced V2</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enhancedOptions.enableCache}
                      onChange={(e) => setEnhancedOptions(prev => ({
                        ...prev,
                        enableCache: e.target.checked
                      }))}
                      className="rounded"
                    />
                    Cache intelligent
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enhancedOptions.enhancedAI}
                      onChange={(e) => setEnhancedOptions(prev => ({
                        ...prev,
                        enhancedAI: e.target.checked
                      }))}
                      className="rounded"
                    />
                    IA GPT-4 optimisée
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enhancedOptions.includeMetadata}
                      onChange={(e) => setEnhancedOptions(prev => ({
                        ...prev,
                        includeMetadata: e.target.checked
                      }))}
                      className="rounded"
                    />
                    Métadonnées enrichies
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enhancedOptions.fallbackToBasic}
                      onChange={(e) => setEnhancedOptions(prev => ({
                        ...prev,
                        fallbackToBasic: e.target.checked
                      }))}
                      className="rounded"
                    />
                    Fallback automatique
                  </label>
                </div>
                <div className="mt-3">
                  <label className="flex items-center gap-2 text-sm">
                    <span className="min-w-fit">Cache TTL:</span>
                    <input
                      type="range"
                      min="5"
                      max="240"
                      step="5"
                      value={enhancedOptions.cacheTimeout}
                      onChange={(e) => setEnhancedOptions(prev => ({
                        ...prev,
                        cacheTimeout: parseInt(e.target.value)
                      }))}
                      className="flex-1"
                    />
                    <span className="min-w-fit text-muted-foreground">
                      {enhancedOptions.cacheTimeout}min
                    </span>
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
              {/* Enhanced Platform header */}
              <div className={`p-4 text-white ${getPlatformColor(extractedRecipe.platform)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {platformIcons[extractedRecipe.platform]}
                    <div>
                      <p className="font-semibold">
                        {extractedRecipe.recipe.author?.name || extractedRecipe.author || 'Auteur inconnu'}
                      </p>
                      <p className="text-sm opacity-90">
                        @{extractedRecipe.recipe.author?.handle || extractedRecipe.authorProfile || extractedRecipe.platform}
                      </p>
                      {extractedRecipe.extractionMethod && (
                        <p className="text-xs opacity-75">
                          {extractedRecipe.extractionMethod === 'enhanced-ai' ? '✨ Enhanced AI' : 
                           extractedRecipe.extractionMethod === 'enhanced-manual' ? '📝 Enhanced Manuel' : 
                           '🔧 Basic'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      Confiance: {Math.round((extractedRecipe.confidence || 0.8) * 100)}%
                    </Badge>
                    {extractedRecipe.cached && (
                      <Badge variant="secondary" className="bg-green-500/20 text-white text-xs">
                        🚀 Cached
                      </Badge>
                    )}
                    {extractedRecipe.costSavings && (
                      <Badge variant="secondary" className="bg-blue-500/20 text-white text-xs">
                        💰 -{extractedRecipe.costSavings.savingsPercent}%
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Recipe content */}
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

                {/* Recipe details */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-muted-foreground">Préparation</p>
                    <p className="font-semibold">
                      {extractedRecipe.recipe.prepTime || '?'} min
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Cuisson</p>
                    <p className="font-semibold">
                      {extractedRecipe.recipe.cookTime || '?'} min
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Portions</p>
                    <p className="font-semibold">
                      {extractedRecipe.recipe.servings || 4}
                    </p>
                  </div>
                </div>

                {/* Ingredients preview */}
                {extractedRecipe.recipe.ingredients?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Ingrédients ({extractedRecipe.recipe.ingredients.length})</h4>
                    <div className="text-sm text-muted-foreground">
                      {extractedRecipe.recipe.ingredients.slice(0, 3).map((ing: any, i: number) => (
                        <p key={i}>• {ing.quantity} {ing.unit} {ing.name}</p>
                      ))}
                      {extractedRecipe.recipe.ingredients.length > 3 && (
                        <p className="italic">... et {extractedRecipe.recipe.ingredients.length - 3} autres</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Enhanced Tags with metadata */}
                <div className="space-y-3">
                  {/* Regular tags */}
                  {extractedRecipe.recipe.tags?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {extractedRecipe.recipe.tags.map((tag: string) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Enhanced metadata tags */}
                  {extractedRecipe.metadata?.hashtags?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Hashtags originaux</h4>
                      <div className="flex flex-wrap gap-2">
                        {extractedRecipe.metadata.hashtags.slice(0, 6).map((hashtag: string) => (
                          <Badge key={hashtag} variant="outline" className="text-xs">
                            #{hashtag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Engagement metrics */}
                  {extractedRecipe.metadata?.engagement && (
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      {extractedRecipe.metadata.engagement.likes && (
                        <div className="text-center">
                          <p>❤️ {extractedRecipe.metadata.engagement.likes}</p>
                          <p className="text-[10px]">likes</p>
                        </div>
                      )}
                      {extractedRecipe.metadata.engagement.views && (
                        <div className="text-center">
                          <p>👀 {extractedRecipe.metadata.engagement.views}</p>
                          <p className="text-[10px]">vues</p>
                        </div>
                      )}
                      {extractedRecipe.metadata.engagement.comments && (
                        <div className="text-center">
                          <p>💬 {extractedRecipe.metadata.engagement.comments}</p>
                          <p className="text-[10px]">commentaires</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

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

      {/* Enhanced Tips */}
      {!extractedRecipe && !error && (
        <div className="space-y-3">
          <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <div className="space-y-2">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                💡 <strong>Astuce {parsingMode === 'enhanced' ? 'Enhanced V2' : 'Basic'} :</strong>
              </p>
              {parsingMode === 'enhanced' ? (
                <ul className="text-sm text-blue-900 dark:text-blue-100 list-disc list-inside space-y-1">
                  <li>Mode Enhanced utilise GPT-4 pour une meilleure extraction (85% moins cher)</li>
                  <li>Cache intelligent : les résultats sont mis en cache pour plus de rapidité</li>
                  <li>Métadonnées enrichies : hashtags, engagement et informations d'auteur</li>
                  <li>Fallback automatique vers le mode Basic en cas d'échec</li>
                </ul>
              ) : (
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  Pour de meilleurs résultats, utilisez des posts qui contiennent la recette complète 
                  dans la description ou les commentaires.
                </p>
              )}
            </div>
          </Card>

          {parsingMode === 'enhanced' && (
            <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
              <div className="flex items-center gap-2 text-sm text-green-900 dark:text-green-100">
                <span className="text-lg">✨</span>
                <div>
                  <p><strong>Enhanced V2 activé :</strong></p>
                  <p className="text-xs opacity-90">
                    Extraction optimisée • Cache intelligent • Métadonnées enrichies • Économies de coût
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to get auth token
async function getAuthToken(): Promise<string> {
  // This would get the actual auth token from your auth system
  return 'mock-token';
}

// Helper function to save to history
function saveToHistory(result: any) {
  try {
    const history = JSON.parse(localStorage.getItem('social-media-history') || '[]');
    history.unshift({
      ...result,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 20 items
    const trimmed = history.slice(0, 20);
    localStorage.setItem('social-media-history', JSON.stringify(trimmed));
  } catch (error) {
    console.error('Error saving to history:', error);
  }
}