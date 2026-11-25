/**
 * V11-01 E5b — a receipt reviewed against the shopping list (PRP V11-01 §7; D13, D14). Pure functions:
 * each read line finds its row of the list, or is a purchase off the list, or is set aside; its
 * quantity is the receipt's when printed and convertible, otherwise proposed and flagged (the user's
 * choice of 25 November 2026: the whole row, or 1 piece off the list). The reviewed lines become the
 * payload of reconcile_receipt; nothing is written here.
 */
import {
  convertQuantity, ingredientMatchRank, ingredientNameTokens, ingredientResembles, RECEIPT_PRICE_MAX,
  type ReceiptLine, type ReceiptScan, type StockCommand,
} from '@smart/shared';
import type { ShoppingItem } from '@/hooks/useShoppingList';

export type ReceiptTarget = { kind: 'list'; shoppingId: string } | { kind: 'new' } | { kind: 'skip' };
/** Where the quantity comes from: printed on the receipt, the row of the list, or assumed (1 piece). */
export type QuantitySource = 'receipt' | 'list' | 'assumed';
/** How the row was found: same product, close (to check), chosen by the user; null without a row. */
export type MatchKind = 'same' | 'close' | 'chosen' | null;

export interface ReviewLine {
  /** The line's place in the scan. */
  index: number;
  name: string;
  /** As typed: « 0,25 ». */
  quantity: string;
  unit: string;
  /** The line's price as typed, empty when unknown. */
  price: string;
  /** The unit price read, sent only while the price is the one read. */
  unitPrice: number | null;
  target: ReceiptTarget;
  quantitySource: QuantitySource;
  match: MatchKind;
  nameEdited: boolean;
  quantityEdited: boolean;
  priceEdited: boolean;
  targetChosen: boolean;
}
export type ReconcileLine = Extract<StockCommand, { command_type: 'reconcile_receipt' }>['payload']['lines'][number];

const PIECE = 'pièce';
const AMOUNT = /^\d+(?:[.,]\d+)?$/;
/** « 1,5 », « 2 » or « 0.25 »; anything else is no amount. */
export function parseAmount(text: string): number | null {
  const value = text.trim();
  return AMOUNT.test(value) ? Number(value.replace(',', '.')) : null;
}
export const formatAmount = (value: number): string => String(Number(value.toFixed(3))).replace('.', ',');
/** A price as printed: « 2,40 ». */
export const formatPrice = (value: number): string => value.toFixed(2).replace('.', ',');

export const rowName = (row: ShoppingItem): string => row.product?.name ?? '';
export const rowUnit = (row: ShoppingItem): string | null => row.unit ?? row.product?.unit_type ?? null;
const lineName = (line: ReceiptLine): string => (line.name ?? line.raw_text).slice(0, 120);

/** The read name starts with every word of the row's (« Farine » in « Farine de blé T65 »): close, to check. */
function startsWith(rowLabel: string, read: string): boolean {
  const row = ingredientNameTokens(rowLabel);
  const words = ingredientNameTokens(read);
  return row.length > 0 && row.length < words.length && row.every((token, index) => words[index] === token);
}

/** An unchecked row before a checked one, then the oldest. */
const byPreference = (a: ShoppingItem, b: ShoppingItem) => Number(a.is_purchased) - Number(b.is_purchased)
  || String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')) || a.id.localeCompare(b.id);

/** The row of the list a read name designates: the same product first, else a close one. */
export function findRow(name: string, rows: ShoppingItem[]): { row: ShoppingItem; match: 'same' | 'close' } | null {
  const ranked = rows.map(row => ({ row, rank: ingredientMatchRank(rowName(row), name) })).filter(item => item.rank > 0)
    .sort((a, b) => a.rank - b.rank || byPreference(a.row, b.row));
  if (ranked.length) return { row: ranked[0].row, match: 'same' };
  const close = rows.filter(row => ingredientResembles(rowName(row), name) || startsWith(rowName(row), name)).sort(byPreference);
  return close.length ? { row: close[0], match: 'close' } : null;
}

function convertible(quantity: number, unit: string, row: ShoppingItem): boolean {
  try { convertQuantity(quantity, unit, rowUnit(row)); return true; } catch { return false; }
}

