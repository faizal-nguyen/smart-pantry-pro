import React from 'react';
import { ExternalLink, AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { PlatformIcon, platformLabel, type SourcePlatform } from './PlatformIcon';
import { detectPlatform } from '@/services/recipe-import/helpers/url';
import { safeRecipeSourceUrl } from '@/lib/recipeLinks';

/**
 * The shape this card consumes is the legacy `recipes` row enriched
 * with the PRP-220.16 source columns. We accept a permissive shape so
 * the component drops in alongside the existing `useRecipes` hook
 * (which still returns plain Supabase rows) without forcing a type
 * migration.
 */
export interface RecipeSourceLike {
  image_url?: string | null;
  source_platform?: SourcePlatform | string | null;
  source_url?: string | null;
  source_metadata?: {
    sources?: Array<{url:string;title:string;kind:'recipe'|'video'|'technique';publisher?:string;author?:string}>;
    photo?: {image_url:string;source_url:string;publisher:string;author?:string;note?:string};
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
 * Best-effort detection of the source platform from a URL when the
 * recipe wasn't tagged at import time (legacy `recipes` rows, manual
 * SQL seeds, etc.). 2026-05-18 — seeded recipes (Ayam Percik, Tiv
 * set) carry only `source_url` and used to hide this card entirely.
 */
function inferPlatformFromUrl(url: string | null | undefined): SourcePlatform {
  if (!url) return 'unknown';
  return detectPlatform(url);
}

/**
 * Source provenance card for the recipe detail view (PRP-220.17).
 *
 * Renders the originating platform, author, import date, and a hard
 * link back to the source URL. Hidden entirely when both `source_url`
 * and `source_platform` are absent — i.e. truly hand-typed recipes.
 * When only a URL is present, the platform is inferred from the host.
 *
 * Outbound link is `target="_blank"` + `rel="noopener noreferrer
 * nofollow"` so the user-supplied URL can't break out of the SPA or
 * leak referrer data.
 */
export const RecipeSourceCard: React.FC<RecipeSourceCardProps> = ({ recipe, className }) => {
  const rawPlatform = (recipe.source_platform ?? null) as SourcePlatform | string | null;
  const sourceUrl = safeRecipeSourceUrl(recipe.source_url);
  const meta = recipe.source_metadata ?? {};
  const seen=new Set<string>();
  const references=(Array.isArray(meta.sources) ? meta.sources : []).flatMap(item=>{
    if (!item || typeof item!=='object' || typeof item.title!=='string') return [];
    const url=safeRecipeSourceUrl(item.url);
    if (!url || seen.has(url)) return [];
    seen.add(url);return [{...item,url}];
  });
  const photoUrl=recipe.image_url===undefined || recipe.image_url===meta.photo?.image_url ? safeRecipeSourceUrl(meta.photo?.source_url) : null;
  if (references.length || photoUrl) return <Card className={className} data-testid="recipe-source-card">
    <CardHeader className="pb-3"><CardTitle className="text-base">Sources et inspirations</CardTitle></CardHeader>
    <CardContent className="space-y-3">
      <p className="text-sm text-muted-foreground">Ces références présentent le plat ou une technique. Leurs ingrédients peuvent différer de cette version maison sans porc ni alcool.</p>
      <ul className="space-y-2">{references.map(item=><li key={item.url}>
        <a className="inline-flex min-h-11 items-center gap-2 underline underline-offset-2" href={item.url} target="_blank" rel="noopener noreferrer nofollow"><ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true"/>{item.title}</a>
        <p className="text-xs text-muted-foreground">{item.kind==='video' ? 'Vidéo' : item.kind==='technique' ? 'Technique' : 'Recette de référence'}{item.publisher ? ` · ${item.publisher}` : ''}{item.author ? ` · ${item.author}` : ''}</p>
      </li>)}</ul>
      {photoUrl && <div className="border-t pt-2 text-sm"><p>Photo de référence : {meta.photo?.author || meta.photo?.publisher}. <a className="inline-flex min-h-11 items-center underline" href={photoUrl} target="_blank" rel="noopener noreferrer nofollow">Voir la photo sur le site source</a></p>{meta.photo?.note && <p className="text-xs text-muted-foreground">{meta.photo.note}</p>}</div>}
    </CardContent>
  </Card>;
  // Hide only when both signals are missing. If we have a URL alone
  // (seeded rows, legacy imports before PRP-220.16), infer and show.
  if ((!rawPlatform || rawPlatform === 'manual') && !sourceUrl) return null;

  const platform: SourcePlatform =
    rawPlatform && rawPlatform !== 'manual'
      ? (rawPlatform as SourcePlatform)
      : inferPlatformFromUrl(sourceUrl);

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

        {sourceUrl && (
          <div>
            <Button variant="outline" size="sm" className="min-h-11" asChild>
              <a
                href={sourceUrl}
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
  const safeAuthorUrl = safeRecipeSourceUrl(authorUrl);
  if (!authorName && !authorHandle) return null;
  const display = authorName ?? authorHandle ?? '';
  const handle = authorHandle && authorHandle !== authorName ? ` (@${authorHandle})` : '';

  if (safeAuthorUrl) {
    return (
      <p className="text-sm">
        Par{' '}
        <a
          href={safeAuthorUrl}
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
