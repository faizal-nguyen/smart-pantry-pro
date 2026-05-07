import React from 'react';
import { Globe, Instagram, Music, PenLine, Pin, Youtube } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { SocialPlatform } from '@/services/recipe-import/types';

interface PlatformBadgeProps {
  platform: SocialPlatform;
  className?: string;
  /** Hide the textual label and show the icon only. */
  iconOnly?: boolean;
}

const META: Record<SocialPlatform, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  instagram: { label: 'Instagram', icon: Instagram, className: 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300' },
  tiktok:    { label: 'TikTok',    icon: Music,     className: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-200' },
  youtube:   { label: 'YouTube',   icon: Youtube,   className: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
  pinterest: { label: 'Pinterest', icon: Pin,       className: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
  web:       { label: 'Web',       icon: Globe,     className: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  manual:    { label: 'Manuel',    icon: PenLine,   className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  unknown:   { label: 'Source',    icon: Globe,     className: 'bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-300' },
};

export const PlatformBadge: React.FC<PlatformBadgeProps> = ({ platform, className, iconOnly }) => {
  const { label, icon: Icon, className: tone } = META[platform] ?? META.unknown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        tone,
        className
      )}
      aria-label={label}
    >
      <Icon className="h-3 w-3" />
      {!iconOnly && <span>{label}</span>}
    </span>
  );
};

export default PlatformBadge;
