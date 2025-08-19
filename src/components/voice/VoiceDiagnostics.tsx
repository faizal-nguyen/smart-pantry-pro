import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { voiceService } from '@/services/voice/enhancedVoiceService';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Mic, 
  Globe,
  Smartphone,
  Shield
} from 'lucide-react';

export const VoiceDiagnostics: React.FC = () => {
  const [capabilities, setCapabilities] = useState<any>({});
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkCapabilities();
  }, []);

  const checkCapabilities = async () => {
    setIsChecking(true);
    
    try {
      const caps = await voiceService.getCapabilities();
      setCapabilities(caps);
      
      // Check microphone permission
      if (caps.hasPermission) {
        const permission = await caps.hasPermission;
        setPermissionStatus(permission.state);
      }
      
      // Additional browser checks
      const additionalChecks = {
        https: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
        webAudioAPI: 'AudioContext' in window || 'webkitAudioContext' in window,
        getUserMedia: navigator.mediaDevices && navigator.mediaDevices.getUserMedia,
        speechSynthesis: 'speechSynthesis' in window
      };
      
      setCapabilities({ ...caps, ...additionalChecks });
    } catch (error) {
      console.error('Error checking capabilities:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const requestPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await checkCapabilities();
    } catch (error) {
      console.error('Permission denied:', error);
    }
  };

  const getStatusIcon = (isSupported: boolean) => {
    return isSupported ? (
      <CheckCircle2 className="w-5 h-5 text-success" />
    ) : (
      <XCircle className="w-5 h-5 text-destructive" />
    );
  };

  const getBrowserRecommendation = () => {
    const browser = capabilities.browser;
    const recommendations: Record<string, string> = {
      chrome: "Chrome offre le meilleur support pour la reconnaissance vocale",
      edge: "Edge offre un excellent support pour la reconnaissance vocale",
      safari: "Safari supporte la reconnaissance vocale sur iOS et macOS",
      firefox: "Firefox a un support limité, préférez Chrome ou Edge",
      unknown: "Navigateur non reconnu, utilisez Chrome ou Edge pour de meilleurs résultats"
    };
    
    return recommendations[browser] || recommendations.unknown;
  };

  if (isChecking) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Diagnostic Vocal
          </CardTitle>
          <CardDescription>
            Vérification des capacités de reconnaissance vocale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Support Status */}
          <Alert variant={capabilities.isSupported ? "default" : "destructive"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {capabilities.isSupported 
                ? "Reconnaissance vocale supportée" 
                : "Reconnaissance vocale non supportée"}
            </AlertTitle>
            <AlertDescription>
              {capabilities.isSupported
                ? "Votre navigateur supporte la reconnaissance vocale"
                : "Votre navigateur ne supporte pas la reconnaissance vocale. Essayez Chrome, Edge ou Safari."}
            </AlertDescription>
          </Alert>

          {/* Capabilities Check */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Capacités du navigateur</h4>
            
            <div className="grid gap-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">API Speech Recognition</span>
                </div>
                {getStatusIcon(capabilities.isSupported)}
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">HTTPS / Localhost</span>
                </div>
                {getStatusIcon(capabilities.https)}
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">getUserMedia API</span>
                </div>
                {getStatusIcon(capabilities.getUserMedia)}
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Navigateur</span>
                </div>
                <Badge variant="outline">{capabilities.browser}</Badge>
              </div>
            </div>
          </div>

          {/* Permission Status */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Permissions</h4>
            
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                <span className="text-sm">Permission microphone</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={
                    permissionStatus === 'granted' ? 'default' : 
                    permissionStatus === 'denied' ? 'destructive' : 
                    'secondary'
                  }
                >
                  {permissionStatus === 'granted' ? 'Accordée' :
                   permissionStatus === 'denied' ? 'Refusée' :
                   permissionStatus === 'prompt' ? 'Non demandée' :
                   'Inconnue'}
                </Badge>
                {permissionStatus !== 'granted' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={requestPermission}
                  >
                    Demander
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Browser Recommendation */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Recommandation</AlertTitle>
            <AlertDescription>
              {getBrowserRecommendation()}
            </AlertDescription>
          </Alert>

          {/* Language Support */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Configuration</h4>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <span className="text-sm">Langue configurée</span>
              <Badge>{capabilities.language || 'fr-FR'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Conseils d'utilisation</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Parlez clairement et à un rythme normal</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Utilisez des phrases simples comme "Ajoute 2 kg de tomates"</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Évitez le bruit de fond pour de meilleurs résultats</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Attendez le signal avant de parler</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};