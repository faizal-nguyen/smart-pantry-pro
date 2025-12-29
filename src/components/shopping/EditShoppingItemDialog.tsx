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
  }) => void;
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
  const [formData, setFormData] = useState({
    productName: "",
    quantity: 1,
    unit: "pièce(s)",
    category: "Autres",
    estimatedPrice: 0,
    storeSection: ""
  });

  const { products } = useInventory();

  // Update form when item changes
  useEffect(() => {
    if (item) {
      setFormData({
        productName: item.product?.name || "",
        quantity: item.quantity,
        unit: item.product?.unit_type || "pièce(s)",
        category: item.product?.category || "Autres",
        estimatedPrice: item.estimated_price || 0,
        storeSection: item.store_section || ""
      });
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (item && formData.productName.trim()) {
      onSave(item.id, formData);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
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
                  min="0.1"
                  step="0.1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 1 })}
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
                    {UNITS.map((unit) => (
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
            <Button type="submit">
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditShoppingItemDialog;
