/**
 * V11-01 E3b (D5) — « Déplacer » : a day of the week shown and a meal, by touch or keyboard. An
 * occupied slot swaps both meals; a slot that would put a leftover before its meal is explained.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { MenuEntryView, MenuMealType } from '@/hooks/useWeeklyMenu';
import { DAY_LABELS, MEALS, MEAL_LABELS, moveOptions, type MenuSlotRef } from '@/lib/menuEdit';

interface MoveMealDialogProps {
  entry: MenuEntryView | null;
  entries: MenuEntryView[];
  /** An edit is running: the choices wait, the confirm button keeps focus. */
  busy: boolean;
  /** The refusal of the last attempt, said here: the page's notice is behind the dialog. */
  error?: string | null;
  onClose: () => void;
  /** Where focus goes once closed (Radix would send it to a DialogTrigger, which this dialog has not). */
  onCloseAutoFocus?: (event: Event) => void;
  /** Resolves true once the move is confirmed. */
  onConfirm: (slot: MenuSlotRef, occupant: MenuEntryView | null) => Promise<boolean>;
}

export default function MoveMealDialog({ entry, entries, busy, error, onClose, onConfirm, onCloseAutoFocus }: MoveMealDialogProps) {
  const [day, setDay] = useState(entry?.day_of_week ?? 0);
  const [mealType, setMealType] = useState<MenuMealType>(entry?.meal_type ?? 'dinner');
  if (!entry) return null;
  const options = moveOptions(entry, entries);
  const chosen = options.find(option => option.day_of_week === day && option.meal_type === mealType);
  const confirm = async () => {
    if (busy || !chosen || chosen.blocked) return;
    if (await onConfirm({ day_of_week: chosen.day_of_week, meal_type: chosen.meal_type }, chosen.occupant)) onClose();
  };
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="routine-dialog" onCloseAutoFocus={onCloseAutoFocus}>
      <DialogHeader>
        <DialogTitle>Déplacer « {entry.recipe_name} »</DialogTitle>
        <DialogDescription>Choisis le jour et le repas. Si le créneau est occupé, les deux repas sont échangés.</DialogDescription>
      </DialogHeader>
      <fieldset className="kitchen-move-choices">
        <legend className="text-sm font-medium">Jour</legend>
        {DAY_LABELS.map((label, index) => <label key={label} className="kitchen-move-choice">
          <input type="radio" name="move-day" value={index} checked={day === index} disabled={busy} onChange={() => setDay(index)} />{label}
        </label>)}
      </fieldset>
      <fieldset className="kitchen-move-choices">
        <legend className="text-sm font-medium">Repas</legend>
        {MEALS.map(value => <label key={value} className="kitchen-move-choice">
          <input type="radio" name="move-meal" value={value} checked={mealType === value} disabled={busy} onChange={() => setMealType(value)} />{MEAL_LABELS[value]}
        </label>)}
      </fieldset>
      <p role="status" className="text-sm text-muted-foreground">
        {!chosen ? 'C’est sa place actuelle : choisis un autre créneau.'
          : chosen.blocked ?? (chosen.occupant ? `Créneau occupé par « ${chosen.occupant.recipe_name} » : les deux repas seront échangés.` : 'Créneau libre.')}
      </p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="routine-dialog-footer">
        <Button className="min-h-11 w-full" disabled={!chosen || !!chosen.blocked} aria-disabled={busy} onClick={() => void confirm()}>
          {busy ? 'Déplacement en cours…' : chosen?.occupant ? `Échanger avec « ${chosen.occupant.recipe_name} »` : 'Déplacer'}
        </Button>
      </div>
    </DialogContent>
  </Dialog>;
}
