import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { scannerService } from '@/services/scanning/enhancedScannerService';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Camera,
  Smartphone,
  Shield,
  Scan,
  Globe
} from 'lucide-react';

export const ScannerDiagnostics: React.FC = () => {
  const [capabilities, setCapabilities] = useState<any>({});
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [isChecking, setIsChecking] = useState(true);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    checkCapabilities();
  }, []);

  const checkCapabilities = async () => {
    setIsChecking(true);
    
    try {
      const caps = await scannerService.getCapabilities();
      setCapabilities(caps);
      
      // Check camera permission
      if (caps.permissions) {
        setPermissionStatus(caps.permissions);
      }
      
      // Additional browser checks
      const additionalChecks = {
        https: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
        mediaDevices: 'mediaDevices' in navigator,
        getUserMedia: navigator.mediaDevices && 'getUserMedia' in navigator.mediaDevices,
        permissions: 'permissions' in navigator
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
      await navigator.mediaDevices.getUserMedia({ video: true });
      await checkCapabilities();
    } catch (error) {
      console.error('Permission denied:', error);
    }
  };

  const testScanner = async () => {
    try {
      setTestResult({ testing: true });
      
      // Test camera initialization
      const video = await scannerService.initializeCamera();
      
      setTestResult({
        success: true,
        message: 'Scanner initialisé avec succès'
      });
      
      // Clean up
      setTimeout(() => {
        scannerService.stopScanning();
      }, 3000);
      
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Erreur lors du test'
      });
    }
  };

  const getStatusIcon = (isSupported: boolean) => {
    return isSupported ? (
      <CheckCircle2 className="w-5 h-5 text-success" />
    ) : (
      <XCircle className="w-5 h-5 text-destructive" />
    );
  };

  const getCameraRecommendation = () => {
    if (!capabilities.hasCamera) {
      return "Aucune caméra détectée. Vérifiez que votre appareil dispose d'une caméra.";
    }
    
    if (capabilities.hasMultipleCameras) {
      return "Plusieurs caméras détectées. Le scanner utilisera la caméra arrière par défaut.";
    }
    
    return "Une caméra détectée. Le scanner est prêt à l'emploi.";
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
            <Scan className="w-5 h-5" />
            Diagnostic Scanner
          </CardTitle>
          <CardDescription>
            Vérification des capacités de scan de codes-barres
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Support Status */}
          <Alert variant={capabilities.hasCamera ? "default" : "destructive"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {capabilities.hasCamera 
                ? "Scanner supporté" 
                : "Scanner non supporté"}
            </AlertTitle>
            <AlertDescription>
              {getCameraRecommendation()}
            </AlertDescription>
          </Alert>

          {/* Capabilities Check */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Capacités du navigateur</h4>
            
            <div className="grid gap-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Caméra disponible</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(capabilities.hasCamera)}
                  {capabilities.cameraCount > 0 && (
                    <Badge variant="outline">{capabilities.cameraCount}</Badge>
                  )}
                </div>
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
                  <span className="text-sm">API MediaDevices</span>
                </div>
                {getStatusIcon(capabilities.mediaDevices && capabilities.getUserMedia)}
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">API Permissions</span>
                </div>
                {getStatusIcon(capabilities.permissions)}
              </div>
            </div>
          </div>

          {/* Permission Status */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Permissions</h4>
            
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                <span className="text-sm">Permission caméra</span>
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

          {/* Supported Formats */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Formats supportés</h4>
            <div className="flex flex-wrap gap-2">
              {capabilities.supportedFormats?.map((format: string) => (
                <Badge key={format} variant="secondary">{format}</Badge>
              ))}
            </div>
          </div>

          {/* Test Scanner */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Test du scanner</h4>
            
            <div className="space-y-2">
              <Button 
                onClick={testScanner}
                disabled={!capabilities.hasCamera || testResult?.testing}
                className="w-full"
              >
                {testResult?.testing ? 'Test en cours...' : 'Tester le scanner'}
              </Button>
              
              {testResult && !testResult.testing && (
                <Alert variant={testResult.success ? "default" : "destructive"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {testResult.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Conseils pour le scan</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Utilisez un bon éclairage pour de meilleurs résultats</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Tenez l'appareil stable pendant le scan</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Centrez le code-barres dans le cadre</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Évitez les reflets sur les emballages brillants</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>La distance idéale est de 15-20 cm</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};