import { useEffect } from 'react';
import { useAppStore } from '@/store/appStore';

export const usePWA = () => {
  const { 
    installPromptEvent,
    isInstallable,
    isInstalled,
    setInstallPromptEvent,
    setInstallable,
    setInstalled,
    notificationSettings,
    requestNotificationPermission
  } = useAppStore();

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content available, show update notification
                  showUpdateNotification();
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('SW registration failed:', error);
        });
    }

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e);
      setInstallable(true);
    };

    // Check if app is already installed
    const handleAppInstalled = () => {
      setInstalled(true);
      setInstallable(false);
      setInstallPromptEvent(null);
    };

    // Check if running as PWA
    const isRunningAsPWA = () => {
      return window.matchMedia('(display-mode: standalone)').matches ||
             window.matchMedia('(display-mode: fullscreen)').matches ||
             (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    };

    if (isRunningAsPWA()) {
      setInstalled(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Request notification permission on first visit
    if (notificationSettings.permission === 'default') {
      setTimeout(() => {
        requestNotificationPermission();
      }, 5000); // Wait 5 seconds before asking
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [setInstallPromptEvent, setInstallable, setInstalled, notificationSettings.permission, requestNotificationPermission]);

  const installApp = async () => {
    if (!installPromptEvent) return false;

    try {
      installPromptEvent.prompt();
      const { outcome } = await installPromptEvent.userChoice;
      
      if (outcome === 'accepted') {
        setInstalled(true);
        setInstallable(false);
        setInstallPromptEvent(null);
        return true;
      }
    } catch (error) {
      console.error('Installation failed:', error);
    }
    return false;
  };

  const scheduleExpiryNotifications = async () => {
    if (!notificationSettings.enabled || !notificationSettings.expiryReminders) {
      return;
    }

    // This would typically fetch from your inventory and schedule notifications
    // for items expiring soon
    try {
      // Example: Schedule notification for tomorrow at 9 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        // Use the Push API to schedule notifications
        // This is a simplified example - you'd typically use your backend
        // to send push notifications at scheduled times
        setTimeout(() => {
          registration.showNotification('Smart Grocery', {
            body: 'Vérifiez vos produits qui expirent bientôt !',
            icon: '/icons/icon-192x192.png',
            tag: 'expiry-reminder',
            data: { url: '/?tab=inventory' }
          });
        }, tomorrow.getTime() - Date.now());
      }
    } catch (error) {
      console.error('Failed to schedule notifications:', error);
    }
  };

  return {
    isInstallable,
    isInstalled,
    installApp,
    scheduleExpiryNotifications,
    notificationSettings,
  };
};

function showUpdateNotification() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification('Smart Grocery', {
        body: 'Une nouvelle version est disponible !',
        icon: '/icons/icon-192x192.png',
        tag: 'app-update',
        requireInteraction: true,
        data: {
          action: 'update'
        }
      } as NotificationOptions);
    });
  }
}