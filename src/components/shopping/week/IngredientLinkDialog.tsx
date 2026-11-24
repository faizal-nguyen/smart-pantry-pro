/**
 * V11-01 — « Je l'ai déjà »: the user picks the product of their stock that an ingredient of
 * their recipes names (« Huile neutre » → « Huile de tournesol »). The link then counts in
 * cooking and in shopping (resolve_stock_recipe).
 */
import { useState } from 'react';
import { normalizeIngredientName } from '@smart/shared';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { useStockProducts, type StockProduct } from '@/hooks/useStockProducts';
import { linkIngredient } from '@/services/ingredientLinks';

interface IngredientLinkDialogProps {
  open: boolean;
  ingredientName: string;
  /** Close products the review named (similar_lots): offered first. */
  similar: string[];
  onOpenChange: (open: boolean) => void;
  /** The product chosen, and the key the link is stored under (to remove it). */
  onLinked: (productName: string, key: string) => void;
}

/** The close products first, then by name; a search keeps the names that contain it. */
function offered(products: StockProduct[], similar: string[], search: string): StockProduct[] {
  const close = new Set(similar.map(normalizeIngredientName));
  const wanted = normalizeIngredientName(search);
  return products
    .filter(product => !wanted || normalizeIngredientName(product.name).includes(wanted))
    .map(product => ({ product, close: close.has(normalizeIngredientName(product.name)) }))
    .sort((a, b) => Number(b.close) - Number(a.close))
    .map(({ product }) => product);
}

export default function IngredientLinkDialog({ open, ingredientName, similar, onOpenChange, onLinked }: IngredientLinkDialogProps) {
  const user = useAuthenticatedUser();
  const products = useStockProducts(user.id, open);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const close = new Set(similar.map(normalizeIngredientName));

  const choose = async (product: StockProduct) => {
    if (busy) return;
    setBusy(product.id); setError(null);
    try {
      const key = await linkIngredient(user.id, ingredientName, product.id);
      onLinked(product.name, key);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Le lien n’a pas pu être enregistré. Réessaie.');
    } finally {
      setBusy(null);
    }
  };

  const list = products.data ? offered(products.data, similar, search) : [];
  return <Dialog open={open} onOpenChange={value => { if (!busy) onOpenChange(value); }}>
    <DialogContent className="routine-dialog">
      <DialogHeader>
        <DialogTitle>J’ai déjà « {ingredientName} »</DialogTitle>
        <DialogDescription>Choisis le produit de ton stock : il comptera pour cet ingrédient dans toutes tes recettes, en cuisine comme en courses.</DialogDescription>
      </DialogHeader>
      <label className="block space-y-1 text-sm">Chercher dans ton stock
        <Input className="h-11" type="search" value={search} onChange={event => setSearch(event.target.value)} disabled={!!busy} />
      </label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {products.isLoading ? <p role="status" className="text-sm text-muted-foreground">Lecture de ton stock…</p>
        : products.error ? <p role="alert" className="text-sm">Ton stock n’a pas pu être lu. Ferme puis rouvre pour réessayer.</p>
        : !products.data?.length ? <p className="text-sm text-muted-foreground">Ton stock est vide : ajoute d’abord le produit à ton stock.</p>
        : <ul aria-label="Produits de ton stock" className="kitchen-link-choices">
          {list.map(product => <li key={product.id}>
            <button type="button" className="kitchen-link-choice" disabled={!!busy} onClick={() => void choose(product)}>
              <span className="kitchen-week-line-name">{product.name}</span>
              <span className="kitchen-week-line-note">{close.has(normalizeIngredientName(product.name)) ? 'Proche · ' : ''}{product.amounts.join(', ')}</span>
            </button>
          </li>)}
          {!list.length && <li className="text-sm text-muted-foreground">Aucun produit de ton stock ne correspond.</li>}
        </ul>}
    </DialogContent>
  </Dialog>;
}
