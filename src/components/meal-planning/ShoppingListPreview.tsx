"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ShoppingCart, 
  Download, 
  DollarSign, 
  Package, 
  TrendingDown,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { OptimizedShoppingList } from '@/services/planning/smartMealPlannerService';

interface ShoppingListPreviewProps {
  shoppingList: OptimizedShoppingList;
  onExportToShoppingList: () => void;
}

interface GroupedItems {
  [category: string]: typeof shoppingList.items;
}

export function ShoppingListPreview({ 
  shoppingList, 
  onExportToShoppingList 
}: ShoppingListPreviewProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const toggleItemChecked = (itemId: string) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Group items by category
  const groupedItems: GroupedItems = shoppingList.items.reduce((acc, item) => {
    const category = item.category || 'Autres';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as GroupedItems);

  // Sort categories by importance
  const categoryOrder = ['Protéines', 'Légumes', 'Fruits', 'Céréales', 'Produits laitiers', 'Épices', 'Autres'];
  const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  const getTotalItems = () => shoppingList.items.length;
  const getCheckedItems = () => checkedItems.size;
  const getTotalCost = () => shoppingList.items.reduce((sum, item) => sum + item.estimatedPrice, 0);
  const getCheckedCost = () => {
    return shoppingList.items
      .filter(item => checkedItems.has(item.id))
      .reduce((sum, item) => sum + item.estimatedPrice, 0);
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'protéines': return '🥩';
      case 'légumes': return '🥬';
      case 'fruits': return '🍎';
      case 'céréales': return '🌾';
      case 'produits laitiers': return '🥛';
      case 'épices': return '🧂';
      default: return '📦';
    }
  };

  const getStoreSection = (category: string) => {
    switch (category.toLowerCase()) {
      case 'protéines': return 'Boucherie/Poissonnerie';
      case 'légumes': return 'Rayon Fruits & Légumes';
      case 'fruits': return 'Rayon Fruits & Légumes';
      case 'céréales': return 'Épicerie';
      case 'produits laitiers': return 'Rayon Frais';
      case 'épices': return 'Épicerie';
      default: return 'Divers';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {getTotalItems()}
              </div>
              <div className="text-xs text-muted-foreground">
                Articles à acheter
              </div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-green-600">
                {getTotalCost().toFixed(2)}€
              </div>
              <div className="text-xs text-muted-foreground">
                Coût estimé
              </div>
            </div>
          </div>

          {shoppingList.estimatedSavings > 0 && (
            <div className="mt-3 p-2 bg-green-50 rounded border-l-2 border-green-200">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800">
                  Économies estimées: {shoppingList.estimatedSavings.toFixed(2)}€
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shopping List by Category */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Liste par rayon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-4">
              {sortedCategories.map((category) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getCategoryIcon(category)}</span>
                    <h4 className="font-medium text-sm">{category}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {groupedItems[category].length} articles
                    </Badge>
                    <div className="flex-1" />
                    <span className="text-xs text-muted-foreground">
                      {getStoreSection(category)}
                    </span>
                  </div>

                  <div className="space-y-2 ml-6">
                    {groupedItems[category].map((item) => {
                      const isChecked = checkedItems.has(item.id);
                      
                      return (
                        <div 
                          key={item.id}
                          className={`flex items-center gap-3 p-2 rounded transition-colors ${
                            isChecked ? 'bg-green-50 line-through text-muted-foreground' : 'hover:bg-accent/50'
                          }`}
                          onClick={() => toggleItemChecked(item.id)}
                        >
                          <button className="flex-shrink-0">
                            {isChecked ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                          
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                {item.name}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {item.estimatedPrice.toFixed(2)}€
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {item.quantity} {item.unit}
                              </span>
                              {item.priority === 'high' && (
                                <Badge variant="destructive" className="text-xs">
                                  Priorité
                                </Badge>
                              )}
                              {item.fromInventory && (
                                <Badge variant="outline" className="text-xs">
                                  En stock
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {category !== sortedCategories[sortedCategories.length - 1] && (
                    <Separator className="mt-3" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Shopping Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Progression des achats</span>
              <span className="text-sm text-muted-foreground">
                {getCheckedItems()}/{getTotalItems()} articles
              </span>
            </div>
            
            <Progress 
              value={(getCheckedItems() / getTotalItems()) * 100} 
              className="h-2"
            />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Coût actuel: {getCheckedCost().toFixed(2)}€</span>
              <span>Reste: {(getTotalCost() - getCheckedCost()).toFixed(2)}€</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Button 
          onClick={onExportToShoppingList}
          className="gap-2"
        >
          <ShoppingCart className="h-4 w-4" />
          Exporter vers Courses
        </Button>
        
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Télécharger PDF
        </Button>
      </div>

      {/* Shopping Tips */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <h4 className="font-medium text-sm mb-2 text-blue-800">
            💡 Conseils d'achat
          </h4>
          <div className="text-sm text-blue-700 space-y-1">
            <div>• Commencez par les produits frais (fruits, légumes)</div>
            <div>• Vérifiez les dates de péremption</div>
            <div>• Groupez les achats par rayon pour optimiser votre parcours</div>
            {shoppingList.estimatedSavings > 0 && (
              <div>• Cette liste vous fait économiser {shoppingList.estimatedSavings.toFixed(2)}€</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}