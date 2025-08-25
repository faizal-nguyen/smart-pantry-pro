import React from "react";
import { FoodCard, MaterialCardContent } from "@/components/ui/material/Card";
import { MaterialButton } from "@/components/ui/material/Button";
import { useMaterialYouTheme } from "@/contexts/MaterialYouThemeContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MoreVertical, 
  MapPin, 
  Calendar,
  Package,
  AlertTriangle 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InventoryItem } from "@/hooks/useInventory";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { fr } from "date-fns/locale";

interface ProductCardProps {
  item: InventoryItem;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}

const ProductCard = ({ item, onEdit, onDelete }: ProductCardProps) => {
  const { extractColorFromImage, setThemeContext } = useMaterialYouTheme();
  
  // Extract theme colors from product image and set context
  React.useEffect(() => {
    if (item.product?.image_url) {
      extractColorFromImage(item.product.image_url).catch(console.error);
    }
    // Set cooking context when viewing inventory
    setThemeContext('cooking');
  }, [item.product?.image_url, extractColorFromImage, setThemeContext]);
  const getExpiryStatus = () => {
    if (!item.expiry_date) return 'none';
    
    const expiryDate = new Date(item.expiry_date);
    const today = new Date();
    const warningDate = addDays(today, 3);
    
    if (isBefore(expiryDate, today)) return 'expired';
    if (isBefore(expiryDate, warningDate)) return 'warning';
    return 'good';
  };

  const getExpiryColor = () => {
    const status = getExpiryStatus();
    switch (status) {
      case 'expired': return 'bg-destructive text-destructive-foreground';
      case 'warning': return 'bg-yellow-500 text-white';
      case 'good': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getExpiryIcon = () => {
    const status = getExpiryStatus();
    if (status === 'expired' || status === 'warning') {
      return <AlertTriangle className="w-3 h-3" />;
    }
    return <Calendar className="w-3 h-3" />;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Fruits et légumes': 'bg-green-100 text-green-800',
      'Viandes et poissons': 'bg-red-100 text-red-800', 
      'Produits laitiers': 'bg-blue-100 text-blue-800',
      'Épicerie salée': 'bg-orange-100 text-orange-800',
      'Épicerie sucrée': 'bg-pink-100 text-pink-800',
      'Surgelés': 'bg-cyan-100 text-cyan-800',
      'Boissons': 'bg-purple-100 text-purple-800',
      'Hygiène et beauté': 'bg-indigo-100 text-indigo-800',
      'Entretien': 'bg-gray-100 text-gray-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  // Determine if item is fresh based on expiry
  const isItemFresh = () => {
    if (!item.expiry_date) return true; // No expiry means it's likely fresh
    const expiryDate = new Date(item.expiry_date);
    const today = new Date();
    const warningDate = addDays(today, 3);
    return isAfter(expiryDate, warningDate);
  };
  
  const isItemExpired = () => {
    if (!item.expiry_date) return false;
    const expiryDate = new Date(item.expiry_date);
    const today = new Date();
    return isBefore(expiryDate, today);
  };

  return (
    <FoodCard 
      foodImage={item.product?.image_url}
      fresh={isItemFresh()}
      expired={isItemExpired()}
      interactive
    >
      <MaterialCardContent>
        <div className="flex gap-3 mb-3">
          {/* Image du produit */}
          {item.product?.image_url && (
            <div className="flex-shrink-0">
              <img
                src={item.product.image_url}
                alt={item.product.name}
                className="w-16 h-16 rounded-lg object-cover border"
              />
            </div>
          )}
          
          <div className="flex justify-between items-start flex-1">
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">
                {item.product?.name || 'Produit inconnu'}
              </h3>
              <Badge 
                variant="secondary" 
                className={`mt-1 ${getCategoryColor(item.product?.category || '')}`}
              >
                {item.product?.category}
              </Badge>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <MaterialButton variant="text" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </MaterialButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(item)}>
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(item.id)}
                  className="text-destructive"
                >
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="w-4 h-4" />
              <span className="font-medium text-foreground">
                {item.quantity} {item.product?.unit_type}
              </span>
            </div>
          </div>

          {item.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{item.location}</span>
            </div>
          )}

          {item.expiry_date && (
            <div className="flex items-center gap-2">
              <Badge className={`text-xs ${getExpiryColor()}`}>
                {getExpiryIcon()}
                <span className="ml-1">
                  {format(new Date(item.expiry_date), 'dd MMM yyyy', { locale: fr })}
                </span>
              </Badge>
            </div>
          )}
        </div>
      </MaterialCardContent>
    </FoodCard>
  );
};

export default ProductCard;