/**
 * V11-01 E5b — the receipt routes for the visual test only (fictional data): a scan read from the
 * list of the scene, the history, a scan by id, and reconcile_receipt with its undo. The SQL rules
 * themselves are tested on PostgreSQL (scripts/test-receipt-scans-db.py).
 */
import { convertQuantity, type ReceiptLine, type ReceiptScan, type ReceiptScanSummary, type StockCommand, type StockCommandResult } from '@smart/shared';
import { data, failures, OWNER } from './supabase';

const KEY = 'v10-fixture-receipts';
const scans = new Map<string, ReceiptScan>(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
const persist = () => localStorage.setItem(KEY, JSON.stringify([...scans]));
interface Refusal { message: string; status: number; code: string }
const refusal = (status: number, code: string, message: string): Refusal => ({ status, code, message });

const line = (raw_text: string, name: string, extra: Partial<ReceiptLine> = {}): ReceiptLine => ({
  raw_text, name, quantity: null, unit: null, package: null, unit_price: null, total_price: null, food: true, confidence: 'high', ...extra,
});

export function scanReceiptFixture(): ReceiptScan {
  if (failures.receiptUnreadable) {
    failures.receiptUnreadable = false;
    throw refusal(422, 'RECEIPT_UNREADABLE', 'Ce ticket n’a pas pu être lu : reprends la photo, ticket à plat, entier et bien éclairé.');
  }
  const today = new Date().toISOString();
  const earlier = [...scans.values()].find(scan => scan.state === 'applied');
  const scan: ReceiptScan = {
    id: crypto.randomUUID(), state: 'read', store: 'Primeur du quartier', purchased_on: today.slice(0, 10), total: 12.04, currency: 'EUR',
    created_at: today, applied_at: null,
    possible_duplicate: failures.receiptDuplicate && earlier?.applied_at ? { id: earlier.id, applied_at: earlier.applied_at } : null,
    lines: [
      line('COURGETTES BIO', 'Courgettes bio', { total_price: 2.4 }),
      line('YAOURT NAT X4', 'Yaourts nature', { quantity: 4, unit: 'pièce', package: '4 x 125 g', total_price: 1.85 }),
      line('EPINARDS FRAIS 0,500KG', 'Épinards frais', { quantity: 0.5, unit: 'kg', unit_price: 4.2, total_price: 2.1 }),
      line('PAIN COMPLET', 'Pain complet', { total_price: 1.6 }),
      line('CHOC NR 70%', 'Chocolat noir 70 %', { total_price: 1.99, confidence: 'low' }),
      line('SAC CABAS', 'Sac', { food: false, total_price: 0.1 }),
    ],
  };
  failures.receiptDuplicate = false;
  scans.set(scan.id, scan); persist();
  return scan;
}

export function receiptFixture(id: string): ReceiptScan {
  const scan = scans.get(id);
  if (!scan || scan.state === 'failed') throw refusal(404, 'RECEIPT_NOT_FOUND', 'Ce ticket n’est plus disponible : scanne-le à nouveau.');
  return scan;
}

export function receiptHistoryFixture(): ReceiptScanSummary[] {
  return [...scans.values()].filter(scan => scan.state !== 'failed').sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20)
    .map(({ lines, possible_duplicate: _duplicate, ...header }) => ({ ...header, line_count: lines.length }));
}

/** reconcile_receipt, for the eye: one application per scan; a partial purchase leaves its remainder to buy. */
export function applyReconcileFixture(command: Extract<StockCommand, { command_type: 'reconcile_receipt' }>, result: StockCommandResult, refuse: (code: string, message: string, status?: number) => never) {
  const scan = scans.get(command.payload.receipt_scan_id);
  if (!scan) refuse('RECEIPT_NOT_FOUND', 'Ce ticket n’est plus disponible : scanne-le à nouveau.', 400);
  if (scan!.state === 'applied') refuse('RECEIPT_ALREADY_APPLIED', 'Ce ticket a déjà été rapproché de ta liste.');
  const changes: NonNullable<StockCommandResult['shopping_changes']> = [];
  const now = new Date().toISOString();
  const productName = (id: unknown) => String(data.products.find(product => product.id === id)?.name ?? 'Produit');
  const targets = new Map<string, number>();
  for (const item of command.payload.lines) {
    if (!item.target) continue;
    const row = data.shopping_list.find(entry => entry.id === item.target!.shopping_id);
    if (!row || Number(row.stock_version) !== item.target.expected_version) refuse('CONFLICT', 'Le stock ou l’achat a changé. Actualise avant de confirmer.');
    let amount = 0;
    try { amount = convertQuantity(item.quantity, item.unit, String(row!.unit)); }
    catch { refuse('UNIT_INCOMPATIBLE', 'Ces unités ne sont pas convertibles sans information supplémentaire.', 400); }
    targets.set(String(row!.id), (targets.get(String(row!.id)) ?? 0) + amount);
  }
  for (const [id, bought] of targets) {
    const row = data.shopping_list.find(entry => entry.id === id)!;
    const left = row.is_purchased ? 0 : Number(row.quantity) - bought;
    Object.assign(row, { quantity: bought, is_purchased: true, stock_version: Number(row.stock_version) + 1, updated_at: now });
    changes.push({ id, outcome: 'checked', name: productName(row.product_id), quantity: bought, unit: String(row.unit), purchased: true, ...(left > 1e-9 ? { note: 'receipt_partial' as const } : {}) });
    if (left > 1e-9) {
      const rest = { id: crypto.randomUUID(), user_id: OWNER, product_id: row.product_id, quantity: left, unit: row.unit, is_purchased: false, stock_version: 0, priority: 1, created_at: now, updated_at: now };
      data.shopping_list.push(rest);
      changes.push({ id: rest.id, outcome: 'created', name: productName(row.product_id), quantity: left, unit: String(row.unit), note: 'receipt_remainder' });
    }
  }
  for (const item of command.payload.lines.filter(entry => !entry.target)) {
    let product = data.products.find(entry => String(entry.name).toLowerCase() === item.name.toLowerCase());
    if (!product) { product = { id: crypto.randomUUID(), name: item.name, category: 'Autres', unit_type: item.unit }; data.products.push(product); }
    const row = { id: crypto.randomUUID(), user_id: OWNER, product_id: product.id, quantity: item.quantity, unit: item.unit, is_purchased: true, stock_version: 0, priority: 1, created_at: now, updated_at: now };
    data.shopping_list.push(row);
    changes.push({ id: row.id, outcome: 'created', name: item.name, quantity: item.quantity, unit: item.unit, purchased: true, note: 'receipt_added' });
  }
  scans.set(scan!.id, { ...scan!, state: 'applied', applied_at: now, possible_duplicate: null }); persist();
  Object.assign(result, { shopping_changes: changes, shopping_ids: changes.map(change => change.id), receipt_scan_id: scan!.id,
    affected_tables: ['shopping_list', 'products', 'purchase_prices', 'receipt_scans'] });
}

/** The undo gives the scan back, to apply again. */
export function undoReconcileFixture(receiptScanId: string | undefined) {
  const scan = receiptScanId ? scans.get(receiptScanId) : undefined;
  if (scan) { scans.set(scan.id, { ...scan, state: 'read', applied_at: null }); persist(); }
}
