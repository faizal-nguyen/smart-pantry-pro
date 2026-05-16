import React, { useState, useMemo, Suspense } from "react";
import { MaterialCard, MaterialCardContent } from "@/components/ui/material/Card";
import { Badge } from "@/components/ui/badge";
import { MaterialButton } from "@/components/ui/material/Button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Filter,
  Loader2,
  AlertCircle,
  Sparkles,
  Grid3X3,
  List,
  MapPin,
  Eye,
  Target,
  Gamepad2,
  Palette,
  Monitor,
  Box,
  BarChart3
} from "lucide-react";
import { useInventory, InventoryItem } from "@/hooks/useInventory";
import { useFoodWaste, RecordWasteInput } from "@/hooks/useFoodWaste";
import { SmartProductCard } from "@/components/inventory/SmartProductCard";
import DiscardItemDialog from "@/components/inventory/DiscardItemDialog";
import { IntelligentSearch } from "@/components/inventory/IntelligentSearch";
import { FloatingActionButton } from "@/components/inventory/FloatingActionButton";
import AddProductDialog from "@/components/inventory/AddProductDialog";
import VoiceInputButton from "@/components/inventory/VoiceInputButton";
import EditItemDialog from "@/components/inventory/EditItemDialog";
import { EnhancedVoiceButton } from "@/components/voice/EnhancedVoiceButton";
import { MobileBarcodeScanner } from "@/components/scanner/MobileBarcodeScanner";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useShoppingList } from "@/hooks/useShoppingList";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Dynamic imports for 3D visualization components
const SimpleInventory3D = React.lazy(() => 
  import('@/visualization/SimpleInventory3D').then(module => ({
    default: module.SimpleInventory3D
  }))
);

