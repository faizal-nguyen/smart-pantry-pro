import { useState, useMemo, useEffect } from "react";
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import AppNavigation from "@/components/navigation/AppNavigation";
import { PageLoader } from "@/components/layout/PageLoader";
import { MaterialCard, MaterialCardContent, MaterialCardHeader } from "@/components/ui/material/Card";
import { MaterialButton } from "@/components/ui/material/Button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
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
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState("Tous");
  const [showPurchased, setShowPurchased] = useState(true);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(STORE_SECTIONS));
  // Mobile audit P0#1 — l'ancien sticky header montait à ~280px (titre +
  // SmartGroceryInput + 3 contrôles de filtres). Sur iPhone SE (667px), la
  // liste réelle était écrasée. On garde le sticky minimal (titre + search)
  // et on rend SmartGroceryInput + filtres déroulables ci-dessous.
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showFABMenu, setShowFABMenu] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setAuthLoading(false);
    };
    getUser();
  }, []);
  
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

  const handleSmartItemsAdded = async () => {
    // Items are added to Supabase by SmartGroceryInput directly; the list
    // refreshes via useShoppingList's realtime subscription.
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

  if (loading) {
    return (
      <AppNavigation user={user!}>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppNavigation>
    );
  }

  if (authLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AppNavigation user={user}>
      <div className="min-h-screen flex flex-col">
        {/* Sticky compact — titre + search uniquement (≈80px sur mobile) */}
        <div className="sticky top-0 bg-background z-10 border-b">
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h1 className="text-xl font-semibold truncate">
                  Ma liste ({getRemainingItems()})
                </h1>
                {getTotalEstimatedCost() > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Budget : {getTotalEstimatedCost().toFixed(2)}€
                  </p>
                )}
              </div>
              <Button
                variant={isFiltersOpen ? "default" : "outline"}
                size="sm"
                className="h-11 shrink-0"
                aria-expanded={isFiltersOpen}
                aria-label="Filtres"
                onClick={() => setIsFiltersOpen((v) => !v)}
              >
                <Menu className="h-4 w-4 mr-2" aria-hidden="true" />
                Filtres
              </Button>
            </div>

            {/* Search reste dans le sticky — c'est le canal de navigation
                principal dans la liste. */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </div>
        </div>

        {/* Hors-sticky — bouton « + ajouter » déclenche SmartGroceryInput.
            Le composant reste monté (animation hauteur) pour ne pas perdre
            l'état interne (mode voice/text + drafts). */}
        <div className="px-4 pt-3 space-y-3">
          <Button
            variant={isAddOpen ? "secondary" : "default"}
            className="w-full h-11 justify-center"
            onClick={() => setIsAddOpen((v) => !v)}
            data-testid="primary-action"
            aria-expanded={isAddOpen}
          >
            {isAddOpen ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" aria-hidden="true" />
                Fermer l'ajout
              </>
            ) : (
              <>
                <PackagePlus className="h-4 w-4 mr-2" aria-hidden="true" />
                Ajouter des articles
              </>
            )}
          </Button>

          {isAddOpen && (
            <SmartGroceryInput
              onItemsAdded={(items) => {
                handleSmartItemsAdded(items);
                setIsAddOpen(false);
              }}
              addMultipleToShoppingList={addMultipleToShoppingList}
              defaultMode="text"
              placeholder="Ajouter des articles..."
            />
          )}

          {isFiltersOpen && (
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger className="w-full sm:w-[180px] h-11">
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
                className="h-11 sm:w-auto w-full"
                onClick={() => setShowPurchased(!showPurchased)}
              >
                {showPurchased ? "Masquer achetés" : "Voir achetés"}
              </Button>
            </div>
          )}
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
              <EmptyState
                icon={ShoppingCart}
                title={searchQuery || selectedSection !== "Tous"
                  ? "Aucun article trouvé"
                  : "Liste de courses vide"}
                description={searchQuery || selectedSection !== "Tous"
                  ? "Aucun article ne correspond à ta recherche. Modifie les filtres ou ajoute un article."
                  : "Ajoute tes premiers articles via le champ ci-dessus ou depuis une recette."}
              />
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
    </AppNavigation>
  );
};

export default SmartShoppingList;