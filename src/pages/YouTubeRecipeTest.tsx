'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { YouTubeVideoParser } from '@/services/video/youtubeVideoParser';
import { VideoRecipe } from '@/services/video/fastVideoParser';
import { 
  Youtube, 
  Globe, 
  Clock, 
  ChefHat, 
  Play,
  AlertCircle,
  Loader2,
  Check,
  Copy,
  Download
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function YouTubeRecipeTest() {
  const [videoUrl, setVideoUrl] = useState('');
  const [language, setLanguage] = useState<string>('auto');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [recipe, setRecipe] = useState<VideoRecipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingSteps, setProcessingSteps] = useState<string[]>([]);

  const parser = new YouTubeVideoParser();
  const supportedLanguages = parser.getSupportedLanguages();

  const addProcessingStep = (step: string) => {
    setProcessingSteps(prev => [...prev, `${new Date().toLocaleTimeString()} - ${step}`]);
  };

  const handleExtract = async () => {
    if (!videoUrl) {
      setError('Please enter a YouTube URL');
      return;
    }

    if (!parser.isYouTubeUrl(videoUrl)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setLoading(true);
    setError(null);
    setRecipe(null);
    setProgress(0);
    setProcessingSteps([]);

    try {
      addProcessingStep('🚀 Starting YouTube recipe extraction...');
      
      const result = await parser.parseYouTubeRecipe(videoUrl, {
        language: language as any,
        autoDetectLanguage: language === 'auto',
        onProgress: (prog) => {
          setProgress(prog);
          
          // Ajouter des étapes de traitement basées sur la progression
          if (prog === 5) addProcessingStep('📊 Extracting YouTube metadata...');
          if (prog === 20) addProcessingStep('🎙️ Starting audio transcription...');
          if (prog === 70) addProcessingStep('✅ Transcription complete!');
          if (prog === 80) addProcessingStep('🤖 Analyzing with GPT-4...');
          if (prog === 95) addProcessingStep('🎯 Finalizing recipe...');
        },
        quality: 'high'
      });

      addProcessingStep('✨ Recipe extraction complete!');
      setRecipe(result);
      
      toast({
        title: "Success!",
        description: "YouTube recipe extracted successfully"
      });

    } catch (err: any) {
      console.error('Extraction error:', err);
      setError(err.message || 'Failed to extract recipe');
      addProcessingStep(`❌ Error: ${err.message}`);
      
      toast({
        title: "Error",
        description: err.message || "Failed to extract recipe",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Content copied to clipboard"
    });
  };

  const downloadAsJSON = () => {
    if (!recipe) return;
    
    const dataStr = JSON.stringify(recipe, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `recipe-${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="h-6 w-6 text-red-600" />
            YouTube Recipe Extractor - Test Page
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="url">YouTube Video URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedLanguages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <div className="flex items-center justify-between w-full">
                        <span>{lang.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({lang.api})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Deepgram: FR, EN, HI | Whisper: Tamil | Auto: Detect from metadata
              </p>
            </div>

            <Button 
              onClick={handleExtract} 
              disabled={loading || !videoUrl}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extracting Recipe...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Extract Recipe
                </>
              )}
            </Button>

            {loading && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-center text-muted-foreground">
                  {progress}% Complete
                </p>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Processing Steps */}
      {processingSteps.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">Processing Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 font-mono text-xs">
              {processingSteps.map((step, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Check className="h-3 w-3 text-green-600 mt-0.5" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recipe Results */}
      {recipe && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Extracted Recipe</span>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadAsJSON}
              >
                <Download className="h-4 w-4 mr-2" />
                Download JSON
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
                <TabsTrigger value="instructions">Instructions</TabsTrigger>
                <TabsTrigger value="raw">Raw Data</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Thumbnail */}
                {recipe.metadata.thumbnail && (
                  <div className="relative aspect-video w-full max-w-2xl mx-auto overflow-hidden rounded-lg">
                    <img 
                      src={recipe.metadata.thumbnail.url} 
                      alt={recipe.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="font-semibold mb-2">{recipe.title}</h3>
                    <p className="text-sm text-muted-foreground">{recipe.description}</p>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span>Language: {recipe.metadata.language || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Duration: {Math.floor(parseInt(recipe.metadata.duration) / 60)}min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ChefHat className="h-4 w-4" />
                      <span>Author: {recipe.metadata.author?.name || 'Unknown'}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Extraction: {recipe.metadata.extractionMethod} | 
                      Confidence: {(recipe.metadata.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ingredients" className="space-y-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Ingredients ({recipe.ingredients.length})</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(
                      recipe.ingredients.map(i => `${i.amount} ${i.unit || ''} ${i.name}`).join('\n')
                    )}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All
                  </Button>
                </div>
                {recipe.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                    <span>
                      {ingredient.amount} {ingredient.unit} {ingredient.name}
                    </span>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="instructions" className="space-y-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Instructions ({recipe.instructions.length} steps)</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(
                      recipe.instructions.map(i => `${i.step}. ${i.description}`).join('\n\n')
                    )}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All
                  </Button>
                </div>
                {recipe.instructions.map((instruction, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                        {instruction.step}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm">{instruction.description}</p>
                        {instruction.duration && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Duration: {instruction.duration}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="raw">
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(JSON.stringify(recipe, null, 2))}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-xs">
                    {JSON.stringify(recipe, null, 2)}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}