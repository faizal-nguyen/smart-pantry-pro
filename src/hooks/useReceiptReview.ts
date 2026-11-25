import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import type { ReceiptScan, StockCommandResult } from '@smart/shared';
import type { ShoppingItem } from '@/hooks/useShoppingList';
import {
  matchReceipt, receiptGroups, reconcileLines, rematchReceipt, retarget, type ReceiptTarget, type ReviewLine,
} from '@/lib/receiptMatching';
import { pendingReceipt, reconcileReceipt, resendReceipt } from '@/services/receipts';
import { isRolledBackRefusal } from '@/services/stockCommandRefusal';

/** What became of the last sending: refused (nothing written), unconfirmed (to send again as it was), applied already. */
export type ReceiptOutcome = 'refused' | 'unconfirmed' | 'applied' | null;
export type LineEdit = Partial<Pick<ReviewLine, 'name' | 'quantity' | 'unit' | 'price'>>;

const storageKey = (owner: string, scanId: string) => `v11-receipt-review:${owner}:${scanId}`;
const LIST_CHANGED = 'Ta liste a changé pendant la révision : le rapprochement a été recalculé. Vérifie-le, puis valide.';
const UNCONFIRMED = 'L’envoi n’est pas confirmé : renvoie-le, il ne sera appliqué qu’une fois.';
const PENDING = 'Un envoi de ce ticket reste à vérifier : renvoie-le, il ne sera appliqué qu’une fois.';
const DUPLICATE = 'Confirme d’abord que c’est un autre ticket.';

const TargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('list'), shoppingId: z.string().min(1) }), z.object({ kind: z.literal('new') }), z.object({ kind: z.literal('skip') }),
]);
const SavedSchema = z.object({
  duplicateConfirmed: z.boolean(),
  lines: z.array(z.object({
    index: z.number().int().nonnegative(), name: z.string().max(200), quantity: z.string().max(40), unit: z.string().max(40), price: z.string().max(40),
    unitPrice: z.number().nullable(), target: TargetSchema, quantitySource: z.enum(['receipt', 'list', 'assumed']),
    match: z.enum(['same', 'close', 'chosen']).nullable(), nameEdited: z.boolean(), quantityEdited: z.boolean(), priceEdited: z.boolean(), targetChosen: z.boolean(),
  })).max(120),
});

/** What the user did on this receipt, kept for this tab while the review lasts; another shape is ignored. */
function restore(owner: string, scan: ReceiptScan): z.infer<typeof SavedSchema> | null {
  try {
    const parsed = SavedSchema.safeParse(JSON.parse(sessionStorage.getItem(storageKey(owner, scan.id)) ?? 'null'));
    return parsed.success && parsed.data.lines.every(line => line.index < scan.lines.length) ? parsed.data : null;
  } catch { return null; }
}

interface Options {
  owner: string;
  scan: ReceiptScan;
  /** The shopping list as read now. */
  rows: ShoppingItem[];
  rowsReady: boolean;
  refetchRows: () => Promise<unknown>;
}

/**
 * V11-01 E5b — the review of one receipt against the list: matched, edited, kept in sessionStorage for
 * the visit, recomputed when the list is read again (a refusal), and sent as one reconcile_receipt. A
 * reply lost is never recomputed: the same command is sent again.
 */
export function useReceiptReview({ owner, scan, rows, rowsReady, refetchRows }: Options) {
  const [saved] = useState(() => restore(owner, scan));
  const [lines, setLines] = useState<ReviewLine[]>([]);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(saved?.duplicateConfirmed ?? false);
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<ReceiptOutcome>(null);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  // The list as it stands: the first match, or a match again that keeps what the user edited.
  useEffect(() => {
    if (!rowsReady) return;
    setLines(previous => previous.length ? rematchReceipt(scan, rows, previous)
      : saved ? rematchReceipt(scan, rows, saved.lines as ReviewLine[]) : matchReceipt(scan, rows));
  }, [rows, rowsReady, scan, saved]);

  useEffect(() => {
    if (done.current || !lines.length) return;
    try { sessionStorage.setItem(storageKey(owner, scan.id), JSON.stringify({ lines, duplicateConfirmed })); }
    catch { /* A private window keeps the review for this visit only. */ }
  }, [owner, scan.id, lines, duplicateConfirmed]);

  // A sending whose reply was lost (another visit, a reload): it is sent again, never recomputed.
  useEffect(() => {
    let active = true;
    void pendingReceipt(scan.id).then(command => {
      if (active && command) { setOutcome('unconfirmed'); setError(PENDING); }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [scan.id]);

  const editLine = useCallback((index: number, change: LineEdit) => {
    setError(null);
    setLines(previous => previous.map(line => line.index !== index ? line : {
      ...line, ...change,
      ...('name' in change ? { nameEdited: true } : {}),
      ...('quantity' in change || 'unit' in change ? { quantityEdited: true } : {}),
      ...('price' in change ? { priceEdited: true } : {}),
    }));
  }, []);

  const setTarget = useCallback((index: number, target: ReceiptTarget) => {
    setError(null);
    setLines(previous => previous.map(line => line.index === index ? retarget(line, scan.lines[index], target, rows) : line));
  }, [scan, rows]);

  const confirmDuplicate = useCallback((value: boolean) => { setDuplicateConfirmed(value); setError(null); }, []);

  /** The review is over: nothing of it is kept. */
  const forget = useCallback(() => {
    done.current = true;
    try { sessionStorage.removeItem(storageKey(owner, scan.id)); } catch { /* Nothing was kept. */ }
  }, [owner, scan.id]);
  const finish = useCallback((result: StockCommandResult) => {
    forget(); setOutcome(null); setError(null);
    return result;
  }, [forget]);

  /** Sends the review (or, after a lost reply, the same command again); the result, or null when it did not go through. */
  const send = useCallback(async (): Promise<StockCommandResult | null> => {
    if (sending) return null;
    if (scan.possible_duplicate && !duplicateConfirmed && outcome !== 'unconfirmed') { setError(DUPLICATE); return null; }
    setSending(true); setError(null);
    try {
      // A command of this receipt still saved (a lost reply, here or before) is sent again as it was, never rebuilt.
      if (outcome === 'unconfirmed' || await pendingReceipt(scan.id)) {
        const again = await resendReceipt(scan.id);
        if (again) return finish(again);
        setOutcome(null);
      }
      return finish(await reconcileReceipt(scan.id, reconcileLines(lines, rows)));
    } catch (failure) {
      const code = (failure as { code?: unknown } | null)?.code;
      // Never a raw validation dump on screen.
      const message = failure instanceof Error && failure.name !== 'ZodError' ? failure.message : 'Le ticket n’a pas pu être rapproché. Réessaie.';
      if (code === 'RECEIPT_ALREADY_APPLIED') { forget(); setOutcome('applied'); setError(message); }
      else if (code === 'CONFLICT' || code === 'ITEM_NOT_FOUND') {
        setOutcome('refused'); setError(LIST_CHANGED);
        await refetchRows().catch(() => undefined);
      } else if (isRolledBackRefusal(failure)) { setOutcome('refused'); setError(message); }
      else if (code !== undefined || await pendingReceipt(scan.id).catch(() => null)) { setOutcome('unconfirmed'); setError(`${message} ${UNCONFIRMED}`); }
      // A line refused here (quantity, unit, price): nothing was sent.
      else setError(message);
      return null;
    } finally { setSending(false); }
  }, [sending, scan, duplicateConfirmed, outcome, lines, rows, finish, forget, refetchRows]);

  const groups = useMemo(() => receiptGroups(lines, rows), [lines, rows]);
  return { lines, groups, editLine, setTarget, duplicateConfirmed, confirmDuplicate, send, sending, outcome, error, clearError: () => setError(null) };
}
