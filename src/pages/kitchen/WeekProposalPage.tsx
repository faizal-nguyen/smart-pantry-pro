/**
 * V11-01 E4b — « Proposer la semaine », served on /kitchen/meal-planning/proposition?week=AAAA-MM-JJ
 * (D8: the week is in the address). Recipes for the empty slots, read from week-proposal (E4a) without
 * any write; « Autre recette », « Laisser vide », the shopping on demand; then one update_menu, and
 * Menus opens with « Annuler ».
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { calendarDate, menuSlotKey } from '@smart/shared';
import KitchenPageHeader from '@/components/layout/KitchenPageHeader';
import ProposalSettings from '@/components/meal-planning/proposal/ProposalSettings';
import ProposalShopping from '@/components/meal-planning/proposal/ProposalShopping';
import ProposalSlotCard from '@/components/meal-planning/proposal/ProposalSlotCard';
import { Button } from '@/components/ui/button';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { useCalendarNow } from '@/hooks/useCalendarNow';
import { useMenuEdit } from '@/hooks/useMenuEdit';
import { useWeekProposal } from '@/hooks/useWeekProposal';
import { useWeeklyMenu } from '@/hooks/useWeeklyMenu';
import { slotDate } from '@/lib/menuEdit';
import { menuWeekFromParam, menuWeekLabel } from '@/lib/menuWeek';
import { isFilled, openSlots, proposalOperations } from '@/lib/weekProposal';

/** How often the validity is judged again while the page is open. */
const CLOCK_MS = 15_000;
const EXPIRED = 'Cette proposition a expiré : recalcule-la, tes choix sont gardés.';
const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

export default function WeekProposalPage() {
  const user = useAuthenticatedUser();
  const now = useCalendarNow();
  const [params] = useSearchParams();
  const week = menuWeekFromParam(params.get('week'), now);
  // A new week starts a new proposal: nothing carries over.
  return <WeekProposalScreen key={week} owner={user.id} week={week} today={calendarDate(now) ?? week} />;
}

