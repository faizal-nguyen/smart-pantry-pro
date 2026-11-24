/**
 * V11-01 E3b (D6) — « Prévoir des restes » : an empty slot of the week after the meal, and servings
 * within what the meal leaves. A leftover is neither bought nor cooked: it comes from the meal.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { MenuEntryView } from '@/hooks/useWeeklyMenu';
import { leftoverCapacity, leftoverOptions, slotLabel, slotMoment, type MenuSlotRef } from '@/lib/menuEdit';

interface LeftoverDialogProps {
  entry: MenuEntryView | null;
  entries: MenuEntryView[];
  /** An edit is running: the choices wait, the confirm button keeps focus. */
  busy: boolean;
  /** The refusal of the last attempt, said here: the page's notice is behind the dialog. */
  error?: string | null;
  onClose: () => void;
  /** Where focus goes once closed (Radix would send it to a DialogTrigger, which this dialog has not). */
  onCloseAutoFocus?: (event: Event) => void;
  /** Resolves true once the leftover is confirmed. */
  onConfirm: (slot: MenuSlotRef, servings: number) => Promise<boolean>;
}

export default function LeftoverDialog({ entry, entries, busy, error, onClose, onConfirm, onCloseAutoFocus }: LeftoverDialogProps) {
  const options = entry ? leftoverOptions(entry, entries) : [];
  const capacity = entry ? leftoverCapacity(entry, entries) : 0;
  const [slot, setSlot] = useState(() => (options[0] ? String(slotMoment(options[0])) : ''));
  // Kept as typed, so that the field can be emptied on the way to another number.
  const [servingsText, setServingsText] = useState(() => String(Math.min(2, Math.max(1, capacity))));
  if (!entry) return null;
  const chosen = options.find(option => String(slotMoment(option)) === slot) ?? options[0];
  const servings = servingsText.trim() === '' ? Number.NaN : Number(servingsText);
  const valid = !!chosen && Number.isInteger(servings) && servings >= 1 && servings <= capacity;
  const confirm = async () => {
    if (busy || !valid || !chosen) return;
    if (await onConfirm(chosen, servings)) onClose();
  };
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="routine-dialog" onCloseAutoFocus={onCloseAutoFocus}>
      <DialogHeader>
        <DialogTitle>Prévoir des restes de « {entry.recipe_name} »</DialogTitle>
        <DialogDescription>Un reste vient de ce repas : il n’ajoute rien aux courses et ne retire rien du stock.</DialogDescription>
      </DialogHeader>
      {!options.length || capacity < 1 ? <p role="status" className="text-sm">
        {capacity < 1 ? 'Toutes les portions de ce repas sont déjà prévues en restes.' : 'Aucun créneau libre après ce repas cette semaine.'}
      </p> : <>
        <label className="block space-y-1 text-sm">Quand
          <select className="h-11 w-full rounded-md border bg-background px-2" value={String(slotMoment(chosen!))} disabled={busy} onChange={event => setSlot(event.target.value)}>
            {options.map(option => <option key={slotMoment(option)} value={slotMoment(option)}>{slotLabel(option)}</option>)}
          </select>
        </label>
        <label className="block space-y-1 text-sm">Portions (au plus {capacity})
          <input className="block h-11 w-24 rounded-md border bg-background px-2" type="number" inputMode="numeric" min={1} max={capacity} step={1} value={servingsText} disabled={busy}
            onChange={event => setServingsText(event.target.value)} />
        </label>
        {!valid && <p role="alert" className="text-sm text-destructive">Choisis entre 1 et {capacity} portions.</p>}
      </>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="routine-dialog-footer">
        <Button className="min-h-11 w-full" disabled={!valid} aria-disabled={busy} onClick={() => void confirm()}>
          {busy ? 'Enregistrement…' : 'Prévoir ce reste'}
        </Button>
      </div>
    </DialogContent>
  </Dialog>;
}
