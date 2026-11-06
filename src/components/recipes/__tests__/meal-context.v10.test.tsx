import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MealContextPanel from '../MealContextPanel';
import type { MealContext } from '@/lib/mealContext';

function Meal({ variant='inline' }:{ variant?:'inline'|'prompt' }) {
  const [value, setValue] = useState<MealContext>({ minutes:'20',query:'riz',occasion:'dinner',servings:'2',craving:'warm' });
  return <MealContextPanel value={value} onChange={setValue} variant={variant} />;
}
test('editing one meal field preserves the other choices and returns focus to its opener', async () => {
  render(<Meal />);
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{ name:'Modifier le repas' }));
  fireEvent.change(screen.getByRole('combobox',{ name:'Temps disponible' }),{ target:{ value:'30' } });
  fireEvent.click(screen.getByRole('button',{ name:'Voir les idées' }));
  await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByLabelText('Contexte du repas')).toHaveTextContent('Ce soir · 30 min · 2 personnes · riz · Chaud');
  expect(screen.getByRole('button',{ name:'Modifier le repas' })).toHaveFocus();
  fireEvent.click(screen.getByRole('button',{ name:'Modifier le repas' }));
  expect(screen.getByRole('combobox',{ name:'Portions pour ce repas' })).toHaveValue('2');
  fireEvent.keyDown(document,{ key:'Escape',code:'Escape' });
  expect(screen.getByLabelText('Contexte du repas')).toHaveTextContent('30 min');
});
test('only explicit reset clears the meal choices', async () => {
  render(<Meal />);
  fireEvent.click(screen.getByRole('button',{ name:'Modifier le repas' }));
  fireEvent.click(screen.getByRole('button',{ name:'Réinitialiser ce repas' }));
  expect(screen.getByRole('combobox',{ name:'Envie' })).toHaveValue('');
  expect(screen.getByRole('combobox',{ name:'Temps disponible' })).toHaveValue('');
});

test('the quiet prompt opens the same meal controls and preserves the selected portions',async()=>{
  render(<Meal variant="prompt"/>);
  const opener=screen.getByRole('button',{name:/Une envie, une contrainte/});
  fireEvent.click(opener);
  fireEvent.change(screen.getByRole('combobox',{name:'Portions pour ce repas'}),{target:{value:'3'}});
  fireEvent.click(screen.getByRole('button',{name:'Voir les idées'}));
  await waitFor(()=>expect(opener).toHaveFocus());
  expect(opener).toHaveAccessibleName(/3 personnes/);
  fireEvent.click(opener);
  expect(screen.getByRole('combobox',{name:'Portions pour ce repas'})).toHaveValue('3');
});
