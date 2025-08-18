import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Filter,
  Loader2,
  AlertCircle,
  Sparkles,
  Grid3X3,
  List,
  MapPin
} from "lucide-react";
import { useInventory, InventoryItem } from "@/hooks/useInventory";
import { SmartProductCard } from "@/components/inventory/SmartProductCard";
import { IntelligentSearch } from "@/components/inventory/IntelligentSearch";
import { FloatingActionButton } from "@/components/inventory/FloatingActionButton";
import AddProductDialog from "@/components/inventory/AddProductDialog";
import VoiceInputButton from "@/components/inventory/VoiceInputButton";
import EditItemDialog from "@/components/inventory/EditItemDialog";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useShoppingList } from "@/hooks/useShoppingList";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Zone {
  name: string;
  icon: string;
  color: string;
  locations: string[];
}

const ZONES: Zone[] = [
  {
    name: 'Frigo',
    icon: '❄️',
    color: 'blue',
    locations: ['Frigo', 'Réfrigérateur']
  },
  {
    name: 'Congélateur',
    icon: '🧊',
    color: 'cyan',
    locations: ['Congélateur', 'Freezer']
  },
  {
    name: 'Placard',
    icon: '🥫',
    color: 'amber',
    locations: ['Placard', 'Garde-manger', 'Étagère']
  },
  {
    name: 'Autres',
    icon: '📦',
    color: 'gray',
    locations: []
  }
];

