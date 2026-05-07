import React from 'react';
import { Inbox } from 'lucide-react';

import { cn } from '@/lib/utils';

interface InboxEmptyStateProps {
  className?: string;
  title?: string;
  description?: string;
}

/**
 * Inbox empty state (PRP-220.12). Used when the list query returns an
 * empty page on the unfiltered view; the filters bar shows its own
 * empty hint when only a status returns nothing.
 */
export const InboxEmptyState: React.FC<InboxEmptyStateProps> = ({
  className,
  title = 'Ton inbox est vide',
  description = 'Colle une URL Instagram, TikTok ou YouTube pour capturer une recette. L\'app la transforme automatiquement en recette structurée.',
}) => (
  <div className={cn('text-center py-12 px-4', className)} data-testid="inbox-empty-state">
    <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
      <Inbox className="h-8 w-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-medium">{title}</h3>
    <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">{description}</p>
  </div>
);

export default InboxEmptyState;
