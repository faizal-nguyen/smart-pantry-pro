import type { ShoppingOrigin, StockCommand, StockCommandResult } from '@smart/shared';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthSessionOptional } from '@/hooks/useAuthenticatedUser';
import { useAgentDbInvalidation } from '@/lib/agentEvents';
import { ApiError } from '@/lib/api';
import { commandForIntent, executeStockCommand, finishIntent, pendingIntent, undoStockCommand } from '@/services/stockCommands';
import { resumePendingShoppingCommands, sendShoppingCommand, shoppingIntent, type ResumeOutcome } from '@/services/shoppingCommands';
import { describeShoppingChanges } from '@/lib/shoppingChanges';

export interface ShoppingItem {
  id: string; product_id: string; quantity: number; unit?: string; stock_version?: number;
  is_purchased: boolean; priority: number; estimated_price?: number; store_section?: string;
  created_at: string; updated_at: string;
  product?: { id: string; name: string; category: string; unit_type: string };
}
export interface NewShoppingItem {
  productName: string; quantity: number; category: string; unit: string;
  estimatedPrice?: number; storeSection?: string;
}
/** The last list command the database confirmed, which undo_stock can take back. */
export interface ShoppingChangeNotice { commandId: string; message: string }

/** Refusals after which the list is read again rather than written over. */
const STALE_CODES: Record<string, string> = {
  CONFLICT: 'Cet article a changé entre-temps : la liste affiche maintenant son état actuel.',
  ITEM_NOT_FOUND: 'Cet article n’est plus sur la liste : elle a été actualisée.',
};
const sortedIds = (ids: string[]) => [...new Set(ids)].sort();
const RESUME_DONE = 'Une action précédente sur la liste vient d’être confirmée : la liste est à jour, refais ton geste si besoin.';
const RESUME_REFUSED = 'Une action précédente sur la liste n’a pas pu être appliquée : l’article avait changé. La liste est à jour.';
const RESUME_PENDING = 'Une action précédente sur la liste n’est pas encore confirmée. Vérifie ta connexion, puis réessaie.';
/** What the user reads after pending list writes were sent again, or null when none was pending. */
const resumeNotice = (outcome: ResumeOutcome): string | null =>
  outcome.failures.length ? RESUME_PENDING : outcome.refused ? RESUME_REFUSED : outcome.confirmed.length ? RESUME_DONE : null;

/** `resume: false`: a screen that resumes its own command (the receipt, V11-01 E5b) leaves the list's intentions to Courses. */
export const useShoppingList = (options: { notify?: boolean; resume?: boolean } = {}) => {
  const resume = options.resume !== false;
  const { user } = useAuthSessionOptional();
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastShoppingChange, setLastShoppingChange] = useState<ShoppingChangeNotice | null>(null);
  const busy = useRef(new Set<string>());
  const { toast } = useToast();

  const requireOwner = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.id !== user?.id) throw new Error('Reconnectez-vous à ce compte pour reprendre.');
    return session.user.id;
  };
  const fetchShoppingList = useCallback(async () => {
    if (!user) { setShoppingList([]); return; }
    const { data, error: failure } = await supabase.from('shopping_list')
      .select('*, product:products(*)').eq('user_id', user.id)
      .order('priority', { ascending: false }).order('created_at', { ascending: false });
    if (failure) { setError('Impossible de charger les courses. Réessayez.'); throw failure; }
    setShoppingList((data ?? []) as ShoppingItem[]);
  }, [user?.id]);

  const withWrite = async <T,>(key: string, write: (owner: string) => Promise<T>): Promise<T> => {
    if (busy.current.has(key)) throw new Error('Cette action est déjà en cours.');
    busy.current.add(key); setError(null);
    try {
      return await write(await requireOwner());
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'Écriture non confirmée. Réessayez.';
      setError(message);
      if (options.notify!==false) toast({ variant: 'destructive', title: 'Action non confirmée', description: message });
      throw failure;
    } finally { busy.current.delete(key); }
  };

  /** Applies what pending list writes became: the last confirmed one can be undone, the list is reread. */
  const applyResume = async (outcome: ResumeOutcome): Promise<string | null> => {
    const last = outcome.confirmed[outcome.confirmed.length - 1];
    if (last) setLastShoppingChange({ commandId: last.command_id, message: describeShoppingChanges(last.shopping_changes, last.command_type) });
    if (outcome.confirmed.length || outcome.refused) await fetchShoppingList().catch(() => undefined);
    return resumeNotice(outcome);
  };

  /**
   * V11-05 E2: every list write is a versioned, undoable command. A row changed elsewhere is
   * read again and never written over; the user sees its current state before acting again.
   * A write a lost reply left pending is settled first: a new gesture never runs on a state
   * that an earlier, unconfirmed one may still change.
   */
  const listCommand = async (run: () => Promise<StockCommandResult>): Promise<StockCommandResult> => {
    const notice = await applyResume(await resumePendingShoppingCommands());
    if (notice) throw new Error(notice);
    let result: StockCommandResult;
    try { result = await run(); }
    catch (failure) {
      const stale = failure instanceof ApiError && failure.code ? STALE_CODES[failure.code] : undefined;
      if (!stale) throw failure;
      await fetchShoppingList().catch(() => undefined);
      throw new Error(stale);
    }
    setLastShoppingChange({ commandId: result.command_id, message: describeShoppingChanges(result.shopping_changes, result.command_type) });
    await fetchShoppingList().catch(() => setError('Action confirmée, mais la liste n’a pas pu être relue. Actualisez les courses.'));
    return result;
  };
  const rowsAt = (ids: string[]) => {
    if (!ids.length) throw new Error('Aucun article sélectionné.');
    return sortedIds(ids).map(id => {
      const row = shoppingList.find(item => item.id === id);
      if (!row) throw new Error('Cet article n’est plus disponible. Actualisez les courses.');
      return { id, expected_version: row.stock_version ?? 0 };
    });
  };

  const addToShoppingList = (item: NewShoppingItem, origin: ShoppingOrigin = 'manual') => withWrite('add', async () => {
    const name = item.productName.trim(), unit = item.unit.trim();
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error('Indiquez une quantité positive.');
    if (!name || !unit) throw new Error('Indiquez le produit et son unité.');
    const category = item.category.trim();
    const intent = shoppingIntent(`add:${name.toLocaleLowerCase('fr')}`);
    return listCommand(async () => sendShoppingCommand(intent, await commandForIntent('shopping_add', intent, { items: [{
      name, ...(category ? { category } : {}), quantity: item.quantity, unit,
      ...(item.storeSection?.trim() ? { store_section: item.storeSection.trim() } : {}), origin,
    }] })));
  });

  const toggleMultiplePurchased = (ids: string[], purchased: boolean) => withWrite(`check:${sortedIds(ids).join(',')}`, async () => {
    if (typeof purchased !== 'boolean') throw new Error('État de cochage invalide.');
    const items = rowsAt(ids).map(row => ({ ...row, purchased }));
    const intent = shoppingIntent(`check:${items.map(row => row.id).join(',')}`);
    return listCommand(async () => sendShoppingCommand(intent, await commandForIntent('shopping_check', intent, { items })));
  });
  const togglePurchased = (id: string, purchased: boolean) => toggleMultiplePurchased([id], purchased);

  const removeMultipleFromShoppingList = (ids: string[]) => withWrite(`delete:${sortedIds(ids).join(',')}`, async () => {
    const items = rowsAt(ids);
    const intent = shoppingIntent(`remove:${items.map(row => row.id).join(',')}`);
    return listCommand(async () => sendShoppingCommand(intent, await commandForIntent('shopping_remove', intent, { items })));
  });
  const removeFromShoppingList = (id: string) => removeMultipleFromShoppingList([id]);
  const clearPurchased = () => removeMultipleFromShoppingList(shoppingList.filter(row => row.is_purchased).map(row => row.id));

  const updateShoppingItem = (id: string, item: NewShoppingItem) => withWrite(`edit:${id}`, async () => {
    const [row] = rowsAt([id]);
    const name = item.productName.trim(), unit = item.unit.trim(), category = item.category.trim();
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error('Indiquez une quantité positive.');
    if (!name || !unit) throw new Error('Indiquez le produit et son unité.');
    // The name resolves the catalogue product in the database; the unit stays on the shopping row.
    const intent = shoppingIntent(`update:${id}`);
    return listCommand(async () => sendShoppingCommand(intent, await commandForIntent('shopping_update', intent, { items: [{
      ...row, name, ...(category ? { category } : {}), quantity: item.quantity, unit,
      estimated_price: item.estimatedPrice ?? null, store_section: item.storeSection?.trim() || null,
    }] })));
  });

  const undoLastShoppingChange = () => withWrite('undo', async () => {
    const change = lastShoppingChange;
    if (!change) throw new Error('Aucune action récente à annuler.');
    await undoStockCommand(change.commandId);
    setLastShoppingChange(current => current?.commandId === change.commandId ? null : current);
    await fetchShoppingList().catch(() => setError('Annulation confirmée, mais la liste n’a pas pu être relue. Actualisez les courses.'));
  });

  const addAllToInventory = async (reviewItems?: Extract<StockCommand,{ command_type:'transfer_shopping' }>['payload']['items']) => {
    if (busy.current.has('transfer')) return;
    setIsTransferring(true);
    try {
      return await withWrite('transfer', async () => {
        const intent = 'shopping-transfer';
        const saved = await pendingIntent(intent);
        if (saved && saved.command_type !== 'transfer_shopping') throw new Error('Le rangement précédent reste à vérifier.');
        const items = shoppingList.filter(row => row.is_purchased).sort((a,b) => a.id.localeCompare(b.id));
        if (!saved && !reviewItems?.length && !items.length) throw new Error('Cochez les articles achetés avant de les ranger.');
        const command = saved ?? await commandForIntent('transfer_shopping', intent, {
          items: reviewItems ?? items.map(row => ({ id: row.id, expected_version: row.stock_version ?? 0 })),
        });
        setPendingTransfer(true);
        const result = await executeStockCommand(command);
        await finishIntent(intent);
        setPendingTransfer(false);
        const transferred = new Set(command.payload.items.map(item => item.id));
        setShoppingList(previous => previous.filter(row => !transferred.has(row.id)));
        await fetchShoppingList().catch(() => setError('Les articles ont été rangés, mais la liste n’a pas pu être relue. Actualisez les courses.'));
        if (options.notify!==false) toast({ title: 'Articles rangés', description: `${result.inventory_ids?.length ?? items.length} article(s) ajoutés au stock.` });
        return result;
      });
    } catch (failure) {
      setPendingTransfer(Boolean(await pendingIntent('shopping-transfer').catch(() => null)));
      throw failure;
    } finally { setIsTransferring(false); }
  };

  const addMultipleToShoppingList = async (items: NewShoppingItem[]) => {
    let added = 0;
    for (const item of items) { try { await addToShoppingList(item); added++; } catch { /* Individual refusal stays visible. */ } }
    return { success: added === items.length, added, failed: items.length - added };
  };
  const getTotalEstimatedCost = () => shoppingList.filter(row => !row.is_purchased).reduce((sum,row) => sum + (row.estimated_price ?? 0) * row.quantity, 0);
  const getPurchasedCount = () => shoppingList.filter(row => row.is_purchased).length;
  const generateShareableList = () => `📝 Ma liste de courses:\n\n${shoppingList.filter(row => !row.is_purchased).map(row => `${row.quantity} ${row.unit ?? row.product?.unit_type ?? ''} ${row.product?.name}`).join('\n')}`;

  useEffect(() => {
    setLoading(true); setShoppingList([]); setLastShoppingChange(null);
    void fetchShoppingList().catch(() => undefined).finally(() => setLoading(false));
    void pendingIntent('shopping-transfer').then(saved => setPendingTransfer(Boolean(saved))).catch(() => undefined);
    // A list write whose reply was lost is sent again under its identity: at most one effect.
    // Its outcome is applied only while this account's list is still the one shown.
    let active = true;
    if (resume) void resumePendingShoppingCommands().then(async outcome => {
      if (!active) return;
      const last = outcome.confirmed[outcome.confirmed.length - 1];
      if (last) setLastShoppingChange({ commandId: last.command_id, message: describeShoppingChanges(last.shopping_changes, last.command_type) });
      if (outcome.confirmed.length || outcome.refused) await fetchShoppingList().catch(() => undefined);
      const notice = resumeNotice(outcome);
      if (active && notice && notice !== RESUME_DONE) setError(notice);
    }).catch(() => { if (active) setError(RESUME_PENDING); });
    return () => { active = false; };
  }, [fetchShoppingList, resume]);
  useAgentDbInvalidation(['shopping_list','products'], () => fetchShoppingList().catch(() => undefined));
  /** V11-01 E5b: a list change confirmed on another screen (a receipt applied), shown here with « Annuler ». */
  const adoptShoppingChange = useCallback((change: ShoppingChangeNotice) => setLastShoppingChange(change), []);
  return { shoppingList, loading, error, isTransferring, pendingTransfer, addToShoppingList, togglePurchased,
    removeFromShoppingList, updateShoppingItem, addAllToInventory, clearPurchased,
    removeMultipleFromShoppingList, toggleMultiplePurchased, addMultipleToShoppingList,
    lastShoppingChange, undoLastShoppingChange, adoptShoppingChange,
    getTotalEstimatedCost, getPurchasedCount, generateShareableList, refetch: fetchShoppingList };
};
