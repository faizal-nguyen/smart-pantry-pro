import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/**
 * Shown when a page throws while rendering or loading (a lazy chunk included): React Router
 * otherwise shows « Unexpected Application Error » in English (audit 2026-11-07, UX P1 4).
 */
export default function RouteError() {
  const error = useRouteError();
  useEffect(() => { console.error('[route] page failed:', error); }, [error]);
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center" role="alert">
      <h1 className="text-xl font-semibold">{missing ? 'Cette page n’existe pas.' : 'Cette page n’a pas pu s’afficher.'}</h1>
      <p className="text-sm text-muted-foreground">
        {missing ? 'Le lien est peut-être ancien.' : 'Recharge la page. Si le problème revient, repars de l’accueil.'}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {!missing && <Button className="min-h-11" onClick={() => window.location.reload()}>Recharger</Button>}
        <Button className="min-h-11" variant="outline" asChild><a href="/kitchen">Retour à l’accueil</a></Button>
      </div>
    </main>
  );
}
