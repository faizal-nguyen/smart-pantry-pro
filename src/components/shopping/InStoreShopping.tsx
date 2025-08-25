import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRight,
  ShoppingCart, 
  Euro, 
  CheckCircle2,
  X,
  RotateCcw
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface InStoreShoppingProps {
  onExit: () => void;
}

const STORE_SECTIONS = [
  "Entrée",
  "Fruits & Légumes", 
  "Boucherie/Poissonnerie",
  "Charcuterie/Fromagerie",
  "Épicerie salée",
  "Épicerie sucrée",
  "Surgelés",
  "Frais/Produits laitiers",
  "Boissons",
  "Hygiène/Beauté",
  "Maison/Entretien",
  "Caisses"
];

const InStoreShopping: React.FC<InStoreShoppingProps> = ({ onExit }) => {
  const { 
    shoppingList, 
    togglePurchased,
    getTotalEstimatedCost,
    getPurchasedCount
  } = useShoppingList();

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [sessionStartTime] = useState(Date.now());
  
  const { vibrate, itemChecked, listCompleted } = useHapticFeedback({
    enabled: true
  });

  // Organiser les articles par section
  const organizedSections = useMemo(() => {
    const sections = STORE_SECTIONS.map(sectionName => {
      const items = shoppingList.filter(item => 
        item.store_section === sectionName && !item.is_purchased
      );
      return {
        name: sectionName,
        items: items
      };
    }).filter(section => section.items.length > 0);

    // Ajouter une section "Autres" pour les articles sans section
    const itemsWithoutSection = shoppingList.filter(item => 
      !item.store_section && !item.is_purchased
    );
    if (itemsWithoutSection.length > 0) {
      sections.push({
        name: "Autres",
        items: itemsWithoutSection
      });
    }

    return sections;
  }, [shoppingList]);

  // Statistiques
  const stats = useMemo(() => {
    const totalItems = shoppingList.length;
    const purchasedItems = getPurchasedCount();
    const remainingItems = totalItems - purchasedItems;
    const progressPercentage = totalItems > 0 ? (purchasedItems / totalItems) * 100 : 0;
    const sessionDuration = Math.round((Date.now() - sessionStartTime) / 1000 / 60);
    
    return {
      totalItems,
      purchasedItems,
      remainingItems,
      progressPercentage,
      sessionDuration,
      isComplete: remainingItems === 0
    };
  }, [shoppingList, getPurchasedCount, sessionStartTime]);

  // Section actuelle
  const currentSection = organizedSections[currentSectionIndex];
  const isLastSection = currentSectionIndex === organizedSections.length - 1;
  const isFirstSection = currentSectionIndex === 0;

  // Garder l'écran allumé
  useEffect(() => {
    let wakeLock: any = null;
    
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.debug('Wake lock not supported:', err);
      }
    };
    
    requestWakeLock();

    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, []);

  const handleItemToggle = useCallback((itemId: string) => {
    togglePurchased(itemId);
    itemChecked();

    // Vérifier si c'était le dernier article
    if (stats.remainingItems === 1) {
      setTimeout(() => {
        listCompleted();
      }, 500);
    }
  }, [togglePurchased, itemChecked, listCompleted, stats.remainingItems]);

  const goToNextSection = () => {
    if (!isLastSection) {
      setCurrentSectionIndex(prev => prev + 1);
      vibrate('light');
    }
  };

  const goToPreviousSection = () => {
    if (!isFirstSection) {
      setCurrentSectionIndex(prev => prev - 1);
      vibrate('light');
    }
  };

  const resetList = () => {
    if (window.confirm("Voulez-vous décocher tous les articles ?")) {
      shoppingList.forEach(item => {
        if (item.is_purchased) {
          togglePurchased(item.id);
        }
      });
      setCurrentSectionIndex(0);
    }
  };

  // Si la liste est vide ou complétée
  if (organizedSections.length === 0 || stats.isComplete) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <div className="sticky top-0 bg-gray-900 p-4 border-b border-gray-800">
          <Button 
            variant="ghost" 
            onClick={onExit}
            className="text-white hover:bg-gray-800"
          >
            <X className="w-5 h-5 mr-2" />
            Fermer
          </Button>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            {stats.isComplete ? (
              <>
                <div className="text-6xl mb-6">🎉</div>
                <h2 className="text-3xl font-bold mb-4">Courses terminées !</h2>
                <p className="text-gray-400 mb-6">
                  {stats.totalItems} articles achetés en {stats.sessionDuration} minutes
                </p>
                <div className="space-y-2 text-lg">
                  <div>Total: {getTotalEstimatedCost().toFixed(2)}€</div>
                </div>
                <div className="mt-8 space-y-3">
                  <Button 
                    onClick={resetList}
                    variant="outline"
                    className="w-full"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Recommencer
                  </Button>
                  <Button 
                    onClick={onExit}
                    className="w-full"
                  >
                    Terminer
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-6xl mb-6">🛒</div>
                <h2 className="text-2xl font-bold mb-4">Liste vide</h2>
                <p className="text-gray-400 mb-6">
                  Ajoutez des articles avant d'utiliser le mode magasin
                </p>
                <Button onClick={onExit}>
                  Retour à la liste
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header fixe */}
      <div className="sticky top-0 bg-gray-900 z-10 border-b border-gray-800">
        <div className="p-4">
          {/* Barre de progression */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">
                {stats.purchasedItems}/{stats.totalItems} articles
              </span>
              <span className="text-sm text-gray-400">
                {stats.sessionDuration} min
              </span>
            </div>
            <Progress 
              value={stats.progressPercentage} 
              className="h-3 bg-gray-800"
            />
          </div>

          {/* Section actuelle */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{currentSection?.name}</h1>
              <p className="text-gray-400">
                Section {currentSectionIndex + 1} sur {organizedSections.length}
              </p>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onExit}
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Liste des articles de la section */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSectionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-3"
          >
            {currentSection?.items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemToggle(item.id)}
                className={cn(
                  "w-full p-6 rounded-xl text-left",
                  "bg-gray-800 active:bg-gray-700",
                  "transition-all transform active:scale-95",
                  "border-2 border-transparent",
                  item.is_purchased && "opacity-50 line-through border-green-500"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-xl font-medium mb-1">
                      {item.product?.name}
                    </div>
                    <div className="text-gray-400">
                      {item.quantity} {item.unit}
                      {item.category && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {item.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {item.estimated_price && (
                      <div className="text-lg">
                        {item.estimated_price.toFixed(2)}€
                      </div>
                    )}
                    <div className={cn(
                      "w-8 h-8 rounded-full border-2",
                      item.is_purchased 
                        ? "bg-green-500 border-green-500" 
                        : "border-gray-600"
                    )}>
                      {item.is_purchased && (
                        <CheckCircle2 className="w-full h-full p-1" />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation en bas */}
      <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 p-4">
        <div className="flex gap-4">
          <Button
            size="lg"
            variant="secondary"
            onClick={goToPreviousSection}
            disabled={isFirstSection}
            className="flex-1 h-16 text-lg"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Précédent
          </Button>
          
          <Button
            size="lg"
            onClick={goToNextSection}
            disabled={isLastSection}
            className="flex-1 h-16 text-lg bg-primary hover:bg-primary/90"
          >
            Suivant
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
        
        {/* Total estimé */}
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <Euro className="w-4 h-4" />
            <span>Total estimé: </span>
            <span className="font-bold text-white">
              {getTotalEstimatedCost().toFixed(2)}€
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InStoreShopping;