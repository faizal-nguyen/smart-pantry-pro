import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InventoryItem, useInventory } from "@/hooks/useInventory";

interface EditItemDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * 2026-05-18 — accept the parent's `updateInventoryItem` so the
   * optimistic UI update lands on the same `useInventory` instance
   * that renders the list. Without this prop the dialog instantiates
   * its own isolated hook, mutates Supabase, and the visible list
   * never refreshes (user sees no change after "Modifier").
   */
  onSubmit?: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
}

const EditItemDialog = ({ item, open, onOpenChange, onSubmit }: EditItemDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [location, setLocation] = useState("");

  // Fallback: keep the legacy behaviour when no `onSubmit` is supplied
  // (some test/storybook contexts may instantiate the dialog stand-alone).
  const localHook = useInventory();
  const updateInventoryItem = onSubmit ?? localHook.updateInventoryItem;

  useEffect(() => {
    if (item) {
      setQuantity(item.quantity.toString());
      setExpiryDate(item.expiry_date || "");
      setLocation(item.location || "");
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !quantity) return;

    setLoading(true);
    try {
      await updateInventoryItem(item.id, {
        quantity: parseFloat(quantity),
        expiry_date: expiryDate || undefined,
        location: location || undefined
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating item:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier {item.product?.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="editQuantity">Quantité *</Label>
            <Input
              id="editQuantity"
              type="number"
              step="0.01"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={`en ${item.product?.unit_type}`}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="editExpiryDate">Date d'expiration</Label>
            <Input
              id="editExpiryDate"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="editLocation">Localisation</Label>
            <Input
              id="editLocation"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="ex: Frigo, Placard cuisine..."
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Modification..." : "Modifier"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditItemDialog;