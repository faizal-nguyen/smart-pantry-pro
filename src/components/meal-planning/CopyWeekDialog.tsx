/**
 * V11-01 E3c (D4) — « Copier vers… » : the shown week's meals go to the same slots of another week,
 * in one command. Meals already planned there are listed and kept unless replaced (a cooked one always
 * stays); leftovers are not copied.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useWeeklyMenu, type MenuEntryView } from '@/hooks/useWeeklyMenu';
import { slotLabel } from '@/lib/menuEdit';
import { copyTargetWeeks, planWeekCopy, type CopyConflict, type WeekCopyPlan } from '@/lib/menuCopy';
import { menuWeekLabel, shiftMenuWeek } from '@/lib/menuWeek';

interface CopyWeekDialogProps {
  sourceWeek: string;
  /** The shown week's meals, as loaded. */
  entries: MenuEntryView[];
  /** An edit is running: the choices wait, the confirm button keeps focus. */
  busy: boolean;
  /** The refusal of the last attempt, said here: the page's notice is behind the dialog. */
  error?: string | null;
  onClose: () => void;
  /** Where focus goes once closed (Radix would send it to a DialogTrigger, which this dialog has not). */
  onCloseAutoFocus?: (event: Event) => void;
  /** Resolves true once the copy is confirmed. */
  onConfirm: (targetWeek: string, plan: WeekCopyPlan) => Promise<boolean>;
}

const plural = (count: number, singular: string, several: string) => (count > 1 ? several : singular);

function conflictText(conflict: CopyConflict): string {
  const slot = slotLabel(conflict.slot);
  const planned = `« ${conflict.target.recipe_name} »`;
  if (conflict.cooked) return `${slot} : ${planned} déjà cuisiné, toujours gardé`;
  if (!conflict.replaced) return `${slot} : ${planned} déjà prévu, gardé`;
  const leftovers = conflict.leftovers === 1 ? ' et son reste' : conflict.leftovers > 1 ? ` et ses ${conflict.leftovers} restes` : '';
  return `${slot} : ${planned}${leftovers} remplacé${leftovers ? 's' : ''} par « ${conflict.source.recipe_name} »`;
}

function summary(plan: WeekCopyPlan): string {
  const kept = plan.kept ? `${plan.kept} ${plural(plan.kept, 'gardé', 'gardés')}` : '';
  const head = plan.copied
    ? `${plan.copied} repas ${plural(plan.copied, 'sera copié', 'seront copiés')}${kept ? `, ${kept}` : ''}.`
    : plan.conflicts.length
      ? `Aucun repas à copier : chaque créneau est déjà pris.${kept ? ` ${kept}.` : ''}`
      : 'Aucun repas à copier : cette semaine n’a que des restes ou des repas sans recette.';
  const leftovers = plan.skippedLeftovers ? ' Les restes ne sont pas copiés.' : '';
  const withoutRecipe = plan.skippedWithoutRecipe
    ? ` ${plan.skippedWithoutRecipe} repas sans recette ${plural(plan.skippedWithoutRecipe, 'n’est pas copié', 'ne sont pas copiés')}.` : '';
  return `${head}${leftovers}${withoutRecipe}`;
}

export default function CopyWeekDialog({ sourceWeek, entries, busy, error, onClose, onCloseAutoFocus, onConfirm }: CopyWeekDialogProps) {
  const nextWeek = shiftMenuWeek(sourceWeek, 1);
  const [targetWeek, setTargetWeek] = useState(nextWeek);
  const [replace, setReplace] = useState(false);
  const target = useWeeklyMenu(targetWeek);
  // A failed reread keeps an older reading in memory: the copy waits for a good one.
  const plan = target.data && !target.isLoading && !target.isError ? planWeekCopy(entries, target.data.entries, targetWeek, replace) : null;
  const confirm = async () => {
    if (busy || !plan?.copied) return;
    if (await onConfirm(targetWeek, plan)) onClose();
  };
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="routine-dialog" onCloseAutoFocus={onCloseAutoFocus}>
      <DialogHeader>
        <DialogTitle>Copier ce menu vers une autre semaine</DialogTitle>
        <DialogDescription>
          Les repas de la {menuWeekLabel(sourceWeek).toLocaleLowerCase('fr')} vont aux mêmes jours et repas. Rien n’est acheté ni cuisiné.
        </DialogDescription>
      </DialogHeader>
      <label className="block space-y-1 text-sm">Vers
        <select className="h-11 w-full rounded-md border bg-background px-2" value={targetWeek} disabled={busy}
          onChange={event => { setTargetWeek(event.target.value); setReplace(false); }}>
          {copyTargetWeeks(sourceWeek).map(week => <option key={week} value={week}>
            {menuWeekLabel(week)}{week === nextWeek ? ' (semaine suivante)' : ''}
          </option>)}
        </select>
      </label>
      {target.isError ? <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
        Cette semaine n’a pas pu être lue.
        <Button type="button" variant="outline" className="min-h-11" onClick={() => void target.refetch()}>Réessayer</Button>
      </div> : plan && plan.conflicts.length > 0 && <>
        <ul aria-label="Déjà prévu cette semaine-là" className="kitchen-copy-conflicts">
          {plan.conflicts.map(conflict => <li key={conflict.target.id}>{conflictText(conflict)}</li>)}
        </ul>
        <fieldset className="kitchen-move-choices">
          <legend className="text-sm font-medium">Repas déjà prévus</legend>
          <label className="kitchen-move-choice">
            <input type="radio" name="copy-conflicts" checked={!replace} disabled={busy} onChange={() => setReplace(false)} />Garder les repas déjà prévus
          </label>
          <label className="kitchen-move-choice">
            <input type="radio" name="copy-conflicts" checked={replace} disabled={busy} onChange={() => setReplace(true)} />Les remplacer
          </label>
        </fieldset>
        {replace && <p className="text-sm text-muted-foreground">Un repas remplacé emporte ses restes, même dans une autre semaine. Un repas déjà cuisiné est toujours gardé.</p>}
      </>}
      <p role="status" className="text-sm text-muted-foreground">
        {target.isError ? '' : plan ? summary(plan) : 'Lecture de la semaine…'}
      </p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="routine-dialog-footer">
        <Button className="min-h-11 w-full" disabled={!plan?.copied} aria-disabled={busy} onClick={() => void confirm()}>
          {busy ? 'Copie en cours…' : plan ? `Copier ${plan.copied} repas` : 'Copier'}
        </Button>
      </div>
    </DialogContent>
  </Dialog>;
}