const NutritionProgressRings = React.lazy(() =>
  import('@/components/progress/NutritionProgressRings').then(module => ({
    default: module.NutritionProgressRings
  }))
);

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
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'zones' | '3d' | 'progress'>('zones');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeVisualizationTab, setActiveVisualizationTab] = useState('overview');
  
  const { inventory, loading, updateInventory, deleteInventoryItem, addInventory } = useInventory();
  const { addToShoppingList } = useShoppingList();
  const { recordWaste } = useFoodWaste();
  const [discardingItem, setDiscardingItem] = useState<InventoryItem | null>(null);
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

  // Transform inventory data for 3D visualization
  const inventoryFor3D = useMemo(() => {
    return inventory.map((item, index) => ({
      id: item.id,
      name: item.product?.name || 'Produit inconnu',
      category: item.product?.category || 'other',
      quantity: item.quantity,
      unit: item.unit || 'unité',
      expirationDate: item.expiry_date ? new Date(item.expiry_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      freshness: item.expiry_date ? Math.max(0, Math.min(1, 
        (new Date(item.expiry_date).getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)
      )) : 0.8,
      nutritionalValue: {
        vitamins: Math.floor(Math.random() * 100) + 50,
        minerals: Math.floor(Math.random() * 80) + 30,
        fiber: Math.floor(Math.random() * 60) + 20
      },
      location: {
        zone: item.location || 'placard',
        x: (index % 3) * 2,
        y: Math.floor(index / 3) % 3,
        z: Math.floor(index / 9) % 2
      },
      discoveryDate: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000),
      rarity: item.quantity > 5 ? 'common' : item.quantity > 2 ? 'uncommon' : item.quantity > 1 ? 'rare' : 'legendary'
    }));
  }, [inventory]);

  // Calculate average freshness
  const avgOverallFreshness = useMemo(() => {
    if (inventoryFor3D.length === 0) return 0;
    const totalFreshness = inventoryFor3D.reduce((sum, item) => sum + item.freshness, 0);
    return Math.round((totalFreshness / inventoryFor3D.length) * 100);
  }, [inventoryFor3D]);

  // Mock nutrition data for progress rings
  const nutritionData = useMemo(() => {
    const vitaminsScore = Math.min(100, inventory.length * 8 + Math.floor(Math.random() * 20));
    const varietyScore = Math.min(15, new Set(inventory.map(item => item.product?.category)).size);
    const freshnessScore = Math.floor(inventoryFor3D.reduce((sum, item) => sum + item.freshness, 0) / inventoryFor3D.length * 100) || 85;
    const balanceScore = Math.min(100, Math.floor(Math.random() * 20) + 75);

    return {
      vitamins: { 
        current: vitaminsScore,
        sources: inventory.slice(0, 3).map(item => item.product?.name).filter(Boolean),
        trend: 'increasing'
      },
      variety: { 
        current: varietyScore,
        categories: Array.from(new Set(inventory.map(item => item.product?.category)).values()).filter(Boolean),
        trend: 'stable'
      },
      freshness: { 
        current: freshnessScore,
        averageAge: Math.floor(Math.random() * 7) + 1,
        trend: 'stable'
      },
      balance: { 
        current: balanceScore,
        distribution: {
          fruits: Math.floor(Math.random() * 30) + 20,
          vegetables: Math.floor(Math.random() * 30) + 15,
          dairy: Math.floor(Math.random() * 25) + 15,
          grains: Math.floor(Math.random() * 20) + 10,
          protein: Math.floor(Math.random() * 15) + 10,
          herbs: Math.floor(Math.random() * 10) + 5
        },
        trend: 'improving'
      }
    };
  }, [inventory, inventoryFor3D]);

  const nutritionGoals = {
    vitamins: 100,
    variety: 15,
    freshness: 90,
    balance: 85
  };

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

  const handleDiscard = (item: InventoryItem) => {
    setDiscardingItem(item);
  };

  const confirmDiscard = async (input: RecordWasteInput) => {
    if (!discardingItem) return;

    const event = await recordWaste(input);
    if (!event) {
      toast({
        variant: 'destructive',
        title: "Échec de l'enregistrement",
        description: "Impossible d'enregistrer le gaspillage. Réessaye.",
      });
      return;
    }

    await deleteInventoryItem(discardingItem.id);
    toast({
      title: 'Produit jeté',
      description: `${discardingItem.product?.name ?? 'Article'} ajouté à l'historique anti-gaspi.`,
    });
  };

  // P1 polish: removed the `handleSubstitute` toast that promised
  // "fonctionnalité arrive bientôt !". SmartProductCard's onSubstitute
  // prop is now optional — wire it back when the feature actually
  // ships.

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSelectedZone(null);
  };

  const handleRecipeSelect = (recipeId: string) => {
    navigate(`/kitchen/recipes/${recipeId}`);
  };

  const handleVoiceCommand = async (parsedInput: any) => {
    if (!parsedInput) return;

    switch (parsedInput.action) {
      case 'add':
        // Ajouter au panier ou à l'inventaire
        await addToShoppingList({
          productName: parsedInput.product,
          quantity: parsedInput.quantity || 1,
          unit: parsedInput.unit || 'unité',
          category: 'Autres'
        });
        
        toast({
          title: "Produit ajouté",
          description: `${parsedInput.quantity || 1} ${parsedInput.unit || 'unité'} de ${parsedInput.product} ajouté(s) à la liste de courses`
        });
        break;
        
      case 'remove':
        // Rechercher et supprimer le produit
        const itemToRemove = inventory.find(item => 
          item.product?.name.toLowerCase().includes(parsedInput.product.toLowerCase())
        );
        
        if (itemToRemove) {
          await deleteInventoryItem(itemToRemove.id);
          toast({
            title: "Produit supprimé",
            description: `${itemToRemove.product?.name} a été retiré de l'inventaire`
          });
        } else {
          toast({
            title: "Produit non trouvé",
            description: `Impossible de trouver "${parsedInput.product}" dans l'inventaire`,
            variant: "destructive"
          });
        }
        break;
        
      case 'search':
        // Rechercher des recettes
        navigate(`/recipes?ingredient=${parsedInput.product}`);
        break;
        
      default:
        toast({
          title: "Commande non reconnue",
          description: "Veuillez réessayer avec une commande plus claire",
          variant: "destructive"
        });
    }
  };

  const handleScanSuccess = async (product: any) => {
    try {
      // Ajouter le produit scanné à l'inventaire
      await addInventory({
        productName: product.name,
        quantity: 1,
        unit: product.unit || 'unité',
        category: product.category || 'Autres',
        location: 'Placard',
        barcode: product.barcode
      });
      
      toast({
        title: "Produit ajouté",
        description: `${product.name} a été ajouté à votre inventaire`
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le produit",
        variant: "destructive"
      });
    }
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header Intelligent */}
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Mon Inventaire</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gérez vos produits intelligemment
            </p>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            <MaterialButton
              variant={viewMode === 'zones' ? 'filled' : 'outlined'}
              size="sm"
              onClick={() => setViewMode('zones')}
              icon={<MapPin className="w-4 h-4" />}
            >
              Zones
            </MaterialButton>
            <MaterialButton
              variant={viewMode === '3d' ? 'filled' : 'outlined'}
              size="sm"
              onClick={() => setViewMode('3d')}
              icon={<Box className="w-4 h-4" />}
            >
              3D
            </MaterialButton>
            <MaterialButton
              variant={viewMode === 'progress' ? 'filled' : 'outlined'}
              size="sm"
              onClick={() => setViewMode('progress')}
              icon={<Target className="w-4 h-4" />}
            >
              Nutrition
            </MaterialButton>
            <MaterialButton
              variant={viewMode === 'grid' ? 'filled' : 'outlined'}
              size="sm"
              onClick={() => setViewMode('grid')}
              icon={<Grid3X3 className="w-4 h-4" />}
            />
            <MaterialButton
              variant={viewMode === 'list' ? 'filled' : 'outlined'}
              size="sm"
              onClick={() => setViewMode('list')}
              icon={<List className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Search Bar avec Voice Button */}
        <div className="flex gap-2">
          <div className="flex-1">
            <IntelligentSearch
              onCategorySelect={handleCategorySelect}
              onRecipeSelect={handleRecipeSelect}
            />
          </div>
          <EnhancedVoiceButton
            onVoiceInput={handleVoiceCommand}
            size="default"
          />
        </div>

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
        <MaterialCard variant="elevated">
          <MaterialCardContent className="p-3 sm:p-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
              <div>
                <p className="text-xl sm:text-2xl font-bold">{stats.totalItems}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Produits</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-orange-500">{stats.expiringThisWeek}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Expirent</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-red-500">{stats.lowStock}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Stock bas</p>
              </div>
            </div>
          </MaterialCardContent>
        </MaterialCard>
      </div>

      {/* Main Content */}
      {viewMode === '3d' ? (
        <div className="space-y-6">
          <MaterialCard variant="elevated">
            <MaterialCardContent className="p-0">
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-green-100 relative rounded-lg overflow-hidden">
                <Suspense fallback={
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-sm text-gray-600">Chargement de l'environnement 3D...</p>
                    </div>
                  </div>
                }>
                  {inventoryFor3D.length > 0 && (
                    <SimpleInventory3D
                      inventoryData={inventoryFor3D}
                      userId="current_user"
                      className="w-full h-full"
                    />
                  )}
                </Suspense>
                
                {/* Overlay Info */}
                <div className="absolute top-4 right-4">
                  <MaterialCard variant="outlined" className="bg-white/90 backdrop-blur-sm">
                    <MaterialCardContent className="p-3">
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>Produits: <span className="font-medium">{inventory.length}</span></div>
                        <div>Vue: <span className="font-medium capitalize">3D Interactive</span></div>
                        <div>Status: <span className="font-medium text-green-600">Actif</span></div>
                      </div>
                    </MaterialCardContent>
                  </MaterialCard>
                </div>

                {/* Instructions */}
                <div className="absolute bottom-4 left-4">
                  <MaterialCard variant="outlined" className="bg-white/90 backdrop-blur-sm">
                    <MaterialCardContent className="p-3">
                      <div className="text-xs text-gray-600">
                        <p className="font-medium mb-1">Navigation 3D:</p>
                        <p>• Clic gauche: Rotation</p>
                        <p>• Molette: Zoom</p>
                        <p>• Clic droit: Déplacement</p>
                      </div>
                    </MaterialCardContent>
                  </MaterialCard>
                </div>
              </div>
            </MaterialCardContent>
          </MaterialCard>

          {/* Quick Stats and Actions */}
          <div className="grid md:grid-cols-2 gap-4">
            <MaterialCard variant="elevated">
              <MaterialCardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold">Statistiques détaillées</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Valeur totale estimée</span>
                    <span className="font-semibold">€{(inventory.length * 2.5).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Catégories</span>
                    <Badge variant="secondary">
                      {new Set(inventory.map(item => item.product?.category)).size} types
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Fraîcheur moyenne</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${avgOverallFreshness}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{avgOverallFreshness}%</span>
                    </div>
                  </div>
                </div>
              </MaterialCardContent>
            </MaterialCard>

            <MaterialCard variant="elevated">
              <MaterialCardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold">Actions recommandées</h3>
                </div>
                <div className="space-y-2">
                  {stats.expiringThisWeek > 0 && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-orange-50">
                      <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-orange-900">
                          {stats.expiringThisWeek} produits expirent bientôt
                        </p>
                        <p className="text-xs text-orange-700 mt-0.5">
                          Utilisez-les dans vos prochains repas
                        </p>
                      </div>
                    </div>
                  )}
                  {stats.lowStock > 0 && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-50">
                      <Package className="w-4 h-4 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">
                          {stats.lowStock} produits en stock faible
                        </p>
                        <p className="text-xs text-blue-700 mt-0.5">
                          Pensez à les réapprovisionner
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </MaterialCardContent>
            </MaterialCard>
          </div>
        </div>
      ) : viewMode === 'progress' ? (
        <div className="space-y-6">
          <MaterialCard variant="elevated">
            <MaterialCardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Anneaux de Progression Nutrition</h3>
              </div>
              
              <Suspense fallback={
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-sm text-gray-600">Chargement des anneaux de progression...</p>
                  </div>
                </div>
              }>
                <NutritionProgressRings
                  nutritionData={nutritionData}
                  goals={nutritionGoals}
                  timeframe="daily"
                  size="large"
                  showLabels={true}
                  showStats={true}
                  onRingClick={(ringId) => {
                    toast({
                      title: "Détails nutritionnels",
                      description: `Affichage des détails pour: ${ringId}`
                    });
                  }}
                />
              </Suspense>
            </MaterialCardContent>
          </MaterialCard>

          {/* Additional Nutrition Insights */}
          <div className="grid md:grid-cols-2 gap-4">
            <MaterialCard variant="elevated">
              <MaterialCardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold">Tendances Hebdomadaires</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Progression moyenne</span>
                    <span className="font-medium">86%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Meilleur jour</span>
                    <span className="font-medium">Samedi (94%)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Série actuelle</span>
                    <span className="font-medium text-green-600">5 jours</span>
                  </div>
                </div>
              </MaterialCardContent>
            </MaterialCard>

            <MaterialCard variant="elevated">
              <MaterialCardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold">Objectifs</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Objectifs quotidiens</span>
                    <Badge className="bg-green-100 text-green-800">3/4 Complétés</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Objectifs hebdomadaires</span>
                    <Badge className="bg-yellow-100 text-yellow-800">En cours</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Objectifs mensuels</span>
                    <Badge variant="outline">En attente</Badge>
                  </div>
                </div>
              </MaterialCardContent>
            </MaterialCard>
          </div>
        </div>
      ) : viewMode === 'zones' ? (
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
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {zoneItems.map(item => (
                    <SmartProductCard
                      key={item.id}
                      product={item}
                      onQuantityChange={handleQuantityChange}
                      onMoveToShoppingList={handleMoveToShoppingList}
                      onConsume={handleConsume}
                      onEdit={handleEdit}
                      onFindRecipes={handleFindRecipes}
                      onDiscard={handleDiscard}
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
            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
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
              onDiscard={handleDiscard}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {inventory.length === 0 && (
        <EmptyState
          icon={Package}
          title="Inventaire vide"
          description="Commence par ajouter tes premiers produits pour suivre ton garde-manger."
          action={{
            label: "Ajouter un produit",
            onClick: () => setAddDialogOpen(true),
          }}
        />
      )}

      {/* Floating Action Button */}
      {/* P1 polish: drop the `onReceiptScan` prop entirely — the
          handler used to surface a "Fonctionnalité bientôt disponible"
          toast. The FAB now hides the Ticket option until the OCR
          pipeline ships. */}
      <FloatingActionButton
        onCameraScan={() => setScannerOpen(true)}
        onVoiceInput={() => toast({ title: "Utilisez le bouton vocal en haut", description: "Le bouton vocal amélioré est maintenant dans la barre de recherche" })}
        onManualAdd={() => setAddDialogOpen(true)}
      />

      {/* Dialogs */}
      <AddProductDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
      
      
      {editingItem && (
        <EditItemDialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setEditingItem(null);
          }}
          item={editingItem}
        />
      )}

      <DiscardItemDialog
        item={discardingItem}
        open={Boolean(discardingItem)}
        onOpenChange={(open) => {
          if (!open) setDiscardingItem(null);
        }}
        onConfirm={confirmDiscard}
      />
      
      {/* Mobile Scanner */}
      <MobileBarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        mode="inventory"
      />
    </div>
  );
};

export default Inventory;