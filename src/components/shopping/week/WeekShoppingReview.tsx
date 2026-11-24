/**
 * V11-01 E2 — the review of a week's shopping (PRP V11-01, sections 4 and 8): what the week's
 * meals need, less the stock and the list, confirmed in one menu_add_missing and undoable.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MenuShoppingLine, MenuUncomputable } from '@smart/shared';
import { Button } from '@/components/ui/button';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { useMenuShoppingPreview } from '@/hooks/useMenuShoppingPreview';
import { mealMoment, mergeChoices, reviewDraft, type LineChoice, type MenuAddMissingPayload, type ReviewChoices } from '@/lib/menuShoppingReview';
import { confirmMenuShopping, pendingMenuShopping, resendMenuShopping } from '@/services/menuShopping';
import { isRolledBackRefusal } from '@/services/stockCommandRefusal';
import { undoStockCommand } from '@/services/stockCommands';
import { unlinkIngredient } from '@/services/ingredientLinks';
import IngredientLinkDialog from './IngredientLinkDialog';
import WeekShoppingSections from './WeekShoppingSections';

interface Counts { adds: number; reductions: number }
type Outcome = ({ kind: 'done'; commandId: string } & Counts) | ({ kind: 'undone' } & Counts) | null;
/** A « Je l'ai déjà » of this review, which can be taken back. */
interface LinkNotice { key: string; name: string; product: string; removed: boolean }

const RECALCULATED = 'Ton menu, ton stock ou ta liste a changé : les courses ont été recalculées. Vérifie-les, puis confirme de nouveau.';
const REFUSALS: Record<string, string> = {
  MENU_CHANGED: RECALCULATED, STOCK_CHANGED: RECALCULATED, CONFLICT: RECALCULATED, ITEM_NOT_FOUND: RECALCULATED,
  INVALID_QUANTITY: 'Une quantité dépasse ce que la semaine demande désormais : les courses ont été recalculées. Vérifie-les, puis confirme de nouveau.',
};
const UNDO_REFUSALS: Record<string, string> = {
  UNDO_CONFLICT: 'Ta liste a changé depuis cet ajout : l’annuler écraserait ta modification. Corrige-la depuis tes courses.',
  ALREADY_UNDONE: 'Cet ajout est déjà annulé.',
};
const UNCERTAIN = 'La confirmation n’est pas encore vérifiée : ta connexion ou le serveur n’a pas répondu. Vérifie-la avant de modifier tes choix ; elle ne sera pas appliquée deux fois.';
const NOTHING_PENDING = 'Aucune confirmation n’attend plus : les courses ont été relues.';
const UNWRITABLE = 'Une ligne ne peut pas être écrite sur la liste telle quelle. Décoche-la et ajoute-la depuis tes courses.';
const READ_FAILED = 'Les courses de la semaine ne peuvent pas être calculées.';
const REASONS: Record<MenuUncomputable['reason'], string> = {
  NO_RECIPE: 'aucune recette liée', RECIPE_UNAVAILABLE: 'recette introuvable', NO_SERVINGS: 'portions à renseigner',
};

const code = (error: unknown) => (error as { code?: unknown } | null)?.code;
const message = (error: unknown, known: Record<string, string>) =>
  known[String(code(error))] ?? (error instanceof Error ? error.message : 'Action non confirmée.');
const countsOf = (payload: MenuAddMissingPayload): Counts => ({ adds: payload.adds.length, reductions: payload.reductions.length });
const noun = (count: number) => `${count} ${count > 1 ? 'articles' : 'article'}`;
const participle = (count: number, verb: string) => `${verb}${count > 1 ? 's' : ''}`;

/** « 2 articles ajoutés à ta liste. », « 1 article ajouté à ta liste, 1 retiré. » */
function doneMessage({ adds, reductions }: Counts): string {
  if (adds && reductions) return `${noun(adds)} ${participle(adds, 'ajouté')} à ta liste, ${reductions} ${participle(reductions, 'retiré')}.`;
  return adds ? `${noun(adds)} ${participle(adds, 'ajouté')} à ta liste.` : `${noun(reductions)} ${participle(reductions, 'retiré')} de ta liste.`;
}
function confirmLabel({ adds, reductions }: Counts): string {
  if (adds && reductions) return 'Mettre à jour ma liste';
  if (reductions) return `Retirer ${noun(reductions)} de ma liste`;
  return adds ? `Ajouter ${noun(adds)} à ma liste` : 'Ajouter à ma liste';
}

export default function WeekShoppingReview({ week }: { week: string }) {
  const user = useAuthenticatedUser();
  const preview = useMenuShoppingPreview(week);
  const [linking, setLinking] = useState<MenuShoppingLine | null>(null);
  const [links, setLinks] = useState<LinkNotice[]>([]);
  const linksRef = useRef<HTMLDivElement>(null);
  const [review, setReview] = useState<{ lines: MenuShoppingLine[] | null; choices: ReviewChoices }>({ lines: null, choices: {} });
  const [pending, setPending] = useState<Counts | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const outcomeRef = useRef<HTMLDivElement>(null);
  const lines = preview.data?.lines ?? null;
  // Each new computation keeps the user's choices by line key and brings an amount above the new
  // need down to it; between two, what the user types stays as typed (and is refused if too high).
  let effective = review.choices;
  if (lines && lines !== review.lines) {
    effective = mergeChoices(review.choices, lines);
    setReview({ lines, choices: effective });
  }
  const draft = preview.data ? reviewDraft(preview.data, effective) : null;
  const locked = busy || !!pending;

  useEffect(() => {
    let active = true;
    pendingMenuShopping(week).then(command => { if (active && command) setPending(countsOf(command.payload)); })
      .catch(error => { if (active) setAlert(message(error, {})); });
    return () => { active = false; };
  }, [week]);

  /** Once the list changed through this review (confirmed or undone), its choices start again from the defaults. */
  const resetChoices = () => setReview({ lines: null, choices: {} });
  // The confirmation bar may leave once the week is read again: the outcome takes the focus.
  useEffect(() => { if (outcome) outcomeRef.current?.focus(); }, [outcome]);

  const change = (key: string, patch: Partial<LineChoice>) =>
    setReview(previous => ({ ...previous, choices: { ...previous.choices, [key]: { ...previous.choices[key], ...patch } } }));

  /** One action at a time: a double tap, or a tap during an undo, does nothing. */
  const exclusive = async (action: () => Promise<void>) => {
    if (sending.current) return;
    sending.current = true; setBusy(true); setAlert(null);
    try { await action(); } finally { sending.current = false; setBusy(false); }
  };

  const confirm = () => exclusive(async () => {
    const counts = pending ?? (draft ? { adds: draft.adds, reductions: draft.reductions } : null);
    if (!counts || (!pending && !draft?.payload)) return;
    try {
      const result = pending ? await resendMenuShopping(week) : await confirmMenuShopping(week, draft!.payload!);
      setPending(null);
      resetChoices();
      if (result) setOutcome({ kind: 'done', commandId: result.command_id, ...counts });
      else { setAlert(NOTHING_PENDING); await preview.refetch(); }
    } catch (error) {
      if (isRolledBackRefusal(error)) {
        setPending(null); setAlert(message(error, REFUSALS)); await preview.refetch();
        return;
      }
      // Refused by the command's schema before anything was saved or sent.
      if (error instanceof Error && error.name === 'ZodError') { setAlert(UNWRITABLE); return; }
      // Unknown outcome: the saved command, if it was saved, is the only one that may be sent again.
      const saved = await pendingMenuShopping(week).catch(() => null);
      setPending(saved ? countsOf(saved.payload) : null);
      setAlert(saved ? UNCERTAIN : message(error, {}));
    }
  });

  const linked = (product: string, key: string) => {
    const name = linking?.name;
    setLinking(null); setAlert(null);
    if (!name) return;
    // One notice per ingredient: linking it again replaces its notice, never another one's undo.
    setLinks(previous => [...previous.filter(item => item.key !== key), { key, name, product, removed: false }]);
    // The line may leave once the week is read again: focus goes to the links.
    setTimeout(() => linksRef.current?.focus(), 0);
  };
  const unlink = (notice: LinkNotice) => exclusive(async () => {
    try {
      await unlinkIngredient(user.id, notice.key);
      setLinks(previous => previous.map(item => item.key === notice.key ? { ...item, removed: true } : item));
    } catch (error) { setAlert(message(error, {})); }
  });

  const undo = () => exclusive(async () => {
    if (outcome?.kind !== 'done') return;
    try {
      await undoStockCommand(outcome.commandId);
      resetChoices();
      setOutcome({ ...outcome, kind: 'undone' });
    } catch (error) { setAlert(message(error, UNDO_REFUSALS)); }
  });

  if (preview.isLoading) return <p role="status" className="kitchen-week-state">Calcul des courses de la semaine…</p>;
  const readError = preview.error instanceof Error ? preview.error.message : READ_FAILED;
  if (!preview.data) return <div role="alert" className="kitchen-week-state space-y-3">
    <p>{readError}</p>
    <Button variant="outline" className="min-h-11" onClick={() => void preview.refetch()}>Réessayer</Button>
  </div>;

  const data = preview.data;
  const hasMeals = data.meals.some(meal => meal.role === 'target');
  const writable = Object.keys(effective).length > 0;
  const showBar = writable || !!pending;
  const counts = pending ?? { adds: draft?.adds ?? 0, reductions: draft?.reductions ?? 0 };
  return <div className="kitchen-shopping-layout"><div className="kitchen-shopping-work">
    {alert && <p role="alert" className="rounded-lg border border-destructive p-3">{alert}</p>}
    {/* A failed refetch keeps the last week read (TanStack Query): it stays, with its outcome and undo. */}
    {preview.isError && <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive p-3">
      <p className="min-w-0 flex-[1_1_14rem]">{readError}</p>
      <Button variant="outline" className="min-h-11" onClick={() => void preview.refetch()}>Relire les courses</Button>
    </div>}
    {/* Always mounted, so that a link written into it is announced. */}
    <div ref={linksRef} tabIndex={-1} role="status" className={links.length ? 'grid gap-2 rounded-lg border p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring' : 'sr-only'}>
      {links.map(notice => <div key={notice.key} className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-[1_1_14rem]">{notice.removed
          ? `Lien retiré : « ${notice.name} » n’est plus compté avec « ${notice.product} ».`
          : `« ${notice.name} » sera compté avec « ${notice.product} » dans tes recettes.`}</p>
        {!notice.removed && <Button variant="outline" className="min-h-11" disabled={busy} aria-label={`Retirer le lien de ${notice.name}`}
          onClick={() => void unlink(notice)}>Retirer ce lien</Button>}
      </div>)}
    </div>
    {/* Always mounted, so that an outcome written into it is announced. */}
    <div ref={outcomeRef} tabIndex={-1} role="status" className={outcome ? 'flex flex-wrap items-center gap-2 rounded-lg border p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring' : 'sr-only'}>{outcome && <>
      <p className="min-w-0 flex-[1_1_14rem]">{outcome.kind === 'done' ? doneMessage(outcome)
        : `${outcome.adds ? 'Ajout' : 'Retrait'} annulé : ta liste est revenue comme avant.`}</p>
      {outcome.kind === 'done' && <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => void undo()}>
        {outcome.adds ? 'Annuler cet ajout' : 'Annuler ce retrait'}</Button>}
      <Button asChild variant="ghost" className="min-h-11"><Link to="/shopping/list">Voir ma liste</Link></Button>
    </>}</div>
    {!hasMeals ? <div className="kitchen-week-state space-y-3">
      <p>Aucun repas à préparer d’ici dimanche.</p>
      <Button asChild variant="outline" className="min-h-11"><Link to={`/kitchen/meal-planning?week=${week}`}>Planifier mes repas</Link></Button>
    </div> : !writable && !pending && <p className="kitchen-week-state">Rien à acheter pour cette semaine.</p>}
    <WeekShoppingSections lines={data.lines} choices={effective} errors={draft?.errors ?? {}} locked={locked} onChange={change} onLink={setLinking} />
    {/* Keyed by line: each opening starts without the last search or error. */}
    <IngredientLinkDialog key={linking?.key ?? 'closed'} open={!!linking} ingredientName={linking?.name ?? ''} similar={linking?.similar_lots ?? []}
      onOpenChange={open => { if (!open) setLinking(null); }} onLinked={linked} />
    {/* After the lines: what to decide comes first, what could not be counted is still named. */}
    {data.uncomputable.length > 0 && <section className="kitchen-shopping-group kitchen-week-group" data-state="uncomputable" aria-labelledby="week-uncomputable">
      <h2 id="week-uncomputable">Repas non comptés ({data.uncomputable.length})</h2>
      <ul className="kitchen-week-uncomputable">{data.uncomputable.map(meal => <li key={meal.id}>
        {meal.recipe_name} ({mealMoment(meal)}{meal.role === 'reserve' ? ', avant cette semaine' : ''}) : {REASONS[meal.reason]}.</li>)}</ul>
    </section>}
  </div>
  {/* Fixed above the navigation on a phone only while there is something to confirm. */}
  {showBar && <aside className="kitchen-shopping-summary" data-ready={!!pending || counts.adds + counts.reductions > 0} aria-labelledby="week-summary-title">
    <h2 id="week-summary-title" className="kitchen-section-title">{pending ? 'Confirmation à vérifier'
      : [counts.adds && `${counts.adds} à ajouter`, counts.reductions && `${counts.reductions} à retirer`].filter(Boolean).join(' · ') || 'Rien de coché'}</h2>
    <div className="kitchen-shopping-note"><p>Les quantités s’ajoutent aux lignes déjà prévues. Tu pourras annuler juste après.</p></div>
    <Button className="min-h-11 w-full" disabled={busy || (!pending && !draft?.payload)} onClick={() => void confirm()}>
      {pending ? 'Vérifier la confirmation envoyée' : confirmLabel(counts)}</Button>
  </aside>}
  </div>;
}
