/**
 * NutritionMiniPanel — petit panel compact kcal + macros + Nutriscore.
 *
 * PRP-225 PR6 — affiche la projection nutrition issue d'OpenFoodFacts
 * sans promesse médicale. Wording explicite "Données OpenFoodFacts,
 * à vérifier" pour rappeler que la base est contributive.
 *
 * Tokens PRP-237 : `accent-ai` pour le header (présence IA / source
 * externe), `muted-foreground` pour les valeurs, `success` / `warning`
 * / `destructive` pour les badges Nutriscore A→E.
 */
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface NutritionPer100g {
  energyKcal?: number;
  proteinG?: number;
  carbsG?: number;
  sugarG?: number;
  fatG?: number;
  saturatedFatG?: number;
  fiberG?: number;
  saltG?: number;
}

export type NutriScore = 'a' | 'b' | 'c' | 'd' | 'e' | 'unknown';

interface NutritionMiniPanelProps {
  per100g?: NutritionPer100g | null;
  nutriScore?: NutriScore | null;
  /** "OpenFoodFacts" / "Saisie manuelle" / etc. */
  sourceLabel?: string;
  className?: string;
}

const NUTRISCORE_VARIANTS: Record<Exclude<NutriScore, 'unknown'>, 'success' | 'info' | 'warning' | 'destructive'> = {
  a: 'success',
  b: 'success',
  c: 'info',
  d: 'warning',
  e: 'destructive',
};

function NutritionRow({ label, value, unit }: { label: string; value: number | undefined; unit: string }) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  // Round to 1 decimal for sub-1 values, 0 decimal otherwise — keeps
  // the panel scannable without flooring kcal info.
  const display = Math.abs(value) < 10 ? value.toFixed(1) : Math.round(value).toString();
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">
        {display}
        <span className="text-xs text-muted-foreground ml-0.5">{unit}</span>
      </span>
    </div>
  );
}

export function NutritionMiniPanel({
  per100g,
  nutriScore,
  sourceLabel = 'OpenFoodFacts',
  className,
}: NutritionMiniPanelProps) {
  const hasAnyMacro =
    per100g &&
    Object.values(per100g).some((v) => typeof v === 'number' && Number.isFinite(v));
  if (!hasAnyMacro && !nutriScore) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-md border bg-surface-muted p-3 space-y-2',
        className,
      )}
      role="region"
      aria-label="Informations nutritionnelles"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-ai">
          Nutrition (pour 100 g)
        </p>
        {nutriScore && nutriScore !== 'unknown' && (
          <Badge
            variant={NUTRISCORE_VARIANTS[nutriScore]}
            className="uppercase text-[10px] tracking-wider"
            title={`Nutriscore ${nutriScore.toUpperCase()}`}
          >
            Nutriscore {nutriScore}
          </Badge>
        )}
      </div>
      {hasAnyMacro && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <NutritionRow label="Énergie" value={per100g?.energyKcal} unit="kcal" />
          <NutritionRow label="Protéines" value={per100g?.proteinG} unit="g" />
          <NutritionRow label="Glucides" value={per100g?.carbsG} unit="g" />
          <NutritionRow label="dont sucres" value={per100g?.sugarG} unit="g" />
          <NutritionRow label="Lipides" value={per100g?.fatG} unit="g" />
          <NutritionRow label="dont saturés" value={per100g?.saturatedFatG} unit="g" />
          <NutritionRow label="Fibres" value={per100g?.fiberG} unit="g" />
          <NutritionRow label="Sel" value={per100g?.saltG} unit="g" />
        </div>
      )}
      <p className="text-[11px] text-muted-foreground italic">
        Données {sourceLabel}, à vérifier.
      </p>
    </div>
  );
}

export default NutritionMiniPanel;
