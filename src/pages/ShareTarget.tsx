import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { extractFirstUrl } from '@/services/recipe-import/helpers/url';
import { useAuthSessionOptional } from '@/hooks/useAuthenticatedUser';
import { beginShareCapture,bindShareCapture,captureSharedRecipe,readShareCapture,type ShareCapture } from '@/services/shareCaptures';
import { Button } from '@/components/ui/button';
export default function ShareTarget() {
  const [params] = useSearchParams(), { user,isLoading } = useAuthSessionOptional();
  const [capture,setCapture] = useState<ShareCapture|null>(null), [error,setError] = useState<string|null>(null), [busy,setBusy] = useState(false);
  const url = [params.get('url'),params.get('text'),params.get('title')].map(value => value && extractFirstUrl(value)).find(Boolean);
  useEffect(() => {
    if (isLoading) return;
    try {
      // Source saved synchronously before displaying a link to authentication.
      let draft = user ? bindShareCapture(user.id) : readShareCapture('anonymous');
      if (url && (!draft || draft.source!==url)) draft = beginShareCapture(url,user?.id);
      setCapture(draft);
      if (!draft) setError('Aucun lien détecté. Revenez au partage ou collez un lien dans Cuisiner.');
    } catch (failure) {
      setError((failure as Error).message);
      try { setCapture(readShareCapture(user?.id ?? 'anonymous')); } catch { /* Keep the storage error visible. */ }
    }
  },[isLoading,user,url]);
  const run = async () => {
    if (!user || busy) return; setBusy(true); setError(null);
    try { setCapture(await captureSharedRecipe(user.id)); }
    catch (failure) { setError((failure as Error).message); setCapture(readShareCapture(user.id)); }
    finally { setBusy(false); }
  };
  const returnTo = '/share-target';
  return <div className="mx-auto max-w-lg min-h-screen p-5 flex flex-col justify-center gap-4"><h1 className="text-2xl font-semibold">Votre lien de recette</h1>
    {isLoading && <p role="status">Vérification de la connexion…</p>}
    {capture && <><p className="break-all rounded-lg border p-3">{capture.source}</p><p className="text-sm text-muted-foreground">Le lien est conservé sur cet appareil jusqu’à confirmation.</p></>}
    {(error || capture?.error) && <p role="alert" className="text-destructive">{error || capture?.error}</p>}
    {capture && !user && <Button className="min-h-11" asChild><Link to={`/auth?returnTo=${encodeURIComponent(returnTo)}`}>Me connecter pour reprendre ce partage</Link></Button>}
    {capture && user && !['captured','saved'].includes(capture.status) && <Button className="min-h-11" disabled={busy} onClick={() => void run()}>{busy ? 'Capture…' : capture.status==='failed' ? 'Réessayer la capture' : 'Ajouter ce lien à mes recettes'}</Button>}
    {capture && ['captured','saved'].includes(capture.status) && <><p role="status">{capture.duplicate ? 'Cette source était déjà enregistrée. Ouvrez la recette ou son brouillon existant.' : capture.status==='saved' ? 'Recette enregistrée.' : 'Lien ajouté. Le brouillon peut être complété dans les imports.'}</p><Button className="min-h-11" asChild><Link to={capture.destination}>{capture.status==='saved' ? 'Ouvrir la recette' : 'Ouvrir ce brouillon'}</Link></Button></>}
    {capture && <Button variant="outline" className="min-h-11" onClick={() => { void navigator.clipboard.writeText(capture.source).catch(() => setError('Copie impossible. Sélectionnez le lien affiché pour le copier.')); }}>Copier le lien</Button>}
    <Button variant="ghost" className="min-h-11" asChild><Link to="/kitchen">Reprendre plus tard</Link></Button>
  </div>;
}
