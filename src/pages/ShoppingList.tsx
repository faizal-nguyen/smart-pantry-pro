import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
  CheckCircle2
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
import { useToast } from "@/hooks/use-toast";

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
  
  const { 
    shoppingList, 
    loading, 
    togglePurchased, 
    removeFromShoppingList,
    addAllToInventory,
    clearPurchased,
    getTotalEstimatedCost,
    getPurchasedCount,
    generateShareableList
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
            <Button onClick={handleShare} variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              Partager
            </Button>
            <AddShoppingItemDialog />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{getRemainingItems()}</p>
                  <p className="text-sm text-muted-foreground">À acheter</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
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
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actions rapides */}
      {getPurchasedCount() > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{getPurchasedCount()} produit(s) acheté(s)</p>
                <p className="text-sm text-muted-foreground">
                  Transférer vers l'inventaire ou nettoyer la liste
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddAllToInventory} size="sm">
                  <PackagePlus className="w-4 h-4 mr-2" />
                  Vers inventaire
                </Button>
                <Button onClick={handleClearPurchased} variant="outline" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Nettoyer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
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
          
          <Button
            variant={showPurchased ? "default" : "outline"}
            size="sm"
            onClick={() => setShowPurchased(!showPurchased)}
          >
            Voir achetés
          </Button>
        </div>
      </div>

      {/* Liste des produits organisée par rayon */}
      <div className="space-y-6">
        {Object.keys(groupedItems).length === 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2 text-primary" />
                Votre liste de courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {searchQuery || selectedSection !== "Tous" 
                  ? "Aucun produit ne correspond à votre recherche."
                  : "Votre liste de courses est vide."
                }
              </p>
            </CardContent>
          </Card>
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
                  />
                ))}
              </div>
              
              {section !== Object.keys(groupedItems).slice(-1)[0] && <Separator />}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ShoppingList;