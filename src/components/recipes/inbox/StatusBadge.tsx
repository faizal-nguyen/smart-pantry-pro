import React from 'react';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ImportStatus } from '@/services/recipe-import/types';

interface StatusBadgeProps {
  status: ImportStatus;
  className?: string;
}

const META: Record<ImportStatus, { label: string; className: string; pulse?: boolean }> = {
  captured:        { label: 'À traiter',     className: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300' },
  metadata_ready:  { label: 'Prêt',          className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' },
  extracting:      { label: 'Extraction…',   className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300', pulse: true },
  draft_ready:     { label: 'Prêt à valider', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  needs_review:    { label: 'À vérifier',    className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  saved:           { label: 'Sauvegardée',   className: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200' },
  failed:          { label: 'Échec',         className: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
  archived:        { label: 'Archivé',       className: 'bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-300' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const { label, className: tone, pulse } = META[status] ?? META.captured;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        tone,
        className
      )}
      role="status"
      aria-label={`Statut: ${label}`}
    >
      {pulse && <Loader2 className="h-3 w-3 animate-spin" />}
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;
