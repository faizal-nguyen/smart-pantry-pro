import React from 'react';
import {
  Globe,
  Instagram,
  Music2,
  Pencil,
  Pin,
  Youtube,
  type LucideProps,
} from 'lucide-react';

export type SourcePlatform =
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'pinterest'
  | 'web'
  | 'manual'
  | 'unknown';

interface PlatformIconProps extends Omit<LucideProps, 'ref'> {
  platform: SourcePlatform | string | null | undefined;
}

/**
 * Inline icon for the source platform of a recipe (PRP-220.17). Maps
 * the canonical `source_platform` enum to a lucide icon. Unknown /
 * missing values get the `Globe` fallback so the UI never breaks.
 *
 * Lucide ships no dedicated TikTok or Pinterest glyph — we approximate
 * with `Music2` / `Pin` which read clearly enough alongside the
 * platform label.
 */
export const PlatformIcon: React.FC<PlatformIconProps> = ({ platform, ...props }) => {
  switch ((platform ?? '').toLowerCase()) {
    case 'instagram':
      return <Instagram aria-hidden {...props} />;
    case 'youtube':
      return <Youtube aria-hidden {...props} />;
    case 'tiktok':
      return <Music2 aria-hidden {...props} />;
    case 'pinterest':
      return <Pin aria-hidden {...props} />;
    case 'manual':
      return <Pencil aria-hidden {...props} />;
    case 'web':
    case 'unknown':
    default:
      return <Globe aria-hidden {...props} />;
  }
};

export function platformLabel(platform: SourcePlatform | string | null | undefined): string {
  switch ((platform ?? '').toLowerCase()) {
    case 'instagram':
      return 'Instagram';
    case 'tiktok':
      return 'TikTok';
    case 'youtube':
      return 'YouTube';
    case 'pinterest':
      return 'Pinterest';
    case 'web':
      return 'le web';
    case 'manual':
      return 'manuel';
    default:
      return 'une source';
  }
}
