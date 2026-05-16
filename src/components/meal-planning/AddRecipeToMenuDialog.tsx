/**
 * PRP-234 PR2 — AddRecipeToMenuDialog.
 *
 * Dialog shadcn (focus trap + Escape + ARIA via Radix) qui permet de
 * chercher une recette dans la bibliothèque utilisateur et de la
 * pousser dans un slot du menu de la semaine. Source recettes via
 * `useMealPlanningRecipes` (PRP §0 : pas de tool assistant
 * `search_recipes` depuis le front).
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Loader2, Search } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMealPlanningRecipes } from '@/hooks/useMealPlanningRecipes';
import type { MenuMealType } from '@/hooks/useWeeklyMenu';

export interface MenuSlot {
  day_of_week: number;
  meal_type: MenuMealType;
  day_label: string;
  meal_label: string;
}

interface AddRecipeToMenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: MenuSlot | null;
  isAdding: boolean;
  onSelect: (recipeId: string) => Promise<void> | void;
}

interface SearchableRecipe {
  id: string;
  name: string;
  prep_time?: number | null;
  cook_time?: number | null;
  servings?: number | null;
  image_url?: string | null;
}

// PRP-234 PR2 — debounce search input to avoid flooding Supabase
// on every keystroke. 300ms feels responsive without being chatty.
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}

function toSearchable(raw: unknown): SearchableRecipe | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<SearchableRecipe>;
  if (typeof r.id !== 'string' || typeof r.name !== 'string') return null;
  return {
    id: r.id,
    name: r.name,
    prep_time: r.prep_time ?? null,
    cook_time: r.cook_time ?? null,
    servings: r.servings ?? null,
    image_url: r.image_url ?? null,
  };
}

export default function AddRecipeToMenuDialog({
  open,
  onOpenChange,
  slot,
  isAdding,
  onSelect,
}: AddRecipeToMenuDialogProps) {
  const navigate = useNavigate();
  const { searchRecipes, isLoading } = useMealPlanningRecipes();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<SearchableRecipe[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Reset state every time the dialog opens / slot changes.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    setHasSearched(false);
  }, [open, slot?.day_of_week, slot?.meal_type]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    // `useMealPlanningRecipes.searchRecipes` ne filtre pas par
    // mealType en V1 (filter shape accepté mais non appliqué côté
    // hook). On laisse l'utilisateur affiner via le champ recherche
    // — c'est le slot qu'il vient de cliquer, le contexte est connu.
    void (async () => {
      const raw = await searchRecipes(debouncedQuery);
      if (!active) return;
      setResults(raw.map(toSearchable).filter((r): r is SearchableRecipe => r !== null));
      setHasSearched(true);
    })();
    return () => {
      active = false;
    };
  }, [open, debouncedQuery, searchRecipes]);

  const handleSelect = async (recipeId: string) => {
    await onSelect(recipeId);
  };

  const handleImport = () => {
    onOpenChange(false);
    navigate('/kitchen/recipes?tab=inbox');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {slot
              ? `Ajouter une recette — ${slot.day_label} ${slot.meal_label.toLowerCase()}`
              : 'Ajouter une recette au menu'}
          </DialogTitle>
          <DialogDescription>
            Choisis une recette de ta bibliothèque pour ce créneau.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Rechercher une recette…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            aria-label="Rechercher une recette"
            autoFocus
          />
        </div>

        <ScrollArea className="h-72 rounded-md border">
          {isLoading && (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground gap-2 py-12">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Chargement…
            </div>
          )}

          {!isLoading && results.length === 0 && hasSearched && (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <p>Aucune recette ne correspond à ta recherche.</p>
              <Button type="button" variant="link" onClick={handleImport}>
                Importer une recette
              </Button>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <ul className="divide-y" role="listbox" aria-label="Résultats de recherche">
              {results.map((r) => {
                const totalTime = (r.prep_time ?? 0) + (r.cook_time ?? 0);
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected="false"
                      disabled={isAdding}
                      onClick={() => handleSelect(r.id)}
                      className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/60 focus:bg-muted/60 focus:outline-none disabled:opacity-60"
                    >
                      {r.image_url ? (
                        <img
                          src={r.image_url}
                          alt=""
                          className="h-12 w-12 flex-shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-surface-muted">
                          <ChefHat className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium leading-snug line-clamp-2">{r.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {totalTime > 0 ? `${totalTime} min` : 'Temps non renseigné'}
                          {r.servings ? ` · ${r.servings} parts` : ''}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
