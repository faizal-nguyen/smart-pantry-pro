/**
 * V11-01 E5b — one line of a receipt under review: the text printed, the product, where it goes
 * (a row of the list, a purchase off the list, set aside), its quantity, and its name and price on
 * demand. A line to look at twice says why, in words and not by colour only.
 */
import { AlertTriangle } from 'lucide-react';
import type { ReceiptLine } from '@smart/shared';
import type { ShoppingItem } from '@/hooks/useShoppingList';
import type { LineEdit } from '@/hooks/useReceiptReview';
import { formatShoppingQuantity } from '@/lib/shoppingChanges';
import { rowName, rowUnit, type ReceiptTarget, type ReviewLine } from '@/lib/receiptMatching';

interface ReceiptLineCardProps {
  line: ReviewLine;
  read: ReceiptLine;
  rows: ShoppingItem[];
  check: boolean;
  /** What the line does to its row (« 250 g sur 500 g… »). */
  note?: string;
  disabled: boolean;
  onEdit: (change: LineEdit) => void;
  onTarget: (target: ReceiptTarget) => void;
}

function reasons(line: ReviewLine, read: ReceiptLine): string[] {
  return [
    read.confidence === 'low' && 'lecture incertaine',
    line.match === 'close' && 'produit seulement proche',
    !line.quantityEdited && line.quantitySource === 'list' && 'quantité de ta liste',
    !line.quantityEdited && line.quantitySource === 'assumed' && line.target.kind !== 'skip' && (read.quantity === null ? '1 pièce supposée' : 'unité supposée'),
  ].filter((reason): reason is string => !!reason);
}
const targetValue = (target: ReceiptTarget) => target.kind === 'list' ? `list:${target.shoppingId}` : target.kind;
const toTarget = (value: string): ReceiptTarget => value.startsWith('list:') ? { kind: 'list', shoppingId: value.slice(5) } : { kind: value === 'skip' ? 'skip' : 'new' };

export default function ReceiptLineCard({ line, read, rows, check, note, disabled, onEdit, onTarget }: ReceiptLineCardProps) {
  // A stable label for screen readers: the name as read, whatever is typed since.
  const label = read.name ?? read.raw_text;
  const why = check ? reasons(line, read) : [];
  return <li className="kitchen-receipt-line" data-check={check && why.length > 0} data-target={line.target.kind}>
    <p className="kitchen-receipt-raw">{read.raw_text}</p>
    <div className="kitchen-receipt-line-head">
      <h3>{line.name || read.raw_text}</h3>
      {line.price.trim() && <span className="text-sm">{line.price} €</span>}
    </div>
    {why.length > 0 && <p className="kitchen-receipt-check"><AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />À vérifier : {why.join(', ')}.</p>}
    {note && <p className="text-sm">{note}</p>}
    <label className="kitchen-proposal-field">Rapprocher de
      <select aria-label={`Rapprocher ${label} de`} value={targetValue(line.target)} disabled={disabled} onChange={event => onTarget(toTarget(event.target.value))}>
        {rows.length > 0 && <optgroup label="Ta liste">
          {rows.map(row => <option key={row.id} value={`list:${row.id}`}>
            {rowName(row) || 'Produit'} · {formatShoppingQuantity(Number(row.quantity))} {rowUnit(row) ?? ''}{row.is_purchased ? ' (déjà coché)' : ''}
          </option>)}
        </optgroup>}
        <option value="new">Achat hors liste</option>
        <option value="skip">Ne pas ranger</option>
      </select>
    </label>
    {line.target.kind !== 'skip' && <div className="kitchen-receipt-amount">
      <label className="kitchen-proposal-field">Quantité
        <input inputMode="decimal" aria-label={`Quantité de ${label}`} value={line.quantity} disabled={disabled} onChange={event => onEdit({ quantity: event.target.value })} />
      </label>
      <label className="kitchen-proposal-field">Unité
        <input aria-label={`Unité de ${label}`} value={line.unit} maxLength={40} disabled={disabled} onChange={event => onEdit({ unit: event.target.value })} />
      </label>
    </div>}
    <details className="kitchen-proposal-more">
      <summary>Nom et prix</summary>
      <label className="kitchen-proposal-field">Nom
        <input aria-label={`Nom de ${label}`} value={line.name} maxLength={120} disabled={disabled} onChange={event => onEdit({ name: event.target.value })} />
      </label>
      <label className="kitchen-proposal-field">Prix de la ligne (€)
        <input inputMode="decimal" aria-label={`Prix de ${label}`} value={line.price} disabled={disabled} onChange={event => onEdit({ price: event.target.value })} />
      </label>
    </details>
  </li>;
}
