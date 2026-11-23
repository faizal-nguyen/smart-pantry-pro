import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import UnitSelect from '../UnitSelect';

function Harness({ initial, onChange }: { initial: string; onChange: (unit: string) => void }) {
  const [unit, setUnit] = useState(initial);
  return <UnitSelect id="unit" label="Unité" value={unit} onChange={value => { setUnit(value); onChange(value); }} />;
}

describe('unit selector for the shopping list', () => {
  test('offers the shared units by group and reports the one chosen', () => {
    const onChange = jest.fn();
    render(<Harness initial="kg" onChange={onChange} />);
    const select = screen.getByRole('combobox', { name: 'Unité' });
    expect(select).toHaveValue('kg');
    expect(screen.getByRole('group', { name: 'Poids' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Conditionnements' })).toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'g' } });
    expect(onChange).toHaveBeenLastCalledWith('g');
    expect(screen.queryByRole('textbox', { name: 'Autre unité' })).not.toBeInTheDocument();
  });

  test('keeps a row’s unit that is not in the list', () => {
    render(<Harness initial="unité(s)" onChange={jest.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Unité' })).toHaveValue('unité(s)');
    expect(screen.getByRole('group', { name: 'Unité actuelle' })).toBeInTheDocument();
  });

  test('« Autre… » lets the user type a unit of their own', () => {
    const onChange = jest.fn();
    render(<Harness initial="pièce" onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Unité' }), { target: { value: '__other__' } });
    const other = screen.getByRole('textbox', { name: 'Autre unité' });
    expect(other).toHaveValue('');
    fireEvent.change(other, { target: { value: 'bocal' } });
    expect(onChange).toHaveBeenLastCalledWith('bocal');
    expect(screen.getByRole('textbox', { name: 'Autre unité' })).toHaveValue('bocal');
    expect(screen.getByRole('combobox', { name: 'Unité' })).toHaveValue('__other__');
  });
});