function WeekProposalScreen({ owner, week, today }: { owner: string; week: string; today: string }) {
  const navigate = useNavigate();
  const menu = useWeeklyMenu(week);
  const edit = useMenuEdit();
  const state = useWeekProposal(owner, week);
  const { settings, proposal, cleared } = state;
  const entries = menu.data?.entries ?? [];
  const slots = openSlots(week, today, entries, settings.meals);
  const over = slotDate(week, 6) < today;
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), CLOCK_MS); return () => window.clearInterval(timer); }, []);
  /** Why the last addition did not go through: refused (to recompute) or unconfirmed (to send again as it was). */
  const [outcome, setOutcome] = useState<'refused' | 'unconfirmed' | null>(null);
  const [showShopping, setShowShopping] = useState(false);
  const operations = useMemo(() => (proposal ? proposalOperations(proposal, cleared) : []), [proposal, cleared]);
  const expired = !!proposal && !(Date.parse(proposal.expires_at) > clock);
  const locked = state.loading || !!edit.busyId;
  const menuReady = !menu.isLoading && !menu.isError && !!menu.data;
  // A new proposal is announced by moving to its heading; a slot asked again keeps its own focus.
  const heading = useRef<HTMLHeadingElement>(null);
  const focusHeading = useRef(false);
  useEffect(() => {
    if (proposal && focusHeading.current) { focusHeading.current = false; heading.current?.focus(); }
  }, [proposal?.proposal_id]); // eslint-disable-line react-hooks/exhaustive-deps -- a new proposal only
  // The week changed since it was read: read it again, so that the next proposal starts from it.
  useEffect(() => { if (state.errorCode === 'MENU_CHANGED') void menu.refetch(); }, [state.errorCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = (action: () => void) => { setOutcome(null); action(); };
  const validate = async () => {
    if (!proposal || locked || expired || !operations.length) return;
    const result = await edit.addProposal(week, proposal.proposal_id, operations, { profile_version: proposal.profile_version, expires_at: proposal.expires_at });
    if (result.notice) {
      state.reset();
      navigate(`/kitchen/meal-planning?week=${week}`, { state: { menuNotice: result.notice } });
      return;
    }
    setOutcome(result.failure);
  };
  /** Every choice kept, from the menu read again: a slot planned since, or a day passed, is dropped. */
  const recompute = async () => {
    if (!proposal || locked) return;
    setOutcome(null);
    edit.clearError();
    const fresh = await menu.refetch();
    const list = fresh.data?.entries ?? entries;
    const taken = new Set(list.map(entry => `${slotDate(week, entry.day_of_week)}:${entry.meal_type}`));
    focusHeading.current = true;
    await state.refresh(proposal.slots.filter(slot => slot.date < today || taken.has(menuSlotKey(slot))).map(menuSlotKey));
  };

  return <div className="culinary-page kitchen-page kitchen-proposal-page">
    <Link className="kitchen-week-back" to={`/kitchen/meal-planning?week=${week}`}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Menus</Link>
    <KitchenPageHeader title="Proposer la semaine"
      description="Des recettes de ta bibliothèque pour tes créneaux vides, selon ton stock et ton profil. Rien n’est ajouté avant que tu valides." />
    <p className="kitchen-proposal-week">{menuWeekLabel(week)}</p>

    {over ? <p className="text-sm">Cette semaine est passée : choisis une semaine à venir depuis Menus.</p>
      : menu.isError ? <div role="alert" className="kitchen-proposal-error">
        <p>Le menu de cette semaine n’a pas pu être lu : la proposition attend de savoir quels créneaux sont libres.</p>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => void menu.refetch()}>Relire le menu</Button>
      </div>
      : !menuReady ? <p role="status" className="text-sm text-muted-foreground">Lecture du menu de la semaine…</p>
      : <ProposalSettings settings={settings} count={slots.length} hasProposal={!!proposal} busy={locked}
        onChange={next => act(() => state.setSettings(next))} onPropose={() => act(() => { focusHeading.current = true; void state.propose(slots); })} />}

    <p role="status" className={state.loading || state.info ? 'text-sm text-muted-foreground' : 'sr-only'}>
      {state.loading ? 'Calcul de la proposition…' : state.info ?? ''}
    </p>
    {state.error && <p role="alert" className="kitchen-proposal-error">{state.error}</p>}

    {proposal && <section className="kitchen-proposal" aria-labelledby="proposal-title">
      <div className="kitchen-proposal-head">
        <h2 id="proposal-title" ref={heading} tabIndex={-1}>Ta proposition</h2>
        {!expired && <p className="text-sm text-muted-foreground">Valable jusqu’à {time.format(new Date(proposal.expires_at))}.</p>}
      </div>
      <ol aria-labelledby="proposal-title" className="kitchen-proposal-slots">
        {proposal.slots.map(slot => {
          const key = menuSlotKey(slot);
          return <ProposalSlotCard key={key} slot={slot} cleared={cleared.includes(key)} busy={state.busySlot === key} locked={locked}
            onReplace={() => act(() => void state.replace(key))} onClear={() => act(() => state.clear(key))} onRestore={() => act(() => state.restore(key))} />;
        })}
      </ol>

      <div className="kitchen-proposal-shopping-toggle">
        <Button type="button" variant="ghost" className="min-h-11" aria-expanded={showShopping && operations.length > 0} disabled={!operations.length}
          onClick={() => setShowShopping(open => !open)}>
          {showShopping ? 'Masquer les courses' : 'Voir les courses de cette proposition'}
        </Button>
        {showShopping && operations.length > 0 && <ProposalShopping owner={owner} week={week}
          meals={operations.map(({ date, meal_type, recipe, servings }) => ({ date, meal_type, recipe, servings }))} />}
      </div>

      <div className="kitchen-proposal-footer">
        {(expired || outcome) && <div role="alert" className="kitchen-proposal-error">
          <p>{expired ? EXPIRED : edit.error}</p>
          {/* No reply: the addition may have gone through, so it is sent again as it was, never recomputed. */}
          {!expired && outcome === 'unconfirmed'
            ? <Button type="button" variant="outline" className="min-h-11 gap-2" aria-disabled={locked} onClick={() => void validate()}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />Réessayer l’ajout
            </Button>
            : <Button type="button" variant="outline" className="min-h-11 gap-2" aria-disabled={locked} onClick={() => void recompute()}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />Recalculer
            </Button>}
        </div>}
        <Button type="button" className="min-h-11 w-full" disabled={!operations.length || expired} aria-disabled={locked}
          onClick={() => void validate()}>
          {edit.busyId ? 'Ajout en cours…' : `Ajouter ${operations.length} repas au menu`}
        </Button>
        {proposal.slots.some(isFilled) && <p className="text-xs text-muted-foreground">
          Un seul ajout, que tu pourras annuler depuis Menus. Les courses s’ajoutent ensuite depuis « Courses de la semaine ».
        </p>}
      </div>
    </section>}
  </div>;
}
