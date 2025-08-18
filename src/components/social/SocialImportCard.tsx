'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Share2, Download, CheckCircle2, Loader2, 
  Instagram, Youtube, Link, ExternalLink,
  ChefHat, Clock, Users, TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useSocialRecipeParser } from '@/hooks/useSocialRecipeParser';
import { useNavigate } from 'react-router-dom';

interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  regex: RegExp;
}

interface ImportedRecipe {
  title: string;
  author: string;
  platform: string;
  ingredients: string[];
  instructions: string[];
  prepTime?: string;
  servings?: number;
  imageUrl?: string;
  tags?: string[];
}

interface SocialImportCardProps {
  className?: string;
  onImport?: (recipe: ImportedRecipe) => void;
  variant?: 'default' | 'compact' | 'full';
}

export const SocialImportCard: React.FC<SocialImportCardProps> = ({
  className,
  onImport,
  variant = 'default'
}) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportedRecipe | null>(null);
  const [activeTab, setActiveTab] = useState('url');
  const [recentImports, setRecentImports] = useState<ImportedRecipe[]>([]);
  const [manualText, setManualText] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const { parseRecipeFromSocial } = useSocialRecipeParser();
  const navigate = useNavigate();

  // Plateformes supportées avec patterns Cipher
  const platforms: Platform[] = [
    {
      id: 'instagram',
      name: 'Instagram',
      icon: <Instagram className="h-5 w-5" />,
      color: 'text-pink-500',
      gradient: 'from-purple-500 to-pink-500',
      regex: /instagram\.com\/(p|reel)\//i
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.43 6.43 0 0 0-6.12 4.39 6.44 6.44 0 0 0 5.44 8.31 6.49 6.49 0 0 0 7-5.92V8.83a8.33 8.33 0 0 0 4.92 1.6V6.96a4.85 4.85 0 0 1-2.01-.27z"/>
        </svg>
      ),
      color: 'text-black',
      gradient: 'from-black to-gray-800',
      regex: /tiktok\.com\/@[\w.-]+\/video\//i
    },
    {
      id: 'youtube',
      name: 'YouTube',
      icon: <Youtube className="h-5 w-5" />,
      color: 'text-red-500',
      gradient: 'from-red-500 to-red-600',
      regex: /youtube\.com\/watch\?v=|youtu\.be\//i
    }
  ];

  // Détection automatique de la plateforme
  const detectPlatform = (inputUrl: string): Platform | null => {
    return platforms.find(p => p.regex.test(inputUrl)) || null;
  };

  // Import réel avec le parser
  const handleImport = async () => {
    // Check if we have either URL or manual text
    if (!url.trim() && !manualText.trim()) {
      toast.error('Veuillez entrer une URL ou coller le texte de la recette');
      return;
    }

    let platform: Platform | null = null;
    let textToProcess = manualText;
    
    if (url.trim() && !showManualInput) {
      platform = detectPlatform(url);
      if (!platform) {
        toast.error('Plateforme non supportée', {
          description: 'Essayez Instagram, TikTok ou YouTube'
        });
        return;
      }
    } else if (showManualInput && manualText.trim()) {
      // For manual text, we'll create a pseudo-platform
      platform = {
        id: 'manual',
        name: 'Texte manuel',
        icon: <Link className="h-5 w-5" />,
        color: 'text-gray-500',
        gradient: 'from-gray-500 to-gray-600',
        regex: /manual/i
      };
    }

    setIsLoading(true);
    setProgress(0);

    try {
      // Simulation de progression
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 20, 90));
      }, 500);

      toast.loading('Import en cours...', { id: 'import-progress' });

      // Appel du parser réel
      console.log("🔄 Appel du parser avec URL:", url);
      const parsingResult = await parseRecipeFromSocial(
        showManualInput ? '' : url,
        showManualInput ? manualText : undefined
      );
      
      console.log("📊 Résultat du parsing:", parsingResult);
      
      clearInterval(progressInterval);
      setProgress(100);

      if (parsingResult.success && parsingResult.data) {
        const recipe = parsingResult.data;
        const importedRecipe: ImportedRecipe = {
          title: recipe.title || 'Recette sans titre',
          author: parsingResult.author || 'Auteur inconnu',
          platform: platform.name,
          ingredients: recipe.ingredients || [],
          instructions: recipe.instructions || [],
          prepTime: recipe.prepTime,
          servings: recipe.servings,
          imageUrl: recipe.imageUrl,
          tags: recipe.tags
        };

        console.log("✅ Recette formatée:", importedRecipe);
        
        setResult(importedRecipe);
        setRecentImports([importedRecipe, ...recentImports.slice(0, 2)]);
        toast.dismiss('import-progress');
        toast.success('Recette importée avec succès !');

        if (onImport) {
          console.log("🚀 Appel de onImport avec la recette");
          onImport(importedRecipe);
        } else {
          console.warn("⚠️ Pas de fonction onImport définie");
        }
      } else {
        throw new Error(parsingResult.error || 'Impossible d\'extraire la recette');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.dismiss('import-progress');
      toast.error('Erreur lors de l\'import', {
        description: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  // Animation des cartes
  const cardAnimation = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  // Rendu compact
  if (variant === 'compact') {
    return (
      <Card className={cn("p-4", className)}>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {platforms.map((platform) => (
              <div
                key={platform.id}
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center",
                  "bg-gradient-to-r",
                  platform.gradient,
                  "ring-2 ring-background"
                )}
              >
                <div className="text-white scale-75">{platform.icon}</div>
              </div>
            ))}
          </div>
          
          <Input
            placeholder="Coller l'URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPaste={(e) => {
              const pastedUrl = e.clipboardData.getData('text');
              if (detectPlatform(pastedUrl)) {
                handleImport();
              }
            }}
            className="flex-1"
          />
          
          <Button
            onClick={handleImport}
            disabled={isLoading}
            size="sm"
            className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        </div>
      </Card>
    );
  }

  // Rendu par défaut ou complet
  return (
    <motion.div
      {...cardAnimation}
      className={cn("", className)}
    >
      <Card className={cn(
        "overflow-hidden",
        "border-gradient bg-gradient-to-br from-background via-background to-muted/20"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500">
                <Share2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Import Social</CardTitle>
                <CardDescription>
                  Importez des recettes depuis vos réseaux
                </CardDescription>
              </div>
            </div>
            
            {recentImports.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                {recentImports.length} récents
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url">Importer</TabsTrigger>
              <TabsTrigger value="recent">Récents</TabsTrigger>
            </TabsList>
            
            <TabsContent value="url" className="space-y-4">
              {/* Plateformes supportées */}
              <div className="grid grid-cols-3 gap-2">
                {platforms.map((platform) => (
                  <motion.button
                    key={platform.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toast.info(`Collez une URL ${platform.name}`)}
                    className={cn(
                      "relative overflow-hidden rounded-xl p-4",
                      "bg-gradient-to-r",
                      platform.gradient,
                      "text-white shadow-lg hover:shadow-xl",
                      "transition-all duration-300"
                    )}
                  >
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                    <div className="relative z-10 flex flex-col items-center gap-2">
                      <div className="scale-125">{platform.icon}</div>
                      <span className="text-xs font-medium">{platform.name}</span>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Input URL */}
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    placeholder="Collez l'URL de la recette ici..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onPaste={(e) => {
                      const pastedUrl = e.clipboardData.getData('text');
                      if (detectPlatform(pastedUrl)) {
                        setTimeout(handleImport, 100);
                      }
                    }}
                    className={cn(
                      "pr-10",
                      url && detectPlatform(url) && "border-green-500"
                    )}
                  />
                  
                  {url && detectPlatform(url) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </motion.div>
                  )}
                </div>
                
                {url && !detectPlatform(url) && (
                  <p className="text-xs text-muted-foreground">
                    Plateformes supportées: Instagram, TikTok, YouTube
                  </p>
                )}
              </div>

              {/* Toggle pour saisie manuelle */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  L'import automatique ne fonctionne pas ?
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManualInput(!showManualInput)}
                >
                  {showManualInput ? 'Masquer' : 'Saisie manuelle'}
                </Button>
              </div>

              {/* Option pour texte manuel */}
              {showManualInput && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Collez le texte de la recette ici
                  </label>
                  <Textarea
                    placeholder="Collez le texte complet de la recette (ingrédients, instructions, etc.)"
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    className="min-h-[150px]"
                  />
                </div>
              )}

              {/* Bouton d'import */}
              <Button
                onClick={handleImport}
                disabled={isLoading || (!url && !manualText) || (url && !detectPlatform(url) && !showManualInput)}
                className={cn(
                  "w-full",
                  "bg-gradient-to-r from-orange-500 to-red-500",
                  "hover:from-orange-600 hover:to-red-600",
                  "text-white border-0 shadow-lg"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Import en cours...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Importer la recette
                  </>
                )}
              </Button>

              {/* Progression */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2"
                >
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">
                    {progress}% - Extraction en cours...
                  </p>
                </motion.div>
              )}

              {/* Résultat */}
              <AnimatePresence>
                {result && !isLoading && (
                  <motion.div
                    {...cardAnimation}
                    className="p-4 bg-muted/50 rounded-lg space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{result.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Par {result.author} • {result.platform}
                        </p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{result.prepTime}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{result.servings} pers.</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ChefHat className="h-4 w-4 text-muted-foreground" />
                        <span>{result.ingredients.length} ingr.</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {result.tags?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <Button
                      className="w-full mt-3"
                      onClick={() => {
                        // TODO: Implement save to database
                        toast.success('Recette ajoutée à votre collection');
                        navigate('/recipes');
                      }}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Ajouter à mes recettes
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>
            
            <TabsContent value="recent" className="space-y-3">
              {recentImports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Share2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Aucun import récent</p>
                </div>
              ) : (
                recentImports.map((recipe, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h5 className="font-medium text-sm">{recipe.title}</h5>
                        <p className="text-xs text-muted-foreground">
                          {recipe.platform} • {recipe.author}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </motion.div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
};