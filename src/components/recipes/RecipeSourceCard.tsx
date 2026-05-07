import React from 'react';
import { ExternalLink, AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { PlatformIcon, platformLabel, type SourcePlatform } from './PlatformIcon';

/**
 * The shape this card consumes is the legacy `recipes` row enriched
 * with the PRP-220.16 source columns. We accept a permissive shape so
 * the component drops in alongside the existing `useRecipes` hook
 * (which still returns plain Supabase rows) without forcing a type
 * migration.
 */
export interface RecipeSourceLike {
  source_platform?: SourcePlatform | string | null;
  source_url?: string | null;
  source_metadata?: {
    canonicalUrl?: string;
    authorName?: string;
    authorHandle?: string;
    authorUrl?: string;
    thumbnailUrl?: string;
    originalTitle?: string;
    originalDescription?: string;
    importedAt?: string;
    extractionMethod?: string;
    confidence?: number;
    extractionWarnings?: string[];
  } | null;
}

interface RecipeSourceCardProps {
  recipe: RecipeSourceLike;
  className?: string;
}

const LOW_CONFIDENCE_THRESHOLD = 0.6;

/**
 * Source provenance card for the recipe detail view (PRP-220.17).
 *
 * Renders the originating platform, author, import date, and a hard
 * link back to the source URL. Hidden entirely when the recipe was
 * created manually (no `source_platform` or platform === 'manual')
 * so existing manually-typed recipes don't grow a confusing
 * "Imported from manual" label.
 *
 * Outbound link is `target="_blank"` + `rel="noopener noreferrer
 * nofollow"` so the user-supplied URL can't break out of the SPA or
 * leak referrer data.
 */
export const RecipeSourceCard: React.FC<RecipeSourceCardProps> = ({ recipe, className }) => {
  const platform = recipe.source_platform ?? null;
  if (!platform || platform === 'manual') return null;

  const meta = recipe.source_metadata ?? {};
  const confidence = typeof meta.confidence === 'number' ? meta.confidence : null;
  const importedAt = meta.importedAt ? safeFormatDate(meta.importedAt) : null;

  const authorBlock = renderAuthor(meta);

  return (
    <Card
      className={['border-l-4 border-l-primary', className].filter(Boolean).join(' ')}
      data-testid="recipe-source-card"
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <PlatformIcon platform={platform} className="h-5 w-5 text-primary" />
          <span>Importé depuis {platformLabel(platform)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {authorBlock}

        {importedAt && (
          <p className="text-xs text-muted-foreground">Importée le {importedAt}</p>
        )}

        {meta.originalTitle && meta.originalTitle !== '' && (
          <p className="text-sm text-muted-foreground italic">« {meta.originalTitle} »</p>
        )}

        {recipe.source_url && (
          <div>
            <Button variant="outline" size="sm" asChild>
              <a
                href={recipe.source_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                aria-label={`Voir la source originale sur ${platformLabel(platform)}`}
              >
                <ExternalLink className="mr-1 h-4 w-4" />
                Voir la source
              </a>
            </Button>
          </div>
        )}

        {confidence !== null && confidence < LOW_CONFIDENCE_THRESHOLD && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Cette recette a été extraite avec une confiance modérée
              ({Math.round(confidence * 100)}%). Vérifie les ingrédients
              et les étapes avant de cuisiner.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

function renderAuthor(meta: NonNullable<RecipeSourceLike['source_metadata']>): React.ReactNode {
  const { authorName, authorHandle, authorUrl } = meta;
  if (!authorName && !authorHandle) return null;
  const display = authorName ?? authorHandle ?? '';
  const handle = authorHandle && authorHandle !== authorName ? ` (@${authorHandle})` : '';

  if (authorUrl) {
    return (
      <p className="text-sm">
        Par{' '}
        <a
          href={authorUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="font-medium underline underline-offset-2"
        >
          {display}
        </a>
        {handle}
      </p>
    );
  }
  return (
    <p className="text-sm">
      Par <span className="font-medium">{display}</span>
      {handle}
    </p>
  );
}

function safeFormatDate(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}
