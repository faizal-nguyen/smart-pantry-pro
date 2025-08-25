import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Youtube, 
  Play,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function YouTubeRecipeTestSimple() {
  const [videoUrl, setVideoUrl] = useState('');
  const [language, setLanguage] = useState<string>('auto');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const supportedLanguages = [
    { code: 'auto', name: '🌐 Auto-detect', api: 'auto' },
    { code: 'en', name: '🇬🇧 English', api: 'deepgram' },
    { code: 'fr', name: '🇫🇷 Français', api: 'deepgram' },
    { code: 'hi', name: '🇮🇳 हिन्दी', api: 'deepgram' },
    { code: 'ta', name: '🇮🇳 தமிழ்', api: 'whisper' }
  ];

  const handleExtract = async () => {
    if (!videoUrl) {
      setError('Please enter a YouTube URL');
      return;
    }

    if (!videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be')) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Simuler l'extraction pour tester l'interface
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setResult({
        title: 'Test Recipe from YouTube',
        description: 'This is a test recipe to verify the interface works',
        ingredients: [
          { name: 'Test ingredient 1', amount: '2', unit: 'cups' },
          { name: 'Test ingredient 2', amount: '1', unit: 'tbsp' }
        ],
        instructions: [
          { step: 1, description: 'Test step 1' },
          { step: 2, description: 'Test step 2' }
        ]
      });

    } catch (err: any) {
      console.error('Extraction error:', err);
      setError(err.message || 'Failed to extract recipe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="h-6 w-6 text-red-600" />
            YouTube Recipe Extractor - Test Interface
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
                  Testing Interface...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Test Extract Recipe
                </>
              )}
            </Button>

            {loading && (
              <div className="space-y-2">
                <Progress value={50} className="h-2" />
                <p className="text-sm text-center text-muted-foreground">
                  Testing interface functionality...
                </p>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <Card>
                <CardHeader>
                  <CardTitle>Test Result</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">{result.title}</h3>
                      <p className="text-sm text-muted-foreground">{result.description}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Ingredients ({result.ingredients.length})</h4>
                      <div className="space-y-1">
                        {result.ingredients.map((ingredient: any, index: number) => (
                          <div key={index} className="text-sm">
                            • {ingredient.amount} {ingredient.unit} {ingredient.name}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Instructions</h4>
                      <div className="space-y-2">
                        {result.instructions.map((instruction: any, index: number) => (
                          <div key={index} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                              {instruction.step}
                            </span>
                            <p className="text-sm">{instruction.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-blue-900 dark:text-blue-100">
              🧪 Interface Test Mode
            </p>
            <p className="text-blue-900 dark:text-blue-100">
              This is a simplified version to test the UI components. 
              The actual YouTube parsing functionality will be integrated once the interface is working.
            </p>
            <ul className="text-blue-900 dark:text-blue-100 list-disc list-inside space-y-1">
              <li><strong>Languages supported:</strong> French, English, Hindi (Deepgram) + Tamil (Whisper)</li>
              <li><strong>Features:</strong> Auto language detection, progress tracking, error handling</li>
              <li><strong>Next step:</strong> Integrate with YouTubeVideoParser service</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}