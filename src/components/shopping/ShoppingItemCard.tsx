import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MoreVertical, 
  MapPin, 
  Euro,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShoppingItem } from "@/hooks/useShoppingList";

interface ShoppingItemCardProps {
  item: ShoppingItem;
  onTogglePurchased: (id: string, isPurchased: boolean) => void;
  onRemove: (id: string) => void;
}

const ShoppingItemCard = ({ item, onTogglePurchased, onRemove }: ShoppingItemCardProps) => {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Fruits/Légumes': 'bg-green-100 text-green-800',
      'Viandes': 'bg-red-100 text-red-800', 
      'Produits laitiers': 'bg-blue-100 text-blue-800',
      'Épicerie': 'bg-yellow-100 text-yellow-800',
      'Surgelés': 'bg-cyan-100 text-cyan-800',
      'Boissons': 'bg-purple-100 text-purple-800',
      'Hygiène': 'bg-pink-100 text-pink-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getSectionColor = (section: string) => {
    // Colors based on typical store layout flow
    const colors: Record<string, string> = {
      'Entrée': 'bg-slate-100 text-slate-700',
      'Fruits & Légumes': 'bg-green-100 text-green-700',
      'Boucherie/Poissonnerie': 'bg-red-100 text-red-700',
      'Charcuterie/Fromagerie': 'bg-orange-100 text-orange-700',
      'Épicerie salée': 'bg-yellow-100 text-yellow-700',
      'Épicerie sucrée': 'bg-amber-100 text-amber-700',
      'Surgelés': 'bg-cyan-100 text-cyan-700',
      'Frais/Produits laitiers': 'bg-blue-100 text-blue-700',
      'Boissons': 'bg-purple-100 text-purple-700',
      'Hygiène/Beauté': 'bg-pink-100 text-pink-700',
      'Maison/Entretien': 'bg-indigo-100 text-indigo-700',
      'Caisses': 'bg-gray-100 text-gray-700',
    };
    return colors[section] || 'bg-gray-100 text-gray-700';
  };

  return (
    <Card className={`transition-all duration-200 ${item.is_purchased ? 'opacity-60 bg-muted/50' : 'hover:shadow-md'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <Checkbox
            checked={item.is_purchased}
            onCheckedChange={(checked) => onTogglePurchased(item.id, checked as boolean)}
            className="mt-1"
          />

          {/* Product info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className={`font-medium ${item.is_purchased ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {item.product?.name || 'Produit inconnu'}
                </h3>
                
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-medium">
                    {item.quantity} {item.product?.unit_type}
                  </span>
                  
                  {item.estimated_price && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Euro className="w-3 h-3" />
                      <span>{(item.estimated_price * item.quantity).toFixed(2)}€</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  {item.product?.category && (
                    <Badge variant="secondary" className={`text-xs ${getCategoryColor(item.product.category)}`}>
                      {item.product.category}
                    </Badge>
                  )}
                  
                  {item.store_section && (
                    <Badge variant="outline" className={`text-xs ${getSectionColor(item.store_section)}`}>
                      <MapPin className="w-3 h-3 mr-1" />
                      {item.store_section}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Actions menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onTogglePurchased(item.id, !item.is_purchased)}>
                    {item.is_purchased ? 'Marquer comme non acheté' : 'Marquer comme acheté'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onRemove(item.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShoppingItemCard;