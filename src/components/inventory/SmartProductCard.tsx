import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { InventoryItem } from '@/hooks/useInventory';
import { QuantitySelector } from './QuantitySelector';
import { SwipeableActions } from './SwipeableActions';
import { Button } from '@/components/ui/button';
import { Edit, ChefHat, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SmartProductCardProps {
  product: InventoryItem;
  onQuantityChange: (id: string, quantity: number) => void;
  onMoveToShoppingList: (product: InventoryItem) => void;
  onConsume: (product: InventoryItem) => void;
  onEdit: (product: InventoryItem) => void;
  onFindRecipes: (product: InventoryItem) => void;
  onSubstitute: (product: InventoryItem) => void;
}

const getEmojiForCategory = (category?: string): string => {
  const categoryEmojis: Record<string, string> = {
    'Fruits/Légumes': '🥬',
    'Viandes': '🥩',
    'Produits laitiers': '🥛',
    'Épicerie': '🥫',
    'Surgelés': '🧊',
    'Boissons': '🥤',
    'Hygiène': '🧼',
    'Boulangerie': '🥖',
    'Poissonnerie': '🐟',
    'Autres': '📦'
  };
  return categoryEmojis[category || 'Autres'] || '📦';
};

const getDaysUntilExpiry = (expiryDate?: string): number | null => {
  if (!expiryDate) return null;
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const SmartProductCard: React.FC<SmartProductCardProps> = ({
  product,
  onQuantityChange,
  onMoveToShoppingList,
  onConsume,
  onEdit,
  onFindRecipes,
  onSubstitute
}) => {
  const daysUntilExpiry = getDaysUntilExpiry(product.expiry_date);

  return (
    <motion.div
      className="relative bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow group"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Badge Expiration Dynamique */}
      {daysUntilExpiry !== null && daysUntilExpiry <= 3 && (
        <div className="absolute -top-2 -right-2 z-10">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white",
              daysUntilExpiry <= 1 ? "bg-red-500" : "bg-orange-500"
            )}
          >
            {daysUntilExpiry}j
          </motion.div>
        </div>
      )}

      {/* Image avec placeholder intelligent */}
      <div className="aspect-square rounded-lg bg-gray-100 mb-3 overflow-hidden">
        {product.product?.image_url ? (
          <img 
            src={product.product.image_url} 
            alt={product.product.name}
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {getEmojiForCategory(product.product?.category)}
          </div>
        )}
      </div>

      {/* Informations */}
      <h3 className="font-medium text-gray-900 mb-1 truncate">
        {product.product?.name}
      </h3>
      
      {/* Localisation */}
      {product.location && (
        <p className="text-xs text-gray-500 mb-2">{product.location}</p>
      )}
      
      {/* Quantité Interactive */}
      <div className="mb-2">
        <QuantitySelector
          value={product.quantity}
          unit={product.unit || 'unité'}
          onChange={(val) => onQuantityChange(product.id, val)}
          quick={true}
        />
      </div>

      {/* Actions Swipe sur Mobile */}
      <div className="md:hidden">
        <SwipeableActions
          onSwipeLeft={() => onMoveToShoppingList(product)}
          onSwipeRight={() => onConsume(product)}
          leftAction={{ icon: '🛒', color: 'blue', label: 'Courses' }}
          rightAction={{ icon: '✅', color: 'green', label: 'Consommé' }}
        />
      </div>

      {/* Quick Actions Desktop */}
      <div className="hidden md:flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => onEdit(product)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => onFindRecipes(product)}
        >
          <ChefHat className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => onSubstitute(product)}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};