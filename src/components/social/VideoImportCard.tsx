/**
 * Video Import Card Component
 * Alternative parsing method using video analysis
 */

import React, { useState } from 'react';
import { Video, Youtube, Instagram, Music, Upload, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useVideoRecipeParser } from '@/hooks/useVideoRecipeParser';
import { Recipe } from '@/types/recipe';
import { VideoAnalysisOptions } from '@/services/socialMediaParser/videoRecipeParser';

interface VideoImportCardProps {
  onImport?: (recipe: Recipe) => void;
  className?: string;
}

interface Platform {
  name: string;
  icon: React.ReactNode;
  regex: RegExp;
  color: string;
  bgGradient: string;
}

const platforms: Platform[] = [
  {
    name: 'YouTube',
    icon: <Youtube className="w-5 h-5" />,
    regex: /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/,
    color: 'text-red-500',
    bgGradient: 'from-red-500 to-red-600'
  },
  {
    name: 'Instagram',
    icon: <Instagram className="w-5 h-5" />,
    regex: /instagram\.com\/(p|reel|tv)\//,
    color: 'text-pink-500',
    bgGradient: 'from-pink-500 to-purple-600'
  },
  {
    name: 'TikTok',
    icon: <Music className="w-5 h-5" />,
    regex: /tiktok\.com\/@[\w.-]+\/video\/\d+/,
    color: 'text-black',
    bgGradient: 'from-black to-gray-800'
  }
];

export function VideoImportCard({ onImport, className }: VideoImportCardProps) {
  const [url, setUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [options, setOptions] = useState<VideoAnalysisOptions>({
    extractFrames: true,
    transcribeAudio: true,
    useOCR: true,
    frameInterval: 5
  });

  const { isLoading, error, progress, parseVideoUrl, parseVideoFile, resetError } = useVideoRecipeParser();

  const detectPlatform = (inputUrl: string): Platform | null => {
    return platforms.find(p => p.regex.test(inputUrl)) || null;
  };

  const handleUrlImport = async () => {
    if (!url.trim()) return;

    console.log('VideoImportCard: Starting URL import for:', url);
    const result = await parseVideoUrl(url, options);
    console.log('VideoImportCard: Parse result:', result);
    
    if (result.success && result.recipe && onImport) {
      console.log('VideoImportCard: Import successful, calling onImport');
      onImport(result.recipe);
      setUrl('');
      // Progress will be reset by the hook
    } else {
      console.log('VideoImportCard: Import failed or no recipe', result);
      // Progress already reset by the hook on error
    }
  };

  const handleFileImport = async () => {
    if (!selectedFile) return;

    const result = await parseVideoFile(selectedFile, options);
    
    if (result.success && result.recipe && onImport) {
      onImport(result.recipe);
      setSelectedFile(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      resetError();
    }
  };

  const detectedPlatform = url ? detectPlatform(url) : null;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-gradient-to-r from-purple-500 to-blue-600 text-white">
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          Import Vidéo Intelligent
        </CardTitle>
        <CardDescription className="text-purple-100">
          Extraction avancée avec analyse vidéo et transcription
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6">
        <Tabs defaultValue="url" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url">URL Vidéo</TabsTrigger>
            <TabsTrigger value="file">Fichier Local</TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4">
            {/* URL Input */}
            <div className="space-y-2">
              <Label>URL de la vidéo</Label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isLoading}
                  className={cn(
                    "flex-1 transition-all",
                    detectedPlatform && "border-green-500"
                  )}
                />
                <Button
                  onClick={handleUrlImport}
                  disabled={isLoading || !url || !detectedPlatform}
                  className={cn(
                    "min-w-[120px]",
                    detectedPlatform && `bg-gradient-to-r ${detectedPlatform.bgGradient}`
                  )}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analyse...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {detectedPlatform?.icon || <Sparkles className="w-4 h-4" />}
                      Analyser
                    </span>
                  )}
                </Button>
              </div>

              {/* Platform badges */}
              <div className="flex gap-2 mt-2">
                {platforms.map((platform) => (
                  <div
                    key={platform.name}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all",
                      detectedPlatform?.name === platform.name
                        ? "bg-gray-100 dark:bg-gray-800 scale-110"
                        : "opacity-50"
                    )}
                  >
                    <span className={platform.color}>{platform.icon}</span>
                    <span>{platform.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="file" className="space-y-4">
            {/* File Upload */}
            <div className="space-y-2">
              <Label>Fichier vidéo</Label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="video-upload"
                  disabled={isLoading}
                />
                <label
                  htmlFor="video-upload"
                  className="cursor-pointer space-y-2"
                >
                  <Upload className="w-12 h-12 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedFile ? (
                      <span className="font-medium">{selectedFile.name}</span>
                    ) : (
                      "Cliquez pour sélectionner une vidéo"
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    MP4, MOV, AVI, WebM (max 100MB)
                  </p>
                </label>
              </div>

              {selectedFile && (
                <Button
                  onClick={handleFileImport}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Analyse en cours..." : "Analyser la vidéo"}
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Analysis Options */}
        <div className="mt-6 space-y-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h4 className="text-sm font-medium">Options d'analyse</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="extract-frames" className="text-sm cursor-pointer">
                Extraire les frames
              </Label>
              <Switch
                id="extract-frames"
                checked={options.extractFrames}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, extractFrames: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="transcribe-audio" className="text-sm cursor-pointer">
                Transcrire l'audio
              </Label>
              <Switch
                id="transcribe-audio"
                checked={options.transcribeAudio}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, transcribeAudio: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="use-ocr" className="text-sm cursor-pointer">
                OCR sur les frames
              </Label>
              <Switch
                id="use-ocr"
                checked={options.useOCR}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, useOCR: checked }))
                }
              />
            </div>
          </div>
        </div>

        {/* Progress */}
        {isLoading && progress > 0 && (
          <div className="mt-4 space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Analyse en cours... {progress}%
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Info */}
        <Alert className="mt-4">
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            Cette méthode utilise l'analyse vidéo avancée avec extraction de frames, 
            OCR et transcription audio pour une meilleure précision.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}