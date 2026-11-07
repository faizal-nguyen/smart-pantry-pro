/**
 * The line an assistant message carries when photos are joined: what the
 * photos show, which is not yet in the stock.
 */
import { productNameWithBrand } from '@smart/shared';
import type { RecognizedGrocery } from '@/services/assistantApi';

// The products line stays well inside the 4,000 characters of a message.
const MAX_NOTE_LENGTH = 2500;

const describe = (item: RecognizedGrocery) => {
  const details = [
    item.quantity != null ? `${item.quantity} ${item.unit ?? ''}`.trim() : null,
    item.expiry_date ? `date limite ${item.expiry_date}` : null,
  ].filter(Boolean);
  return `${productNameWithBrand(item.name, item.brand)}${details.length ? ` (${details.join(', ')})` : ''}`;
};

export function groceriesNote(items: readonly RecognizedGrocery[]): string {
  const note = `📷 Sur mes photos (pas encore dans mon stock) : ${items.map(describe).join(' ; ')}.`;
  return note.length > MAX_NOTE_LENGTH ? `${note.slice(0, MAX_NOTE_LENGTH - 1)}…` : note;
}
