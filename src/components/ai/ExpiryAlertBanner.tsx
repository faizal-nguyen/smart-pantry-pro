import React from 'react';
import { motion } from 'framer-motion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, Skull } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpiryAlert {
  productName: string;
  type: 'expired' | 'critical' | 'warning';
  daysUntilExpiry: number;
  message: string;
}

interface ExpiryAlertBannerProps {
  alerts: ExpiryAlert[];
}

export function ExpiryAlertBanner({ alerts }: ExpiryAlertBannerProps) {
  if (!alerts || alerts.length === 0) return null;

  // Group alerts by type
  const groupedAlerts = alerts.reduce((acc, alert) => {
    if (!acc[alert.type]) acc[alert.type] = [];
    acc[alert.type].push(alert);
    return acc;
  }, {} as Record<string, ExpiryAlert[]>);

  // Get most critical alert type
  const mostCriticalType = groupedAlerts.expired ? 'expired' 
    : groupedAlerts.critical ? 'critical' 
    : 'warning';

  const getAlertConfig = (type: string) => {
    switch (type) {
      case 'expired':
        return {
          icon: Skull,
          className: 'border-red-500 bg-red-50 dark:bg-red-950',
          iconClassName: 'text-red-600',
          title: 'Produits expirés'
        };
      case 'critical':
        return {
          icon: AlertTriangle,
          className: 'border-orange-500 bg-orange-50 dark:bg-orange-950',
          iconClassName: 'text-orange-600',
          title: 'Expiration imminente'
        };
      default:
        return {
          icon: AlertCircle,
          className: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950',
          iconClassName: 'text-yellow-600',
          title: 'À consommer bientôt'
        };
    }
  };

  const config = getAlertConfig(mostCriticalType);
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="px-4 py-2"
    >
      <Alert className={cn("relative", config.className)}>
        <Icon className={cn("h-4 w-4", config.iconClassName)} />
        <AlertDescription className="ml-2">
          <div className="font-medium mb-1">{config.title}</div>
          <div className="space-y-1">
            {Object.entries(groupedAlerts).map(([type, typeAlerts]) => (
              <div key={type}>
                {typeAlerts.map((alert, index) => (
                  <div key={index} className="text-sm">
                    • {alert.message}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </AlertDescription>
      </Alert>
    </motion.div>
  );
}