import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Camera, Mic, FileText, Receipt } from 'lucide-react';
import { MaterialButton } from '@/components/ui/material/Button';
import { useMaterialYouTheme } from '@/contexts/MaterialYouThemeContext';
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
  const { setThemeContext } = useMaterialYouTheme();

  // Set appropriate context when FAB is used
  useEffect(() => {
    setThemeContext('cooking');
  }, [setThemeContext]);

  // Handle keyboard navigation (Escape to close)
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isExpanded) {
      setIsExpanded(false);
    }
  }, [isExpanded]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
    <div
      className="fixed bottom-6 right-6 z-50"
      role="group"
      aria-label="Actions rapides d'ajout de produit"
    >
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-16 right-0 space-y-2"
            role="menu"
            aria-label="Options d'ajout"
          >
            {options.map((option, index) => (
              <motion.div
                key={option.action}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-end gap-2"
                role="menuitem"
              >
                <span
                  className="bg-gray-900 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap"
                  aria-hidden="true"
                >
                  {option.label}
                </span>
                <MaterialButton
                  variant="elevated"
                  size="sm"
                  className="h-12 w-12 rounded-full shadow-lg"
                  onClick={() => handleOptionClick(option)}
                  aria-label={option.label}
                >
                  {option.icon}
                </MaterialButton>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{ rotate: isExpanded ? 45 : 0 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <MaterialButton
          variant="filled"
          className={cn(
            "h-14 w-14 rounded-full shadow-lg",
            "transition-all duration-200"
          )}
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? "Fermer le menu d'ajout" : "Ouvrir le menu d'ajout"}
          aria-expanded={isExpanded}
          aria-haspopup="menu"
        >
          <Plus className="w-6 h-6" aria-hidden="true" />
        </MaterialButton>
      </motion.div>
    </div>
  );
};