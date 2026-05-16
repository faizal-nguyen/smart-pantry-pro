/**
 * PRP-234 PR3 — TodayPanelShell.
 *
 * Conventions partagées entre les 4 panels Today : header avec titre,
 * loading skeleton, error state avec retry, empty state avec CTA. DRY
 * pour garder les TodayContinue/Recommendations/Week/AntiWaste panels
 * focalisés sur leur data + leur rendu spécifique.
 */
import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface PanelChromeProps {
  title: string;
  children: React.ReactNode;
}

export function PanelChrome({ title, children }: PanelChromeProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

interface PanelSkeletonProps {
  title: string;
  rows?: number;
}

export function PanelSkeleton({ title, rows = 3 }: PanelSkeletonProps) {
  return (
    <PanelChrome title={title}>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </PanelChrome>
  );
}

interface PanelErrorProps {
  title: string;
  message?: string;
  onRetry?: () => void;
}

export function PanelError({ title, message, onRetry }: PanelErrorProps) {
  return (
    <PanelChrome title={title}>
      <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
        <p>{message ?? 'Impossible de charger ce bloc.'}</p>
        {onRetry && (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Réessayer
          </Button>
        )}
      </div>
    </PanelChrome>
  );
}

interface PanelEmptyProps {
  title: string;
  message: string;
  cta?: { label: string; onClick: () => void };
}

export function PanelEmpty({ title, message, cta }: PanelEmptyProps) {
  return (
    <PanelChrome title={title}>
      <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
        <p>{message}</p>
        {cta && (
          <Button type="button" variant="outline" size="sm" onClick={cta.onClick}>
            {cta.label}
          </Button>
        )}
      </div>
    </PanelChrome>
  );
}
