import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, Upload, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickScanStepProps {
  title: string;
  subtitle: string;
  onScanComplete: (completed: boolean) => void;
  hasScanned: boolean;
}

const QuickScanStep: React.FC<QuickScanStepProps> = ({
  title,
  subtitle,
  onScanComplete,
  hasScanned
}) => {
  const [isScanning, setIsScanning] = useState(false);

  const handleCameraScan = async () => {
    setIsScanning(true);
    
    // Simulate camera scan process
    setTimeout(() => {
      setIsScanning(false);
      onScanComplete(true);
    }, 2000);
  };

  const handlePhotoUpload = async () => {
    setIsScanning(true);
    
    // Simulate photo upload process
    setTimeout(() => {
      setIsScanning(false);
      onScanComplete(true);
    }, 1500);
  };

  if (hasScanned) {
    return (
      <div className="space-y-8 text-center">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="text-6xl text-green-500"
        >
          ✅
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="space-y-4"
        >
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Parfait !
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Nous avons scanné vos premiers produits. Vous pourrez en ajouter d'autres plus tard.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="flex justify-center"
        >
          <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">3 produits ajoutés à votre inventaire</span>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="text-center space-y-4"
      >
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          {subtitle}
        </p>
      </motion.div>

      {/* Illustration */}
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.4 }}
        className="text-6xl text-center"
      >
        📱📷
      </motion.div>

      {/* Scan Options */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="space-y-4"
      >
        {/* Camera Scan */}
        <Button
          onClick={handleCameraScan}
          disabled={isScanning}
          className={cn(
            "w-full h-16 flex items-center justify-center gap-3 rounded-2xl transition-all duration-200",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            isScanning && "opacity-50 cursor-not-allowed"
          )}
        >
          {isScanning ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Camera className="w-5 h-5" />
            </motion.div>
          ) : (
            <Camera className="w-5 h-5" />
          )}
          <span className="font-semibold">
            {isScanning ? 'Scan en cours...' : 'Scanner avec l\'appareil photo'}
          </span>
        </Button>

        {/* Photo Upload */}
        <Button
          onClick={handlePhotoUpload}
          disabled={isScanning}
          variant="outline"
          className={cn(
            "w-full h-16 flex items-center justify-center gap-3 rounded-2xl transition-all duration-200",
            "hover:bg-gray-50 dark:hover:bg-gray-800",
            isScanning && "opacity-50 cursor-not-allowed"
          )}
        >
          <Upload className="w-5 h-5" />
          <span className="font-semibold">Importer une photo</span>
        </Button>
      </motion.div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="text-center"
      >
        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            💡 <strong>Astuce:</strong> Prenez une photo de votre frigo ou de vos placards pour un scan rapide
          </p>
        </Card>
      </motion.div>
    </div>
  );
};

export default QuickScanStep;