/**
 * TextBulkAddDialog — parse a free-form text into inventory items.
 *
 * User flow (2026-05-17): the user types something like
 *   "curcuma, paprika, poudre de coriandre, garam masala"
 * and gets each item added to the pantry without filling a form per
 * line.
 *
 * Implementation reuses the existing `POST /api/shopping/parse-text`
 * endpoint (same LLM pipeline used by the shopping/voice flow), then
 * threads the parsed items through `useInventory.addProduct` +
 * `addToInventory`. We don't introduce a new backend route — the
 * shopping parser already returns the right shape
 * (`{ productName, quantity, unit, category }`).
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Trash2, X } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { useToast } from '@/hooks/use-toast';
import { apiPost } from '@/lib/api';

interface ParsedItem {
  productName: string;
  quantity: number;
  unit: string;
  category?: string;
  storeSection?: string;
  confidence?: number;
}

interface ParseTextResponse {
  items: ParsedItem[];
  originalText: string;
  demo?: boolean;
}

interface TextBulkAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EXAMPLES = [
  'curcuma, paprika, poudre de coriandre, garam masala',
  '2kg de tomates, 1L de lait, paquet de pâtes',
  'sel, poivre, huile d\'olive 500ml, vinaigre balsamique',
];

export default function TextBulkAddDialog({ open, onOpenChange }: TextBulkAddDialogProps) {
  const { addProduct, addToInventory, products, loadProducts } = useInventory();
  const { toast } = useToast();

  // Perf audit 2026-05-21 — useInventory() ne charge plus `products` au
  // mount. La dedup contre le catalogue existant en a besoin.
  useEffect(() => { void loadProducts(); }, [loadProducts]);

  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [defaultLocation, setDefaultLocation] = useState('Placard');

  const canParse = text.trim().length > 0 && !parsing && !adding;
  const canAdd = items.length > 0 && !adding;

  const reset = () => {
    setText('');
    setItems([]);
    setParsing(false);
    setAdding(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleParse = async () => {
    if (!canParse) return;
    setParsing(true);
    try {
      const body = await apiPost<ParseTextResponse>('/shopping/parse-text', {
        text: text.trim(),
      });
      const parsed = body?.items ?? [];
      if (parsed.length === 0) {
        toast({
          title: 'Aucun produit détecté',
          description: 'Essaie une formulation différente (ex : « 2kg tomates »).',
          variant: 'destructive',
        });
      } else {
        setItems(parsed);
        if (body?.demo) {
          toast({
            title: 'Parsing en mode démo',
            description: 'Le service IA est indisponible — résultats d\'exemple affichés. Vérifie avant d\'ajouter.',
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast({
        title: 'Parsing échoué',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setParsing(false);
    }
  };

  const updateItem = (index: number, patch: Partial<ParsedItem>) => {
    setItems(prev => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddAll = async () => {
    if (!canAdd) return;
    setAdding(true);
    let succeeded = 0;
    let failed = 0;

    for (const item of items) {
      try {
        // Reuse existing product if name+unit_type match (cheap dedup);
        // otherwise create a fresh `products` row before linking the
        // inventory entry. The `products` table column is `unit_type`,
        // NOT `unit` (audit 2026-05-18 — sending `unit` produced a 400
        // from PostgREST and crashed every bulk add).
        const existing = products.find(
          p =>
            p.name.trim().toLowerCase() === item.productName.trim().toLowerCase() &&
            (p.unit_type ?? '').toLowerCase() === (item.unit ?? '').toLowerCase(),
        );

        const product = existing
          ? existing
          : await addProduct({
              name: item.productName.trim(),
              category: item.category ?? 'Autres',
              unit_type: item.unit || 'unité',
              barcode: null,
            } as Parameters<typeof addProduct>[0]);

        await addToInventory({
          product_id: product.id,
          quantity: item.quantity || 1,
          location: defaultLocation,
        });
        succeeded += 1;
      } catch (err) {
        failed += 1;
        console.warn('TextBulkAdd: failed to add', item.productName, err);
      }
    }

    setAdding(false);
    if (succeeded > 0) {
      toast({
        title: `${succeeded} produit${succeeded > 1 ? 's' : ''} ajouté${succeeded > 1 ? 's' : ''}`,
        description:
          failed > 0
            ? `${failed} échec${failed > 1 ? 's' : ''} — vérifie la console pour le détail.`
            : `Ajoutés à « ${defaultLocation} ».`,
      });
      handleClose(false);
    } else {
      toast({
        title: 'Aucun produit ajouté',
        description: 'Toutes les insertions ont échoué. Vérifie la connexion ou les permissions.',
        variant: 'destructive',
      });
    }
  };

  const totalQuantity = useMemo(
    () => items.reduce((acc, it) => acc + (it.quantity || 0), 0),
    [items],
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajouter par texte</DialogTitle>
          <DialogDescription>
            Tape une liste séparée par des virgules ou des sauts de ligne. Le
            parser détecte le nom, la quantité et l&apos;unité.
          </DialogDescription>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="space-y-3">
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={EXAMPLES[0]}
              rows={5}
              disabled={parsing}
              className="resize-none"
            />
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Exemples :</span>
              <ul className="mt-1 space-y-0.5">
                {EXAMPLES.map(ex => (
                  <li key={ex}>
                    <button
                      type="button"
                      className="text-left hover:text-foreground transition-colors"
                      onClick={() => setText(ex)}
                    >
                      « {ex} »
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {items.length} produit{items.length > 1 ? 's' : ''} détecté
                {items.length > 1 ? 's' : ''} ·{' '}
                <span className="tabular-nums">{totalQuantity}</span> au total
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setItems([])}
                disabled={adding}
              >
                <X className="h-4 w-4 mr-1" />
                Effacer
              </Button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <Card key={idx} className="border-border">
                  <CardContent className="p-3 flex items-center gap-2">
                    <Input
                      value={item.productName}
                      onChange={e => updateItem(idx, { productName: e.target.value })}
                      placeholder="Nom"
                      className="flex-1 h-9"
                      disabled={adding}
                    />
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={e => updateItem(idx, { quantity: Number(e.target.value) || 0 })}
                      className="w-20 h-9 tabular-nums"
                      min={0}
                      step="any"
                      disabled={adding}
                    />
                    <Input
                      value={item.unit}
                      onChange={e => updateItem(idx, { unit: e.target.value })}
                      placeholder="unité"
                      className="w-24 h-9"
                      disabled={adding}
                    />
                    {item.category && (
                      <Badge variant="secondary" className="font-normal text-xs">
                        {item.category}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(idx)}
                      disabled={adding}
                      aria-label={`Retirer ${item.productName}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Label htmlFor="bulk-location" className="text-xs text-muted-foreground shrink-0">
                Stocker dans
              </Label>
              <Input
                id="bulk-location"
                value={defaultLocation}
                onChange={e => setDefaultLocation(e.target.value)}
                placeholder="Placard / Frigo / …"
                className="h-9"
                disabled={adding}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={parsing || adding}>
            Annuler
          </Button>
          {items.length === 0 ? (
            <Button onClick={handleParse} disabled={!canParse}>
              {parsing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyse…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Parser le texte
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleAddAll} disabled={!canAdd}>
              {adding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ajout en cours…
                </>
              ) : (
                <>Ajouter {items.length} produit{items.length > 1 ? 's' : ''}</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
