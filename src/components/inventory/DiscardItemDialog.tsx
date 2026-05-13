/**
 * DiscardItemDialog — PRP-222 PR5
 *
 * Modal that lets the user log a food_waste_events row when they
 * throw out an inventory item. Captures reason, quantity, optional
 * notes + cost. Calls onConfirm(input) which the parent wires to
 * useFoodWaste.recordWaste and useInventory removal.
 */
import React, { useEffect, useState } from 'react';
import { InventoryItem } from '@/hooks/useInventory';
import { RecordWasteInput, WasteReason } from '@/hooks/useFoodWaste';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DiscardItemDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: RecordWasteInput) => Promise<void> | void;
}

const REASON_LABELS: Record<WasteReason, string> = {
  expired: 'Périmé',
  spoiled: 'Abîmé / moisi',
  leftover: 'Reste de repas',
  other: 'Autre',
};

export const DiscardItemDialog: React.FC<DiscardItemDialogProps> = ({
  item,
  open,
  onOpenChange,
  onConfirm,
}) => {
  const [reason, setReason] = useState<WasteReason>('expired');
  const [quantity, setQuantity] = useState<string>('1');
  const [costEur, setCostEur] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && item) {
      setReason('expired');
      setQuantity(String(item.quantity || 1));
      setCostEur('');
      setNotes('');
    }
  }, [open, item]);

  if (!item) return null;

  const handleSubmit = async () => {
    const qtyNum = parseFloat(quantity);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) return;

    const costNum = costEur.trim() === '' ? null : parseFloat(costEur);
    const cost = costNum !== null && Number.isFinite(costNum) && costNum >= 0 ? costNum : null;

    setSubmitting(true);
    try {
      await onConfirm({
        product_id: item.product_id ?? null,
        product_name: item.product?.name ?? 'Produit',
        category: item.product?.category ?? null,
        quantity: qtyNum,
        unit_type: item.product?.unit_type ?? null,
        reason,
        notes: notes.trim() || null,
        estimated_cost_eur: cost,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Jeter {item.product?.name ?? 'cet article'}</DialogTitle>
          <DialogDescription>
            On enregistre l&apos;événement pour suivre tes pertes — ça aide à mieux acheter la
            prochaine fois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="discard-reason">Pourquoi ?</Label>
            <Select value={reason} onValueChange={v => setReason(v as WasteReason)}>
              <SelectTrigger id="discard-reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(REASON_LABELS) as WasteReason[]).map(r => (
                  <SelectItem key={r} value={r}>
                    {REASON_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="discard-quantity">Quantité</Label>
              <Input
                id="discard-quantity"
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discard-cost">Coût estimé (€, optionnel)</Label>
              <Input
                id="discard-cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={costEur}
                onChange={e => setCostEur(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="discard-notes">Note (optionnel)</Label>
            <Textarea
              id="discard-notes"
              placeholder="Détails utiles…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Enregistrement…' : 'Confirmer & jeter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DiscardItemDialog;
