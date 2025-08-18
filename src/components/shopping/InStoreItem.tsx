import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Mic, MicOff, Plus, Minus, Euro, Edit2, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ShoppingListItem } from '@/types/shopping-list';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

interface InStoreItemProps {
  item: ShoppingListItem;
  isChecked: boolean;
  inStoreMode?: boolean;
  showPrices?: boolean;
  onCheck: (item: ShoppingListItem) => void;
  onQuantityChange?: (item: ShoppingListItem, newQuantity: number) => void;
  onEdit?: (item: ShoppingListItem) => void;
  onRemove?: (item: ShoppingListItem) => void;
  onVoiceCommand?: (item: ShoppingListItem, command: string) => void;
  className?: string;
}

const InStoreItem: React.FC<InStoreItemProps> = ({
  item,
  isChecked,
  inStoreMode = false,
  showPrices = true,
  onCheck,
  onQuantityChange,
  onEdit,
  onRemove,
  onVoiceCommand,
  className
}) => {
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [showQuantityControls, setShowQuantityControls] = useState(false);
  
  const { itemChecked, itemUnchecked, vibrate } = useHapticFeedback();
  
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript,
    isSupported: isVoiceSupported 
  } = useSpeechRecognition({
    language: 'fr-FR',
    continuous: false
  });

  // Handle voice commands
  React.useEffect(() => {
    if (transcript && !isListening) {
      const command = transcript.toLowerCase().trim();
      
      // Check for common shopping voice commands
      if (command.includes('coché') || command.includes('acheté') || command.includes('pris')) {
        onCheck(item);
        resetTranscript();
        setIsVoiceActive(false);
      } else if (command.includes('plus') || command.includes('+')) {
        const quantity = item.quantity + 1;
        onQuantityChange?.(item, quantity);
        vibrate('light');
        resetTranscript();
        setIsVoiceActive(false);
      } else if (command.includes('moins') || command.includes('-')) {
        const quantity = Math.max(1, item.quantity - 1);
        onQuantityChange?.(item, quantity);
        vibrate('light');
        resetTranscript();
        setIsVoiceActive(false);
      } else if (onVoiceCommand) {
        onVoiceCommand(item, transcript);
        resetTranscript();
        setIsVoiceActive(false);
      }
    }
  }, [transcript, isListening, item, onCheck, onQuantityChange, onVoiceCommand, resetTranscript, vibrate]);

  const handleCheck = () => {
    if (isChecked) {
      itemUnchecked();
    } else {
      itemChecked();
    }
    onCheck(item);
  };

  const handleVoiceToggle = () => {
    if (isVoiceActive && isListening) {
      stopListening();
      setIsVoiceActive(false);
    } else if (!isListening) {
      setIsVoiceActive(true);
      startListening();
    }
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, item.quantity + delta);
    onQuantityChange?.(item, newQuantity);
    vibrate('light');
  };

  // Get corrected price (same logic as original ShoppingItemCard)
  const getCorrectedPrice = (): number | undefined => {
    if (!item.estimated_price) return undefined;
    
    const productName = item.product?.name?.toLowerCase() || '';
    const unit = item.product?.unit_type?.toLowerCase() || '';
    
    // Fix for curry leaves with aberrant price
    if ((productName.includes('curry') && (productName.includes('feuille') || productName.includes('leaf') || productName.includes('leaves'))) ||
        productName === 'curry leaves' || productName === 'feuilles de curry') {
      if (item.estimated_price > 10) {
        return 0.01; // 1 cent per leaf
      }
    }
    
    // Fix for water with aberrant price
    if ((productName === 'eau' || productName === 'water' || productName.includes('eau')) && 
        item.estimated_price > 1) {
      return 0.001; // 0.001€ per unit for water
    }
    
    // Fix for meat with aberrant price
    if ((productName.includes('steak') || productName.includes('viande') || productName.includes('boeuf') || 
         productName.includes('porc') || productName.includes('poulet') || productName.includes('agneau')) && 
        unit === 'g' && item.estimated_price > 100) {
      const pricePerKg = productName.includes('flank') ? 25 : 20;
      return pricePerKg / 1000; // Price per gram
    }
    
    return item.estimated_price;
  };

  const correctedPrice = getCorrectedPrice();
  const totalPrice = correctedPrice ? correctedPrice * item.quantity : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "relative bg-white rounded-xl shadow-sm border transition-all duration-200",
        inStoreMode ? "p-4 min-h-[120px]" : "p-3",
        isChecked && "opacity-60 bg-muted/50",
        !isChecked && "hover:shadow-md",
        isVoiceActive && "ring-2 ring-blue-500 bg-blue-50",
        className
      )}
    >
      {/* Voice indicator */}
      <AnimatePresence>
        {isVoiceActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -top-2 -right-2 z-10"
          >
            <div className="bg-blue-500 text-white rounded-full p-2 shadow-lg">
              <Mic className="w-4 h-4" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn(
        "flex items-center gap-3",
        inStoreMode && "gap-4"
      )}>
        {/* Large checkbox for in-store mode */}
        <Button
          variant="ghost"
          size={inStoreMode ? "lg" : "sm"}
          onClick={handleCheck}
          className={cn(
            "flex-shrink-0 rounded-full border-2 transition-all duration-200",
            inStoreMode ? "w-12 h-12" : "w-8 h-8",
            isChecked 
              ? "bg-green-500 border-green-500 text-white hover:bg-green-600" 
              : "border-gray-300 hover:border-green-400"
          )}
        >
          {isChecked && <Check className={cn(inStoreMode ? "w-6 h-6" : "w-4 h-4")} />}
        </Button>

        {/* Item details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "font-medium truncate",
                inStoreMode ? "text-lg" : "text-base",
                isChecked && "line-through text-muted-foreground"
              )}>
                {item.product?.name || 'Produit inconnu'}
              </h3>
              
              <div className={cn(
                "flex items-center gap-2 mt-1",
                inStoreMode && "mt-2"
              )}>
                {/* Quantity with controls */}
                <div className="flex items-center gap-2">
                  {(inStoreMode && onQuantityChange && !isChecked) ? (
                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuantityChange(-1)}
                        disabled={item.quantity <= 1}
                        className="h-8 w-8 p-0 rounded-l-lg"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="px-2 font-medium min-w-[40px] text-center">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuantityChange(1)}
                        className="h-8 w-8 p-0 rounded-r-lg"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <span className={cn(
                      "font-medium",
                      inStoreMode ? "text-base" : "text-sm"
                    )}>
                      {item.quantity}
                    </span>
                  )}
                  
                  <span className={cn(
                    "text-muted-foreground",
                    inStoreMode ? "text-sm" : "text-xs"
                  )}>
                    {item.product?.unit_type}
                  </span>
                </div>

                {/* Price */}
                {showPrices && totalPrice > 0 && (
                  <div className="flex items-center gap-1 text-green-600">
                    <Euro className={cn(inStoreMode ? "w-4 h-4" : "w-3 h-3")} />
                    <span className={cn(
                      "font-semibold",
                      inStoreMode ? "text-base" : "text-sm"
                    )}>
                      {totalPrice.toFixed(2)}€
                    </span>
                    {item.discount && (
                      <Badge variant="outline" className="text-xs text-green-600 ml-1">
                        -{item.discount}%
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              {item.notes && (
                <p className={cn(
                  "text-muted-foreground mt-1",
                  inStoreMode ? "text-sm" : "text-xs"
                )}>
                  {item.notes}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 ml-2">
              {/* Voice control button (in-store mode only) */}
              {inStoreMode && isVoiceSupported && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleVoiceToggle}
                  className={cn(
                    "w-8 h-8 p-0",
                    isVoiceActive && "bg-blue-100 text-blue-600"
                  )}
                >
                  {isVoiceActive ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </Button>
              )}

              {/* Edit button */}
              {onEdit && !inStoreMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(item)}
                  className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}

              {/* Remove button */}
              {onRemove && !inStoreMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(item)}
                  className="w-8 h-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Voice feedback */}
      <AnimatePresence>
        {isVoiceActive && transcript && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200"
          >
            <p className="text-sm text-blue-700">
              🎤 "{transcript}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default InStoreItem;