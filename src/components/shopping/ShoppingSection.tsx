import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, MapPin, CheckCircle2, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StoreSection, ShoppingListItem } from '@/types/shopping-list';
import InStoreItem from './InStoreItem';

interface ShoppingSectionProps {
  section: StoreSection & { items: ShoppingListItem[] };
  checkedItems: Set<string>;
  inStoreMode?: boolean;
  showPrices?: boolean;
  currentSection?: string;
  estimatedTime?: number; // in minutes
  onItemCheck: (item: ShoppingListItem) => void;
  onItemQuantityChange?: (item: ShoppingListItem, newQuantity: number) => void;
  onItemEdit?: (item: ShoppingListItem) => void;
  onItemRemove?: (item: ShoppingListItem) => void;
  onItemVoiceCommand?: (item: ShoppingListItem, command: string) => void;
  onSectionEnter?: (sectionId: string) => void;
  onSectionExit?: (sectionId: string) => void;
  className?: string;
}

const ShoppingSection: React.FC<ShoppingSectionProps> = ({
  section,
  checkedItems,
  inStoreMode = false,
  showPrices = true,
  currentSection,
  estimatedTime,
  onItemCheck,
  onItemQuantityChange,
  onItemEdit,
  onItemRemove,
  onItemVoiceCommand,
  onSectionEnter,
  onSectionExit,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [sectionStartTime, setSectionStartTime] = useState<number | null>(null);

  // Calculate section progress
  const sectionStats = useMemo(() => {
    const totalItems = section.items.length;
    const checkedCount = section.items.filter(item => checkedItems.has(item.id)).length;
    const progressPercentage = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;
    const isComplete = checkedCount === totalItems && totalItems > 0;
    
    const totalValue = section.items.reduce((sum, item) => {
      const correctedPrice = getCorrectedPrice(item);
      return sum + (correctedPrice ? correctedPrice * item.quantity : 0);
    }, 0);

    return {
      totalItems,
      checkedCount,
      progressPercentage,
      isComplete,
      totalValue
    };
  }, [section.items, checkedItems]);

  // Helper function to get corrected price (same logic as InStoreItem)
  const getCorrectedPrice = (item: ShoppingListItem): number | undefined => {
    if (!item.estimated_price) return undefined;
    
    const productName = item.product?.name?.toLowerCase() || '';
    const unit = item.product?.unit_type?.toLowerCase() || '';
    
    if ((productName.includes('curry') && (productName.includes('feuille') || productName.includes('leaf') || productName.includes('leaves'))) ||
        productName === 'curry leaves' || productName === 'feuilles de curry') {
      if (item.estimated_price > 10) {
        return 0.01;
      }
    }
    
    if ((productName === 'eau' || productName === 'water' || productName.includes('eau')) && 
        item.estimated_price > 1) {
      return 0.001;
    }
    
    if ((productName.includes('steak') || productName.includes('viande') || productName.includes('boeuf') || 
         productName.includes('porc') || productName.includes('poulet') || productName.includes('agneau')) && 
        unit === 'g' && item.estimated_price > 100) {
      const pricePerKg = productName.includes('flank') ? 25 : 20;
      return pricePerKg / 1000;
    }
    
    return item.estimated_price;
  };

  const handleSectionClick = () => {
    if (inStoreMode && onSectionEnter && currentSection !== section.id) {
      onSectionEnter(section.id);
      setSectionStartTime(Date.now());
    }
    setIsExpanded(!isExpanded);
  };

  const handleSectionComplete = () => {
    if (inStoreMode && onSectionExit && sectionStartTime) {
      const timeSpent = Math.round((Date.now() - sectionStartTime) / 1000);
      onSectionExit(section.id);
    }
  };

  React.useEffect(() => {
    if (sectionStats.isComplete && sectionStartTime) {
      handleSectionComplete();
    }
  }, [sectionStats.isComplete, sectionStartTime, handleSectionComplete]);

  const isCurrentSection = currentSection === section.id;

  return (
    <Card className={cn(
      "transition-all duration-200",
      isCurrentSection && inStoreMode && "ring-2 ring-primary shadow-lg",
      sectionStats.isComplete && "bg-green-50 border-green-200",
      className
    )}>
      <CardHeader 
        className={cn(
          "pb-3 cursor-pointer",
          inStoreMode && "pb-4"
        )}
        onClick={handleSectionClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Section icon and name */}
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-2xl",
                inStoreMode && "text-3xl"
              )}>
                {section.icon}
              </span>
              <div>
                <h3 className={cn(
                  "font-semibold flex items-center gap-2",
                  inStoreMode ? "text-lg" : "text-base"
                )}>
                  {section.name}
                  {isCurrentSection && inStoreMode && (
                    <Badge variant="default" className="bg-blue-500">
                      <MapPin className="w-3 h-3 mr-1" />
                      Vous êtes ici
                    </Badge>
                  )}
                </h3>
                {inStoreMode && (
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-muted-foreground">
                      {sectionStats.checkedCount}/{sectionStats.totalItems} articles
                    </span>
                    {showPrices && sectionStats.totalValue > 0 && (
                      <span className="text-sm font-medium text-green-600">
                        {sectionStats.totalValue.toFixed(2)}€
                      </span>
                    )}
                    {estimatedTime && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{estimatedTime} min</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Completion indicator */}
            {sectionStats.isComplete && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-green-500"
              >
                <CheckCircle2 className="w-5 h-5" />
              </motion.div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Progress badge */}
            <Badge 
              variant={sectionStats.isComplete ? "default" : "secondary"}
              className={cn(
                sectionStats.isComplete && "bg-green-500"
              )}
            >
              {Math.round(sectionStats.progressPercentage)}%
            </Badge>

            {/* Expand/collapse button */}
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Progress bar for in-store mode */}
        {inStoreMode && (
          <div className="mt-3">
            <Progress 
              value={sectionStats.progressPercentage} 
              className={cn(
                "h-2",
                sectionStats.isComplete && "bg-green-200"
              )}
            />
          </div>
        )}
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className={cn(
              "pt-0 space-y-3",
              inStoreMode && "space-y-4"
            )}>
              {section.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="text-4xl mb-2">{section.icon}</div>
                  <p>Aucun article dans ce rayon</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {section.items.map((item) => (
                    <InStoreItem
                      key={item.id}
                      item={item}
                      isChecked={checkedItems.has(item.id)}
                      inStoreMode={inStoreMode}
                      showPrices={showPrices}
                      onCheck={onItemCheck}
                      onQuantityChange={onItemQuantityChange}
                      onEdit={onItemEdit}
                      onRemove={onItemRemove}
                      onVoiceCommand={onItemVoiceCommand}
                    />
                  ))}
                </AnimatePresence>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default ShoppingSection;