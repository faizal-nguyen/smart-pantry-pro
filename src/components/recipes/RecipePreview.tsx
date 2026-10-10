import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { resolveRecipeImageUrl } from '@smart/shared';
import { cn } from '@/lib/utils';

interface RecipePreviewProps {
  imageUrl?: string | null;
  title: string;
  priority?: boolean;
  decorative?: boolean;
  variant?: 'card' | 'compact' | 'detail';
  className?: string;
  caption?: string;
}

/** No provider request or substituted dish; a failed URL keeps the reserved space. */
export default function RecipePreview({ imageUrl, ...props }: RecipePreviewProps) {
  const url = resolveRecipeImageUrl(imageUrl);
  return <PreviewImage key={url ?? 'absent'} url={url} {...props} />;
}

function PreviewImage({ url, title, priority = false, decorative = false, variant = 'card', className, caption }: Omit<RecipePreviewProps, 'imageUrl'> & { url: string | null }) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const frame = cn(
    'relative overflow-hidden rounded-lg bg-muted text-muted-foreground',
    url ? (variant === 'compact' ? 'h-20 w-24 shrink-0' : 'aspect-[4/3] w-full') : (variant === 'detail' ? 'h-32 w-full' : 'h-14 w-full'),
    className,
  );
  if (!url || state === 'error') return (
    <div className={cn(frame, 'flex items-center justify-center gap-2 px-3 text-sm')}
      role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : `Aperçu indisponible pour ${title}`}>
      <ImageOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>Photo indisponible</span>
    </div>
  );
  return (
    <div className={frame}>
      {state === 'loading' && <div className="absolute inset-0 animate-pulse motion-reduce:animate-none bg-muted" aria-hidden="true" />}
      <img src={url} alt={decorative ? '' : title} loading={priority ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer"
        className={cn('absolute inset-0 h-full w-full object-cover', state === 'loading' && 'opacity-0')}
        onLoad={() => setState('loaded')} onError={() => setState('error')} />
      {caption && state==='loaded' && <span className="absolute left-2 top-2 rounded bg-background/95 px-2 py-1 text-xs text-foreground">{caption}</span>}
    </div>
  );
}
