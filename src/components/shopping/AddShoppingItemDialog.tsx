import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useShoppingList, NewShoppingItem } from "@/hooks/useShoppingList";

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

interface AddShoppingItemDialogProps {
  trigger?: React.ReactNode;
}

const AddShoppingItemDialog = ({ trigger }: AddShoppingItemDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<NewShoppingItem>({
    productName: "",
    quantity: 1,
    category: "",
    unit: "",
    estimatedPrice: undefined,
    storeSection: ""
  });
  
  const { addToShoppingList } = useShoppingList();

  const resetForm = () => {
    setFormData({
      productName: "",
      quantity: 1,
      category: "",
      unit: "",
      estimatedPrice: undefined,
      storeSection: ""
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName || !formData.category || !formData.unit) return;

    setLoading(true);
    try {
      await addToShoppingList(formData);
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error adding item:', error);
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button>
      <Plus className="w-4 h-4 mr-2" />
      Ajouter un produit
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter à la liste de courses</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productName">Nom du produit *</Label>
            <Input
              id="productName"
              value={formData.productName}
              onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
              placeholder="ex: Pommes Gala"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 1 }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unité *</Label>
              <Select value={formData.unit} onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Unité" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_TYPES.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Catégorie *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="storeSection">Rayon magasin (optionnel)</Label>
            <Select value={formData.storeSection} onValueChange={(value) => setFormData(prev => ({ ...prev, storeSection: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un rayon" />
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

          <div className="space-y-2">
            <Label htmlFor="estimatedPrice">Prix estimé (€, optionnel)</Label>
            <Input
              id="estimatedPrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.estimatedPrice || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                estimatedPrice: e.target.value ? parseFloat(e.target.value) : undefined 
              }))}
              placeholder="ex: 2.50"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Ajout..." : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddShoppingItemDialog;