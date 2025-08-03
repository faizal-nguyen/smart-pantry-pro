import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wifi, 
  WifiOff, 
  Loader2, 
  Download, 
  Bell,
  BellOff,
  Smartphone
} from 'lucide-react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { usePWA } from '@/hooks/usePWA';
import { useAppStore } from '@/store/appStore';

const PWAStatus = () => {
  const { isOnline, offlineActionsCount, syncInProgress, lastSynced } = useConnectionStatus();
  const { isInstallable, isInstalled, installApp, notificationSettings } = usePWA();
  const { requestNotificationPermission, updateNotificationSettings } = useAppStore();

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      console.log('App installed successfully');
    }
  };

  const toggleNotifications = async () => {
    if (notificationSettings.permission === 'granted') {
      updateNotificationSettings({ enabled: !notificationSettings.enabled });
    } else {
      await requestNotificationPermission();
    }
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            
            <span className="text-sm">
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </span>
            
            {offlineActionsCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {offlineActionsCount} en attente
              </Badge>
            )}
            
            {syncInProgress && (
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
            )}
          </div>

          {/* PWA Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleNotifications}
              className="h-8 w-8 p-0"
            >
              {notificationSettings.enabled ? (
                <Bell className="w-4 h-4 text-primary" />
              ) : (
                <BellOff className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>

            {/* Install Button */}
            {isInstallable && !isInstalled && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleInstall}
                className="h-8"
              >
                <Download className="w-3 h-3 mr-1" />
                Installer
              </Button>
            )}

            {/* PWA Indicator */}
            {isInstalled && (
              <Badge variant="secondary" className="text-xs">
                <Smartphone className="w-3 h-3 mr-1" />
                PWA
              </Badge>
            )}
          </div>
        </div>

        {/* Last Sync Info */}
        {lastSynced && (
          <div className="mt-2 text-xs text-muted-foreground">
            Dernière sync: {lastSynced.toLocaleTimeString('fr-FR')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PWAStatus;