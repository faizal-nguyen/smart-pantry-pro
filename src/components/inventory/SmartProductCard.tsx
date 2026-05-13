import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { InventoryItem } from '@/hooks/useInventory';
import { QuantitySelector } from './QuantitySelector';
import { SwipeableActions } from './SwipeableActions';
import { MaterialButton } from '@/components/ui/material/Button';
import { MaterialCard, MaterialCardContent } from '@/components/ui/material/Card';
import { Edit, ChefHat, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useMaterialYouTheme } from '@/contexts/MaterialYouThemeContext';
import { standardizeUnit } from '@/utils/units';

interface SmartProductCardProps {
  product: InventoryItem;
  onQuantityChange: (id: string, quantity: number) => void;
  onMoveToShoppingList: (product: InventoryItem) => void;
  onConsume: (product: InventoryItem) => void;
  onEdit: (product: InventoryItem) => void;
  onFindRecipes: (product: InventoryItem) => void;
  /**
   * PRP-222 PR5: opens the DiscardItemDialog so the user can log a
   * food_waste_events row when throwing the item out.
   */
  onDiscard?: (product: InventoryItem) => void;
  /**
   * P1 polish: optional. The substitute lookup feature is not built
   * yet (toast read "Cette fonctionnalité arrive bientôt !"). The
   * audit's rule: hide buttons that don't do real work. Pass a
   * handler when the feature ships; until then the icon stays hidden.
   */
  onSubstitute?: (product: InventoryItem) => void;
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
  onDiscard,
  onSubstitute
}) => {
  const daysUntilExpiry = getDaysUntilExpiry(product.expiry_date);
  const { theme } = useMaterialYouTheme();

  return (
    <MaterialCard 
      variant="elevated" 
      interactive
      className="relative group cursor-pointer"
      onClick={() => onEdit(product)}
    >
      {/* Badge Expiration Dynamique */}
      {daysUntilExpiry !== null && daysUntilExpiry <= 3 && (
        <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 z-10">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className={cn(
              "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold text-white",
              daysUntilExpiry <= 1 ? "bg-red-500" : "bg-orange-500"
            )}
          >
            {daysUntilExpiry}j
          </motion.div>
        </div>
      )}

      <MaterialCardContent className="p-3 sm:p-4">
        {/* Image avec placeholder intelligent */}
        <div 
          className="aspect-square rounded-lg bg-muted mb-2 sm:mb-3 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {product.product?.image_url ? (
            <img 
              src={product.product.image_url} 
              alt={product.product.name}
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl bg-muted">
              {getEmojiForCategory(product.product?.category)}
            </div>
          )}
        </div>

        {/* Informations */}
        <h3 className="font-medium text-foreground mb-1 truncate text-xs sm:text-sm leading-tight">
          {product.product?.name || 'Produit'}
        </h3>
        
        {/* Localisation */}
        {product.location && (
          <p className="text-xs text-muted-foreground mb-1 sm:mb-2 truncate">{product.location}</p>
        )}
        
        {/* Quantité Interactive */}
        <div className="mb-1 sm:mb-2" onClick={(e) => e.stopPropagation()}>
          <QuantitySelector
            value={product.quantity}
            unit={standardizeUnit(product.unit)}
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
        <div className="hidden md:flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <MaterialButton
            variant="text"
            className="h-7 w-7 p-0"
            icon={<Edit className="h-3 w-3" />}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(product);
            }}
          />
          <MaterialButton
            variant="text"
            className="h-7 w-7 p-0"
            icon={<ChefHat className="h-3 w-3" />}
            onClick={(e) => {
              e.stopPropagation();
              onFindRecipes(product);
            }}
          />
          {onSubstitute && (
            <MaterialButton
              variant="text"
              className="h-7 w-7 p-0"
              icon={<RefreshCw className="h-3 w-3" />}
              onClick={(e) => {
                e.stopPropagation();
                onSubstitute(product);
              }}
            />
          )}
          {onDiscard && (
            <MaterialButton
              variant="text"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              icon={<Trash2 className="h-3 w-3" />}
              onClick={(e) => {
                e.stopPropagation();
                onDiscard(product);
              }}
            />
          )}
        </div>
      </MaterialCardContent>
    </MaterialCard>
  );
};