/** The quantity a target proposes for a line, unless the user typed one. */
function quantityFor(line: ReviewLine, read: ReceiptLine, target: ReceiptTarget, rows: ShoppingItem[]): Pick<ReviewLine, 'quantity' | 'unit' | 'quantitySource'> {
  if (line.quantityEdited) return { quantity: line.quantity, unit: line.unit, quantitySource: line.quantitySource };
  const row = target.kind === 'list' ? rows.find(item => item.id === target.shoppingId) : undefined;
  // A quantity printed without a unit counts pieces; the unit is assumed, so the line is to check.
  const printed = read.quantity === null ? null : { quantity: formatAmount(read.quantity), unit: read.unit ?? PIECE, quantitySource: read.unit ? 'receipt' as const : 'assumed' as const };
  if (row) {
    if (printed && read.quantity !== null && convertible(read.quantity, printed.unit, row)) return printed;
    return { quantity: formatAmount(Number(row.quantity)), unit: rowUnit(row) ?? PIECE, quantitySource: 'list' };
  }
  return printed ?? { quantity: '1', unit: PIECE, quantitySource: 'assumed' };
}

function fresh(read: ReceiptLine, index: number, rows: ShoppingItem[], name = lineName(read)): ReviewLine {
  const found = findRow(name, rows);
  const target: ReceiptTarget = found ? { kind: 'list', shoppingId: found.row.id } : read.food === false ? { kind: 'skip' } : { kind: 'new' };
  const base: ReviewLine = {
    index, name, quantity: '', unit: '', price: read.total_price === null ? '' : formatPrice(read.total_price), unitPrice: read.unit_price,
    target, quantitySource: 'assumed', match: found?.match ?? null, nameEdited: false, quantityEdited: false, priceEdited: false, targetChosen: false,
  };
  return { ...base, ...quantityFor(base, read, target, rows) };
}

/** Every line of the scan, matched against the list. */
export function matchReceipt(scan: ReceiptScan, rows: ShoppingItem[]): ReviewLine[] {
  return scan.lines.map((read, index) => fresh(read, index, rows));
}

/** The user points a line elsewhere: its quantity follows, unless typed. */
export function retarget(line: ReviewLine, read: ReceiptLine, target: ReceiptTarget, rows: ShoppingItem[]): ReviewLine {
  return { ...line, target, targetChosen: true, match: target.kind === 'list' ? 'chosen' : null, ...quantityFor(line, read, target, rows) };
}

/**
 * The list was read again (a refusal, a reload): what the user edited stays while its row exists;
 * everything else is matched again (the model of mergeChoices in menuShoppingReview).
 */
export function rematchReceipt(scan: ReceiptScan, rows: ShoppingItem[], previous: ReviewLine[]): ReviewLine[] {
  return scan.lines.map((read, index) => {
    const before = previous.find(line => line.index === index);
    const name = before?.nameEdited ? before.name : lineName(read);
    const again = fresh(read, index, rows, name);
    if (!before) return again;
    const targetHolds = before.targetChosen && (before.target.kind !== 'list' || rows.some(row => before.target.kind === 'list' && row.id === before.target.shoppingId));
    const kept: ReviewLine = {
      ...again,
      ...(before.nameEdited ? { name: before.name, nameEdited: true } : {}),
      ...(before.priceEdited ? { price: before.price, unitPrice: null, priceEdited: true } : {}),
      ...(targetHolds ? { target: before.target, match: before.match, targetChosen: true } : {}),
    };
    return before.quantityEdited ? { ...kept, quantity: before.quantity, unit: before.unit, quantitySource: before.quantitySource, quantityEdited: true }
      : { ...kept, ...quantityFor({ ...kept, quantityEdited: false }, read, kept.target, rows) };
  });
}

/** A line to look at twice: a doubtful reading, a proposed quantity, a row only close. */
export function needsCheck(line: ReviewLine, read: ReceiptLine): boolean {
  return read.confidence === 'low' || line.match === 'close' || (!line.quantityEdited && line.quantitySource !== 'receipt');
}

