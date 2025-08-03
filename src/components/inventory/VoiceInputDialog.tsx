import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mic, MicOff, Volume2, Edit3, Check, X, Loader2 } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { parseVoiceInput, ParsedProduct, examplePhrases } from "@/utils/voiceParser";
import { useInventory } from "@/hooks/useInventory";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  "Fruits/Légumes",
  "Viandes", 
  "Produits laitiers",
  "Épicerie",
  "Surgelés",
  "Boissons",
  "Hygiène",
  "Autres"
];

const UNIT_TYPES = [
  "unité(s)",
  "kg", 
  "g",
  "L",
  "ml",
  "cl",
  "paquet(s)",
  "boîte(s)",
  "bouteille(s)",
  "pot(s)",
  "sachet(s)"
];

interface VoiceInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VoiceInputDialog = ({ open, onOpenChange }: VoiceInputDialogProps) => {
  const [continuousMode, setContinuousMode] = useState(false);
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    quantity: string;
    unit: string;
    category: string;
  }>({ name: '', quantity: '', unit: '', category: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const { toast } = useToast();
  const { products, addProduct, addToInventory } = useInventory();

  const {
    isListening,
    transcript,
    confidence,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition({
    language: 'fr-FR',
    continuous: continuousMode,
    interimResults: true
  });

  useEffect(() => {
    if (transcript && !isListening) {
      handleTranscriptReceived(transcript);
    }
  }, [transcript, isListening]);

  const handleTranscriptReceived = (text: string) => {
    setIsProcessing(true);
    
    setTimeout(() => {
      const result = parseVoiceInput(text);
      
      if (result.success && result.products.length > 0) {
        setParsedProducts(prev => [...prev, ...result.products]);
        toast({
          title: "Produits détectés",
          description: `${result.products.length} produit(s) extrait(s) de votre message.`
        });
      } else {
        toast({
          variant: "destructive",
          title: "Parsing échoué",
          description: "Je n'ai pas pu comprendre votre demande. Essayez d'être plus précis."
        });
      }
      
      resetTranscript();
      setIsProcessing(false);
      
      if (continuousMode) {
        setTimeout(() => startListening(), 1000);
      }
    }, 500);
  };

  const handleStartListening = () => {
    if (continuousMode && parsedProducts.length > 0) {
      setParsedProducts([]);
    }
    startListening();
  };

  const handleStopListening = () => {
    stopListening();
    setContinuousMode(false);
  };

  const handleEditProduct = (index: number, product: ParsedProduct) => {
    setEditingIndex(index);
    setEditForm({
      name: product.name,
      quantity: product.quantity.toString(),
      unit: product.unit,
      category: 'Autres'
    });
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null) {
      const updatedProducts = [...parsedProducts];
      updatedProducts[editingIndex] = {
        ...updatedProducts[editingIndex],
        name: editForm.name,
        quantity: parseFloat(editForm.quantity),
        unit: editForm.unit
      };
      setParsedProducts(updatedProducts);
      setEditingIndex(null);
    }
  };

  const handleRemoveProduct = (index: number) => {
    setParsedProducts(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddToInventory = async () => {
    setIsProcessing(true);
    
    try {
      for (const parsedProduct of parsedProducts) {
        // Chercher si le produit existe déjà
        let existingProduct = products.find(p => 
          p.name.toLowerCase() === parsedProduct.name.toLowerCase()
        );

        // Si le produit n'existe pas, le créer
        if (!existingProduct) {
          existingProduct = await addProduct({
            name: parsedProduct.name,
            category: editForm.category || 'Autres',
            unit_type: parsedProduct.unit
          });
        }

        // Ajouter à l'inventaire
        await addToInventory({
          product_id: existingProduct.id,
          quantity: parsedProduct.quantity
        });
      }

      toast({
        title: "Produits ajoutés",
        description: `${parsedProducts.length} produit(s) ajouté(s) à votre inventaire.`
      });

      setParsedProducts([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding products:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter les produits à l'inventaire."
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setParsedProducts([]);
    resetTranscript();
    setEditingIndex(null);
    setContinuousMode(false);
    if (isListening) stopListening();
  };

  if (!isSupported) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconnaissance vocale non supportée</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <p className="text-muted-foreground">
              Votre navigateur ne supporte pas la reconnaissance vocale.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) reset();
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary" />
            Ajouter par la voix
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contrôles de reconnaissance */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={isListening ? handleStopListening : handleStartListening}
                    variant={isListening ? "destructive" : "default"}
                    className="flex items-center gap-2"
                    disabled={isProcessing}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-4 h-4" />
                        Arrêter
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        Commencer
                      </>
                    )}
                  </Button>
                  
                  {isProcessing && (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setContinuousMode(!continuousMode)}
                  className={continuousMode ? 'bg-primary text-primary-foreground' : ''}
                >
                  Mode continu
                </Button>
              </div>

              {/* Status de l'écoute */}
              {isListening && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  Écoute en cours...
                </div>
              )}

              {/* Transcript en temps réel */}
              {transcript && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Volume2 className="w-3 h-3" />
                    <span className="text-xs text-muted-foreground">
                      Texte reconnu (confiance: {Math.round(confidence * 100)}%)
                    </span>
                  </div>
                  <p className="italic">"{transcript}"</p>
                </div>
              )}

              {error && (
                <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Exemples */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Exemples de phrases</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xs text-muted-foreground space-y-1">
                {examplePhrases.slice(0, 4).map((phrase, index) => (
                  <div key={index}>• {phrase}</div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Produits détectés */}
          {parsedProducts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  Produits détectés
                  <Badge variant="secondary">{parsedProducts.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-2">
                  {parsedProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      {editingIndex === index ? (
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <Input
                            value={editForm.quantity}
                            onChange={(e) => setEditForm(prev => ({ ...prev, quantity: e.target.value }))}
                            placeholder="Quantité"
                            type="number"
                            step="0.01"
                          />
                          <Select value={editForm.unit} onValueChange={(value) => setEditForm(prev => ({ ...prev, unit: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNIT_TYPES.map(unit => (
                                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Nom du produit"
                          />
                        </div>
                      ) : (
                        <div className="flex-1">
                          <span className="font-medium">{product.quantity} {product.unit}</span>
                          <span className="ml-2">{product.name}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {Math.round(product.confidence * 100)}%
                          </Badge>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1 ml-2">
                        {editingIndex === index ? (
                          <>
                            <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingIndex(null)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => handleEditProduct(index, product)}>
                              <Edit3 className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleRemoveProduct(index)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  <Label>Catégorie par défaut</Label>
                  <Select value={editForm.category} onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button 
                    onClick={handleAddToInventory}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? "Ajout..." : `Ajouter ${parsedProducts.length} produit(s)`}
                  </Button>
                  <Button variant="outline" onClick={() => setParsedProducts([])}>
                    Effacer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceInputDialog;