/**
 * ReceiptScanFlow Component
 * Complete receipt scanning workflow: capture -> validate -> add to inventory
 */
import React, { useState, useCallback } from 'react';
import { ArrowLeft, Check, ShoppingCart, AlertCircle, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ReceiptScanner } from './ReceiptScanner';
import { ProductValidationList, EnrichedProduct } from './ProductValidationList';
import { useReceiptScan } from '@/hooks/useReceiptScan';

type FlowStep = 'capture' | 'validate' | 'success';

interface ReceiptScanFlowProps {
  onComplete?: (addedCount: number) => void;
  onClose?: () => void;
}

export const ReceiptScanFlow: React.FC<ReceiptScanFlowProps> = ({
  onComplete,
  onClose,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<FlowStep>('capture');
  const [addedCount, setAddedCount] = useState(0);

  const {
    isScanning,
    scanResult,
    scanMetadata,
    error,
    selectedProducts,
    isAddingToInventory,
    scanReceipt,
    toggleProduct,
    selectAll,
    deselectAll,
    addToInventory,
    reset,
  } = useReceiptScan();

  // Handle photo capture
  const handleCapture = useCallback(async (file: File) => {
    await scanReceipt(file);
    setStep('validate');
  }, [scanReceipt]);

  // Handle adding products to inventory
  const handleAddToInventory = useCallback(async () => {
    const result = await addToInventory();
    if (result.success) {
      setAddedCount(result.count);
      setStep('success');
      toast({
        title: 'Produits ajoutes !',
        description: `${result.count} produits ont ete ajoutes a votre inventaire.`,
      });
      onComplete?.(result.count);
    } else {
      toast({
        title: 'Erreur',
        description: error || "Impossible d'ajouter les produits",
        variant: 'destructive',
      });
    }
  }, [addToInventory, error, toast, onComplete]);

  // Handle going back
  const handleBack = useCallback(() => {
    if (step === 'validate') {
      reset();
      setStep('capture');
    } else if (step === 'success') {
      reset();
      setStep('capture');
    }
  }, [step, reset]);

  // Handle close
  const handleClose = useCallback(() => {
    reset();
    onClose?.();
  }, [reset, onClose]);

  // Handle new scan
  const handleNewScan = useCallback(() => {
    reset();
    setStep('capture');
    setAddedCount(0);
  }, [reset]);

  // Render capture step
  if (step === 'capture') {
    return (
      <ReceiptScanner
        onCapture={handleCapture}
        onClose={handleClose}
        isProcessing={isScanning}
      />
    );
  }

  // Render validation step
  if (step === 'validate') {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">Valider les produits</h1>
              {scanResult && (
                <p className="text-sm text-muted-foreground">
                  {scanResult.stats.total_products} produits detectes
                  {scanResult.store && ` - ${scanResult.store}`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 pb-24">
          {/* Error message */}
          {error && (
            <Card className="mb-4 border-red-200 bg-red-50 dark:bg-red-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <p>{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scan metadata */}
          {scanMetadata && (
            <div className="flex gap-4 mb-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {(scanMetadata.processing_time_ms / 1000).toFixed(1)}s
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                ${scanMetadata.gpt_cost_usd.toFixed(4)}
              </div>
            </div>
          )}

          {/* Product list */}
          {scanResult ? (
            <ProductValidationList
              products={scanResult.products as EnrichedProduct[]}
              selectedProducts={selectedProducts}
              onToggleProduct={toggleProduct}
              onSelectAll={selectAll}
              onDeselectAll={deselectAll}
            />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                {isScanning ? 'Analyse en cours...' : 'Aucun resultat'}
              </p>
            </Card>
          )}
        </div>

        {/* Fixed bottom action bar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleBack}
              disabled={isAddingToInventory}
            >
              Reprendre photo
            </Button>
            <Button
              className="flex-1"
              onClick={handleAddToInventory}
              disabled={selectedProducts.size === 0 || isAddingToInventory}
            >
              {isAddingToInventory ? (
                'Ajout en cours...'
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Ajouter ({selectedProducts.size})
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render success step
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Produits ajoutes !</CardTitle>
            <CardDescription>
              {addedCount} produit{addedCount > 1 ? 's' : ''} {addedCount > 1 ? 'ont' : 'a'} ete ajoute{addedCount > 1 ? 's' : ''} a votre inventaire.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button onClick={handleNewScan} className="w-full">
              Scanner un autre ticket
            </Button>
            <Button variant="outline" onClick={handleClose} className="w-full">
              Fermer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default ReceiptScanFlow;
