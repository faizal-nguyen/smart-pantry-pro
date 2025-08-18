import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { FastVideoImport } from './FastVideoImport';
import { VideoRecipe } from '../../hooks/useFastVideoRecipe';
import { 
  BookOpen, 
  Clock, 
  Users, 
  ChefHat, 
  Zap, 
  Play,
  Copy,
  Download,
  Share2
} from 'lucide-react';

/**
 * Example component demonstrating how to integrate FastVideoImport
 * into your application with recipe management
 */
export const VideoImportExample: React.FC = () => {
  const [extractedRecipe, setExtractedRecipe] = useState<VideoRecipe | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<VideoRecipe[]>([]);

  const handleRecipeExtracted = (recipe: VideoRecipe) => {
    setExtractedRecipe(recipe);
    console.log('Recipe extracted:', recipe);
  };

  const handleError = (error: string) => {
    console.error('Video import error:', error);
    // You could show a toast notification here
  };

  const saveRecipe = () => {
    if (extractedRecipe) {
      setSavedRecipes(prev => [...prev, extractedRecipe]);
      // Here you would typically save to your database
      console.log('Recipe saved to collection');
    }
  };

  const copyToClipboard = (recipe: VideoRecipe) => {
    const text = formatRecipeAsText(recipe);
    navigator.clipboard.writeText(text);
    // Show success toast
  };

  const formatRecipeAsText = (recipe: VideoRecipe): string => {
    let text = `${recipe.title}\n\n${recipe.description}\n\n`;
    
    text += 'INGRÉDIENTS:\n';
    recipe.ingredients.forEach((ingredient, index) => {
      text += `${index + 1}. ${ingredient.amount} ${ingredient.unit || ''} ${ingredient.name}\n`;
    });
    
    text += '\nINSTRUCTIONS:\n';
    recipe.instructions.forEach((instruction) => {
      text += `${instruction.step}. ${instruction.description}`;
      if (instruction.duration) text += ` (${instruction.duration})`;
      text += '\n';
    });
    
    if (recipe.nutritionalInfo?.cookingTime) {
      text += `\nTemps de cuisson: ${recipe.nutritionalInfo.cookingTime}`;
    }
    
    return text;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Zap className="w-8 h-8 text-yellow-500" />
          Import Vidéo Ultra-Rapide
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Transformez instantanément vos vidéos de recettes YouTube, TikTok et Instagram 
          en recettes structurées avec notre IA avancée en moins de 45 secondes.
        </p>
      </div>

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="import">Import de Vidéo</TabsTrigger>
          <TabsTrigger value="result">Résultat</TabsTrigger>
          <TabsTrigger value="collection">Collection</TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          <FastVideoImport
            onRecipeExtracted={handleRecipeExtracted}
            onError={handleError}
          />
          
          {/* Examples */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">URLs d'exemple</CardTitle>
              <CardDescription>
                Testez avec ces URLs pour voir la magie opérer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">YouTube</h4>
                  <div className="text-sm bg-gray-100 p-2 rounded font-mono">
                    https://youtube.com/watch?v=recipe-id
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">TikTok</h4>
                  <div className="text-sm bg-gray-100 p-2 rounded font-mono">
                    https://tiktok.com/@chef/video/123456
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Instagram</h4>
                  <div className="text-sm bg-gray-100 p-2 rounded font-mono">
                    https://instagram.com/p/recipe-post/
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Instagram Reel</h4>
                  <div className="text-sm bg-gray-100 p-2 rounded font-mono">
                    https://instagram.com/reel/cooking-reel/
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Result Tab */}
        <TabsContent value="result">
          {extractedRecipe ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl">{extractedRecipe.title}</CardTitle>
                      <CardDescription className="mt-2">
                        {extractedRecipe.description}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveRecipe} size="sm">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Sauvegarder
                      </Button>
                      <Button onClick={() => copyToClipboard(extractedRecipe)} variant="outline" size="sm">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <ChefHat className="w-6 h-6 mx-auto text-blue-600 mb-2" />
                      <div className="font-bold text-lg">{extractedRecipe.ingredients.length}</div>
                      <div className="text-sm text-gray-600">Ingrédients</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <Play className="w-6 h-6 mx-auto text-green-600 mb-2" />
                      <div className="font-bold text-lg">{extractedRecipe.instructions.length}</div>
                      <div className="text-sm text-gray-600">Étapes</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <Clock className="w-6 h-6 mx-auto text-purple-600 mb-2" />
                      <div className="font-bold text-lg">
                        {extractedRecipe.nutritionalInfo?.cookingTime || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">Temps</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <Users className="w-6 h-6 mx-auto text-orange-600 mb-2" />
                      <div className="font-bold text-lg">
                        {extractedRecipe.nutritionalInfo?.servings || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">Portions</div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="capitalize">
                      {extractedRecipe.metadata.platform}
                    </Badge>
                    <Badge variant="outline">
                      Confiance: {Math.round(extractedRecipe.metadata.confidence * 100)}%
                    </Badge>
                    <Badge variant="outline">
                      {extractedRecipe.metadata.extractionMethod === 'audio_transcription' ? 'Audio' : 'Visuel'}
                    </Badge>
                    <Badge variant="outline">
                      {extractedRecipe.metadata.processingTime}ms
                    </Badge>
                    {extractedRecipe.nutritionalInfo?.difficulty && (
                      <Badge variant="outline" className="capitalize">
                        {extractedRecipe.nutritionalInfo.difficulty}
                      </Badge>
                    )}
                  </div>

                  {/* Ingredients */}
                  <div>
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <ChefHat className="w-5 h-5" />
                      Ingrédients
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {extractedRecipe.ingredients.map((ingredient, index) => (
                        <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm mr-3">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">
                              <span className="text-blue-600">{ingredient.amount}</span>{' '}
                              {ingredient.unit && <span className="text-gray-500">{ingredient.unit}</span>}{' '}
                              <span>{ingredient.name}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Instructions */}
                  <div>
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Play className="w-5 h-5" />
                      Instructions
                    </h3>
                    <div className="space-y-4">
                      {extractedRecipe.instructions.map((instruction) => (
                        <div key={instruction.step} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold flex-shrink-0">
                            {instruction.step}
                          </div>
                          <div className="flex-1">
                            <p className="text-gray-900">{instruction.description}</p>
                            {instruction.duration && (
                              <div className="mt-2 flex items-center text-sm text-gray-600">
                                <Clock className="w-4 h-4 mr-1" />
                                {instruction.duration}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🎥</div>
                <h3 className="text-lg font-medium text-gray-500 mb-2">
                  Aucune recette extraite
                </h3>
                <p className="text-gray-400">
                  Utilisez l'onglet "Import de Vidéo" pour extraire une recette d'une vidéo
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Collection Tab */}
        <TabsContent value="collection">
          <Card>
            <CardHeader>
              <CardTitle>Collection de Recettes ({savedRecipes.length})</CardTitle>
              <CardDescription>
                Vos recettes extraites automatiquement
              </CardDescription>
            </CardHeader>
            <CardContent>
              {savedRecipes.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedRecipes.map((recipe, index) => (
                    <Card key={index} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg line-clamp-2">
                          {recipe.title}
                        </CardTitle>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {recipe.metadata.platform}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {recipe.ingredients.length} ingrédients
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                          {recipe.description}
                        </p>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{recipe.instructions.length} étapes</span>
                          <span>{recipe.nutritionalInfo?.cookingTime || 'N/A'}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📚</div>
                  <h3 className="text-lg font-medium text-gray-500 mb-2">
                    Collection vide
                  </h3>
                  <p className="text-gray-400">
                    Sauvegardez vos recettes extraites pour les retrouver ici
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};