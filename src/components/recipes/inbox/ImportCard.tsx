import React from 'react';
import { ExternalLink } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { ConfidenceBadge } from '@/components/recipes/ConfidenceBadge';
import { cn } from '@/lib/utils';
import type { SocialImport } from '@/services/recipe-import/types';

import { ImportActions } from './ImportActions';
import { PlatformBadge } from './PlatformBadge';
import { StatusBadge } from './StatusBadge';

interface ImportCardProps {
  import_: SocialImport;
  onExtract?: (id: string, force?: boolean) => void;
  onVerify?: (import_: SocialImport) => void;
  onSave?: (import_: SocialImport) => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  /** When true, disables all actions on this card. */
  busy?: boolean;
  className?: string;
}

/**
 * Single inbox card (PRP-220.12). Displays:
 *   - thumbnail (if available) or platform icon as fallback
 *   - platform + status + confidence badges
 *   - title (or source URL when title hasn't been extracted yet)
 *   - author handle when known
 *   - error message when status === failed
 *   - status-driven action buttons (cf ImportActions)
 *   - small external link to the source URL
 */
export const ImportCard: React.FC<ImportCardProps> = ({
  import_,
  onExtract,
  onVerify,
  onSave,
  onArchive,
  onUnarchive,
  busy,
  className,
}) => {
  const titleOrUrl = import_.title?.trim() || prettyUrl(import_.source_url);
  const authorLabel = import_.author_handle
    ? `@${import_.author_handle}`
    : import_.author_name ?? null;
  // PRP-220.24 §5.16: prefer the snapshot URL (signed Supabase Storage)
  // over the volatile remote CDN URL — the latter expires within weeks
  // on Insta/TikTok.
  const displayThumbnail = import_.display_thumbnail_url ?? import_.thumbnail_url;

  return (
    <Card className={cn('overflow-hidden', className)} data-testid={`import-card-${import_.id}`}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Thumbnail / icon */}
          <div className="shrink-0">
            {displayThumbnail ? (
              <img
                src={displayThumbnail}
                alt=""
                loading="lazy"
                className="h-20 w-20 rounded-md object-cover bg-muted"
              />
            ) : (
              <div className="h-20 w-20 rounded-md bg-muted flex items-center justify-center">
                <PlatformBadge platform={import_.platform} iconOnly />
              </div>
            )}
          </div>

          {/* Body */}
          <div className="min-w-0 flex-1 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <PlatformBadge platform={import_.platform} />
              <StatusBadge status={import_.status} />
              {import_.confidence != null && import_.confidence > 0 && (
                <ConfidenceBadge value={import_.confidence} />
              )}
            </div>

            <h3
              className="font-medium text-sm sm:text-base truncate"
              title={titleOrUrl}
            >
              {titleOrUrl}
            </h3>

            {authorLabel && (
              <p className="text-xs text-muted-foreground">{authorLabel}</p>
            )}

            {import_.error_message && import_.status === 'failed' && (
              <p
                className="text-xs text-red-700 dark:text-red-300 mt-1 line-clamp-2"
                title={import_.error_message}
              >
                {import_.error_message}
              </p>
            )}

            <a
              href={import_.source_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1 w-fit"
            >
              <ExternalLink className="h-3 w-3" />
              Source
            </a>
          </div>

          {/* Actions */}
          <div className="shrink-0 self-start sm:self-center">
            <ImportActions
              import_={import_}
              onExtract={onExtract}
              onVerify={onVerify}
              onSave={onSave}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
              disabled={busy}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

function prettyUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`.replace(/\/+$/, '');
  } catch {
    return url;
  }
}

export default ImportCard;
