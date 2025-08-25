import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { MaterialCard, MaterialCardContent, MaterialCardHeader } from "@/components/ui/material/Card";
import { MaterialButton } from "@/components/ui/material/Button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ShoppingCart, 
  Share2, 
  PackagePlus,
  Trash2,
  Euro,
  Loader2,
  Search,
  CheckCircle2,
  Square,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Menu
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useShoppingList } from "@/hooks/useShoppingList";
import ShoppingItemCard from "@/components/shopping/ShoppingItemCard";
import EditShoppingItemDialog from "@/components/shopping/EditShoppingItemDialog";
import { SmartGroceryInput } from "@/components/shopping/SmartGroceryInput";
import { useToast } from "@/hooks/use-toast";
import { ShoppingItem } from "@/hooks/useShoppingList";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import InStoreShopping from "@/components/shopping/InStoreShopping";
import { ShoppingListErrorBoundary } from "@/components/shopping/ShoppingListErrorBoundary";

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

const SmartShoppingList = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState("Tous");
  const [showPurchased, setShowPurchased] = useState(true);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showInStoreMode, setShowInStoreMode] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(STORE_SECTIONS));
  const [showFABMenu, setShowFABMenu] = useState(false);
  
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
    
    STORE_SECTIONS.forEach(section => {
      const sectionItems = filteredItems.filter(item => item.store_section === section);
      if (sectionItems.length > 0) {
        groups[section] = sectionItems;
      }
    });

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
      await navigator.clipboard.writeText(shareText);
      toast({
        title: "Liste copiée",
        description: "La liste a été copiée dans le presse-papiers."
      });
    }
  };

  const handleAddAllToInventory = async () => {
    const purchasedCount = getPurchasedCount();
    if (purchasedCount === 0) {
      toast({
        title: "Aucun produit acheté",
        description: "Cochez d'abord les produits que vous avez achetés."
      });
      return;
    }

    if (window.confirm(`Ajouter ${purchasedCount} produit(s) acheté(s) à l'inventaire ?`)) {
      await addAllToInventory();
    }
  };

  const handleClearPurchased = async () => {
    const purchasedCount = getPurchasedCount();
    if (purchasedCount === 0) {
      toast({
        title: "Aucun produit acheté",
        description: "Il n'y a pas de produits achetés à supprimer."
      });
      return;
    }

    if (window.confirm(`Supprimer ${purchasedCount} produit(s) acheté(s) de la liste ?`)) {
      await clearPurchased();
    }
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

  const handleDeleteItem = async (id: string) => {
    await removeFromShoppingList(id);
  };

  const handleSmartItemsAdded = async (items: any[]) => {
    console.log(`✅ ${items.length} items added via smart input`);
  };

  const toggleSectionExpanded = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getTotalItems = () => filteredItems.length;
  const getRemainingItems = () => filteredItems.filter(item => !item.is_purchased).length;
  const getCompletionPercentage = () => {
    const total = getTotalItems();
    if (total === 0) return 0;
    return Math.round((getPurchasedCount() / total) * 100);
  };

  // Mode magasin
  if (showInStoreMode) {
    return (
      <Layout>
        <ShoppingListErrorBoundary>
          <InStoreShopping onExit={() => setShowInStoreMode(false)} />
        </ShoppingListErrorBoundary>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen flex flex-col">
        {/* Header fixe et compact */}
        <div className="sticky top-0 bg-background z-10 border-b">
          <div className="px-4 pt-4 pb-2">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-xl font-semibold">
                  Ma liste ({getRemainingItems()})
                </h1>
                <p className="text-sm text-muted-foreground">
                  {getTotalEstimatedCost() > 0 && `Budget: ${getTotalEstimatedCost().toFixed(2)}€`}
                </p>
              </div>
              
              {/* Mode magasin pour mobile */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInStoreMode(true)}
                className="md:hidden"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Mode magasin
              </Button>
            </div>
            
            {/* Input principal */}
            <SmartGroceryInput 
              onItemsAdded={handleSmartItemsAdded}
              addMultipleToShoppingList={addMultipleToShoppingList}
              defaultMode="text"
              className="mb-3"
              placeholder="Ajouter des articles..."
            />
            
            {/* Filtres compacts */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
              
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger className="w-[140px] h-9">
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
              
              <Button
                variant={showPurchased ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPurchased(!showPurchased)}
                className="h-9"
              >
                Achetés
              </Button>
            </div>
          </div>
        </div>

        {/* Contenu principal scrollable */}
        <div className="flex-1 overflow-y-auto pb-20">
          <div className="p-4 space-y-4">
            {/* Actions pour les articles achetés */}
            {getPurchasedCount() > 0 && (
              <MaterialCard variant="elevated">
                <MaterialCardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{getPurchasedCount()} article(s) acheté(s)</p>
                      <p className="text-sm text-muted-foreground">
                        Que voulez-vous faire ?
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleAddAllToInventory} 
                        size="sm"
                        variant="default"
                      >
                        <PackagePlus className="w-4 h-4 mr-2" />
                        Inventaire
                      </Button>
                      <Button 
                        onClick={handleClearPurchased} 
                        variant="outline" 
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Nettoyer
                      </Button>
                    </div>
                  </div>
                </MaterialCardContent>
              </MaterialCard>
            )}

            {/* Liste des articles par rayon */}
            {Object.keys(groupedItems).length === 0 ? (
              <MaterialCard variant="elevated">
                <MaterialCardContent className="p-8 text-center">
                  <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery || selectedSection !== "Tous" 
                      ? "Aucun article ne correspond à votre recherche."
                      : "Votre liste est vide. Ajoutez des articles pour commencer."}
                  </p>
                </MaterialCardContent>
              </MaterialCard>
            ) : (
              Object.entries(groupedItems).map(([section, items]) => (
                <div key={section} className="space-y-2">
                  <button
                    onClick={() => toggleSectionExpanded(section)}
                    className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                  >
                    <span className="font-medium">{section}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {items.length}
                      </Badge>
                      {expandedSections.has(section) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </button>
                  
                  {expandedSections.has(section) && (
                    <div className="space-y-2 pl-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-center gap-3 p-3 bg-card rounded-lg",
                            "hover:bg-accent/50 transition-colors",
                            item.is_purchased && "opacity-60"
                          )}
                        >
                          <Checkbox
                            checked={item.is_purchased}
                            onCheckedChange={() => togglePurchased(item.id)}
                            className="w-5 h-5"
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className={cn(
                              "font-medium",
                              item.is_purchased && "line-through"
                            )}>
                              {item.product?.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {item.quantity} {item.unit}
                              {item.category && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {item.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {item.estimated_price && (
                            <div className="text-sm font-medium">
                              {item.estimated_price.toFixed(2)}€
                            </div>
                          )}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditItem(item)}>
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-destructive"
                              >
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* FAB pour actions secondaires */}
        <div className="fixed bottom-6 right-6 z-20">
          <div className={cn(
            "absolute bottom-16 right-0 space-y-2 transition-all",
            showFABMenu ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
          )}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                handleShare();
                setShowFABMenu(false);
              }}
              className="w-full justify-start shadow-lg"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Partager la liste
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowInStoreMode(true);
                setShowFABMenu(false);
              }}
              className="w-full justify-start shadow-lg hidden md:flex"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Mode magasin
            </Button>
          </div>
          
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
            onClick={() => setShowFABMenu(!showFABMenu)}
          >
            <Menu className={cn(
              "w-6 h-6 transition-transform",
              showFABMenu && "rotate-90"
            )} />
          </Button>
        </div>
      </div>

      {/* Dialog d'édition */}
      {editingItem && (
        <EditShoppingItemDialog
          item={editingItem}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleSaveEdit}
        />
      )}
    </Layout>
  );
};

export default SmartShoppingList;