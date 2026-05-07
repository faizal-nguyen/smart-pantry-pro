import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Shared loading state for top-level pages while auth/data resolves
 * (UI/UX audit P2 — replaces the bare `<div>Chargement...</div>` that
 * shipped on 8+ pages and stripped users of any navigation chrome).
 *
 * Intentionally minimal: a centered spinner on the app background, no
 * branding chrome. The auth-resolution window is short — the goal is
 * to avoid showing the wrong shell for half a second, not to surface
 * a marketing splash.
 */
export const PageLoader: React.FC<{ label?: string; className?: string }> = ({
  label = 'Chargement…',
  className,
}) => (
  <div
    role="status"
    aria-live="polite"
    aria-busy="true"
    className={[
      'min-h-screen w-full flex flex-col items-center justify-center bg-background gap-3',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
);

export default PageLoader;
