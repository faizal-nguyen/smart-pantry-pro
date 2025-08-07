import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Database, 
  BarChart, 
  Battery, 
  Trash2,
  Download,
  Clock,
  Eye,
  Camera
} from 'lucide-react';
import { PrivacySettings } from '@/hooks/usePrivacySettings';
import { toast } from 'sonner';

interface ScannerSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PrivacySettings;
  onUpdate: (settings: Partial<PrivacySettings>) => void;
}

export function ScannerSettings({
  isOpen,
  onClose,
  settings,
  onUpdate
}: ScannerSettingsProps) {
  const handleDataRetentionChange = (value: string) => {
    const retentionDays: Record<string, number | undefined> = {
      minimal: 7,
      standard: 30,
      full: undefined
    };

    onUpdate({
      dataRetention: value as 'minimal' | 'standard' | 'full',
      autoDeleteAfter: retentionDays[value]
    });
  };

  const handleDeleteData = async () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer toutes vos données ? Cette action est irréversible.')) {
      // This would call the deleteAllData function from usePrivacySettings
      toast.success('Demande de suppression en cours...');
      onClose();
    }
  };

  const handleExportData = () => {
    // This would call the exportUserData function from usePrivacySettings
    toast.info('Export des données en cours...');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Paramètres du scanner</DialogTitle>
          <DialogDescription>
            Gérez vos préférences de confidentialité et de performance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Privacy Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Confidentialité</h3>
            </div>

            <Card className="p-4 space-y-4">
              {/* Analytics */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <BarChart className="h-4 w-4" />
                    Analyses anonymisées
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Aide à améliorer l'application
                  </p>
                </div>
                <Switch
                  checked={settings.allowAnalytics}
                  onCheckedChange={(checked) => onUpdate({ allowAnalytics: checked })}
                />
              </div>

              <Separator />

              {/* History */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Historique des scans
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Sauvegarde votre historique
                  </p>
                </div>
                <Switch
                  checked={settings.saveHistory}
                  onCheckedChange={(checked) => onUpdate({ saveHistory: checked })}
                />
              </div>

              <Separator />

              {/* Image Processing */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Traitement d'image avancé
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Améliore la reconnaissance
                  </p>
                </div>
                <Switch
                  checked={settings.allowImageProcessing}
                  onCheckedChange={(checked) => onUpdate({ allowImageProcessing: checked })}
                />
              </div>

              <Separator />

              {/* Data Retention */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Conservation des données
                </Label>
                <Select
                  value={settings.dataRetention || 'standard'}
                  onValueChange={handleDataRetentionChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">
                      <div>
                        <p className="font-medium">Minimale (7 jours)</p>
                        <p className="text-xs text-muted-foreground">
                          Suppression automatique après 7 jours
                        </p>
                      </div>
                    </SelectItem>
                    <SelectItem value="standard">
                      <div>
                        <p className="font-medium">Standard (30 jours)</p>
                        <p className="text-xs text-muted-foreground">
                          Suppression automatique après 30 jours
                        </p>
                      </div>
                    </SelectItem>
                    <SelectItem value="full">
                      <div>
                        <p className="font-medium">Complète</p>
                        <p className="text-xs text-muted-foreground">
                          Conservation jusqu'à suppression manuelle
                        </p>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>
          </div>

          {/* Performance Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Battery className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Performance</h3>
            </div>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Battery className="h-4 w-4" />
                    Mode économie d'énergie
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Réduit la qualité pour économiser la batterie
                  </p>
                </div>
                <Switch
                  checked={settings.batterySaver}
                  onCheckedChange={(checked) => onUpdate({ batterySaver: checked })}
                />
              </div>
            </Card>
          </div>

          {/* Data Management */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Gestion des données</h3>
            </div>

            <Card className="p-4 space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleExportData}
              >
                <Download className="h-4 w-4" />
                Exporter mes données (RGPD)
              </Button>

              <Button
                variant="destructive"
                className="w-full justify-start gap-2"
                onClick={handleDeleteData}
              >
                <Trash2 className="h-4 w-4" />
                Supprimer toutes mes données
              </Button>
            </Card>
          </div>

          {/* Privacy Mode Indicator */}
          {!settings.saveHistory && (
            <Card className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">
                    Mode privé activé
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-200">
                    Aucun historique n'est sauvegardé
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button onClick={onClose}>
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}