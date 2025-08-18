import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  Video,
  Users,
  ChefHat,
  Timer
} from 'lucide-react';
import { useFastVideoRecipe, useVideoUrlValidation, VideoRecipe } from '../../hooks/useFastVideoRecipe';

interface FastVideoImportProps {
  onRecipeExtracted?: (recipe: VideoRecipe) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const FastVideoImport: React.FC<FastVideoImportProps> = ({
  onRecipeExtracted,
  onError,
  className = ''
}) => {
  const [videoUrl, setVideoUrl] = useState('');
  const { validateUrl } = useVideoUrlValidation();

  const {
    state,
    parseVideo,
    cancel,
    reset,
    isSupported,
    getSupportedPlatforms,
    getEstimatedTime
  } = useFastVideoRecipe({
    onSuccess: onRecipeExtracted,
    onError: onError
  });

  const urlValidation = validateUrl(videoUrl);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!urlValidation.isValid) {
      return;
    }

    await parseVideo(videoUrl, urlValidation.platform);
  }, [videoUrl, urlValidation, parseVideo]);

  const getStatusMessage = (status: typeof state.status): string => {
    const messages = {
      idle: 'Prêt à analyser votre vidéo',
      extracting: 'Extraction des métadonnées...',
      transcribing: 'Transcription audio avec Deepgram...',
      analyzing: 'Analyse des frames avec Cloudinary...',
      synthesizing: 'Synthèse avec GPT-4 Turbo...',
      completed: 'Recette extraite avec succès!',
      error: 'Erreur lors de l\'extraction'
    };
    return messages[status] || 'Traitement en cours...';
  };

  const getProgressColor = (progress: number): string => {
    if (progress < 30) return 'bg-blue-500';
    if (progress < 70) return 'bg-yellow-500';
    if (progress < 95) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const platformIcons = {
    youtube: '🔴',
    tiktok: '🎵',
    instagram: '📸',
    generic: '🎥'
  };

  const estimatedTime = urlValidation.platform ? getEstimatedTime(urlValidation.platform) : 30;

  return (
    <Card className={`w-full max-w-2xl mx-auto ${className}`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-500" />
          <CardTitle className="text-xl font-bold">Import Vidéo Ultra-Rapide</CardTitle>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            &lt; 45 sec
          </Badge>
        </div>
        <CardDescription>
          Extraction automatique de recettes depuis YouTube, TikTok, Instagram
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Form de saisie URL */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="video-url" className="text-sm font-medium">
              URL de la vidéo
            </label>
            <div className="relative">
              <Input
                id="video-url"
                type="url"
                placeholder="https://youtube.com/watch?v=... ou https://tiktok.com/..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                disabled={state.loading}
                className={`pl-10 ${!urlValidation.isValid && videoUrl ? 'border-red-300' : ''}`}
              />
              <Video className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            
            {/* Validation feedback */}
            {videoUrl && !urlValidation.isValid && (
              <p className="text-sm text-red-600">{urlValidation.error}</p>
            )}
            
            {urlValidation.isValid && urlValidation.platform && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {platformIcons[urlValidation.platform as keyof typeof platformIcons]} 
                  {urlValidation.platform.charAt(0).toUpperCase() + urlValidation.platform.slice(1)} 
                  détecté - Temps estimé: ~{estimatedTime}s
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={!urlValidation.isValid || state.loading}
              className="flex-1"
            >
              {state.loading ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Extraction en cours...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Extraire la recette
                </>
              )}
            </Button>
            
            {state.loading && (
              <Button
                type="button"
                variant="outline"
                onClick={cancel}
                className="px-4"
              >
                <Square className="w-4 h-4" />
              </Button>
            )}
          </div>
        </form>

        {/* Indicateur de progression */}
        {state.loading && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{getStatusMessage(state.status)}</span>
                <span className="text-gray-500">{state.progress}%</span>
              </div>
              <Progress value={state.progress} className="h-3" />
            </div>

            {/* Timeline de progression */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className={`text-center p-2 rounded ${state.progress > 20 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>
                <div className="font-medium">Extraction</div>
                <div className="text-xs opacity-75">0-20%</div>
              </div>
              <div className={`text-center p-2 rounded ${state.progress > 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100'}`}>
                <div className="font-medium">Transcription</div>
                <div className="text-xs opacity-75">20-40%</div>
              </div>
              <div className={`text-center p-2 rounded ${state.progress > 70 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100'}`}>
                <div className="font-medium">Analyse</div>
                <div className="text-xs opacity-75">40-70%</div>
              </div>
              <div className={`text-center p-2 rounded ${state.progress > 90 ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                <div className="font-medium">Synthèse</div>
                <div className="text-xs opacity-75">70-100%</div>
              </div>
            </div>

            {/* Temps de traitement */}
            {state.processingTime && (
              <div className="text-center text-sm text-gray-500">
                <Clock className="w-4 h-4 inline mr-1" />
                Temps de traitement: {(state.processingTime / 1000).toFixed(1)}s
              </div>
            )}
          </div>
        )}

        {/* Résultat */}
        {state.status === 'completed' && state.result && (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Recette extraite avec succès en {(state.processingTime! / 1000).toFixed(1)}s!
              </AlertDescription>
            </Alert>

            <Card className="bg-gray-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{state.result.title}</CardTitle>
                <CardDescription>{state.result.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Statistiques rapides */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold">{state.result.ingredients.length}</div>
                    <div className="text-xs text-gray-500">Ingrédients</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{state.result.instructions.length}</div>
                    <div className="text-xs text-gray-500">Étapes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      {Math.round(state.result.metadata.confidence * 100)}%
                    </div>
                    <div className="text-xs text-gray-500">Confiance</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      {state.result.nutritionalInfo?.cookingTime || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">Temps</div>
                  </div>
                </div>

                <Separator />

                {/* Aperçu des ingrédients */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <ChefHat className="w-4 h-4" />
                    Ingrédients ({state.result.ingredients.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {state.result.ingredients.slice(0, 6).map((ingredient, index) => (
                      <div key={index} className="text-sm bg-white p-2 rounded border">
                        <span className="font-medium">{ingredient.amount}</span>{' '}
                        {ingredient.unit} {ingredient.name}
                      </div>
                    ))}
                  </div>
                  {state.result.ingredients.length > 6 && (
                    <div className="text-sm text-gray-500 mt-2">
                      +{state.result.ingredients.length - 6} autres ingrédients
                    </div>
                  )}
                </div>

                {/* Métadonnées */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {state.result.metadata.platform}
                  </Badge>
                  <Badge variant="outline">
                    {state.result.metadata.extractionMethod === 'audio_transcription' ? 'Audio' : 'Visuel'}
                  </Badge>
                  {state.result.nutritionalInfo?.difficulty && (
                    <Badge variant="outline">
                      {state.result.nutritionalInfo.difficulty}
                    </Badge>
                  )}
                  {state.result.nutritionalInfo?.servings && (
                    <Badge variant="outline">
                      <Users className="w-3 h-3 mr-1" />
                      {state.result.nutritionalInfo.servings} portions
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Erreur */}
        {state.status === 'error' && state.error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              {state.error}
              <Button
                variant="link"
                size="sm"
                onClick={reset}
                className="ml-2 p-0 h-auto"
              >
                Réessayer
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Plateformes supportées */}
        {state.status === 'idle' && (
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">Plateformes supportées:</p>
            <div className="flex justify-center gap-4">
              {getSupportedPlatforms().map(platform => (
                <div key={platform} className="text-center">
                  <div className="text-2xl">
                    {platformIcons[platform as keyof typeof platformIcons]}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">
                    {platform}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};