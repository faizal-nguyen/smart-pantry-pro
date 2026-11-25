/**
 * V11-01 E4b — one slot of a proposed week: its recipe, what the week leaves it to buy or check, and
 * why it was chosen; or why it stayed empty. « Autre recette » asks for that slot again, the others kept.
 */
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Clock, RefreshCw, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WeekProposalSlot } from '@smart/shared';
import { recipeDetailPath } from '@/lib/recipeLinks';
import { availabilityText, CAUSE_TEXT, proposalSlotLabel } from '@/lib/weekProposal';

interface ProposalSlotCardProps {
  slot: WeekProposalSlot;
  /** Left empty by the user: not added. */
  cleared: boolean;
  /** This slot is being asked again. */
  busy: boolean;
  /** Any request runs: the actions wait. */
  locked: boolean;
  onReplace: () => void;
  onClear: () => void;
  onRestore: () => void;
}

export default function ProposalSlotCard({ slot, cleared, busy, locked, onReplace, onClear, onRestore }: ProposalSlotCardProps) {
  const label = proposalSlotLabel(slot);
  const guard = (action: () => void) => () => { if (!locked) action(); };
  // « Laisser vide » and « Remettre » swap the card's content: focus follows to the button now in its place.
  const swapped = useRef<HTMLButtonElement>(null);
  const wasCleared = useRef(cleared);
  useEffect(() => {
    if (wasCleared.current !== cleared) swapped.current?.focus();
    wasCleared.current = cleared;
  }, [cleared]);
  if (slot.status === 'empty') {
    return <li className="kitchen-proposal-slot" data-state="empty" aria-busy={busy}>
      <h3>{label}</h3>
      <p className="text-sm text-muted-foreground">{CAUSE_TEXT[slot.cause]}</p>
      <Button type="button" variant="outline" className="min-h-11 gap-2" aria-disabled={locked} aria-label={`Réessayer : ${label}`} onClick={guard(onReplace)}>
        <RefreshCw className="h-4 w-4" aria-hidden="true" />{busy ? 'Recherche…' : 'Réessayer'}
      </Button>
    </li>;
  }
  const { recipe } = slot;
  if (cleared) {
    return <li className="kitchen-proposal-slot" data-state="cleared">
      <h3>{label}</h3>
      <p className="text-sm text-muted-foreground">Laissé vide : rien ne sera ajouté ici.</p>
      <Button ref={swapped} type="button" variant="outline" className="min-h-11" aria-disabled={locked} onClick={guard(onRestore)}>Remettre « {recipe.name} »</Button>
    </li>;
  }
  return <li className="kitchen-proposal-slot" data-state={slot.status} data-availability={slot.availability} aria-busy={busy}>
    <h3>{label}</h3>
    <p className="kitchen-proposal-recipe">
      <Link to={recipeDetailPath(recipe.reference, recipe.servings)}>{recipe.name}</Link>
    </p>
    <p className="kitchen-proposal-meta">
      {recipe.duration_minutes != null && <span><Clock className="h-3 w-3" aria-hidden="true" />{recipe.duration_minutes} min</span>}
      <span><Users className="h-3 w-3" aria-hidden="true" />{recipe.servings} portion{recipe.servings > 1 ? 's' : ''}</span>
    </p>
    <p className="kitchen-proposal-availability">{availabilityText(slot)}</p>
    {slot.reasons.length > 0 && <details className="kitchen-proposal-reasons">
      <summary>Pourquoi cette recette ?</summary>
      <ul>{slot.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
    </details>}
    <div className="kitchen-proposal-actions">
      <Button type="button" variant="outline" className="min-h-11 gap-2" aria-disabled={locked} aria-label={`Autre recette : ${label}`} onClick={guard(onReplace)}>
        <RefreshCw className="h-4 w-4" aria-hidden="true" />{busy ? 'Recherche…' : 'Autre recette'}
      </Button>
      <Button ref={swapped} type="button" variant="ghost" className="min-h-11 gap-2" aria-disabled={locked} aria-label={`Laisser vide : ${label}`} onClick={guard(onClear)}>
        <X className="h-4 w-4" aria-hidden="true" />Laisser vide
      </Button>
    </div>
  </li>;
}
