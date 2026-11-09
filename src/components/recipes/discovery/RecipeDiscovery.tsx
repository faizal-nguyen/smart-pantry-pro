import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import type { DiscoveryItem, DiscoveryPrepareImportResponse } from '@smart/shared';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { useRecipeDiscovery } from '@/hooks/useRecipeDiscovery';
import { useOwnedValue } from '@/lib/ownedStorage';
import { useCulinaryDesign } from '@/contexts/CulinaryDesignContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { safeDiscoverySourceUrl, type DiscoveryDecision, type DiscoveryFeedback, type DiscoveryStarterLink } from '@/services/discoveryApi';
import DiscoveryCard from './DiscoveryCard';
import DiscoveryDraftEditor from './DiscoveryDraftEditor';

const CaptureFormSchema = z.object({ creatorId: z.string(), sourceUrl: z.string().max(2000), title: z.string().max(300) });
const emptyCapture = { creatorId: '', sourceUrl: '', title: '' };

export default function RecipeDiscovery() {
  const user = useAuthenticatedUser();
  return <OwnedDiscovery key={user.id} owner={user.id} />;
}

export function OwnedDiscovery({ owner }: { owner: string }) {
  const discovery = useRecipeDiscovery(owner), design = useCulinaryDesign();
  const [savedCapture, saveCapture, captureStorageError] = useOwnedValue<unknown>(owner, 'discovery-capture', emptyCapture);
  const captureResult = CaptureFormSchema.safeParse(savedCapture);
  const capture = captureResult.success ? captureResult.data : emptyCapture;
  const captureError = captureStorageError ?? (captureResult.success ? null : 'Le lien saisi ne peut pas être relu. Il reste conservé.');
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ item: DiscoveryItem; prepared: DiscoveryPrepareImportResponse } | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const chosenCreator = capture.creatorId || discovery.creators.find(creator => !creator.paused)?.id || '';
  const updateCapture = (patch: Partial<typeof emptyCapture>) => {
    setError(null);
    try { saveCapture({ ...capture, creatorId: chosenCreator, ...patch }); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'La saisie ne peut pas être conservée.'); }
  };
  const perform = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError(null); setNotice(null);
    try { await action(); }
    catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : 'Le choix n’a pas pu être confirmé.'); }
    finally { if (mounted.current) setBusy(false); }
  };
  const prepare = async (item: DiscoveryItem) => {
    const prepared = await discovery.prepare(item);
    if (mounted.current) setEditor({ item: prepared.item, prepared });
  };
  const decide = (item: DiscoveryItem, value: DiscoveryDecision) => void perform(async () => {
    const result = await discovery.decide(item, value);
    if (!mounted.current) return;
    setNotice(value === 'keep' ? 'Inspiration gardée. Vérifie la recette avant de l’ajouter.' : value === 'pass' ? 'Proposition passée. Ce choix ne change pas tes goûts mémorisés.' : 'Proposition mise de côté pour aujourd’hui.');
    if (value === 'keep') await prepare(result.item);
  });
  const feedback = (item: DiscoveryItem, value: DiscoveryFeedback) => void perform(async () => {
    await discovery.feedback(item, value);
    if (mounted.current) setNotice('Ton avis après cuisine est enregistré.');
  });
  const addLink = () => void perform(async () => {
    if (!chosenCreator || !safeDiscoverySourceUrl(capture.sourceUrl)) throw new Error('Choisis un créateur et renseigne un lien http ou https valide.');
    await discovery.capture({ creatorId: chosenCreator, sourceUrl: capture.sourceUrl.trim(), ...(capture.title.trim() ? { title: capture.title.trim() } : {}) });
    if (!mounted.current) return;
    saveCapture({ creatorId: chosenCreator, sourceUrl: '', title: '' });
    setNotice('Lien proposé. Tu peux maintenant le garder ou passer.');
  });
  const addStarter = (link: DiscoveryStarterLink) => void perform(async () => {
    await discovery.capture({ creatorId: link.creatorId, sourceUrl: link.sourceUrl, title: link.title });
    if (mounted.current) setNotice('Lien proposé. Consulte la source puis garde la recette si elle te donne envie.');
  });
  const locked = busy || !!discovery.pending || !!discovery.pendingError;
  const available = discovery.feed?.items ?? [], saved = discovery.feed?.savedItems ?? [];
  const starterLinks = discovery.links.filter(link => link.creatorId === chosenCreator && safeDiscoverySourceUrl(link.sourceUrl));
  return <section className="space-y-5 min-w-0" data-culinary-view={design} aria-labelledby="discovery-heading">
    <header className="space-y-1"><h2 id="discovery-heading" className="text-xl font-semibold">À découvrir</h2><p className="text-sm text-muted-foreground">Quelques plats de créateurs choisis, puis les recettes que tu as envie de garder.</p><p className="text-xs text-muted-foreground">Les liens sont ajoutés à la main. Aucune veille automatique n’est activée.</p></header>
    {discovery.isLoading && <p role="status">Chargement de la sélection…</p>}
    {discovery.error && <div role="alert" className="rounded-lg border p-3 space-y-2 text-sm"><p>{discovery.isStale ? 'La sélection récente n’a pas pu être relue. La dernière sélection conservée reste visible.' : 'La découverte ne peut pas être lue pour le moment.'}</p><Button className="min-h-11" variant="outline" disabled={busy} onClick={() => void perform(async () => { await discovery.refresh(); })}>Réessayer la découverte</Button></div>}
    {(discovery.cacheError || captureError || discovery.pendingError) && <p role="alert" className="text-sm">{discovery.cacheError ?? captureError ?? discovery.pendingError}</p>}
    {discovery.pending && <div role="status" className="rounded-lg border p-3 space-y-2 text-sm"><p>Un choix attend sa confirmation. La même demande est conservée pour le vérifier.</p><Button className="min-h-11" variant="outline" disabled={busy} onClick={() => void perform(async () => {
      const result = await discovery.replay();
      if (!mounted.current) return;
      setNotice('Le choix conservé est confirmé.');
      if (result.item.status === 'kept') await prepare(result.item);
    })}>Vérifier le choix conservé</Button></div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    <details className="rounded-lg border p-3" open={available.length === 0 && saved.length === 0}>
      <summary className="cursor-pointer min-h-11 text-sm font-medium">Mes créateurs et mes liens</summary>
      <div className="space-y-4 pt-2">
        {discovery.creatorsLoading ? <p role="status" className="text-sm">Chargement des créateurs…</p> : <ul className="space-y-3" aria-label="Créateurs suivis">{discovery.creators.map(creator => <li key={creator.id} className="min-w-0 space-y-1 rounded-lg bg-muted/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium break-words">{creator.name}</span><Button className="min-h-11" variant="outline" disabled={locked} onClick={() => void perform(async () => {
            try { await discovery.pause(creator, !creator.paused); if (mounted.current) setNotice(creator.paused ? `${creator.name} repris.` : `${creator.name} mis en pause.`); }
            catch (failure) { await discovery.refresh(); throw failure; }
          })}>{creator.paused ? 'Reprendre' : 'Mettre en pause'}<span className="sr-only"> {creator.name}</span></Button></div>
          <p className="text-xs text-muted-foreground">{creator.paused ? 'En pause · liens déjà gardés conservés' : 'Liens manuels'}</p>
          <div className="flex flex-wrap gap-2">{creator.sources.map(source => { const url = safeDiscoverySourceUrl(source.url); return url ? <a key={source.id} className="inline-flex min-h-11 items-center text-sm underline break-words" href={url} target="_blank" rel="noopener noreferrer nofollow">{source.platform === 'web' ? 'Site' : source.platform} de {creator.name}</a> : null; })}</div>
          {creator.sources.some(source => source.lastError) && <p className="text-xs text-muted-foreground">Une source est indisponible. Les liens déjà gardés restent accessibles.</p>}
        </li>)}</ul>}
        <form className="space-y-3" aria-label="Proposer un lien de recette" onSubmit={event => { event.preventDefault(); addLink(); }}>
          <label className="block space-y-1 text-sm">Créateur<select className="flex min-h-11 w-full min-w-0 rounded-md border bg-background px-3 py-2 text-base" value={chosenCreator} disabled={locked || !!captureError || discovery.creators.length === 0} onChange={event => updateCapture({ creatorId: event.target.value })}>
            {!chosenCreator && <option value="">Choisir un créateur</option>}{discovery.creators.map(creator => <option key={creator.id} value={creator.id} disabled={creator.paused}>{creator.name}{creator.paused ? ' — en pause' : ''}</option>)}
          </select></label>
          <label className="block space-y-1 text-sm">Lien de la recette<Input type="url" inputMode="url" className="min-h-11 text-base" maxLength={2000} placeholder="https://…" disabled={locked || !!captureError} value={capture.sourceUrl} onChange={event => updateCapture({ sourceUrl: event.target.value })} /></label>
          <label className="block space-y-1 text-sm">Nom du plat, si connu<Input className="min-h-11 text-base" maxLength={300} disabled={locked || !!captureError} value={capture.title} onChange={event => updateCapture({ title: event.target.value })} /></label>
          <Button type="submit" className="min-h-11 w-full" disabled={locked || !!captureError || !chosenCreator || !capture.sourceUrl.trim() || discovery.creators.some(creator => creator.id === chosenCreator && creator.paused)}>Proposer ce lien</Button>
        </form>
        {starterLinks.length > 0 && <details className="text-sm"><summary className="min-h-11 cursor-pointer">Liens de départ ({starterLinks.length})</summary><p className="text-sm text-muted-foreground pb-2">Des marque-pages vers les sources. Chaque ajout demande ton choix.</p><ul className="space-y-3">{starterLinks.map(link => <li key={link.sourceUrl} className="min-w-0 rounded-lg border p-3 space-y-2"><a className="min-h-11 inline-flex items-center break-words underline" href={link.sourceUrl} target="_blank" rel="noopener noreferrer nofollow">{link.title}</a><Button className="min-h-11 w-full whitespace-normal" variant="outline" disabled={locked || discovery.creators.some(creator => creator.id === link.creatorId && creator.paused)} onClick={() => addStarter(link)}>Proposer ce lien<span className="sr-only"> : {link.title}</span></Button></li>)}</ul></details>}
        {discovery.linksError && <p className="text-sm text-muted-foreground">Les liens de départ ne sont pas disponibles. Tu peux proposer ton propre lien.</p>}
      </div>
    </details>
    {discovery.feed?.selectionAt && <p className="text-xs text-muted-foreground">Sélection du {new Date(discovery.feed.selectionAt).toLocaleString('fr-FR')}</p>}
    {!discovery.isLoading && !discovery.error && available.length === 0 && <div className="rounded-lg bg-muted/40 p-4 text-sm"><p>Aucune nouvelle proposition. Ajoute un lien d’un créateur pour préparer la prochaine recette.</p></div>}
    {discovery.feed?.errors.map((message, index) => <p key={index} role="status" className="text-sm">{message}</p>)}
    {available.length > 0 && <ul className="culinary-recipe-grid" aria-label="Recettes à découvrir">{available.map((item, index) => <DiscoveryCard key={item.id} item={item} creator={discovery.creators.find(creator => creator.id === item.creatorId)} priority={index === 0} disabled={locked} onDecision={decide} onReview={item => void perform(() => prepare(item))} onFeedback={feedback} />)}</ul>}
    {saved.length > 0 && <section className="space-y-3" aria-labelledby="discovery-saved"><h2 id="discovery-saved" className="text-lg font-semibold">Mes inspirations gardées</h2><ul className="culinary-recipe-grid" aria-label="Inspirations gardées">{saved.map(item => <DiscoveryCard key={item.id} item={item} creator={discovery.creators.find(creator => creator.id === item.creatorId)} disabled={locked} onDecision={decide} onReview={item => void perform(() => prepare(item))} onFeedback={feedback} />)}</ul></section>}
    {editor && <DiscoveryDraftEditor key={`${owner}:${editor.item.id}`} owner={owner} item={editor.item} prepared={editor.prepared} onClose={() => setEditor(null)} onAdded={() => setNotice('Recette ajoutée à ta bibliothèque. L’envie et l’avis après cuisine restent distincts.')} />}
  </section>;
}
