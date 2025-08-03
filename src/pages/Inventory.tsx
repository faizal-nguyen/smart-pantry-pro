import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useBarcodeAPI } from "@/hooks/useBarcodeAPI";
import ProductCard from "@/components/inventory/ProductCard";
import AddProductDialog from "@/components/inventory/AddProductDialog";
import VoiceInputButton from "@/components/inventory/VoiceInputButton";
import EditItemDialog from "@/components/inventory/EditItemDialog";
import BarcodeTest from "@/components/inventory/BarcodeTest";

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
  const [testResult, setTestResult] = useState<{status: number, product?: { name: string; brand?: string; category?: string }} | null>(null);
  
  const { inventory, loading, deleteInventoryItem } = useInventory();
  const { fetchProductInfo, loading: apiLoading } = useBarcodeAPI();

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

      {/* Test API Codes-Barres (Temporaire) */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">🧪 Test API Codes-Barres</h3>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={async () => {
                console.log('🧪 Test API clicked');
                try {
                  const result = await fetchProductInfo('3017620422003');
                  console.log('📦 Test result:', result);
                  setTestResult(result);
                  alert(`Test API: ${result.status === 1 ? 'SUCCESS' : 'FAILED'}\nProduit: ${result.product?.name || 'Non trouvé'}`);
                } catch (error) {
                  console.error('❌ Test error:', error);
                  alert('Erreur lors du test API');
                }
              }}
              disabled={apiLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {apiLoading ? 'Test en cours...' : '🧪 Tester API Nutella'}
            </Button>
            
            <Button 
              onClick={() => {
                console.log('🔍 Test scan clicked');
                alert('Test scan - Vérifiez la console pour les logs');
              }}
              variant="outline"
            >
              📱 Test Scan
            </Button>
          </div>
          
          {testResult && (
            <div className="p-3 bg-white border rounded-lg">
              <h4 className="font-medium mb-2">Résultat du test:</h4>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
        
        <BarcodeTest />
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