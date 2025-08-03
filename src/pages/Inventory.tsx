import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Package, 
  Filter,
  Loader2,
  AlertCircle
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInventory, InventoryItem } from "@/hooks/useInventory";
import ProductCard from "@/components/inventory/ProductCard";
import AddProductDialog from "@/components/inventory/AddProductDialog";
import VoiceInputButton from "@/components/inventory/VoiceInputButton";
import EditItemDialog from "@/components/inventory/EditItemDialog";

const CATEGORIES = [
  "Tous",
  "Fruits/Légumes",
  "Viandes", 
  "Produits laitiers",
  "Épicerie",
  "Surgelés",
  "Boissons",
  "Hygiène",
  "Autres"
];

const Inventory = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const { inventory, loading, deleteInventoryItem } = useInventory();

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.product?.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "Tous" || item.product?.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchQuery, selectedCategory]);

  const groupedInventory = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    
    filteredInventory.forEach(item => {
      const category = item.product?.category || "Autres";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });
    
    return groups;
  }, [filteredInventory]);

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      await deleteInventoryItem(id);
    }
  };

  const getTotalItems = () => {
    return filteredInventory.length;
  };

  const getExpiringItems = () => {
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    return filteredInventory.filter(item => {
      if (!item.expiry_date) return false;
      const expiryDate = new Date(item.expiry_date);
      return expiryDate <= threeDaysFromNow;
    }).length;
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header avec stats */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Inventaire</h1>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{getTotalItems()}</p>
                  <p className="text-sm text-muted-foreground">Produits</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{getExpiringItems()}</p>
                  <p className="text-sm text-muted-foreground">Expirent bientôt</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recherche et filtres */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Rechercher un produit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Catégorie" />
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
      </div>

      {/* Liste des produits groupés par catégorie */}
      <div className="space-y-6">
        {Object.keys(groupedInventory).length === 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Package className="w-5 h-5 mr-2 text-primary" />
                Votre inventaire
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {searchQuery || selectedCategory !== "Tous" 
                  ? "Aucun produit ne correspond à votre recherche."
                  : "Aucun produit en stock pour le moment."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedInventory).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{category}</h2>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              
              <div className="grid gap-3">
                {items.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Boutons flottants */}
      <VoiceInputButton />
      <AddProductDialog />

      {/* Dialog d'édition */}
      <EditItemDialog
        item={editingItem}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingItem(null);
        }}
      />
    </div>
  );
};

export default Inventory;