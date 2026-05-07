/**
 * Floating Video Import Button
 * Floating action button for quick video import access
 */

import React, { useState } from 'react';
import { Video, Sparkles, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VideoImportModal } from '@/components/social/VideoImportModal';
import { Recipe } from '@/types/recipe';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface FloatingVideoButtonProps {
  className?: string;
  onImport?: (recipe: Recipe) => void;
}

export function FloatingVideoButton({ className, onImport }: FloatingVideoButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const handleImport = async (recipe: Recipe) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté pour importer des recettes');
        return;
      }

      // Map difficulty to numeric value
      const difficultyMap: Record<string, number> = {
        'easy': 2,
        'medium': 3,
        'hard': 4
      };

      // Save recipe to database
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          user_id: user.id,
          name: recipe.name,
          description: recipe.description || '',
          prep_time: recipe.prepTime || 0,
          cook_time: recipe.cookTime || 0,
          servings: recipe.servings || 4,
          difficulty: difficultyMap[recipe.difficulty || 'medium'] || 3,
          cuisine_category: recipe.cuisine || '',
          meal_type: recipe.course || '',
          instructions: recipe.instructions?.map(inst => 
            typeof inst === 'string' ? inst : inst.text
          ).join('\n') || '',
          nutrition_info: recipe.nutrition || {},
          tags: recipe.tags || [],
          image_url: recipe.images?.[0] || '',
          source_url: recipe.videoUrl || '',
          source_type: 'video',
          is_public: false
        })
        .select()
        .single();

      if (recipeError) {
        console.error('Error saving recipe:', recipeError);
        toast.error('Erreur lors de la sauvegarde de la recette');
        return;
      }

      // Save ingredients separately
      if (recipeData && recipe.ingredients && recipe.ingredients.length > 0) {
        const ingredientsToInsert = recipe.ingredients.map((ing, index) => ({
          recipe_id: recipeData.id,
          ingredient_name: typeof ing === 'string' ? ing : ing.name,
          quantity: typeof ing === 'string' ? null : ing.quantity,
          unit: typeof ing === 'string' ? '' : ing.unit || '',
          is_essential: true,
          order_index: index,
          notes: typeof ing === 'string' ? '' : ing.notes || ''
        }));

        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientsToInsert);

        if (ingredientsError) {
          console.error('Error saving ingredients:', ingredientsError);
          // Continue anyway, recipe is saved
        }
      }

      toast.success('Recette importée avec succès!', {
        description: `${recipe.name} a été ajoutée à vos recettes`,
        action: {
          label: 'Voir',
          onClick: () => navigate(`/kitchen/recipes/${recipeData.id}`)
        }
      });
      
      if (onImport) {
        onImport(recipe);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erreur lors de l\'import de la recette');
    }
  };

  return (
    <>
      {/* Floating Button */}
      <div
        className={cn(
          "fixed bottom-28 right-4 z-50 group",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Tooltip */}
        <div
          className={cn(
            "absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-black/90 text-white text-sm rounded-lg whitespace-nowrap transition-all duration-200",
            isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2 pointer-events-none"
          )}
        >
          Import Vidéo Intelligent
        </div>

        {/* Main Button */}
        <button
          type="button"
          onClick={() => {
            console.log('FloatingVideoButton clicked');
            setIsModalOpen(true);
          }}
          className={cn(
            "relative w-14 h-14 rounded-full shadow-lg transition-all duration-300",
            "bg-gradient-to-r from-purple-500 to-blue-600",
            "hover:from-purple-600 hover:to-blue-700",
            "hover:scale-110 hover:shadow-xl",
            "flex items-center justify-center",
            "group-hover:rotate-12",
            "cursor-pointer"
          )}
        >
          <Video className="w-6 h-6 text-white" />
          
          {/* Sparkle Effect */}
          <Sparkles 
            className={cn(
              "absolute -top-1 -right-1 w-4 h-4 text-yellow-400 pointer-events-none",
              "transition-all duration-300",
              isHovered ? "opacity-100 scale-100" : "opacity-0 scale-0"
            )}
          />
          
          {/* Plus Icon */}
          <Plus 
            className={cn(
              "absolute bottom-0 right-0 w-4 h-4 text-white bg-green-500 rounded-full p-0.5 pointer-events-none",
              "transition-all duration-300",
              isHovered ? "opacity-100 scale-100" : "opacity-0 scale-0"
            )}
          />
        </button>

        {/* Pulse Animation - pointer-events-none to avoid click interference */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-blue-600 animate-ping opacity-20 pointer-events-none" />
      </div>

      {/* Modal */}
      <VideoImportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onImport={handleImport}
      />
    </>
  );
}