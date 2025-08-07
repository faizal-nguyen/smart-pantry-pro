import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Camera, 
  Package, 
  Link,
  ScanLine,
  ShieldCheck,
  Info,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CameraCapture } from '@/components/inventory/CameraCapture';
import { MultiProductScanner } from '@/components/vision/MultiProductScanner';
import { SocialMediaInput } from './SocialMediaInput';
import { PrivacyConsent } from './PrivacyConsent';
import { ScannerSettings } from './ScannerSettings';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';
import { toast } from 'sonner';

interface SmartScannerProps {
  onProductAdded?: (product: any) => void;
  defaultMode?: 'single' | 'multi' | 'social';
}

export function SmartScanner({ 
  onProductAdded,
  defaultMode = 'single' 
}: SmartScannerProps) {
  const [activeMode, setActiveMode] = useState(defaultMode);
  const [showSettings, setShowSettings] = useState(false);
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);
  
  const { 
    hasConsent,
    settings,
    requestConsent,
    updateSettings,
    isLoading: privacyLoading
  } = usePrivacySettings();

  // Check privacy consent on mount
  useEffect(() => {
    if (!privacyLoading && !hasConsent) {
      requestConsent();
    }
  }, [privacyLoading, hasConsent, requestConsent]);

  // Handle product addition with privacy checks
  const handleProductAdded = (product: any) => {
    if (!hasConsent) {
      toast.error('Veuillez accepter les conditions d\'utilisation');
      requestConsent();
      return;
    }

    // Log anonymized usage if analytics enabled
    if (settings.allowAnalytics) {
      logAnonymizedUsage(activeMode);
    }

    if (onProductAdded) {
      onProductAdded(product);
    }
  };

  // Privacy indicator
  const PrivacyIndicator = () => (
    <div className="flex items-center gap-2 text-sm">
      <ShieldCheck className="h-4 w-4 text-green-600" />
      <span className="text-muted-foreground">
        {settings.saveHistory ? 'Historique activé' : 'Mode privé'}
      </span>
      {!settings.saveHistory && <EyeOff className="h-4 w-4" />}
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header with privacy status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Smart Scanner</h1>
          <p className="text-muted-foreground">
            Ajoutez rapidement des produits à votre inventaire
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <PrivacyIndicator />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Privacy notice for first-time users */}
      {!privacyLoading && !hasConsent && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            <strong>Protection de vos données</strong><br />
            Smart Scanner respecte votre vie privée. Les images sont traitées localement 
            et ne sont jamais stockées sans votre consentement.
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowPrivacyInfo(true)}
              className="ml-2 text-blue-700"
            >
              En savoir plus
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main scanner interface */}
      <Card className="p-6">
        <Tabs value={activeMode} onValueChange={(v: any) => setActiveMode(v)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="single" className="gap-2">
              <Camera className="h-4 w-4" />
              Produit unique
            </TabsTrigger>
            <TabsTrigger value="multi" className="gap-2">
              <Package className="h-4 w-4" />
              Multi-produits
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-2">
              <Link className="h-4 w-4" />
              Réseaux sociaux
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <AnimatePresence mode="wait">
              <TabsContent value="single" className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <SingleProductScanner
                    onProductAdded={handleProductAdded}
                    settings={settings}
                  />
                </motion.div>
              </TabsContent>

              <TabsContent value="multi" className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <MultiProductScanner />
                </motion.div>
              </TabsContent>

              <TabsContent value="social" className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <SocialMediaInput
                    onRecipeExtracted={handleProductAdded}
                    settings={settings}
                  />
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </div>
        </Tabs>
      </Card>

      {/* Features info */}
      <div className="grid md:grid-cols-3 gap-4">
        <FeatureCard
          icon={<ScanLine className="h-6 w-6" />}
          title="Scan intelligent"
          description="Reconnaissance automatique des produits et codes-barres"
        />
        <FeatureCard
          icon={<ShieldCheck className="h-6 w-6" />}
          title="Respect de la vie privée"
          description="Vos images ne sont jamais stockées sans consentement"
        />
        <FeatureCard
          icon={<Eye className="h-6 w-6" />}
          title="Détection avancée"
          description="Dates de péremption et fraîcheur analysées automatiquement"
        />
      </div>

      {/* Privacy consent modal */}
      <PrivacyConsent
        isOpen={!hasConsent && !privacyLoading}
        onAccept={(accepted) => {
          if (accepted) {
            toast.success('Paramètres de confidentialité sauvegardés');
          }
        }}
      />

      {/* Settings modal */}
      <ScannerSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdate={updateSettings}
      />

      {/* Privacy info modal */}
      <AnimatePresence>
        {showPrivacyInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowPrivacyInfo(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-background rounded-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-4">
                Protection de vos données
              </h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Traitement local</p>
                    <p className="text-muted-foreground">
                      Les images sont analysées directement sur votre appareil
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <EyeOff className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Pas de stockage automatique</p>
                    <p className="text-muted-foreground">
                      Les photos ne sont jamais sauvegardées sans votre permission
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Métadonnées supprimées</p>
                    <p className="text-muted-foreground">
                      Les données EXIF sont automatiquement effacées
                    </p>
                  </div>
                </div>
              </div>

              <Button
                className="w-full mt-6"
                onClick={() => setShowPrivacyInfo(false)}
              >
                Compris
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Single product scanner component
function SingleProductScanner({ 
  onProductAdded, 
  settings 
}: { 
  onProductAdded: (product: any) => void;
  settings: any;
}) {
  const [showCamera, setShowCamera] = useState(false);
  const [lastScanned, setLastScanned] = useState<any>(null);

  const handleCapture = async (blob: Blob) => {
    // Process with privacy settings in mind
    const product = await processImage(blob, settings);
    
    if (product) {
      setLastScanned(product);
      onProductAdded(product);
      
      if (!settings.saveHistory) {
        // Clear last scanned after delay in private mode
        setTimeout(() => setLastScanned(null), 5000);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center py-8">
        <Button
          size="lg"
          onClick={() => setShowCamera(true)}
          className="gap-2"
        >
          <Camera className="h-5 w-5" />
          Scanner un produit
        </Button>
      </div>

      {lastScanned && settings.saveHistory && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{lastScanned.name}</strong> ajouté à l'inventaire
          </AlertDescription>
        </Alert>
      )}

      {showCamera && (
        <div className="fixed inset-0 z-50">
          <CameraCapture
            onCapture={handleCapture}
            onClose={() => setShowCamera(false)}
            batteryMode={settings.batterySaver}
          />
        </div>
      )}
    </div>
  );
}

// Feature card component
function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="text-primary">{icon}</div>
        <div>
          <h3 className="font-medium text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        </div>
      </div>
    </Card>
  );
}

// Helper functions
async function processImage(blob: Blob, settings: any): Promise<any> {
  // Implementation would process image with privacy settings
  return {
    name: 'Produit scanné',
    brand: 'Marque'
  };
}

function logAnonymizedUsage(mode: string) {
  // Log usage without personal data
  console.log('[Analytics] Scanner used:', { mode, timestamp: Date.now() });
}

// Add missing import
import { CheckCircle } from 'lucide-react';