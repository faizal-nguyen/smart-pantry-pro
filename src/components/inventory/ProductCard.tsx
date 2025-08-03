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
      'Fruits/Légumes': 'bg-green-100 text-green-800',
      'Viandes': 'bg-red-100 text-red-800', 
      'Produits laitiers': 'bg-blue-100 text-blue-800',
      'Épicerie': 'bg-yellow-100 text-yellow-800',
      'Surgelés': 'bg-cyan-100 text-cyan-800',
      'Boissons': 'bg-purple-100 text-purple-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
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
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
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
      </CardContent>
    </Card>
  );
};

export default ProductCard;