const Inventory = () => {
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'zones'>('zones');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  
  const { inventory, loading, updateInventory, deleteInventoryItem } = useInventory();
  const { addToShoppingList } = useShoppingList();
  const navigate = useNavigate();

  // Filter inventory by zone
  const filteredByZone = useMemo(() => {
    if (!selectedZone) return inventory;
    
    const zone = ZONES.find(z => z.name === selectedZone);
    if (!zone) return inventory;
    
    return inventory.filter(item => {
      if (!item.location) return zone.name === 'Autres';
      return zone.locations.some(loc => 
        item.location.toLowerCase().includes(loc.toLowerCase())
      );
    });
  }, [inventory, selectedZone]);

  // Group inventory by zones
  const inventoryByZones = useMemo(() => {
    const grouped: Record<string, InventoryItem[]> = {};
    
    ZONES.forEach(zone => {
      grouped[zone.name] = inventory.filter(item => {
        if (!item.location && zone.name === 'Autres') return true;
        if (!item.location) return false;
        return zone.locations.some(loc => 
          item.location.toLowerCase().includes(loc.toLowerCase())
        );
      });
    });
    
    return grouped;
  }, [inventory]);

  // Stats calculations
  const stats = useMemo(() => {
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    const expiringItems = inventory.filter(item => {
      if (!item.expiry_date) return false;
      const expiryDate = new Date(item.expiry_date);
      return expiryDate <= threeDaysFromNow;
    });

    const lowStockItems = inventory.filter(item => 
      item.quantity <= (item.min_quantity || 1)
    );

    return {
      totalItems: inventory.length,
      expiringThisWeek: expiringItems.length,
      lowStock: lowStockItems.length
    };
  }, [inventory]);

  const handleQuantityChange = async (id: string, quantity: number) => {
    await updateInventory(id, { quantity });
  };

  const handleMoveToShoppingList = async (item: InventoryItem) => {
    await addToShoppingList({
      productName: item.product?.name || '',
      quantity: 1,
      unit: item.unit || 'unité',
      category: item.product?.category || 'Autres'
    });
    
    toast({
      title: "Ajouté aux courses",
      description: `${item.product?.name} a été ajouté à votre liste de courses`
    });
  };

  const handleConsume = async (item: InventoryItem) => {
    if (item.quantity > 1) {
      await updateInventory(item.id, { quantity: item.quantity - 1 });
    } else {
      await deleteInventoryItem(item.id);
    }
    
    toast({
      title: "Produit consommé",
      description: `${item.product?.name} a été marqué comme consommé`
    });
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setEditDialogOpen(true);
  };

  const handleFindRecipes = (item: InventoryItem) => {
    navigate(`/recipes?ingredient=${item.product?.name}`);
  };

  const handleSubstitute = (item: InventoryItem) => {
    toast({
      title: "Recherche de substituts",
      description: "Cette fonctionnalité arrive bientôt !"
    });
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSelectedZone(null);
  };

  const handleRecipeSelect = (recipeId: string) => {
    navigate(`/recipes/${recipeId}`);
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
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header Intelligent */}
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Mon Inventaire Intelligent</h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos produits avec intelligence
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'zones' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('zones')}
            >
              <MapPin className="w-4 h-4 mr-1" />
              Zones
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <IntelligentSearch
          onCategorySelect={handleCategorySelect}
          onRecipeSelect={handleRecipeSelect}
        />

        {/* Quick Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Badge 
            variant="outline" 
            className={cn(
              "cursor-pointer whitespace-nowrap transition-colors",
              stats.expiringThisWeek > 0 && "border-red-500 text-red-500"
            )}
          >
            🔴 Expire bientôt ({stats.expiringThisWeek})
          </Badge>
          
          {ZONES.map(zone => (
            <Badge
              key={zone.name}
              variant={selectedZone === zone.name ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setSelectedZone(selectedZone === zone.name ? null : zone.name)}
            >
              {zone.icon} {zone.name}
            </Badge>
          ))}
        </div>

        {/* Stats Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{stats.totalItems}</p>
                <p className="text-sm text-muted-foreground">Produits total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-500">{stats.expiringThisWeek}</p>
                <p className="text-sm text-muted-foreground">Expirent bientôt</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">{stats.lowStock}</p>
                <p className="text-sm text-muted-foreground">Stock faible</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {viewMode === 'zones' ? (
        <div className="space-y-6">
          {ZONES.map(zone => {
            const zoneItems = inventoryByZones[zone.name];
            if (zoneItems.length === 0) return null;
            
            return (
              <motion.div
                key={zone.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{zone.icon}</span>
                  <h2 className="text-xl font-semibold">{zone.name}</h2>
                  <Badge variant="secondary">{zoneItems.length}</Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {zoneItems.map(item => (
                    <SmartProductCard
                      key={item.id}
                      product={item}
                      onQuantityChange={handleQuantityChange}
                      onMoveToShoppingList={handleMoveToShoppingList}
                      onConsume={handleConsume}
                      onEdit={handleEdit}
                      onFindRecipes={handleFindRecipes}
                      onSubstitute={handleSubstitute}
                    />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className={cn(
          "grid gap-4",
          viewMode === 'grid' 
            ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            : "grid-cols-1"
        )}>
          {(selectedZone ? filteredByZone : inventory).map(item => (
            <SmartProductCard
              key={item.id}
              product={item}
              onQuantityChange={handleQuantityChange}
              onMoveToShoppingList={handleMoveToShoppingList}
              onConsume={handleConsume}
              onEdit={handleEdit}
              onFindRecipes={handleFindRecipes}
              onSubstitute={handleSubstitute}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {inventory.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Inventaire vide</h3>
            <p className="text-muted-foreground mb-4">
              Commencez par ajouter vos premiers produits
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Sparkles className="w-4 h-4 mr-2" />
              Ajouter un produit
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Floating Action Button */}
      <FloatingActionButton
        onCameraScan={() => toast({ title: "Scanner", description: "Fonctionnalité bientôt disponible" })}
        onVoiceInput={() => setVoiceDialogOpen(true)}
        onManualAdd={() => setAddDialogOpen(true)}
        onReceiptScan={() => toast({ title: "Scanner de ticket", description: "Fonctionnalité bientôt disponible" })}
      />

      {/* Dialogs */}
      <AddProductDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
      
      <VoiceInputButton
        onVoiceInput={() => {}}
        open={voiceDialogOpen}
        onOpenChange={setVoiceDialogOpen}
      />
      
      {editingItem && (
        <EditItemDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          item={editingItem}
          onClose={() => {
            setEditDialogOpen(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
};

export default Inventory;