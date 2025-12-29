/**
 * ProductValidationList Component
 * Display and validate scanned products before adding to inventory
 */
import React from 'react';
import { Check, X, AlertTriangle, Edit2, MapPin, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface EnrichedProduct {
  raw_name: string;
  normalized_name: string;
  quantity: number;
  unit_price?: number;
  total_price: number;
  confidence: number;
  matched: boolean;
  match_confidence: number;
  match_method: string;
  suggested_location: 'frigo' | 'congelateur' | 'placard' | 'autre';
  category?: string;
  estimated_expiry_date?: string;
  matched_product?: {
    id?: string;
    name: string;
    barcode?: string;
    brand?: string;
    nutriscore?: string;
    image_url?: string;
  };
}

interface ProductValidationListProps {
  products: EnrichedProduct[];
  selectedProducts: Set<string>;
  onToggleProduct: (index: number) => void;
  onEditProduct?: (index: number) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

const locationConfig: Record<string, { label: string; color: string; icon: string }> = {
  frigo: { label: 'Frigo', color: 'bg-blue-100 text-blue-800', icon: '🧊' },
  congelateur: { label: 'Congelateur', color: 'bg-cyan-100 text-cyan-800', icon: '❄️' },
  placard: { label: 'Placard', color: 'bg-amber-100 text-amber-800', icon: '🗄️' },
  autre: { label: 'Autre', color: 'bg-gray-100 text-gray-800', icon: '📦' },
};

export const ProductValidationList: React.FC<ProductValidationListProps> = ({
  products,
  selectedProducts,
  onToggleProduct,
  onEditProduct,
  onSelectAll,
  onDeselectAll,
}) => {
  const selectedCount = selectedProducts.size;
  const totalCount = products.length;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header with selection controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedCount} / {totalCount} produits selectionnes
        </div>
        <div className="flex gap-2">
          {onSelectAll && (
            <Button variant="outline" size="sm" onClick={onSelectAll}>
              Tout selectionner
            </Button>
          )}
          {onDeselectAll && selectedCount > 0 && (
            <Button variant="outline" size="sm" onClick={onDeselectAll}>
              Tout deselectionner
            </Button>
          )}
        </div>
      </div>

      {/* Products list */}
      <div className="space-y-2">
        {products.map((product, index) => {
          const isSelected = selectedProducts.has(String(index));
          const isLowConfidence = product.confidence < 0.7;
          const location = locationConfig[product.suggested_location] || locationConfig.autre;

          return (
            <Card
              key={index}
              className={cn(
                'p-3 transition-all cursor-pointer hover:shadow-md',
                isSelected
                  ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                  : 'border-gray-200 dark:border-gray-700',
                isLowConfidence && !isSelected && 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/20'
              )}
              onClick={() => onToggleProduct(index)}
            >
              <div className="flex items-start gap-3">
                {/* Selection indicator */}
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                    isSelected ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                  )}
                >
                  {isSelected ? (
                    <Check className="h-4 w-4 text-white" />
                  ) : (
                    <X className="h-3 w-3 text-gray-400" />
                  )}
                </div>

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">
                      {product.normalized_name}
                    </span>
                    {isLowConfidence && (
                      <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    )}
                    {product.matched_product?.nutriscore && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs uppercase font-bold',
                          product.matched_product.nutriscore === 'a' && 'border-green-500 text-green-600',
                          product.matched_product.nutriscore === 'b' && 'border-lime-500 text-lime-600',
                          product.matched_product.nutriscore === 'c' && 'border-yellow-500 text-yellow-600',
                          product.matched_product.nutriscore === 'd' && 'border-orange-500 text-orange-600',
                          product.matched_product.nutriscore === 'e' && 'border-red-500 text-red-600'
                        )}
                      >
                        {product.matched_product.nutriscore}
                      </Badge>
                    )}
                  </div>

                  {/* Product details row */}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      x{product.quantity}
                    </span>
                    <span>•</span>
                    <span>{product.total_price.toFixed(2)}€</span>
                    <span>•</span>
                    <Badge
                      variant="secondary"
                      className={cn('text-xs', location.color)}
                    >
                      {location.icon} {location.label}
                    </Badge>
                    {product.estimated_expiry_date && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(product.estimated_expiry_date)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Category */}
                  {product.category && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {product.category}
                    </div>
                  )}

                  {/* Original name if different */}
                  {product.raw_name !== product.normalized_name && (
                    <div className="text-xs text-muted-foreground mt-1 truncate opacity-60">
                      Ticket: {product.raw_name}
                    </div>
                  )}

                  {/* Matched product brand */}
                  {product.matched_product?.brand && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Marque: {product.matched_product.brand}
                    </div>
                  )}
                </div>

                {/* Edit button */}
                {onEditProduct && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditProduct(index);
                    }}
                    className="flex-shrink-0"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Empty state */}
      {products.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Aucun produit detecte</p>
        </Card>
      )}
    </div>
  );
};

export default ProductValidationList;
