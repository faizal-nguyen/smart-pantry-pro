import type { StockCommand } from '@smart/shared';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthSessionOptional } from '@/hooks/useAuthenticatedUser';
import { dispatchAgentDbChanged, useAgentDbInvalidation } from '@/lib/agentEvents';
import { commandForIntent, executeStockCommand, finishIntent, pendingIntent } from '@/services/stockCommands';

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

export const useShoppingList = (options: { notify?: boolean } = {}) => {
  const { user } = useAuthSessionOptional();
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      const result = await write(await requireOwner());
      dispatchAgentDbChanged(['shopping_list']);
      return result;
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'Écriture non confirmée. Réessayez.';
      setError(message);
      if (options.notify!==false) toast({ variant: 'destructive', title: 'Action non confirmée', description: message });
      throw failure;
    } finally { busy.current.delete(key); }
  };

  const resolveProduct = async (item: NewShoppingItem) => {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error('Indiquez une quantité positive.');
    if (!item.productName.trim() || !item.unit.trim()) throw new Error('Indiquez le produit et son unité.');
    const { data, error: failure } = await supabase.from('products').select('*').ilike('name', item.productName.trim()).limit(1);
    if (failure) throw failure;
    if (data?.[0]) return data[0];
    const { data: created, error: insertionError } = await supabase.from('products')
      .insert({ name: item.productName.trim(), category: item.category, unit_type: item.unit }).select().single();
    if (insertionError) throw insertionError;
    return created;
  };

  const addToShoppingList = (item: NewShoppingItem) => withWrite('add', async owner => {
    const product = await resolveProduct(item);
    const { data, error: failure } = await supabase.from('shopping_list').insert({
      user_id: owner, product_id: product.id, quantity: item.quantity, unit: item.unit,
      estimated_price: item.estimatedPrice, store_section: item.storeSection, priority: 1,
    }).select('*, product:products(*)').single();
    if (failure || !data) throw failure ?? new Error('Ajout non confirmé.');
    setShoppingList(prev => [data as ShoppingItem, ...prev]);
    if (options.notify!==false) toast({ title: 'Produit ajouté', description: `${item.productName} ajouté aux courses.` });
    return data as ShoppingItem;
  });

  const checkedWrite = (ids: string[], purchased: boolean) => withWrite(`check:${ids.join(',')}`, async owner => {
    if (typeof purchased !== 'boolean') throw new Error('État de cochage invalide.');
    const { data, error: failure } = await supabase.from('shopping_list').update({ is_purchased: purchased })
      .eq('user_id', owner).in('id', ids).select('id,is_purchased,stock_version');
    if (failure || data?.length !== ids.length) throw failure ?? new Error('La liste a changé. Actualisez les courses.');
    const rows = new Map(data.map(row => [row.id, row]));
    setShoppingList(prev => prev.map(row => rows.has(row.id) ? { ...row, ...rows.get(row.id) } : row));
  });
  const togglePurchased = (id: string, purchased: boolean) => checkedWrite([id], purchased);
  const toggleMultiplePurchased = checkedWrite;

  const removeMultipleFromShoppingList = (ids: string[]) => withWrite(`delete:${ids.join(',')}`, async owner => {
    const { data, error: failure } = await supabase.from('shopping_list').delete().eq('user_id', owner).in('id', ids).select('id');
    if (failure || data?.length !== ids.length) throw failure ?? new Error('Suppression non confirmée. Actualisez les courses.');
    setShoppingList(prev => prev.filter(row => !ids.includes(row.id)));
  });
  const removeFromShoppingList = (id: string) => removeMultipleFromShoppingList([id]);
  const clearPurchased = () => removeMultipleFromShoppingList(shoppingList.filter(row => row.is_purchased).map(row => row.id));

  const updateShoppingItem = (id: string, item: NewShoppingItem) => withWrite(`edit:${id}`, async owner => {
    const previous = shoppingList.find(row => row.id === id);
    if (!previous) throw new Error('Cet article n’est plus disponible.');
    const product = await resolveProduct(item);
    // Unit belongs to the shopping row, never to another user's shared product.
    const { data, error: failure } = await supabase.from('shopping_list').update({
      product_id: product.id, quantity: item.quantity, unit: item.unit,
      estimated_price: item.estimatedPrice, store_section: item.storeSection,
    }).eq('user_id', owner).eq('id', id).eq('stock_version', previous.stock_version ?? 0)
      .select('*, product:products(*)').single();
    if (failure || !data) throw failure ?? new Error('Cet article a changé. Actualisez avant de le modifier.');
    setShoppingList(prev => prev.map(row => row.id === id ? data as ShoppingItem : row));
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
    setLoading(true); setShoppingList([]);
    void fetchShoppingList().catch(() => undefined).finally(() => setLoading(false));
    void pendingIntent('shopping-transfer').then(saved => setPendingTransfer(Boolean(saved))).catch(() => undefined);
  }, [fetchShoppingList]);
  useAgentDbInvalidation(['shopping_list','products'], () => fetchShoppingList().catch(() => undefined));
  return { shoppingList, loading, error, isTransferring, pendingTransfer, addToShoppingList, togglePurchased,
    removeFromShoppingList, updateShoppingItem, addAllToInventory, clearPurchased,
    removeMultipleFromShoppingList, toggleMultiplePurchased, addMultipleToShoppingList,
    getTotalEstimatedCost, getPurchasedCount, generateShareableList, refetch: fetchShoppingList };
};
