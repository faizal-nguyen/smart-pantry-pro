"use client";

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, DollarSign, Flame } from 'lucide-react';
import { WeeklyMealPlan, MealPlanEntry, MealType } from '@/services/planning/types';
import { MealSlot } from './MealSlot';
import { RecipePicker } from './RecipePicker';

interface WeeklyCalendarProps {
  plan: WeeklyMealPlan | null;
  onMealChange: (dayIndex: number, mealType: MealType, recipeId: string | null) => void;
  isEditable: boolean;
}

const DAYS_OF_WEEK = [
  'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'
];

const MEAL_TYPES: { key: MealType; label: string; icon: string }[] = [
  { key: 'lunch', label: 'Midi', icon: '🌞' },
  { key: 'dinner', label: 'Soir', icon: '🌙' }
];

export function WeeklyCalendar({ plan, onMealChange, isEditable }: WeeklyCalendarProps) {
  const [selectedSlot, setSelectedSlot] = useState<{
    dayIndex: number;
    mealType: MealType;
  } | null>(null);
  const [showRecipePicker, setShowRecipePicker] = useState(false);

  const getMealForSlot = (dayIndex: number, mealType: MealType): MealPlanEntry | null => {
    if (!plan) return null;
    return plan.meals.find(meal => 
      meal.dayOfWeek === dayIndex && meal.mealType === mealType
    ) || null;
  };

  const handleSlotClick = (dayIndex: number, mealType: MealType) => {
    if (!isEditable) return;
    
    setSelectedSlot({ dayIndex, mealType });
    setShowRecipePicker(true);
  };

  const handleRecipeSelect = (recipeId: string | null) => {
    if (selectedSlot) {
      onMealChange(selectedSlot.dayIndex, selectedSlot.mealType, recipeId);
    }
    setShowRecipePicker(false);
    setSelectedSlot(null);
  };

  const getWeekDates = () => {
    const startDate = plan?.weekStartDate || new Date();
    const dates = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  const weekDates = getWeekDates();

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            Semaine du {weekDates[0].toLocaleDateString('fr-FR', { 
              day: 'numeric', 
              month: 'long' 
            })} au {weekDates[6].toLocaleDateString('fr-FR', { 
              day: 'numeric', 
              month: 'long' 
            })}
          </h2>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            ← Semaine précédente
          </Button>
          <Button variant="outline" size="sm">
            Semaine suivante →
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 md:gap-4">
        {/* Day Headers */}
        {DAYS_OF_WEEK.map((day, index) => (
          <Card key={day} className="p-2 text-center">
            <CardContent className="p-2">
              <div className="font-medium text-sm">{day}</div>
              <div className="text-xs text-muted-foreground">
                {weekDates[index]?.toLocaleDateString('fr-FR', { 
                  day: 'numeric',
                  month: 'short'
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Meal Slots */}
        {MEAL_TYPES.map(mealType => (
          DAYS_OF_WEEK.map((_, dayIndex) => {
            const meal = getMealForSlot(dayIndex, mealType.key);
            
            return (
              <MealSlot
                key={`${dayIndex}-${mealType.key}`}
                dayIndex={dayIndex}
                mealType={mealType}
                meal={meal}
                isEditable={isEditable}
                onClick={() => handleSlotClick(dayIndex, mealType.key)}
              />
            );
          })
        ))}
      </div>

      {/* Weekly Summary */}
      {plan && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {totalWeeklyCost.toFixed(2)}€
                </div>
                <div className="text-sm text-muted-foreground">
                  Budget utilisé
                </div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {plan.meals.length}/14
                </div>
                <div className="text-sm text-muted-foreground">
                  Repas planifiés
                </div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {planningInsights.healthScore}/10
                </div>
                <div className="text-sm text-muted-foreground">
                  Score santé
                </div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {planningInsights.varietyScore}/10
                </div>
                <div className="text-sm text-muted-foreground">
                  Variété
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recipe Picker Modal */}
      {showRecipePicker && selectedSlot && (
        <RecipePicker
          isOpen={showRecipePicker}
          onClose={() => setShowRecipePicker(false)}
          onSelectRecipe={handleRecipeSelect}
          mealType={selectedSlot.mealType}
          dayOfWeek={selectedSlot.dayIndex}
          userPreferences={userPreferences}
        />
      )}
    </div>
  );
}