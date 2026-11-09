import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NewVersionBannerProps {
  available: boolean;
  onReload?: () => void;
}

/** Offers the deployed build; « Plus tard » hides it until the next start. */
export default function NewVersionBanner({ available, onReload = () => window.location.reload() }: NewVersionBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (!available || dismissed) return null;
  return (
    <div role="status" aria-live="polite"
      className="fixed inset-x-0 top-0 z-[60] flex flex-wrap items-center justify-center gap-2 border-b bg-background/95 px-4 py-2 text-sm shadow-sm backdrop-blur pt-[max(0.5rem,env(safe-area-inset-top))]">
      <RefreshCw className="h-4 w-4 text-primary" aria-hidden="true" />
      <span>Une nouvelle version de l’app est disponible.</span>
      <Button size="sm" className="min-h-11" onClick={onReload}>Mettre à jour</Button>
      <Button size="sm" variant="ghost" className="min-h-11" onClick={() => setDismissed(true)}>Plus tard</Button>
    </div>
  );
}
