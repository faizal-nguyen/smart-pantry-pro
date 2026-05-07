import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExtractionWarningsListProps {
  /** Warnings produced by the recipe-import pipeline (PRP-220.06/07). */
  warnings: readonly string[];
  className?: string;
  /** Custom title; defaults to "Points à vérifier". */
  title?: string;
}

/**
 * Renders the `extractionWarnings` of an `ImportedRecipeDraft` as an
 * Alert with a bulleted list. Returns null when the list is empty so
 * call sites don't need to guard.
 */
export const ExtractionWarningsList: React.FC<ExtractionWarningsListProps> = ({
  warnings,
  className,
  title,
}) => {
  if (!warnings || warnings.length === 0) return null;

  return (
    <Alert
      className={cn(
        'border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-200',
        className
      )}
    >
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle>{title ?? 'Points à vérifier'}</AlertTitle>
      <AlertDescription>
        <ul className="mt-1 list-disc pl-5 space-y-0.5">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
};

export default ExtractionWarningsList;
