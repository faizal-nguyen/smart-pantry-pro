import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  MapPin, 
  ShoppingCart, 
  Euro, 
  CheckCircle2, 
  Plus,
  Settings,
  Users,
  Mic,
  MicOff,
  Clock
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ShoppingListItem, StoreSection, InStoreModeConfig, DEFAULT_IN_STORE_CONFIG } from '@/types/shopping-list';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useShoppingPatterns } from '@/hooks/useShoppingPatterns';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import ShoppingSection from './ShoppingSection';
import AddShoppingItemDialog from './AddShoppingItemDialog';

interface InStoreShoppingProps {
  items: ShoppingListItem[];
  sections: StoreSection[];
  checkedItems: Set<string>;
  config?: InStoreModeConfig;
  collaborators?: Array<{ id: string; name: string; avatar_url?: string; current_section?: string }>;
  onItemCheck: (item: ShoppingListItem) => void;
  onItemQuantityChange?: (item: ShoppingListItem, newQuantity: number) => void;
  onItemEdit?: (item: ShoppingListItem) => void;
  onItemRemove?: (item: ShoppingListItem) => void;
  onExit: () => void;
  onConfigChange?: (config: InStoreModeConfig) => void;
  className?: string;
}

const InStoreShopping: React.FC<InStoreShoppingProps> = ({
  items,
  sections,
  checkedItems,
  config = DEFAULT_IN_STORE_CONFIG,
  collaborators = [],
  onItemCheck,
  onItemQuantityChange,
  onItemEdit,
  onItemRemove,
  onExit,
  onConfigChange,
  className
}) => {
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [sessionStartTime] = useState(Date.now());
  const [sectionStartTime, setSectionStartTime] = useState<number | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { vibrate, listCompleted, itemChecked } = useHapticFeedback({
    enabled: config.features.hapticFeedback
  });
  
  const { getOptimalOrder, recordSectionVisit } = useShoppingPatterns();
  
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript,
    isSupported: isVoiceSupported 
  } = useSpeechRecognition({
    language: 'fr-FR',
    continuous: true
  });

  // Keep screen on if enabled
  useEffect(() => {
    let wakeLock: any = null;
    
    if (config.features.keepScreenOn && 'wakeLock' in navigator) {
      const requestWakeLock = async () => {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.debug('Wake lock not supported:', err);
        }
      };
      requestWakeLock();
    }

    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, [config.features.keepScreenOn]);

  // Organize items by sections with smart reordering
  const organizedSections = useMemo(() => {
    const sectionMap = new Map<string, ShoppingListItem[]>();
    
    // Initialize sections
    sections.forEach(section => {
      sectionMap.set(section.id, []);
    });

    // Distribute items to sections
    items.forEach(item => {
      const sectionId = sections.find(s => s.name === item.store_section)?.id || 'unknown';
      if (!sectionMap.has(sectionId)) {
        sectionMap.set(sectionId, []);
      }
      sectionMap.get(sectionId)!.push(item);
    });

    // Apply smart reordering if enabled
    let orderedItems = items;
    if (config.features.smartReorder) {
      orderedItems = getOptimalOrder(items);
    }

    // Build sections with items
    const result = sections.map(section => ({
      ...section,
      items: sectionMap.get(section.id) || []
    })).filter(section => section.items.length > 0);

    // Add unknown section if there are items without a proper section
    const unknownItems = sectionMap.get('unknown') || [];
    if (unknownItems.length > 0) {
      result.push({
        id: 'unknown',
        name: 'Autres',
        icon: '📦',
        color: 'bg-gray-100 text-gray-700',
        order: 999,
        items: unknownItems
      });
    }

    return result.sort((a, b) => a.order - b.order);
  }, [items, sections, config.features.smartReorder, getOptimalOrder]);

  // Calculate overall statistics
  const stats = useMemo(() => {
    const totalItems = items.length;
    const checkedCount = items.filter(item => checkedItems.has(item.id)).length;
    const remainingItems = totalItems - checkedCount;
    const progressPercentage = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;
    
    const currentTotal = items
      .filter(item => checkedItems.has(item.id))
      .reduce((sum, item) => {
        const correctedPrice = getCorrectedPrice(item);
        return sum + (correctedPrice ? correctedPrice * item.quantity : 0);
      }, 0);
    
    const estimatedTotal = items.reduce((sum, item) => {
      const correctedPrice = getCorrectedPrice(item);
      return sum + (correctedPrice ? correctedPrice * item.quantity : 0);
    }, 0);

    const sessionDuration = Math.round((Date.now() - sessionStartTime) / 1000 / 60); // in minutes

    return {
      totalItems,
      checkedCount,
      remainingItems,
      progressPercentage,
      currentTotal,
      estimatedTotal,
      sessionDuration,
      isComplete: remainingItems === 0
    };
  }, [items, checkedItems, sessionStartTime]);

  // Helper function to get corrected price
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

  // Handle section navigation
  const handleSectionEnter = useCallback((sectionId: string) => {
    setCurrentSection(sectionId);
    setSectionStartTime(Date.now());
    
    if (config.features.hapticFeedback) {
      vibrate('light');
    }
  }, [config.features.hapticFeedback, vibrate]);

  const handleSectionExit = useCallback((sectionId: string) => {
    if (sectionStartTime) {
      const timeSpent = Math.round((Date.now() - sectionStartTime) / 1000);
      recordSectionVisit(sectionId, timeSpent);
    }
    setSectionStartTime(null);
  }, [sectionStartTime, recordSectionVisit]);

  // Handle item check with haptic feedback
  const handleItemCheck = useCallback((item: ShoppingListItem) => {
    onItemCheck(item);
    
    if (config.features.hapticFeedback) {
      if (checkedItems.has(item.id)) {
        vibrate('light'); // unchecking
      } else {
        itemChecked(); // checking
      }
    }

    // Check if list is completed
    if (stats.remainingItems === 1 && !checkedItems.has(item.id)) {
      setTimeout(() => {
        if (config.features.hapticFeedback) {
          listCompleted();
        }
      }, 500);
    }
  }, [onItemCheck, checkedItems, config.features.hapticFeedback, vibrate, itemChecked, listCompleted, stats.remainingItems]);

  // Handle voice commands
  useEffect(() => {
    if (transcript && !isListening && config.features.voiceCheck) {
      const command = transcript.toLowerCase().trim();
      
      // Global voice commands
      if (command.includes('suivant') || command.includes('next')) {
        // Move to next section with items
        const currentIndex = organizedSections.findIndex(s => s.id === currentSection);
        const nextSection = organizedSections[currentIndex + 1];
        if (nextSection) {
          handleSectionEnter(nextSection.id);
        }
      } else if (command.includes('précédent') || command.includes('previous')) {
        const currentIndex = organizedSections.findIndex(s => s.id === currentSection);
        const prevSection = organizedSections[currentIndex - 1];
        if (prevSection) {
          handleSectionEnter(prevSection.id);
        }
      }
      
      resetTranscript();
    }
  }, [transcript, isListening, config.features.voiceCheck, currentSection, organizedSections, handleSectionEnter, resetTranscript]);

  const handleVoiceToggle = () => {
    if (isVoiceActive && isListening) {
      stopListening();
      setIsVoiceActive(false);
    } else if (!isListening && isVoiceSupported) {
      setIsVoiceActive(true);
      startListening();
    }
  };

  // Update config
  const updateConfig = (updates: Partial<InStoreModeConfig>) => {
    const newConfig = {
      ...config,
      ...updates,
      features: { ...config.features, ...updates.features },
      display: { ...config.display, ...updates.display }
    };
    onConfigChange?.(newConfig);
  };

  return (
    <div className={cn("min-h-screen bg-gray-50", className)}>
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white border-b z-50 shadow-sm">
        <div className="p-4">
          {/* Top row with back button and voice */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onExit}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Sortir
              </Button>
              
              <Badge variant="outline" className="text-xs">
                Mode Magasin
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {/* Collaborators */}
              {collaborators.length > 0 && (
                <div className="flex -space-x-2">
                  {collaborators.slice(0, 3).map(collab => (
                    <div
                      key={collab.id}
                      className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium border-2 border-white"
                      title={collab.name}
                    >
                      {collab.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {collaborators.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs border-2 border-white">
                      +{collaborators.length - 3}
                    </div>
                  )}
                </div>
              )}

              {/* Voice control */}
              {config.features.voiceCheck && isVoiceSupported && (
                <Button
                  variant={isVoiceActive ? "default" : "outline"}
                  size="sm"
                  onClick={handleVoiceToggle}
                  className={isVoiceActive ? "bg-blue-500" : ""}
                >
                  {isVoiceActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              )}

              {/* Settings */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Progress and stats */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  <span className="font-medium">
                    {stats.checkedCount}/{stats.totalItems} articles
                  </span>
                </div>
                
                {config.display.runningTotal && (
                  <div className="flex items-center gap-2">
                    <Euro className="w-5 h-5 text-green-500" />
                    <span className="text-lg font-bold text-green-600">
                      {stats.currentTotal.toFixed(2)}€
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {stats.estimatedTotal.toFixed(2)}€
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{stats.sessionDuration} min</span>
              </div>
            </div>
            
            {config.features.progressBar && (
              <Progress value={stats.progressPercentage} className="h-3" />
            )}
          </div>
          
          {/* Current section indicator */}
          {currentSection && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-blue-500" />
              <span className="text-muted-foreground">Rayon actuel:</span>
              <span className="font-medium">
                {organizedSections.find(s => s.id === currentSection)?.name}
              </span>
            </div>
          )}
        </div>

        {/* Voice feedback */}
        <AnimatePresence>
          {isVoiceActive && transcript && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-3"
            >
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                <p className="text-sm text-blue-700">
                  🎤 "{transcript}"
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t bg-gray-50"
            >
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Vibrations</span>
                  <Switch
                    checked={config.features.hapticFeedback}
                    onCheckedChange={(checked) => 
                      updateConfig({ features: { ...config.features, hapticFeedback: checked } })
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Contrôle vocal</span>
                  <Switch
                    checked={config.features.voiceCheck}
                    onCheckedChange={(checked) => 
                      updateConfig({ features: { ...config.features, voiceCheck: checked } })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total en cours</span>
                  <Switch
                    checked={config.display.runningTotal}
                    onCheckedChange={(checked) => 
                      updateConfig({ display: { ...config.display, runningTotal: checked } })
                    }
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Shopping Sections */}
      <div className="p-4 space-y-6 pb-20">
        {organizedSections.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">🛒</div>
              <h3 className="text-lg font-medium mb-2">Liste vide</h3>
              <p className="text-muted-foreground mb-4">
                Votre liste de courses est vide. Ajoutez des articles pour commencer.
              </p>
              <AddShoppingItemDialog />
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence>
            {organizedSections.map((section) => (
              <motion.div
                key={section.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <ShoppingSection
                  section={section}
                  checkedItems={checkedItems}
                  inStoreMode={true}
                  showPrices={config.display.showPrices}
                  currentSection={currentSection || undefined}
                  onItemCheck={handleItemCheck}
                  onItemQuantityChange={onItemQuantityChange}
                  onItemEdit={onItemEdit}
                  onItemRemove={onItemRemove}
                  onSectionEnter={handleSectionEnter}
                  onSectionExit={handleSectionExit}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Completion celebration */}
        <AnimatePresence>
          {stats.isComplete && stats.totalItems > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <Card className="bg-green-50 border-green-200">
                <CardContent className="py-8">
                  <div className="text-6xl mb-4">🎉</div>
                  <h2 className="text-2xl font-bold text-green-700 mb-2">
                    Courses terminées !
                  </h2>
                  <p className="text-green-600 mb-4">
                    Vous avez acheté tous vos articles en {stats.sessionDuration} minutes
                  </p>
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>{stats.totalItems} articles</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Euro className="w-4 h-4 text-green-500" />
                      <span>{stats.currentTotal.toFixed(2)}€</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-green-500" />
                      <span>{stats.sessionDuration} min</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating quick add */}
      <div className="fixed bottom-6 right-6">
        <AddShoppingItemDialog>
          <Button size="lg" className="rounded-full shadow-lg">
            <Plus className="w-5 h-5" />
          </Button>
        </AddShoppingItemDialog>
      </div>
    </div>
  );
};

export default InStoreShopping;