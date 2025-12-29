"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell,
  BellRing,
  X, 
  Check, 
  Cloud,
  Calendar,
  Leaf,
  Tag,
  Zap,
  TrendingUp,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { AdaptationLog } from '@/services/context/types';

interface RealTimeNotificationsProps {
  adaptations: AdaptationLog[];
  onAdaptationAction?: (adaptationId: string, action: 'apply' | 'dismiss') => void;
  onSettingsChange?: (settings: NotificationSettings) => void;
  className?: string;
}

interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  autoHide: boolean;
  autoHideDelay: number;
  showOnlyHighConfidence: boolean;
}

interface NotificationItem {
  id: string;
  adaptation: AdaptationLog;
  timestamp: Date;
  isNew: boolean;
  dismissed: boolean;
}

export const RealTimeNotifications: React.FC<RealTimeNotificationsProps> = ({
  adaptations,
  onAdaptationAction,
  onSettingsChange,
  className
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    soundEnabled: true,
    position: 'top-right',
    autoHide: false,
    autoHideDelay: 5000,
    showOnlyHighConfidence: false
  });
  const [showSettings, setShowSettings] = useState(false);

  // Convertir les adaptations en notifications
  useEffect(() => {
    const newNotifications = adaptations
      .filter(adaptation => {
        if (settings.showOnlyHighConfidence) {
          return adaptation.confidence > 0.8;
        }
        return true;
      })
      .map(adaptation => ({
        id: adaptation.id,
        adaptation,
        timestamp: new Date(),
        isNew: true,
        dismissed: false
      }));

    setNotifications(prev => {
      const existingIds = new Set(prev.map(n => n.id));
      const trulyNewNotifications = newNotifications.filter(n => !existingIds.has(n.id));
      
      // Jouer le son si nouvelles notifications
      if (trulyNewNotifications.length > 0 && settings.soundEnabled && settings.enabled) {
        playNotificationSound();
      }
      
      // Marquer les anciennes comme pas nouvelles et ajouter les nouvelles
      const updatedPrev = prev.map(n => ({ ...n, isNew: false }));
      return [...updatedPrev, ...trulyNewNotifications];
    });
  }, [adaptations, settings.showOnlyHighConfidence, settings.soundEnabled, settings.enabled]);

  // Auto-hide des notifications
  useEffect(() => {
    if (!settings.autoHide) return;

    const timer = setTimeout(() => {
      setNotifications(prev => 
        prev.map(n => ({ ...n, dismissed: true }))
      );
    }, settings.autoHideDelay);

    return () => clearTimeout(timer);
  }, [notifications.length, settings.autoHide, settings.autoHideDelay]);

  const playNotificationSound = () => {
    // Son de notification subtil
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  };

  const handleAction = (notificationId: string, action: 'apply' | 'dismiss') => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;

    // Marquer comme dismissée
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId 
          ? { ...n, dismissed: true }
          : n
      )
    );

    // Notifier le parent
    if (onAdaptationAction) {
      onAdaptationAction(notificationId, action);
    }
  };

  const handleSettingsChange = (newSettings: Partial<NotificationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    if (onSettingsChange) {
      onSettingsChange(updatedSettings);
    }
  };

  const getAdaptationIcon = (type: string) => {
    switch (type) {
      case 'weather': return <Cloud className="w-4 h-4 text-blue-500" />;
      case 'calendar': return <Calendar className="w-4 h-4 text-purple-500" />;
      case 'seasonal': return <Leaf className="w-4 h-4 text-green-500" />;
      case 'promotion': return <Tag className="w-4 h-4 text-orange-500" />;
      default: return <TrendingUp className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPositionClasses = (position: string) => {
    switch (position) {
      case 'top-right': return 'top-4 right-4';
      case 'top-left': return 'top-4 left-4';
      case 'bottom-right': return 'bottom-4 right-4';
      case 'bottom-left': return 'bottom-4 left-4';
      default: return 'top-4 right-4';
    }
  };

  const visibleNotifications = notifications
    .filter(n => !n.dismissed && settings.enabled)
    .slice(0, 3); // Limiter à 3 notifications max

  if (!settings.enabled || visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      "fixed z-50 space-y-2 max-w-sm",
      getPositionClasses(settings.position),
      className
    )}>
      {/* Bouton settings */}
      <div className="flex justify-end mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="h-8 w-8 p-0 bg-white/80 backdrop-blur-sm shadow-lg hover:bg-white"
        >
          {showSettings ? <X className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        </Button>
      </div>

      {/* Panel des réglages */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0">
              <CardContent className="p-4 space-y-3">
                <h4 className="font-medium text-sm">Réglages Notifications</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BellRing className="w-4 h-4" />
                      <span className="text-sm">Activées</span>
                    </div>
                    <Switch
                      checked={settings.enabled}
                      onCheckedChange={(enabled) => handleSettingsChange({ enabled })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {settings.soundEnabled ? 
                        <Volume2 className="w-4 h-4" /> : 
                        <VolumeX className="w-4 h-4" />
                      }
                      <span className="text-sm">Son</span>
                    </div>
                    <Switch
                      checked={settings.soundEnabled}
                      onCheckedChange={(soundEnabled) => handleSettingsChange({ soundEnabled })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      <span className="text-sm">Haute confiance seule</span>
                    </div>
                    <Switch
                      checked={settings.showOnlyHighConfidence}
                      onCheckedChange={(showOnlyHighConfidence) => 
                        handleSettingsChange({ showOnlyHighConfidence })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Masquer auto</span>
                    <Switch
                      checked={settings.autoHide}
                      onCheckedChange={(autoHide) => handleSettingsChange({ autoHide })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications */}
      <AnimatePresence mode="popLayout">
        {visibleNotifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            layout
            initial={{ 
              opacity: 0, 
              x: settings.position.includes('right') ? 300 : -300,
              scale: 0.8 
            }}
            animate={{ 
              opacity: 1, 
              x: 0, 
              scale: 1 
            }}
            exit={{ 
              opacity: 0, 
              x: settings.position.includes('right') ? 300 : -300,
              scale: 0.8 
            }}
            transition={{ 
              duration: 0.3, 
              delay: index * 0.1,
              ease: "easeOut" 
            }}
            className={cn(
              "relative",
              notification.isNew && "animate-pulse"
            )}
          >
            <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-0 overflow-hidden">
              {/* Barre de couleur selon le type */}
              <div className={cn(
                "h-1 w-full",
                notification.adaptation.type === 'weather' && "bg-blue-500",
                notification.adaptation.type === 'seasonal' && "bg-green-500",
                notification.adaptation.type === 'promotion' && "bg-orange-500",
                notification.adaptation.type === 'calendar' && "bg-purple-500"
              )} />

              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {getAdaptationIcon(notification.adaptation.type)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {notification.adaptation.type}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(notification.adaptation.confidence * 100)}%
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-800 leading-relaxed">
                      {notification.adaptation.reason}
                    </p>
                    
                    {notification.adaptation.savings && (
                      <p className="text-xs text-green-600 mt-1">
                        💰 Économie: {notification.adaptation.savings}€
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => handleAction(notification.id, 'apply')}
                        className="h-7 px-3 text-xs"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Appliquer
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction(notification.id, 'dismiss')}
                        className="h-7 px-3 text-xs"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Ignorer
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Indicateur de notifications supplémentaires */}
      {notifications.filter(n => !n.dismissed).length > 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Badge variant="secondary" className="text-xs">
            +{notifications.filter(n => !n.dismissed).length - 3} autres
          </Badge>
        </motion.div>
      )}
    </div>
  );
};