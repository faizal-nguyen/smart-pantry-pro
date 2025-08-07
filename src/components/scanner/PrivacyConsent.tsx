import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { 
  ShieldCheck, 
  Eye, 
  Database, 
  BarChart,
  Camera,
  Lock,
  Info,
  ExternalLink
} from 'lucide-react';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';
import { motion } from 'framer-motion';

interface PrivacyConsentProps {
  isOpen: boolean;
  onAccept: (accepted: boolean) => void;
}

export function PrivacyConsent({ isOpen, onAccept }: PrivacyConsentProps) {
  const { updateSettings } = usePrivacySettings();
  
  const [consents, setConsents] = useState({
    essential: true, // Always true, cannot be disabled
    analytics: false,
    history: true,
    imageProcessing: true
  });

  const [showDetails, setShowDetails] = useState(false);

  const handleAccept = async () => {
    // Update privacy settings
    await updateSettings({
      hasConsent: true,
      consentDate: new Date().toISOString(),
      allowAnalytics: consents.analytics,
      saveHistory: consents.history,
      allowImageProcessing: consents.imageProcessing,
      shareAnonymizedData: consents.analytics
    });

    onAccept(true);
  };

  const handleReject = () => {
    // Only essential features will be enabled
    updateSettings({
      hasConsent: true,
      consentDate: new Date().toISOString(),
      allowAnalytics: false,
      saveHistory: false,
      allowImageProcessing: true, // Required for app to function
      shareAnonymizedData: false
    });

    onAccept(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Confidentialité et protection des données
          </DialogTitle>
          <DialogDescription>
            Smart Pantry Pro respecte votre vie privée. Choisissez comment vos données sont utilisées.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Key privacy points */}
          <div className="space-y-3">
            <PrivacyPoint
              icon={<Camera className="h-5 w-5" />}
              title="Traitement des images"
              description="Les photos sont analysées localement et ne sont jamais stockées sur nos serveurs"
              status="local"
            />
            <PrivacyPoint
              icon={<Lock className="h-5 w-5" />}
              title="Données chiffrées"
              description="Toutes vos données sont chiffrées et sécurisées"
              status="secure"
            />
            <PrivacyPoint
              icon={<Eye className="h-5 w-5" />}
              title="Contrôle total"
              description="Vous pouvez modifier ou supprimer vos données à tout moment"
              status="control"
            />
          </div>

          {/* Consent options */}
          <div className="space-y-4">
            <h3 className="font-semibold">Paramètres de confidentialité</h3>
            
            {/* Essential - always checked */}
            <Card className="p-4 bg-muted/30">
              <div className="flex items-start gap-3">
                <Checkbox 
                  checked={true} 
                  disabled 
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label className="text-base font-medium">
                    Fonctionnalités essentielles
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Requis pour le fonctionnement de l'application (scan, inventaire, recettes)
                  </p>
                </div>
              </div>
            </Card>

            {/* Analytics */}
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={consents.analytics}
                  onCheckedChange={(checked) => 
                    setConsents(prev => ({ ...prev, analytics: checked as boolean }))
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <BarChart className="h-4 w-4" />
                    Analyses anonymisées
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Nous aide à améliorer l'application (statistiques d'usage, performances)
                  </p>
                </div>
              </div>
            </Card>

            {/* History */}
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={consents.history}
                  onCheckedChange={(checked) => 
                    setConsents(prev => ({ ...prev, history: checked as boolean }))
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Historique des scans
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sauvegarde votre historique pour des suggestions personnalisées
                  </p>
                </div>
              </div>
            </Card>

            {/* Image processing */}
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={consents.imageProcessing}
                  onCheckedChange={(checked) => 
                    setConsents(prev => ({ ...prev, imageProcessing: checked as boolean }))
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Traitement d'image avancé
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Utilise l'IA pour améliorer la reconnaissance (traitement local uniquement)
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Details button */}
          <Button
            variant="link"
            onClick={() => setShowDetails(!showDetails)}
            className="gap-2"
          >
            <Info className="h-4 w-4" />
            {showDetails ? 'Masquer' : 'Voir'} les détails
          </Button>

          {/* Detailed information */}
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 text-sm"
            >
              <Card className="p-4 bg-muted/30">
                <h4 className="font-medium mb-2">Ce que nous ne faisons JAMAIS :</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Stocker vos photos sans consentement</li>
                  <li>• Partager vos données personnelles</li>
                  <li>• Utiliser vos données pour de la publicité</li>
                  <li>• Accéder à vos photos sans votre action</li>
                </ul>
              </Card>

              <Card className="p-4 bg-muted/30">
                <h4 className="font-medium mb-2">Vos droits (RGPD) :</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Droit d'accès à vos données</li>
                  <li>• Droit de rectification</li>
                  <li>• Droit à l'effacement</li>
                  <li>• Droit à la portabilité</li>
                  <li>• Droit d'opposition</li>
                </ul>
              </Card>
            </motion.div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="link"
            onClick={() => window.open('/privacy-policy', '_blank')}
            className="gap-2"
          >
            Politique de confidentialité complète
            <ExternalLink className="h-4 w-4" />
          </Button>
          
          <div className="flex gap-3 ml-auto">
            <Button
              variant="outline"
              onClick={handleReject}
            >
              Refuser les options
            </Button>
            <Button
              onClick={handleAccept}
              className="gap-2"
            >
              <ShieldCheck className="h-4 w-4" />
              Accepter et continuer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PrivacyPointProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: 'local' | 'secure' | 'control';
}

function PrivacyPoint({ icon, title, description, status }: PrivacyPointProps) {
  const statusColors = {
    local: 'text-green-600 bg-green-100',
    secure: 'text-blue-600 bg-blue-100',
    control: 'text-purple-600 bg-purple-100'
  };

  const statusLabels = {
    local: 'Local',
    secure: 'Sécurisé',
    control: 'Contrôle'
  };

  return (
    <div className="flex items-start gap-3">
      <div className={`p-2 rounded-lg ${statusColors[status]}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">{title}</h4>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[status]}`}>
            {statusLabels[status]}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {description}
        </p>
      </div>
    </div>
  );
}