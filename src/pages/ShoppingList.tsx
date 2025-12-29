import { useState, useMemo } from "react";
import { MaterialCard, MaterialCardContent, MaterialCardHeader } from "@/components/ui/material/Card";
import { MaterialButton } from "@/components/ui/material/Button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  ShoppingCart, 
  Plus, 
  Share2, 
  PackagePlus,
  Trash2,
  Euro,
  Loader2,
  Filter,
  Search,
  Store,
  CheckCircle2,
  CheckSquare,
  Square
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useShoppingList } from "@/hooks/useShoppingList";
import ShoppingItemCard from "@/components/shopping/ShoppingItemCard";
import AddShoppingItemDialog from "@/components/shopping/AddShoppingItemDialog";
import EditShoppingItemDialog from "@/components/shopping/EditShoppingItemDialog";
import { SmartGroceryInput } from "@/components/shopping/SmartGroceryInput";
import { useToast } from "@/hooks/use-toast";
import { ShoppingItem } from "@/hooks/useShoppingList";

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

const ShoppingList = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState("Tous");
  const [showPurchased, setShowPurchased] = useState(true);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showAddToInventoryDialog, setShowAddToInventoryDialog] = useState(false);
  const [showClearPurchasedDialog, setShowClearPurchasedDialog] = useState(false);
  const [showDeleteSelectedDialog, setShowDeleteSelectedDialog] = useState(false);
  
  const { 
    shoppingList, 
    loading, 
    addMultipleToShoppingList,
    updateShoppingItem,
    togglePurchased, 
    removeFromShoppingList,
    removeMultipleFromShoppingList,
    toggleMultiplePurchased,
    addAllToInventory,
    clearPurchased,
    getTotalEstimatedCost,
    getPurchasedCount,
    generateShareableList,
    refetch
  } = useShoppingList();
  
  const { toast } = useToast();

  const filteredItems = useMemo(() => {
    return shoppingList.filter(item => {
      const matchesSearch = item.product?.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSection = selectedSection === "Tous" || item.store_section === selectedSection;
      const matchesVisibility = showPurchased || !item.is_purchased;
      return matchesSearch && matchesSection && matchesVisibility;
    });
  }, [shoppingList, searchQuery, selectedSection, showPurchased]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};
    
    // Group by store section for optimal shopping path
    STORE_SECTIONS.forEach(section => {
      const sectionItems = filteredItems.filter(item => item.store_section === section);
      if (sectionItems.length > 0) {
        groups[section] = sectionItems;
      }
    });

    // Add items without section to "Autres"
    const itemsWithoutSection = filteredItems.filter(item => !item.store_section || !STORE_SECTIONS.includes(item.store_section));
    if (itemsWithoutSection.length > 0) {
      groups["Autres"] = itemsWithoutSection;
    }
    
    return groups;
  }, [filteredItems]);

  const handleShare = async () => {
    const shareText = generateShareableList();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ma liste de courses',
          text: shareText
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareText);
      toast({
        title: "Liste copiée",
        description: "La liste a été copiée dans le presse-papiers."
      });
    }
  };

  const handleAddAllToInventoryClick = () => {
    const purchasedCount = getPurchasedCount();
    if (purchasedCount === 0) {
      toast({
        title: "Aucun produit acheté",
        description: "Cochez d'abord les produits que vous avez achetés."
      });
      return;
    }
    setShowAddToInventoryDialog(true);
  };

  const handleAddAllToInventoryConfirm = async () => {
    await addAllToInventory();
    setShowAddToInventoryDialog(false);
  };

  const handleClearPurchasedClick = () => {
    const purchasedCount = getPurchasedCount();
    if (purchasedCount === 0) {
      toast({
        title: "Aucun produit acheté",
        description: "Il n'y a pas de produits achetés à supprimer."
      });
      return;
    }
    setShowClearPurchasedDialog(true);
  };

  const handleClearPurchasedConfirm = async () => {
    await clearPurchased();
    setShowClearPurchasedDialog(false);
  };

  const handleEditItem = (item: ShoppingItem) => {
    setEditingItem(item);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async (id: string, updates: {
    productName: string;
    quantity: number;
    unit: string;
    category: string;
    estimatedPrice?: number;
    storeSection?: string;
  }) => {
    await updateShoppingItem(id, updates);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleDeleteSelectedClick = () => {
    if (selectedItems.size === 0) {
      toast({
        title: "Aucun produit sélectionné",
        description: "Sélectionnez d'abord les produits à supprimer."
      });
      return;
    }
    setShowDeleteSelectedDialog(true);
  };

  const handleDeleteSelectedConfirm = async () => {
    await removeMultipleFromShoppingList(Array.from(selectedItems));
    setSelectedItems(new Set());
    setShowDeleteSelectedDialog(false);
  };

  const handleMarkSelectedAsPurchased = async (isPurchased: boolean) => {
    if (selectedItems.size === 0) {
      toast({
        title: "Aucun produit sélectionné",
        description: "Sélectionnez d'abord les produits à modifier."
      });
      return;
    }

    await toggleMultiplePurchased(Array.from(selectedItems), isPurchased);
    setSelectedItems(new Set());
  };

  const handleSmartItemsAdded = async (items: any[]) => {
    console.log(`✅ ${items.length} items added via smart input`);
    // La fonction addMultipleToShoppingList s'occupe déjà du refresh
  };

  const getTotalItems = () => filteredItems.length;
  const getRemainingItems = () => filteredItems.filter(item => !item.is_purchased).length;
  const getCompletionPercentage = () => {
    const total = getTotalItems();
    if (total === 0) return 0;
    return Math.round((getPurchasedCount() / total) * 100);
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
          <h1 className="text-2xl font-bold">Liste de courses</h1>
          <div className="flex gap-2">
            <MaterialButton onClick={handleShare} variant="outlined" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Partager
            </MaterialButton>
            <AddShoppingItemDialog />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <MaterialCard variant="elevated">
            <MaterialCardContent className="p-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{getRemainingItems()}</p>
                  <p className="text-sm text-muted-foreground">À acheter</p>
                </div>
              </div>
            </MaterialCardContent>
          </MaterialCard>
          
          <MaterialCard variant="elevated">
            <MaterialCardContent className="p-4">
              <div className="flex items-center gap-2">
                {getTotalEstimatedCost() > 0 ? (
                  <Euro className="w-5 h-5 text-green-500" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
                <div>
                  {getTotalEstimatedCost() > 0 ? (
                    <>
                      <p className="text-2xl font-bold">{getTotalEstimatedCost().toFixed(2)}€</p>
                      <p className="text-sm text-muted-foreground">Budget estimé</p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold">{getCompletionPercentage()}%</p>
                      <p className="text-sm text-muted-foreground">Complété</p>
                    </>
                  )}
                </div>
              </div>
            </MaterialCardContent>
          </MaterialCard>
        </div>
      </div>

      {/* Smart Grocery Input */}
      <SmartGroceryInput 
        onItemsAdded={handleSmartItemsAdded}
        addMultipleToShoppingList={addMultipleToShoppingList}
        defaultMode="text"
        className="mb-4"
      />

      {/* Actions rapides */}
      {getPurchasedCount() > 0 && (
        <MaterialCard variant="elevated">
          <MaterialCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{getPurchasedCount()} produit(s) acheté(s)</p>
                <p className="text-sm text-muted-foreground">
                  Transférer vers l'inventaire ou nettoyer la liste
                </p>
              </div>
              <div className="flex gap-2">
                <MaterialButton
                  onClick={handleAddAllToInventoryClick}
                  size="sm"
                  variant="filled"
                  icon={<PackagePlus className="w-4 h-4" />}
                >
                  Vers inventaire
                </MaterialButton>
                <MaterialButton
                  onClick={handleClearPurchasedClick}
                  variant="outlined"
                  size="sm"
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  Nettoyer
                </MaterialButton>
              </div>
            </div>
          </MaterialCardContent>
        </MaterialCard>
      )}

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
          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Rayon" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Tous">Tous les rayons</SelectItem>
              {STORE_SECTIONS.map((section) => (
                <SelectItem key={section} value={section}>
                  {section}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <MaterialButton
            variant={showPurchased ? "filled" : "outlined"}
            size="sm"
            onClick={() => setShowPurchased(!showPurchased)}
          >
            Voir achetés
          </MaterialButton>
        </div>
      </div>

      {/* Barre d'outils de sélection */}
      {filteredItems.length > 0 && (
        <MaterialCard variant="elevated">
          <MaterialCardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedItems.size > 0 
                      ? `${selectedItems.size} sélectionné(s)` 
                      : "Tout sélectionner"}
                  </span>
                </div>
                
                {selectedItems.size > 0 && (
                  <>
                    <Separator orientation="vertical" className="h-6" />
                    <div className="flex items-center gap-2">
                      <MaterialButton
                        size="sm"
                        variant="outlined"
                        onClick={() => handleMarkSelectedAsPurchased(true)}
                        icon={<CheckCircle2 className="w-4 h-4" />}
                      >
                        Marquer acheté
                      </MaterialButton>
                      <MaterialButton
                        size="sm"
                        variant="outlined"
                        onClick={() => handleMarkSelectedAsPurchased(false)}
                        icon={<Square className="w-4 h-4" />}
                      >
                        Non acheté
                      </MaterialButton>
                      <MaterialButton
                        size="sm"
                        variant="outlined"
                        onClick={handleDeleteSelectedClick}
                        icon={<Trash2 className="w-4 h-4" />}
                      >
                        Supprimer
                      </MaterialButton>
                    </div>
                  </>
                )}
              </div>
            </div>
          </MaterialCardContent>
        </MaterialCard>
      )}

      {/* Liste des produits organisée par rayon */}
      <div className="space-y-6">
        {Object.keys(groupedItems).length === 0 ? (
          <MaterialCard variant="elevated">
            <MaterialCardHeader className="pb-2">
              <div className="text-lg font-semibold flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2 text-primary" />
                Votre liste de courses
              </div>
            </MaterialCardHeader>
            <MaterialCardContent>
              <p className="text-muted-foreground">
                {searchQuery || selectedSection !== "Tous" 
                  ? "Aucun produit ne correspond à votre recherche."
                  : "Votre liste de courses est vide."
                }
              </p>
            </MaterialCardContent>
          </MaterialCard>
        ) : (
          Object.entries(groupedItems).map(([section, items]) => (
            <div key={section} className="space-y-3">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold">{section}</h2>
                <Badge variant="secondary">{items.length}</Badge>
                <Badge variant="outline" className="text-xs">
                  {items.filter(item => item.is_purchased).length} / {items.length} acheté(s)
                </Badge>
              </div>
              
              <div className="grid gap-3">
                {items.map((item) => (
                  <ShoppingItemCard
                    key={item.id}
                    item={item}
                    onTogglePurchased={togglePurchased}
                    onRemove={removeFromShoppingList}
                    onEdit={handleEditItem}
                    isSelected={selectedItems.has(item.id)}
                    onSelect={handleSelectItem}
                  />
                ))}
              </div>
              
              {section !== Object.keys(groupedItems).slice(-1)[0] && <Separator />}
            </div>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <EditShoppingItemDialog
        item={editingItem}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveEdit}
      />

      {/* Add to Inventory Confirmation Dialog */}
      <AlertDialog open={showAddToInventoryDialog} onOpenChange={setShowAddToInventoryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ajouter à l'inventaire</AlertDialogTitle>
            <AlertDialogDescription>
              Ajouter {getPurchasedCount()} produit(s) acheté(s) à votre inventaire ?
              Les produits seront automatiquement ajoutés avec les quantités achetées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddAllToInventoryConfirm}>
              Ajouter à l'inventaire
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Purchased Confirmation Dialog */}
      <AlertDialog open={showClearPurchasedDialog} onOpenChange={setShowClearPurchasedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer les produits achetés</AlertDialogTitle>
            <AlertDialogDescription>
              Supprimer {getPurchasedCount()} produit(s) acheté(s) de la liste ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearPurchasedConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Selected Confirmation Dialog */}
      <AlertDialog open={showDeleteSelectedDialog} onOpenChange={setShowDeleteSelectedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer les produits sélectionnés</AlertDialogTitle>
            <AlertDialogDescription>
              Supprimer {selectedItems.size} produit(s) sélectionné(s) de la liste ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelectedConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ShoppingList;