export interface ReceiptGroups {
  checked: ReviewLine[];
  /** Bought less than the row asks: the remainder stays to buy (D14). */
  partial: ReviewLine[];
  added: ReviewLine[];
  skipped: ReviewLine[];
  /** Rows to buy that the receipt does not name. */
  remaining: ShoppingItem[];
  /** Per row named: what the receipt buys in the row's unit (null when it cannot be told). */
  bought: Map<string, number | null>;
}

export function receiptGroups(lines: ReviewLine[], rows: ShoppingItem[]): ReceiptGroups {
  const bought = new Map<string, number | null>();
  for (const line of lines) {
    if (line.target.kind !== 'list') continue;
    const row = rows.find(item => line.target.kind === 'list' && item.id === line.target.shoppingId);
    const quantity = parseAmount(line.quantity);
    let amount: number | null = null;
    try { amount = row && quantity !== null ? convertQuantity(quantity, line.unit, rowUnit(row)) : null; } catch { amount = null; }
    const id = line.target.shoppingId;
    const sum = bought.has(id) ? bought.get(id) ?? null : 0;
    bought.set(id, sum === null || amount === null ? null : Number((sum + amount).toFixed(9)));
  }
  // As in reconcile_receipt: below a millionth of the row, nothing is left to buy.
  const partialRows = new Set(rows.filter(row => {
    const sum = bought.get(row.id);
    return !row.is_purchased && sum !== undefined && sum !== null && Number(row.quantity) - sum > Math.max(1e-9, Number(row.quantity) * 1e-6);
  }).map(row => row.id));
  const isPartial = (line: ReviewLine) => line.target.kind === 'list' && partialRows.has(line.target.shoppingId);
  return {
    checked: lines.filter(line => line.target.kind === 'list' && !isPartial(line)),
    partial: lines.filter(isPartial),
    added: lines.filter(line => line.target.kind === 'new'),
    skipped: lines.filter(line => line.target.kind === 'skip'),
    remaining: rows.filter(row => !row.is_purchased && !bought.has(row.id)),
    bought,
  };
}

/** The payload lines of reconcile_receipt; a value the database would refuse is refused here, in words. */
export function reconcileLines(lines: ReviewLine[], rows: ShoppingItem[]): ReconcileLine[] {
  const kept = lines.filter(line => line.target.kind !== 'skip');
  if (!kept.length) throw new Error('Garde au moins un achat à rapprocher.');
  return kept.map(line => {
    const name = line.name.trim();
    const label = name || `ligne ${line.index + 1}`;
    if (!name || name.length > 120) throw new Error(`Vérifie le nom de « ${label} ».`);
    const quantity = parseAmount(line.quantity);
    if (quantity === null || quantity <= 0 || quantity > 1e9) throw new Error(`Vérifie la quantité de « ${label} ».`);
    const unit = line.unit.trim();
    if (!unit || unit.length > 40) throw new Error(`Indique l’unité de « ${label} ».`);
    const price = line.price.trim() ? parseAmount(line.price) : null;
    if (line.price.trim() && (price === null || price > RECEIPT_PRICE_MAX)) throw new Error(`Vérifie le prix de « ${label} ».`);
    let target: ReconcileLine['target'] = null;
    if (line.target.kind === 'list') {
      const id = line.target.shoppingId;
      const row = rows.find(item => item.id === id);
      if (!row) throw new Error(`« ${label} » vise une ligne qui n’est plus sur ta liste : choisis-en une autre.`);
      if (!rowUnit(row)) throw new Error(`« ${label} » vise une ligne de ta liste sans unité : choisis « Achat hors liste », ou indique une unité sur ta liste.`);
      if (!convertible(quantity, unit, row)) {
        throw new Error(`L’unité de « ${label} » ne se convertit pas dans celle de ta liste (${rowUnit(row)}) : indique la quantité en ${rowUnit(row)}.`);
      }
      target = { shopping_id: row.id, expected_version: row.stock_version ?? 0 };
    }
    // The unit price read belongs to the quantity read: another quantity, or another price, leaves it out.
    const unitPrice = line.priceEdited || line.quantityEdited || line.quantitySource !== 'receipt' ? null : line.unitPrice;
    return { line_index: line.index, name, quantity, unit, unit_price: unitPrice, total_price: price, target };
  });
}
