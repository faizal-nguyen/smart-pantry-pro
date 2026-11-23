import { useState } from 'react';
import { SHOPPING_UNIT_GROUPS, shoppingUnitOptions } from '@smart/shared';
import { Input } from '@/components/ui/input';

const OTHER = '__other__';
const LISTED = SHOPPING_UNIT_GROUPS.reduce((count, group) => count + group.units.length, 0);

interface UnitSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (unit: string) => void;
  disabled?: boolean;
  /** Read under the field, e.g. why this unit is proposed. */
  hint?: string;
}

/**
 * The unit of a shopping row: one of the shared units (convertible ones top up a row,
 * V11-05 D16), the row's current unit when it is not listed, or one typed under « Autre… ».
 * A native select opens the system picker on phones and is announced as a combobox.
 */
export default function UnitSelect({ id, label, value, onChange, disabled, hint }: UnitSelectProps) {
  const [typing, setTyping] = useState(false);
  const options = shoppingUnitOptions(typing ? null : value);
  const current = options.length > LISTED ? options[options.length - 1] : null;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm">{label}</label>
      <select
        id={id}
        className="h-11 w-full rounded-md border bg-background px-2"
        disabled={disabled}
        value={typing ? OTHER : value.trim()}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={event => {
          const next = event.target.value;
          setTyping(next === OTHER);
          onChange(next === OTHER ? '' : next);
        }}
      >
        {SHOPPING_UNIT_GROUPS.map(group => (
          <optgroup key={group.id} label={group.label}>
            {group.units.map(unit => <option key={unit} value={unit}>{unit}</option>)}
          </optgroup>
        ))}
        {current && <optgroup label="Unité actuelle"><option value={current}>{current}</option></optgroup>}
        <option value={OTHER}>Autre…</option>
      </select>
      {typing && (
        <label className="block space-y-1 text-sm">
          Autre unité
          <Input className="h-11" maxLength={40} value={value} autoFocus disabled={disabled}
            onChange={event => onChange(event.target.value)} />
        </label>
      )}
      {hint && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
