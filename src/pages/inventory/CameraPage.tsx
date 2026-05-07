import React, { useState } from 'react';
import { MobileCameraOptimized } from '@/components/inventory/MobileCameraOptimized';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Camera, 
  Package, 
  Scan,
  Smartphone,
  Zap,
  Shield,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import { deviceCapabilities } from '@/utils/mobile-performance';
import { toast } from 'sonner';

export default function CameraPage() {
  const [showCamera, setShowCamera] = useState(false);
  const [recentScans, setRecentScans] = useState<any[]>([]);

  const handleProductAdded = (product: any) => {
    setRecentScans(prev => [product, ...prev.slice(0, 4)]);
    setShowCamera(false);
  };

  // Device info
  const isMobile = deviceCapabilities.isMobile();
  const isIOS = deviceCapabilities.isIOS();

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">
            Scanner des Produits
          </h1>
          <p className="text-muted-foreground">
            Utilisez votre caméra pour ajouter rapidement des produits à votre inventaire
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Scanner un produit</h3>
                  <p className="text-sm text-muted-foreground">
                    Prenez une photo du produit ou de son code-barres
                  </p>
                </div>
              </div>
              
              <Button 
                onClick={() => setShowCamera(true)}
                className="w-full"
                size="lg"
              >
                <Scan className="h-5 w-5 mr-2" />
                Ouvrir la caméra
              </Button>
            </div>
          </Card>

          {/* P1 polish: removed the "Recherche manuelle" card. The
              button surfaced a "bientôt disponible" toast — broken
              promise per UI/UX audit. The "Manuel" entry in the
              FloatingActionButton on /pantry/inventory already covers
              the same flow when it ships. */}
        </div>

        {/* Features */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Fonctionnalités</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Feature
              icon={<Smartphone className="h-5 w-5" />}
              title="Optimisé mobile"
              description={`Support complet ${isIOS ? 'iOS Safari' : isMobile ? 'mobile' : 'desktop'}`}
            />
            <Feature
              icon={<Zap className="h-5 w-5" />}
              title="Mode économie"
              description="Réduit la consommation de batterie"
            />
            <Feature
              icon={<Shield className="h-5 w-5" />}
              title="Sécurisé"
              description="Vos photos ne sont pas stockées"
            />
            <Feature
              icon={<Info className="h-5 w-5" />}
              title="IA intelligente"
              description="Reconnaissance automatique des produits"
            />
          </div>
        </Card>

        {/* Recent Scans */}
        {recentScans.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Scans récents</h3>
            <div className="space-y-2">
              {recentScans.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted"
                >
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    {product.brand && (
                      <p className="text-sm text-muted-foreground">{product.brand}</p>
                    )}
                  </div>
                  <span className="text-sm text-green-600 font-medium">
                    Ajouté ✓
                  </span>
                </motion.div>
              ))}
            </div>
          </Card>
        )}

        {/* Tips */}
        <Card className="p-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
            💡 Conseils pour un meilleur scan
          </h3>
          <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
            <li>• Assurez-vous d'avoir un bon éclairage</li>
            <li>• Centrez le produit dans le cadre</li>
            <li>• Pour les codes-barres, approchez-vous</li>
            <li>• Évitez les reflets sur les emballages brillants</li>
          </ul>
        </Card>
      </div>

      {/* Camera Modal */}
      <MobileCameraOptimized
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onProductAdded={handleProductAdded}
      />
    </div>
  );
}

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function Feature({ icon, title, description }: FeatureProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-primary mt-0.5">{icon}</div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}