import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Camera, Mic, FileText, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FABOption {
  icon: React.ReactNode;
  label: string;
  action: string;
  onClick: () => void;
}

interface FloatingActionButtonProps {
  onCameraScan: () => void;
  onVoiceInput: () => void;
  onManualAdd: () => void;
  onReceiptScan: () => void;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onCameraScan,
  onVoiceInput,
  onManualAdd,
  onReceiptScan
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const options: FABOption[] = [
    {
      icon: <Camera className="w-5 h-5" />,
      label: 'Scanner',
      action: 'camera-scan',
      onClick: onCameraScan
    },
    {
      icon: <Mic className="w-5 h-5" />,
      label: 'Dicter',
      action: 'voice-input',
      onClick: onVoiceInput
    },
    {
      icon: <FileText className="w-5 h-5" />,
      label: 'Manuel',
      action: 'manual-add',
      onClick: onManualAdd
    },
    {
      icon: <Receipt className="w-5 h-5" />,
      label: 'Ticket',
      action: 'receipt-scan',
      onClick: onReceiptScan
    }
  ];

  const handleOptionClick = (option: FABOption) => {
    option.onClick();
    setIsExpanded(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-16 right-0 space-y-2"
          >
            {options.map((option, index) => (
              <motion.div
                key={option.action}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-end gap-2"
              >
                <span className="bg-gray-900 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap">
                  {option.label}
                </span>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-12 w-12 rounded-full shadow-lg"
                  onClick={() => handleOptionClick(option)}
                >
                  {option.icon}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{ rotate: isExpanded ? 45 : 0 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <Button
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full shadow-lg",
            "bg-primary hover:bg-primary/90",
            "transition-all duration-200"
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </motion.div>
    </div>
  );
};