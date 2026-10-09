import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingItem } from "@/hooks/useShoppingList";
import { useInventory } from "@/hooks/useInventory";
import { Autocomplete, AutocompleteSuggestion } from "@/components/ui/Autocomplete";
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { useOwnedValue,removeOwnedValue } from '@/lib/ownedStorage';

interface EditShoppingItemDialogProps {
  item: ShoppingItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: {
    productName: string;
    quantity: number;
    unit: string;
    category: string;
    estimatedPrice?: number;
    storeSection?: string;
  }) => Promise<unknown>;
}

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

const UNITS = [
  "kg",
  "g", 
  "L",
  "mL",
  "pièce(s)",
  "paquet(s)",
  "boîte(s)",
  "bouteille(s)"
];

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

const EditShoppingItemDialog = ({ 
  item, 
  open, 
  onOpenChange, 
  onSave 
}: EditShoppingItemDialogProps) => {
  const [saving,setSaving] = useState(false);
  const [saveError,setSaveError] = useState<string|null>(null);
  const user=useAuthenticatedUser();
  const [formData,saveFormData,storageError] = useOwnedValue(user.id,`shopping-edit:${item?.id}`,{
    productName:item?.product?.name ?? '',
    quantity:String(item?.quantity ?? 1),
    unit:item?.unit ?? item?.product?.unit_type ?? 'pièce(s)',
    category:item?.product?.category ?? 'Autres',
    estimatedPrice:item?.estimated_price ?? 0,
    storeSection:item?.store_section ?? '',
  });
  const setFormData=(value:typeof formData)=>{ try { saveFormData(value); } catch (failure) { setSaveError((failure as Error).message); } };

  const { products, loadProducts } = useInventory();

  // Perf audit 2026-05-21 — useInventory() ne charge plus `products` au
  // mount. L'autocomplete en a besoin a l'ouverture du dialog.
  useEffect(() => { void loadProducts(); }, [loadProducts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!item || saving) return;
    setSaving(true); setSaveError(null);
    try {
      const quantity=Number(formData.quantity.replace(',','.'));
      if (!formData.quantity.trim() || !Number.isFinite(quantity) || quantity<=0 || quantity>1e9) throw new Error('Indiquez une quantité positive.');
      await onSave(item.id,{ ...formData,quantity });
      removeOwnedValue(user.id,`shopping-edit:${item.id}`);onOpenChange(false);
    }
    catch (failure) { setSaveError(failure instanceof Error ? failure.message : 'Modification non confirmée.'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={value=>{ if (!saving) onOpenChange(value); }}>
      <DialogContent className="routine-dialog sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>{(saveError || storageError) && <p role="alert" className="text-destructive">{saveError || storageError}</p>}
          <DialogHeader>
            <DialogTitle>Modifier l'article</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l'article dans votre liste de courses
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="productName">Nom du produit</Label>
              <div className="relative">
                <Autocomplete
                  inputId="productName"
                  value={formData.productName}
                  onValueChange={(val) => setFormData({ ...formData, productName: val })}
                  suggestions={(products || []).map(p => ({
                    id: p.id,
                    label: p.name,
                    value: p.name,
                    section: p.category || 'Autres',
                    meta: p.unit_type || undefined,
                    payload: p
                  })) as AutocompleteSuggestion[]}
                  onSelect={(s) => setFormData({ ...formData, productName: s.value, unit: (s.meta as string) || formData.unit, category: s.payload?.category || formData.category })}
                  placeholder="Ex: Tomates"
                  className="relative"
                  inputClassName="w-full border rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantité</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  step="any"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity:e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="unit">Unité</Label>
                <Select 
                  value={formData.unit} 
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger id="unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...new Set([formData.unit,...UNITS])].map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="storeSection">Rayon du magasin</Label>
              <Select 
                value={formData.storeSection} 
                onValueChange={(value) => setFormData({ ...formData, storeSection: value })}
              >
                <SelectTrigger id="storeSection">
                  <SelectValue placeholder="Sélectionner un rayon" />
                </SelectTrigger>
                <SelectContent>
                  {STORE_SECTIONS.map((section) => (
                    <SelectItem key={section} value={section}>
                      {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="estimatedPrice">Prix estimé (€)</Label>
              <Input
                id="estimatedPrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.estimatedPrice}
                onChange={(e) => setFormData({ ...formData, estimatedPrice: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button disabled={saving || !!storageError} type="submit">
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditShoppingItemDialog;
