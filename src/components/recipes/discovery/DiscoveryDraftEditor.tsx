import { useEffect, useRef, useState, useId } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { assessImportedRecipeQuality, type DiscoveryItem, type ImportedRecipeDraft, type RecipeReference } from '@smart/shared';
import { ApiError } from '@/lib/api';
import { readOwnedValue, removeOwnedValue, writeOwnedValue } from '@/lib/ownedStorage';
import { dispatchAgentDbChanged } from '@/lib/agentEvents';
import { recipeDetailPath } from '@/lib/recipeLinks';
import { importsApi } from '@/services/recipe-import/api';
import { safeDiscoverySourceUrl } from '@/services/discoveryApi';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DiscoveryDraftFields from './DiscoveryDraftFields';
import { DiscoveryReviewSchema, draftFromForm, formFromDraft, type DiscoveryReview } from './draftForm';

export interface PreparedCanonicalImport {
  import: { id: string };
  draft: { id: string; version: number; draft_json: ImportedRecipeDraft };
}

export default function DiscoveryDraftEditor({ owner, item, prepared, onClose, onAdded }: {
  owner: string; item?: DiscoveryItem; prepared: PreparedCanonicalImport;
  onClose: () => void; onAdded: (reference: RecipeReference) => void;
}) {
  const reviewId = item?.id ?? prepared.import.id;
  const key = `discovery-review:${reviewId}`;
  const client = useQueryClient();
  const control = useRef<AbortController | null>(null), mounted = useRef(true);
  const returnFocus = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const [initial] = useState(() => {
    const base: DiscoveryReview = {
      owner, itemId: reviewId, importId: prepared.import.id, revision: prepared.draft.version,
      original: prepared.draft.draft_json, form: formFromDraft(prepared.draft.draft_json),
      acknowledgeUnknowns: false, sourceReviewed: false, acknowledgeAdaptations: false,
      reviewedDraft: null, adaptations: [], pendingSave: null,
    };
    try {
      const saved = readOwnedValue<unknown>(owner, key, null);
      if (!saved) return { value: base, error: null };
      const value = DiscoveryReviewSchema.parse(saved);
      if (value.owner !== owner || value.itemId !== reviewId || value.importId !== prepared.import.id) throw new Error();
      return { value, error: null };
    } catch { return { value: base, error: 'La saisie conservée ne peut pas être relue. Elle reste intacte sur cet appareil; ferme cette vérification et réessaie.' }; }
  });
  const [review, setReview] = useState(initial.value), [storageError, setStorageError] = useState<string | null>(initial.error);
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null), [conflict, setConflict] = useState(false);
  const [serverRevision, setServerRevision] = useState(prepared.draft.version);
  const [added, setAdded] = useState<RecipeReference | null>(null);
  const unknownsId = useId(), sourceId = useId(), adaptationsId = useId();
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; control.current?.abort(); };
  }, []);
  const persist = (next: DiscoveryReview) => {
    setReview(next);
    try { writeOwnedValue(owner, key, next); setStorageError(null); }
    catch (failure) { setStorageError(failure instanceof Error ? failure.message : 'Saisie non conservée.'); throw failure; }
  };
  const update = (patch: Partial<DiscoveryReview>, edited = false) => {
    if (initial.error) return;
    try { persist({ ...review, ...patch, ...(edited ? { reviewedDraft: null, adaptations: [], acknowledgeAdaptations: false } : {}) }); }
    catch { /* Keep the typed form visible while its storage failure blocks sending. */ }
  };
  let draft = null, invalid: string | null = null;
  try { draft = draftFromForm(review.form, review.original); }
  catch (failure) { invalid = failure instanceof Error ? failure.message : 'Complète les champs commencés.'; }
  const quality = draft ? assessImportedRecipeQuality(review.reviewedDraft ?? draft, { sourceReviewed: review.sourceReviewed }) : null;
  const source = safeDiscoverySourceUrl(review.original.source.sourceUrl ?? item?.sourceUrl ?? '');
  const finish = async (recipeId: string) => {
    if (!mounted.current) return;
    const reference: RecipeReference = { id: recipeId, source: 'recipes' };
    removeOwnedValue(owner, key);
    setAdded(reference);
    await Promise.all([
      client.invalidateQueries({ queryKey: ['recipe-discovery', owner] }),
      client.invalidateQueries({ queryKey: ['recipes'] }), client.invalidateQueries({ queryKey: ['user-recipes'] }),
    ]);
    dispatchAgentDbChanged(['recipes', 'recipe_ingredients', 'user_recipes']);
    if (mounted.current) onAdded(reference);
  };
  const act = async (action: (signal: AbortSignal) => Promise<void>) => {
    if (busy || storageError || initial.error) return;
    setBusy(true); setError(null);
    const controller = new AbortController(); control.current = controller;
    try { await action(controller.signal); }
    catch (failure) {
      if (!mounted.current || controller.signal.aborted) return;
      setError(failure instanceof Error ? failure.message : 'Ajout non confirmé. Ta saisie est conservée.');
      if (failure instanceof ApiError && failure.code === 'REVISION_CONFLICT') setConflict(true);
      const rejected = failure instanceof ApiError && failure.status >= 400 && failure.status < 500 && failure.status !== 401 &&
        !['IDEMPOTENCY_CONFLICT', 'COMMAND_CONFLICT'].includes(failure.code ?? '');
      if (rejected) {
        try {
          const saved = readOwnedValue<unknown>(owner, key, null);
          const valid = DiscoveryReviewSchema.safeParse(saved);
          if (valid.success) persist({ ...valid.data, pendingSave: null });
        } catch { /* Storage error is shown; do not replace a possibly committed intent. */ }
      }
    } finally { if (mounted.current) setBusy(false); }
  };
  const verifyPending = () => act(async signal => {
    if (!review.pendingSave) return;
    const current = await importsApi.get(review.importId, owner);
    if (signal.aborted || !mounted.current) return;
    if (current.id !== review.importId || current.user_id !== owner) throw new Error('Le résultat de cet import ne peut pas être confirmé pour ce compte.');
    if (current.status === 'saved' && current.recipe_id) { await finish(current.recipe_id); return; }
    const result = await importsApi.save(review.importId, review.pendingSave, owner, signal);
    if (result.import.id !== review.importId || result.import.user_id !== owner || !result.recipe_id) throw new Error('La réponse d’ajout doit être vérifiée.');
    await finish(result.recipe_id);
  });
  const add = () => act(async signal => {
    const currentDraft = draftFromForm(review.form, review.original);
    let checked = review.reviewedDraft, next = review;
    if (!checked) {
      const result = await importsApi.review(review.importId, {
        draft: currentDraft, expected_revision: review.revision, source_reviewed: review.sourceReviewed,
      }, owner, signal);
      if (signal.aborted || !mounted.current) return;
      if (result.revision !== review.revision) throw new ApiError('Le brouillon a changé. Relis sa révision en gardant tes corrections.', { status: 409, code: 'REVISION_CONFLICT' });
      next = { ...review, reviewedDraft: result.draft, adaptations: result.adaptations, acknowledgeAdaptations: false };
      persist(next); checked = result.draft;
      if (result.adaptations.length > 0) return;
    }
    const checkedQuality = assessImportedRecipeQuality(checked, { sourceReviewed: next.sourceReviewed });
    if (!next.sourceReviewed) throw new Error('Confirme la vérification des ingrédients et des étapes dans la source.');
    if (!checkedQuality.can_save) throw new Error('Les ingrédients et les étapes doivent être complétés et vérifiés dans la source.');
    if (checkedQuality.requires_acknowledgement && !next.acknowledgeUnknowns) throw new Error('Confirme les informations qui restent à vérifier.');
    if (next.adaptations.length > 0 && !next.acknowledgeAdaptations) throw new Error('Confirme les adaptations présentées avant l’ajout.');
    const body: NonNullable<DiscoveryReview['pendingSave']> = {
      draft: checked, expected_revision: next.revision, acknowledge_unknowns: next.acknowledgeUnknowns,
      source_reviewed: next.sourceReviewed, acknowledge_adaptations: next.acknowledgeAdaptations,
    };
    persist({ ...next, pendingSave: body });
    const result = await importsApi.save(next.importId, body, owner, signal);
    if (result.import.id !== next.importId || result.import.user_id !== owner || !result.recipe_id) throw new Error('La réponse d’ajout doit être vérifiée.');
    await finish(result.recipe_id);
  });
  const reread = () => act(async signal => {
    const current = await importsApi.getCurrentDraft(review.importId, owner, signal);
    if (signal.aborted || !mounted.current) return;
    if (current.import.id !== review.importId || current.import.user_id !== owner) throw new Error('Le brouillon ne peut pas être relu pour ce compte.');
    if (current.import.status === 'saved' && current.import.recipe_id) { await finish(current.import.recipe_id); return; }
    if (!current.draft || current.draft.user_id !== owner || current.draft.import_id !== review.importId) throw new Error('Le brouillon ne peut pas être relu pour ce compte.');
    persist({ ...review, revision: current.draft.version, original: current.draft.draft_json,
      sourceReviewed: false, pendingSave: null, reviewedDraft: null, adaptations: [], acknowledgeAdaptations: false });
    setServerRevision(current.draft.version);
    setConflict(false);
  });
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="routine-dialog max-w-3xl min-w-0 [&>button:last-child]:min-w-11 [&>button:last-child]:min-h-11 [&>button:last-child]:inline-flex [&>button:last-child]:items-center [&>button:last-child]:justify-center" onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onPointerDownOutside={event => { if (busy) event.preventDefault(); }} onCloseAutoFocus={event => {
      if (returnFocus.current?.isConnected) { event.preventDefault(); returnFocus.current.focus(); }
    }}>
      <DialogHeader><DialogTitle>{added ? 'Recette ajoutée' : 'Vérifier et ajouter'}</DialogTitle><DialogDescription>{added ? 'La recette est enregistrée dans ta bibliothèque.' : 'Complète les faits connus dans la source. Garder une inspiration ne l’ajoute pas à tes recettes.'}</DialogDescription></DialogHeader>
      {added ? <div className="space-y-3"><p role="status">L’ajout est confirmé.</p><Button asChild className="min-h-11 w-full"><Link to={recipeDetailPath(added)}>Voir ma recette et cuisiner</Link></Button><Button className="min-h-11" variant="outline" onClick={onClose}>Revenir à la sélection</Button></div> : <>
        {source && <Button asChild className="min-h-11 w-full" variant="outline"><a href={source} target="_blank" rel="noopener noreferrer nofollow" referrerPolicy="no-referrer">Vérifier la source<span className="sr-only">, nouvel onglet</span></a></Button>}
        {storageError && <p role="alert" className="text-sm text-destructive">{storageError}</p>}
        <DiscoveryDraftFields form={review.form} disabled={busy || !!review.pendingSave || !!initial.error} onChange={form => update({ form }, true)} />
        {quality && quality.unknowns.length > 0 && <div className="rounded-lg border p-3 space-y-2"><h3 className="font-semibold">Informations à vérifier</h3><ul className="list-disc pl-5 text-sm space-y-1">{quality.unknowns.map((unknown, index) => <li key={`${unknown.path}:${index}`}>{unknown.label}</li>)}</ul></div>}
        <label htmlFor={sourceId} className="flex items-start gap-3 min-h-11 text-sm"><input id={sourceId} type="checkbox" className="h-5 w-5 shrink-0 mt-1" disabled={busy || !!review.pendingSave} checked={review.sourceReviewed} onChange={event => update({ sourceReviewed: event.target.checked }, true)} /><span>J’ai vérifié les ingrédients et les étapes dans la source.</span></label>
        {quality?.requires_acknowledgement && <label htmlFor={unknownsId} className="flex items-start gap-3 min-h-11 text-sm"><input id={unknownsId} type="checkbox" className="h-5 w-5 shrink-0 mt-1" disabled={busy || !!review.pendingSave} checked={review.acknowledgeUnknowns} onChange={event => update({ acknowledgeUnknowns: event.target.checked })} /><span>Je garde les informations manquantes à vérifier avant de cuisiner.</span></label>}
        {review.adaptations.length > 0 && <section className="rounded-lg border p-3 space-y-2" aria-label="Adaptations de la recette"><h3 className="font-semibold">Adaptations proposées</h3><ul className="list-disc pl-5 text-sm space-y-1">{review.adaptations.map((change, index) => <li key={`${change.path}:${index}`} className="break-words">{change.from} → {change.to}</li>)}</ul><label htmlFor={adaptationsId} className="flex items-start gap-3 min-h-11 text-sm"><input id={adaptationsId} type="checkbox" className="h-5 w-5 shrink-0 mt-1" disabled={busy || !!review.pendingSave} checked={review.acknowledgeAdaptations} onChange={event => update({ acknowledgeAdaptations: event.target.checked })} /><span>J’accepte ces adaptations. La source originale reste conservée.</span></label></section>}
        {!quality?.can_save && !invalid && <p className="text-sm text-muted-foreground">Cette inspiration est gardée. Complète ses ingrédients et étapes pour en faire une recette.</p>}
        {invalid && <p className="text-sm text-muted-foreground">Vérifie les champs commencés : {invalid}</p>}
        {(conflict || (!review.pendingSave && review.revision !== serverRevision)) && <div role="alert" className="space-y-2 text-sm"><p>La révision du brouillon doit être relue. Tes corrections restent saisies.</p><Button className="min-h-11" variant="outline" disabled={busy} onClick={reread}>Relire la révision et garder mes corrections</Button></div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {review.pendingSave ? <div role="status" className="space-y-2"><p className="text-sm">Un ajout attend sa vérification. La saisie et la même demande sont conservées.</p><Button className="min-h-11 w-full" disabled={busy || !!storageError || !!initial.error} onClick={verifyPending}>{busy ? 'Vérification…' : 'Vérifier l’ajout'}</Button></div> : <Button className="min-h-11 w-full whitespace-normal" disabled={busy || !!storageError || !!initial.error || conflict || review.revision !== serverRevision || !review.sourceReviewed || !quality?.can_save || (quality.requires_acknowledgement && !review.acknowledgeUnknowns) || (review.adaptations.length > 0 && !review.acknowledgeAdaptations)} onClick={add}>{busy ? 'Vérification…' : review.adaptations.length > 0 ? 'Ajouter la version adaptée à mes recettes' : 'Ajouter à mes recettes'}</Button>}
        <Button className="min-h-11 w-full" variant="ghost" disabled={busy} onClick={onClose}>Garder le brouillon pour plus tard</Button>
      </>}
    </DialogContent>
  </Dialog>;
}
