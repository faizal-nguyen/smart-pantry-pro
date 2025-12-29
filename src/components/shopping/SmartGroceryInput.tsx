import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Loader2,
  Check,
  X,
  Edit2,
  Sparkles,
  Volume2,
  ClipboardPaste,
  Wand2,
  AlertCircle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWhisperGroceryInput } from '@/hooks/useWhisperGroceryInput';
import { useTextGroceryParser } from '@/hooks/useTextGroceryParser';
import { QuickTemplates } from './QuickTemplates';
import { trackSmartInput } from '@/lib/analytics/smart-input';
import { cn } from '@/lib/utils';
import { DEFAULT_STORE_SECTIONS } from '@/types/shopping-list';
import { useInventory } from '@/hooks/useInventory';
import { Autocomplete, AutocompleteSuggestion } from '@/components/ui/Autocomplete';

interface ParsedGroceryItem {
  productName: string;
  quantity: number;
  unit: string;
  category: string;
  storeSection: string;
  confidence: number;
  estimatedPrice?: number;
}

interface SmartGroceryInputProps {
  onItemsAdded?: (items: ParsedGroceryItem[]) => void;
  addMultipleToShoppingList?: (items: any[]) => Promise<any>;
  className?: string;
  defaultMode?: 'text' | 'voice';
}

