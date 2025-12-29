"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, DollarSign, Flame, AlertCircle, ChefHat } from 'lucide-react';
import { MealPlanEntry, MealType } from '@/services/planning/types';

interface MealSlotProps {
  dayIndex: number;
  mealType: { key: MealType; label: string; icon: string };
  meal: MealPlanEntry | null;
  isEditable: boolean;
  onClick: () => void;
  locked?: boolean;
  onToggleLock?: () => void;
  onAlternatives?: () => void;
  onCook?: () => void;
}

export function MealSlot({ dayIndex, mealType, meal, isEditable, onClick, locked, onToggleLock, onAlternatives, onCook }: MealSlotProps) {
  if (!meal) {
    return (
      <Card 
        className={`min-h-[120px] border-dashed border-2 transition-colors ${
          isEditable 
            ? 'hover:border-primary hover:bg-accent/50 cursor-pointer' 
            : 'cursor-not-allowed opacity-50'
        }`}
        onClick={isEditable ? onClick : undefined}
      >
        <CardContent className="flex flex-col items-center justify-center h-full p-4">
          <div className="text-2xl mb-2">{mealType.icon}</div>
          <div className="text-sm font-medium text-muted-foreground mb-2">
            {mealType.label}
          </div>
          {isEditable && (
            <Button variant="ghost" size="sm" className="h-auto p-1">
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={`min-h-[120px] transition-colors ${
        isEditable 
          ? 'hover:shadow-md ' + (locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer') 
          : 'cursor-default'
      }`}
      onClick={isEditable && !locked ? onClick : undefined}
    >
      <CardContent className="p-3 space-y-2">
        {/* Meal Type Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-lg">{mealType.icon}</span>
            <span className="text-xs text-muted-foreground font-medium">
              {mealType.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {meal.confidence && meal.confidence < 0.8 && (
              <AlertCircle className="h-3 w-3 text-amber-500" />
            )}
            {isEditable && (
              <>
                <button
                  type="button"
                  className={`text-xs px-2 py-1 rounded border ${locked ? 'bg-muted' : ''}`}
                  onClick={(e) => { e.stopPropagation(); onToggleLock && onToggleLock(); }}
                >
                  {locked ? '🔒' : '🔓'}
                </button>
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded border"
                  onClick={(e) => { e.stopPropagation(); onAlternatives && onAlternatives(); }}
                >
                  Alt
                </button>
              </>
            )}
          </div>
        </div>

        {/* Recipe Name */}
        <div className="space-y-1">
          <h4 className="text-sm font-medium line-clamp-2">
            {meal.recipeName}
          </h4>
          
          {/* Recipe Metadata */}
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {meal.estimatedTime}min
            </Badge>
            
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {meal.estimatedCost?.toFixed(2)}€
            </Badge>
            
            {meal.nutritionalInfo && (
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <Flame className="h-3 w-3" />
                {Math.round(meal.nutritionalInfo.calories)}kcal
              </Badge>
            )}
          </div>
        </div>

        {/* Preparation Tips */}
        {meal.preparationTips && meal.preparationTips.length > 0 && (
          <div className="space-y-1">
            {meal.preparationTips.slice(0, 2).map((tip, index) => (
              <div 
                key={index}
                className="text-xs p-2 bg-blue-50 rounded border-l-2 border-blue-200"
              >
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-blue-600" />
                  <span className="font-medium text-blue-800">
                    {tip.type === 'defrost' ? '❄️ Décongeler' : 
                     tip.type === 'marinate' ? '🥄 Mariner' : 
                     '💡 Conseil'}
                  </span>
                </div>
                <div className="text-blue-700 mt-1">
                  {tip.message}
                </div>
                {tip.daysInAdvance && tip.daysInAdvance > 0 && (
                  <div className="text-xs text-blue-600 mt-1">
                    À faire {tip.daysInAdvance} jour{tip.daysInAdvance > 1 ? 's' : ''} avant
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions & Servings */}
        {meal.servings && meal.servings !== 1 && (
          <div className="flex justify-between items-center">
            <Badge variant="outline" className="text-xs">
              {meal.servings} portions
            </Badge>
            {isEditable && (
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border flex items-center gap-1"
                onClick={(e) => { e.stopPropagation(); onCook && onCook(); }}
              >
                <ChefHat className="h-3 w-3" /> Cuisiner
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
