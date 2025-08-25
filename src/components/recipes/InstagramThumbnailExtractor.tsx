import React, { useState } from 'react';
import { 
  Instagram, 
  Loader2, 
  Image as ImageIcon,
  Camera,
  AlertCircle,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface InstagramThumbnailExtractorProps {
  url: string;
  onThumbnailExtracted: (thumbnailUrl: string) => void;
}

export const InstagramThumbnailExtractor: React.FC<InstagramThumbnailExtractorProps> = ({
  url,
  onThumbnailExtracted
}) => {
  const [loading, setLoading] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<'instaloader' | 'screenshot'>('instaloader');

  const extractWithInstaloader = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Extraction avec Instaloader...');
      
      const response = await fetch('/api/social/instagram-thumbnail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });

      const data = await response.json();
      console.log('📦 Réponse Instaloader:', data);

      if (data.success && data.thumbnail_url) {
        setThumbnailUrl(data.thumbnail_url);
        onThumbnailExtracted(data.thumbnail_url);
      } else {
        throw new Error(data.error || 'Aucune vignette trouvée');
      }
    } catch (error) {
      console.error('❌ Erreur Instaloader:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors de l\'extraction');
    } finally {
      setLoading(false);
    }
  };

  const takeScreenshot = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📸 Prise de screenshot...');
      
      const response = await fetch('/api/social/instagram-screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });

      const data = await response.json();
      console.log('📦 Réponse Screenshot:', data);

      if (data.success && data.screenshot_url) {
        setThumbnailUrl(data.screenshot_url);
        onThumbnailExtracted(data.screenshot_url);
      } else {
        throw new Error(data.error || 'Échec de la capture d\'écran');
      }
    } catch (error) {
      console.error('❌ Erreur Screenshot:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors de la capture');
    } finally {
      setLoading(false);
    }
  };

  const handleExtraction = () => {
    if (method === 'instaloader') {
      extractWithInstaloader();
    } else {
      takeScreenshot();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Instagram className="w-5 h-5 text-pink-500" />
          Extraction de vignette Instagram
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Tabs value={method} onValueChange={(v) => setMethod(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="instaloader">
              <ImageIcon className="w-4 h-4 mr-2" />
              Via Instaloader
            </TabsTrigger>
            <TabsTrigger value="screenshot">
              <Camera className="w-4 h-4 mr-2" />
              Screenshot
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="instaloader" className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Utilise Instaloader pour récupérer la vignette officielle du post
            </p>
          </TabsContent>
          
          <TabsContent value="screenshot" className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Prend une capture d'écran du post Instagram (nécessite Playwright)
            </p>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Assurez-vous que Playwright est installé : 
                <code className="ml-1 bg-muted px-1 rounded">pip install playwright && playwright install chromium</code>
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        <Button 
          onClick={handleExtraction}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Extraction en cours...
            </>
          ) : (
            <>
              {method === 'instaloader' ? <ImageIcon className="w-4 h-4 mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
              Extraire la vignette
            </>
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {thumbnailUrl && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Check className="w-4 h-4" />
              Vignette extraite avec succès !
            </div>
            <img 
              src={thumbnailUrl} 
              alt="Instagram thumbnail" 
              className="w-full rounded-lg shadow-md"
              onError={(e) => {
                console.error('Erreur chargement image:', e);
                setError('Impossible de charger l\'image');
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};