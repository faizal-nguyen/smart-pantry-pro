import React, { useEffect, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useImportsCount } from '@/hooks/useImportsCount';

const STORAGE_KEY = 'recipeImportOnboardingSeen';
const TARGET_COUNT = 5;

function readSeen(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return true;
  }
}

function writeSeen(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // localStorage unavailable (private mode) — worst case the sheet
    // re-opens next session.
  }
}

interface RecipeImportOnboardingProps {
  className?: string;
}

/**
 * First-launch onboarding sheet for the recipe inbox (PRP-220.19).
 *
 * Goal: get the user to capture their first 5 imports, which is the
 * activation bar where the inbox stops feeling empty and the value
 * compounds.
 *
 * Visibility rules:
 *   - Hidden when localStorage `recipeImportOnboardingSeen=1` (the
 *     user clicked "Plus tard" or hit 5 imports already).
 *   - Hidden when total imports >= 5 (the bar is met — no nag).
 *   - Hidden while the counts query is still loading (avoid flash of
 *     onboarding for returning users).
 */
export const RecipeImportOnboarding: React.FC<RecipeImportOnboardingProps> = ({ className }) => {
  const { data, isLoading, total } = useImportsCount();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isLoading || !data) return;
    if (readSeen()) return;
    if (total >= TARGET_COUNT) return;
    setOpen(true);
  }, [isLoading, data, total]);

  // Auto-close + persist when the user reaches the activation bar.
  useEffect(() => {
    if (data && total >= TARGET_COUNT) {
      writeSeen();
      setOpen(false);
    }
  }, [data, total]);

  const handleDismiss = () => {
    writeSeen();
    setOpen(false);
  };

  if (!data) return null;

  const completedSteps = Math.min(total, TARGET_COUNT);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) handleDismiss();
      }}
    >
      <SheetContent side="bottom" className={className}>
        <SheetHeader className="space-y-2 text-left">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden />
            <SheetTitle>Importe tes 5 premières recettes</SheetTitle>
          </div>
          <SheetDescription>
            Sauvegarde tes Reels, TikTok et vidéos YouTube préférés au
            même endroit. Smart Pantry les classe et extrait les
            ingrédients automatiquement.
          </SheetDescription>
        </SheetHeader>

        <ol
          className="mt-4 space-y-2"
          aria-label={`Progression onboarding ${completedSteps} sur ${TARGET_COUNT}`}
        >
          {Array.from({ length: TARGET_COUNT }, (_, i) => {
            const stepNumber = i + 1;
            const done = stepNumber <= completedSteps;
            return (
              <li
                key={stepNumber}
                className="flex items-center gap-3 text-sm"
                data-state={done ? 'done' : 'todo'}
              >
                <span
                  className={[
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
                    done
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30 text-muted-foreground',
                  ].join(' ')}
                  aria-hidden
                >
                  {done ? <Check className="h-4 w-4" /> : stepNumber}
                </span>
                <span className={done ? 'text-foreground' : 'text-muted-foreground'}>
                  Recette #{stepNumber}{stepNumber === TARGET_COUNT ? ' — bravo !' : ''}
                </span>
              </li>
            );
          })}
        </ol>

        <SheetFooter className="mt-4 sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Astuce : utilise le bouton « Partager » d&apos;Instagram ou
            TikTok et choisis Smart Pantry.
          </p>
          <Button variant="ghost" onClick={handleDismiss}>
            Plus tard
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default RecipeImportOnboarding;
