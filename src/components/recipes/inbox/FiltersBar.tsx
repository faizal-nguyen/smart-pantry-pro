import React from 'react';

import { cn } from '@/lib/utils';
import type { ImportStatus } from '@/services/recipe-import/types';

export type FilterValue = 'all' | ImportStatus;

interface FilterDefinition {
  value: FilterValue;
  label: string;
}

const FILTERS: FilterDefinition[] = [
  { value: 'all', label: 'Tout' },
  { value: 'captured', label: 'À traiter' },
  { value: 'extracting', label: 'Extraction' },
  { value: 'needs_review', label: 'À vérifier' },
  { value: 'draft_ready', label: 'Prêts' },
  { value: 'saved', label: 'Sauvegardés' },
  { value: 'failed', label: 'Échecs' },
  { value: 'archived', label: 'Archivés' },
];

interface FiltersBarProps {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  className?: string;
  /** Optional per-bucket counts to display next to each label. */
  counts?: Partial<Record<FilterValue, number>>;
}

/**
 * Inbox filter pills (PRP-220.12). Horizontally scrollable on narrow
 * viewports; uses radio-button semantics so screen-readers narrate the
 * single-selection contract.
 */
export const FiltersBar: React.FC<FiltersBarProps> = ({ value, onChange, className, counts }) => (
  <div
    role="radiogroup"
    aria-label="Filtre par statut"
    className={cn('flex items-center gap-2 overflow-x-auto py-1 -mx-1 px-1 scrollbar-thin', className)}
  >
    {FILTERS.map((f) => {
      const isActive = f.value === value;
      const count = counts?.[f.value];
      return (
        <button
          key={f.value}
          type="button"
          role="radio"
          aria-checked={isActive}
          onClick={() => onChange(f.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
            isActive
              ? 'bg-foreground text-background'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          <span>{f.label}</span>
          {count !== undefined && count > 0 && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                isActive ? 'bg-background/20 text-background' : 'bg-foreground/10 text-foreground'
              )}
            >
              {count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default FiltersBar;