export const SmartGroceryInput: React.FC<SmartGroceryInputProps> = ({
  onItemsAdded,
  addMultipleToShoppingList,
  className,
  defaultMode = 'text'
}) => {
  const [activeTab, setActiveTab] = useState(defaultMode);
  const [textInput, setTextInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { products } = useInventory();

  // Hooks TOUJOURS appelés dans le même ordre
  const whisperHook = useWhisperGroceryInput();
  const textParserHook = useTextGroceryParser();

  // Déstructuration après l'appel des hooks
  const {
    isRecording,
    isProcessing: isVoiceProcessing,
    transcript,
    parsedItems: voiceParsedItems,
    recordingTime,
    startRecording,
    stopRecording,
    confirmItems: confirmVoiceItems,
    editParsedItem: editVoiceItem,
    removeParsedItem: removeVoiceItem,
    clearParsedItems: clearVoiceItems
  } = whisperHook;

  const {
    isProcessing: isTextProcessing,
    parsedItems: textParsedItems,
    parseText,
    confirmItems: confirmTextItems,
    editParsedItem: editTextItem,
    removeParsedItem: removeTextItem,
    clearParsedItems: clearTextItems,
    error: textError
  } = textParserHook;

  // Items actuels selon le mode
  const currentItems = activeTab === 'voice' ? voiceParsedItems : textParsedItems;
  const isProcessing = isVoiceProcessing || isTextProcessing;

  // Gérer le paste depuis le clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setTextInput(text);
        
        // Analytics tracking
        trackSmartInput.textPasted(text.length);
        
        // Auto-parse si le texte est assez long
        if (text.length > 10) {
          handleTextParse(text);
        }
      }
    } catch (error) {
      console.error('Erreur lecture clipboard:', error);
    }
  };

  // Parser le texte
  const handleTextParse = async (text?: string) => {
    const inputText = text || textInput;
    if (!inputText.trim()) return;
    
    await parseText(inputText);
  };

  // Confirmer les items
  const handleConfirm = async () => {
    let success = false;
    
    if (activeTab === 'voice') {
      success = await confirmVoiceItems(addMultipleToShoppingList);
    } else {
      success = await confirmTextItems(addMultipleToShoppingList);
    }
    
    if (success) {
      onItemsAdded?.(currentItems);
      setTextInput('');
    }
  };

  // Éditer un item
  const handleEdit = (index: number, field: string, value: string | number) => {
    if (activeTab === 'voice') {
      editVoiceItem(index, { [field]: value });
    } else {
      editTextItem(index, { [field]: value });
    }
  };

  // Supprimer un item
  const handleRemove = (index: number) => {
    if (activeTab === 'voice') {
      removeVoiceItem(index);
    } else {
      removeTextItem(index);
    }
  };

  // Clear tous les items
  const handleClearAll = () => {
    if (activeTab === 'voice') {
      clearVoiceItems();
    } else {
      clearTextItems();
      setTextInput('');
    }
  };

  // Auto-resize du textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [textInput]);

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <span>Ajout intelligent</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            IA Powered
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(newTab: string) => {
          const previousTab = activeTab;
          setActiveTab(newTab);
          
          // Analytics tracking
          if (previousTab !== newTab) {
            trackSmartInput.tabSwitched(previousTab as 'text' | 'voice', newTab as 'text' | 'voice');
          }
        }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text" className="gap-2">
              <ClipboardPaste className="w-4 h-4" />
              Texte/Notes
            </TabsTrigger>
            <TabsTrigger value="voice" className="gap-2">
              <Mic className="w-4 h-4" />
              Voix
            </TabsTrigger>
          </TabsList>

          {/* TAB TEXTE */}
          <TabsContent value="text" className="space-y-4">
            <div className="space-y-3">
              {/* Zone de texte avec actions */}
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  placeholder="Collez votre liste ici ou tapez directement...
Ex: 2kg tomates, 1L lait, pain complet, 6 œufs"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="min-h-[100px] pr-12 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.metaKey) {
                      handleTextParse();
                    }
                  }}
                />
                
                {/* Boutons d'action superposés */}
                <div className="absolute right-2 top-2 flex flex-col gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handlePaste}
                    title="Coller depuis le presse-papier"
                    className="h-8 w-8"
                  >
                    <ClipboardPaste className="h-4 w-4" />
                  </Button>
                  
                  {textInput && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setTextInput('')}
                      title="Effacer"
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Exemples de formats supportés */}
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Formats supportés :</p>
                  <ul className="ml-4 space-y-0.5">
                    <li>• Liste simple : tomates, lait, pain</li>
                    <li>• Avec quantités : 2kg tomates, 1L lait</li>
                    <li>• Liste à puces : - tomates\n- lait</li>
                    <li>• Depuis une recette : "Pour la tarte: farine, beurre..."</li>
                  </ul>
                </div>
              </div>

              {/* Bouton d'analyse */}
              <Button
                onClick={() => handleTextParse()}
                disabled={!textInput.trim() || isTextProcessing}
                className="w-full gap-2"
              >
                {isTextProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Analyser avec l'IA
                  </>
                )}
              </Button>
            </div>

            {/* Templates rapides */}
            <QuickTemplates onSelect={(text, templateName) => {
              setTextInput(text);
              
              // Count estimated items for analytics
              const estimatedItemCount = text.split(',').length;
              trackSmartInput.templateUsed(templateName || 'unknown', estimatedItemCount);
              
              handleTextParse(text);
            }} />

            {/* Erreur éventuelle */}
            {textError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{textError}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* TAB VOIX */}
          <TabsContent value="voice" className="space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <Button
                  size="lg"
                  variant={isRecording ? "destructive" : "default"}
                  onClick={() => {
                    console.log('🎤 Button clicked, isRecording:', isRecording);
                    if (isRecording) {
                      stopRecording();
                    } else {
                      startRecording();
                    }
                  }}
                  disabled={isVoiceProcessing}
                  className={cn(
                    "h-20 w-20 rounded-full transition-all",
                    isRecording && "animate-pulse scale-110"
                  )}
                >
                  {isVoiceProcessing ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="h-8 w-8" />
                  ) : (
                    <Mic className="h-8 w-8" />
                  )}
                </Button>
                
                {isRecording && (
                  <div className="absolute -inset-2 rounded-full border-4 border-red-500 animate-ping" />
                )}
              </div>
            </div>

            {/* Timer et visualisation */}
            {isRecording && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Enregistrement...</span>
                  <span>{recordingTime}s / 60s</span>
                </div>
                <Progress value={(recordingTime / 60) * 100} className="h-2" />
                
                <div className="flex justify-center gap-1 py-2">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-primary rounded-full"
                      animate={{
                        height: [16, 32, 16],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Transcription */}
            {transcript && !isVoiceProcessing && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <Volume2 className="w-4 h-4 mt-1 text-muted-foreground" />
                    <p className="text-sm italic flex-1">"{transcript}"</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Instructions et état */}
            {!isRecording && !transcript && voiceParsedItems.length === 0 && (
              <div className="text-center text-sm text-muted-foreground space-y-1">
                <p>Appuyez pour démarrer l'enregistrement</p>
                <p className="text-xs">
                  "2 kilos de tomates, 1 litre de lait, du pain"
                </p>
              </div>
            )}
            
            {isRecording && (
              <div className="text-center text-sm text-red-600 space-y-1">
                <p className="font-medium">🔴 En cours d'enregistrement...</p>
                <p className="text-xs">Cliquez sur le bouton pour arrêter</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* PREVIEW DES ITEMS PARSÉS */}
        <AnimatePresence mode="wait">
          {currentItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              {/* Header avec actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">
                    Produits détectés ({currentItems.length})
                  </h4>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => {
                      const newValue = !showAdvanced;
                      setShowAdvanced(newValue);
                      trackSmartInput.advancedOptionsToggled(newValue);
                    }}
                  >
                    {showAdvanced ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearAll}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Effacer
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirm}
                    className="gap-1"
                  >
                    <Check className="w-4 h-4" />
                    Ajouter ({currentItems.length})
                  </Button>
                </div>
              </div>

              {/* Liste des items */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {currentItems.map((item, index) => (
                  <motion.div
                    key={`${activeTab}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={cn(
                      "p-3 bg-background rounded-lg border transition-colors",
                      item.confidence < 0.7 && "border-orange-200 bg-orange-50/50"
                    )}
                  >
                    {/* Ligne principale */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2 flex-wrap">
                        {editingIndex === index ? (
                          <div className="relative w-full max-w-[240px]">
                            <Autocomplete
                              value={editValue}
                              onValueChange={(val) => setEditValue(val)}
                              suggestions={(products || []).map(p => ({
                                id: p.id,
                                label: p.name,
                                value: p.name,
                                section: p.category || 'Autres',
                                meta: p.unit_type || undefined,
                                payload: p
                              })) as AutocompleteSuggestion[]}
                              onSelect={(s) => {
                                setEditValue(s.value);
                                handleEdit(index, 'productName', s.value);
                                // Optional: update unit/section if desired
                              }}
                              inputClassName="h-7 border rounded px-2 text-sm w-full"
                            />
                          </div>
                        ) : (
                          <>
                            <span className="font-medium">
                              {item.quantity > 1 && `${item.quantity} `}
                              {item.unit !== 'pièce' && `${item.unit} `}
                              {item.productName}
                            </span>
                            <Badge 
                              variant="secondary" 
                              className="text-xs"
                            >
                              {item.storeSection}
                            </Badge>
                            {item.confidence < 0.7 && (
                              <Badge 
                                variant="outline" 
                                className="text-xs border-orange-300"
                              >
                                ⚠️ Vérifier
                              </Badge>
                            )}
                            {item.estimatedPrice && (
                              <span className="text-xs text-muted-foreground">
                                ~{item.estimatedPrice.toFixed(2)}€
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingIndex(index);
                            setEditValue(item.productName);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleRemove(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Options avancées */}
                    {showAdvanced && (
                      <div className="mt-2 pt-2 border-t grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            Quantité
                          </label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => 
                              handleEdit(index, 'quantity', parseInt(e.target.value) || 1)
                            }
                            className="h-7 text-xs"
                            min="1"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            Unité
                          </label>
                          <Select
                            value={item.unit}
                            onValueChange={(value) => handleEdit(index, 'unit', value)}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pièce">pièce</SelectItem>
                              <SelectItem value="kg">kg</SelectItem>
                              <SelectItem value="g">g</SelectItem>
                              <SelectItem value="L">L</SelectItem>
                              <SelectItem value="ml">ml</SelectItem>
                              <SelectItem value="paquet">paquet</SelectItem>
                              <SelectItem value="boîte">boîte</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            Rayon
                          </label>
                          <Select
                            value={item.storeSection}
                            onValueChange={(value) => handleEdit(index, 'storeSection', value)}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DEFAULT_STORE_SECTIONS.map(section => (
                                <SelectItem key={section.id} value={section.name}>
                                  {section.icon} {section.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Total estimé */}
              {currentItems.some(item => item.estimatedPrice) && (
                <div className="pt-2 border-t flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Total estimé
                  </span>
                  <span className="font-semibold">
                    ~{currentItems.reduce((sum, item) => 
                      sum + (item.estimatedPrice || 0), 0
                    ).toFixed(2)}€
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
