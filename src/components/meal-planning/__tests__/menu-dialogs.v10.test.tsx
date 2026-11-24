import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MoveMealDialog from '../MoveMealDialog';
import LeftoverDialog from '../LeftoverDialog';
import type { MenuEntryView } from '@/hooks/useWeeklyMenu';

const base: MenuEntryView = { id: 'meal', day_of_week: 2, meal_type: 'dinner', recipe_reference: { id: 'dish', source: 'recipes_catalog' }, recipe_id: null,
  recipe_name: 'Repas du mercredi', servings: 4, prep_time: 10, cook_time: 20, version: 1, cooked_command_id: null, leftover_of: null };
const other: MenuEntryView = { ...base, id: 'other', day_of_week: 0, meal_type: 'lunch', recipe_name: 'Repas du lundi' };
const rest: MenuEntryView = { ...base, id: 'rest', day_of_week: 3, meal_type: 'lunch', recipe_name: 'Reste : Repas du mercredi', servings: 2, leftover_of: 'meal' };

describe('« Déplacer »', () => {
  test('a free slot moves the meal; the radios are a keyboard choice', async () => {
    const onConfirm = jest.fn(async () => true);
    const onClose = jest.fn();
    render(<MoveMealDialog entry={base} entries={[base, other]} busy={false} onClose={onClose} onConfirm={onConfirm} />);
    expect(screen.getByRole('status')).toHaveTextContent('C’est sa place actuelle : choisis un autre créneau.');
    expect(screen.getByRole('button', { name: 'Déplacer' })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: 'Vendredi' }));
    expect(screen.getByRole('status')).toHaveTextContent('Créneau libre.');
    fireEvent.click(screen.getByRole('button', { name: 'Déplacer' }));
    expect(onConfirm).toHaveBeenCalledWith({ day_of_week: 4, meal_type: 'dinner' }, null);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  test('an occupied slot announces the swap, with the meal it swaps with', () => {
    const onConfirm = jest.fn(async () => false);
    render(<MoveMealDialog entry={base} entries={[base, other]} busy={false} onClose={jest.fn()} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Lundi' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Déjeuner' }));
    expect(screen.getByRole('status')).toHaveTextContent('Créneau occupé par « Repas du lundi » : les deux repas seront échangés.');
    fireEvent.click(screen.getByRole('button', { name: 'Échanger avec « Repas du lundi »' }));
    expect(onConfirm).toHaveBeenCalledWith({ day_of_week: 0, meal_type: 'lunch' }, other);
  });

  test('a slot that would put the meal after its leftover stays shown, disabled, with the reason', () => {
    render(<MoveMealDialog entry={base} entries={[base, rest]} busy={false} onClose={jest.fn()} onConfirm={jest.fn()} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Samedi' }));
    expect(screen.getByRole('status')).toHaveTextContent('Ce repas doit venir avant ses restes.');
    expect(screen.getByRole('button', { name: 'Déplacer' })).toBeDisabled();
  });

  test('while the move runs, the choices wait and the dialog stays open', () => {
    const onClose = jest.fn();
    render(<MoveMealDialog entry={base} entries={[base]} busy onClose={onClose} onConfirm={jest.fn()} />);
    expect(screen.getByRole('radio', { name: 'Lundi' })).toBeDisabled();
    // The confirm button keeps focus while it waits (a disabled one would drop it), and does nothing.
    expect(screen.getByRole('button', { name: 'Déplacement en cours…' })).toHaveAttribute('aria-disabled', 'true');
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape', code: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('« Prévoir des restes »', () => {
  test('the first free slot after the meal and two servings are proposed, within what the meal leaves', async () => {
    const onConfirm = jest.fn(async () => true);
    const onClose = jest.fn();
    render(<LeftoverDialog entry={base} entries={[base, rest]} busy={false} onClose={onClose} onConfirm={onConfirm} />);
    const when = screen.getByRole('combobox', { name: 'Quand' });
    expect(when).toHaveDisplayValue('Mercredi · collation');
    expect(screen.queryByRole('option', { name: 'Jeudi · déjeuner' })).not.toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Portions (au plus 2)' })).toHaveValue(2);
    fireEvent.change(when, { target: { value: String(4 * 4 + 1) } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Portions (au plus 2)' }), { target: { value: '3' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Choisis entre 1 et 2 portions.');
    expect(screen.getByRole('button', { name: 'Prévoir ce reste' })).toBeDisabled();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Portions (au plus 2)' }), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Prévoir ce reste' }));
    expect(onConfirm).toHaveBeenCalledWith({ day_of_week: 4, meal_type: 'lunch' }, 1);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  test('without a free slot after the meal, or servings left, it says so', () => {
    const sunday: MenuEntryView = { ...base, day_of_week: 6, meal_type: 'snack' };
    const view = render(<LeftoverDialog entry={sunday} entries={[sunday]} busy={false} onClose={jest.fn()} onConfirm={jest.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Aucun créneau libre après ce repas cette semaine.');
    expect(screen.getByRole('button', { name: 'Prévoir ce reste' })).toBeDisabled();
    view.unmount();
    const full: MenuEntryView = { ...rest, servings: 4 };
    render(<LeftoverDialog entry={base} entries={[base, full]} busy={false} onClose={jest.fn()} onConfirm={jest.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Toutes les portions de ce repas sont déjà prévues en restes.');
  });
});

test('a refusal is said inside the open dialog, where it can be seen and heard', () => {
  render(<MoveMealDialog entry={base} entries={[base]} busy={false} error="Ce repas a changé entre-temps : le menu a été relu." onClose={jest.fn()} onConfirm={jest.fn()} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Ce repas a changé entre-temps');
  expect(screen.getByRole('alert').closest('[role="dialog"]')).not.toBeNull();
});

test('the servings field can be emptied while typing; the choice waits for a number', () => {
  const onConfirm = jest.fn(async () => true);
  render(<LeftoverDialog entry={base} entries={[base]} busy={false} error="Les restes dépasseraient les portions." onClose={jest.fn()} onConfirm={onConfirm} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Les restes dépasseraient les portions.');
  const field = screen.getByRole('spinbutton', { name: 'Portions (au plus 4)' });
  fireEvent.change(field, { target: { value: '' } });
  expect(field).toHaveValue(null);
  expect(screen.getByText('Choisis entre 1 et 4 portions.')).toBeInTheDocument();
  fireEvent.change(field, { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: 'Prévoir ce reste' }));
  expect(onConfirm).toHaveBeenCalledWith({ day_of_week: 2, meal_type: 'snack' }, 3);
});
