/**
 * GroceryReviewDialog — the products read on grocery photos, reviewed before
 * anything enters the stock.
 *
 * The owner keeps, fixes or drops each product, then one stock add runs
 * through the assistant's add_inventory_items action, which tops up matching
 * lots and can be undone. Unless the owner unticks it, each photo is kept,
 * smaller and private, on the products it shows.
 */
import { useId, useState } from 'react';
import { productNameWithBrand } from '@smart/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { dispatchAgentDbChanged } from '@/lib/agentEvents';
import { KEPT_PHOTO_SIDE, resizePhoto } from '@/lib/photoResize';
import {
  newClientRequestId,
  postAssistantUndo,
  postKeptGroceries,
  type KeptGrocery,
  type RecognizedGrocery,
} from '@/services/assistantApi';

const UNITS = ['piece', 'g', 'kg', 'ml', 'cl', 'l', 'paquet', 'boîte', 'sachet', 'bouteille', 'pot', 'brique'];

interface Row {
  keep: boolean;
  name: string;
  quantity: string;
  unit: string;
  expiry: string;
  brand: string;
  photo: number | null;
  barcode: string | null;
  confidence: RecognizedGrocery['confidence'];
}
type Stage =
  | { kind: 'review' }
  | { kind: 'adding' }
  | { kind: 'added'; count: number; ambiguous: string[]; actionId: string | null; photosLost: boolean }
  | { kind: 'undone' };

const toRow = (item: RecognizedGrocery): Row => ({
  keep: true, name: item.name, quantity: item.quantity == null ? '' : String(item.quantity),
  unit: item.unit ?? '', expiry: item.expiry_date ?? '', brand: item.brand ?? '',
  photo: item.photo ?? null, barcode: item.barcode ?? null, confidence: item.confidence,
});
const parseQuantity = (value: string) => {
  const quantity = Number(value.replace(',', '.'));
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
};
const products = (count: number) => `${count} produit${count > 1 ? 's' : ''}`;

interface GroceryReviewDialogProps {
  owner?: string;
  /** The photos read, resized, in the order the items number them. */
  photos: readonly Blob[];
  items: readonly RecognizedGrocery[];
  onClose: () => void;
  /** Called once the products are in the stock. */
  onAdded?: () => void;
}

export default function GroceryReviewDialog({ owner, photos, items, onClose, onAdded }: GroceryReviewDialogProps) {
  // One identity per reviewed list: a retried add returns its first result.
  const [request] = useState(newClientRequestId);
  const [stage, setStage] = useState<Stage>({ kind: 'review' });
  const [rows, setRows] = useState<Row[]>(() => items.map(toRow));
  const [problem, setProblem] = useState<string | null>(null);
  const [keepPhotos, setKeepPhotos] = useState(true);
  const unitsId = useId();

  const kept = rows.filter(row => row.keep);
  const incomplete = kept.some(row => !row.name.trim() || parseQuantity(row.quantity) === null || !row.unit.trim());
  const update = (index: number, patch: Partial<Row>) => setRows(previous => previous.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  /** The photos showing a kept product, smaller, numbered in the order sent. */
  const photosToKeep = async (): Promise<{ numbers: number[]; files: Blob[] }> => {
    if (!keepPhotos) return { numbers: [], files: [] };
    const numbers = [...new Set(kept.flatMap(row => (row.photo ? [row.photo] : [])))].sort((a, b) => a - b);
    try {
      return { numbers, files: await Promise.all(numbers.map(n => resizePhoto(photos[n - 1], KEPT_PHOTO_SIDE, 0.8))) };
    } catch {
      return { numbers: [], files: [] }; // a photo that cannot be reduced is just not kept
    }
  };

  const add = async () => {
    if (incomplete || kept.length === 0) return;
    setProblem(null); setStage({ kind: 'adding' });
    try {
      const toKeep = await photosToKeep();
      const items = kept.map((row): KeptGrocery => ({
        name: row.name.trim(), quantity: parseQuantity(row.quantity) as number, unit: row.unit.trim(),
        ...(row.brand.trim() ? { brand: row.brand.trim() } : {}),
        ...(row.barcode ? { barcode: row.barcode } : {}),
        ...(row.expiry ? { expiry_date: row.expiry } : {}),
        ...(row.photo && toKeep.numbers.includes(row.photo) ? { photo: toKeep.numbers.indexOf(row.photo) + 1 } : {}),
      }));
      const { action, photos_kept: photosKept } = await postKeptGroceries({
        clientRequestId: request, expectedUserId: owner, items, photos: toKeep.files,
      });
      const result = action.result as { added?: unknown[]; ambiguous?: Array<{ name: string }> } | null;
      dispatchAgentDbChanged(['inventory']);
      onAdded?.();
      setStage({ kind: 'added', count: result?.added?.length ?? kept.length,
        ambiguous: (result?.ambiguous ?? []).map(entry => entry.name), actionId: action.reversible ? action.action_id : null,
        photosLost: (keepPhotos && toKeep.numbers.length === 0 && kept.some(row => row.photo)) || (photosKept ?? 0) < toKeep.files.length });
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'Ajout non confirmé. Vérifie le stock avant de réessayer.');
      setStage({ kind: 'review' });
    }
  };

  const cancelAdd = async (actionId: string) => {
    setProblem(null);
    try {
      await postAssistantUndo(actionId);
      dispatchAgentDbChanged(['inventory']);
      setStage({ kind: 'undone' });
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'L’annulation n’a pas abouti. Vérifie le stock.');
    }
  };

  return (
      <Dialog open onOpenChange={next => { if (!next && stage.kind !== 'adding') onClose(); }}>
        <DialogContent className="max-w-2xl min-w-0 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mes courses en photo</DialogTitle>
            <DialogDescription>Les photos servent à lire tes courses ; seule la liste que tu valides entre dans le stock. Si tu les gardes, elles restent privées, sur tes produits.</DialogDescription>
          </DialogHeader>
          {(stage.kind === 'review' || stage.kind === 'adding') && (rows.length === 0
            ? <p className="text-sm">Aucune course reconnue sur ces photos. Étale les produits, étiquettes visibles, et réessaie.</p>
            : <>
              <datalist id={unitsId}>{UNITS.map(unit => <option key={unit} value={unit} />)}</datalist>
              <ul className="space-y-3">{rows.map((row, index) => {
                const n = index + 1, busy = stage.kind === 'adding';
                return <li key={index} data-testid={`grocery-row-${n}`} className={`rounded-lg border p-3 space-y-2 ${row.keep ? '' : 'opacity-60'}`}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" className="h-5 w-5 shrink-0" aria-label={`Garder le produit ${n}`} checked={row.keep} disabled={busy}
                      onChange={event => update(index, { keep: event.target.checked })} />
                    <Input aria-label={`Nom du produit ${n}`} value={row.name} disabled={busy || !row.keep} className="min-w-0 flex-1"
                      onChange={event => update(index, { name: event.target.value })} />
                    {row.confidence === 'low' && <span className="shrink-0 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">À vérifier</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Input aria-label={`Marque du produit ${n}`} placeholder="Marque" value={row.brand} disabled={busy || !row.keep}
                      onChange={event => update(index, { brand: event.target.value })} />
                    <Input aria-label={`Quantité du produit ${n}`} inputMode="decimal" placeholder="Quantité" value={row.quantity} disabled={busy || !row.keep}
                      onChange={event => update(index, { quantity: event.target.value })} />
                    <Input aria-label={`Unité du produit ${n}`} list={unitsId} placeholder="Unité" value={row.unit} disabled={busy || !row.keep}
                      onChange={event => update(index, { unit: event.target.value })} />
                    <Input aria-label={`Date limite du produit ${n}`} type="date" value={row.expiry} disabled={busy || !row.keep}
                      onChange={event => update(index, { expiry: event.target.value })} />
                  </div>
                  {row.brand.trim() && row.name.trim() && <p className="text-xs text-muted-foreground">Dans le stock : {productNameWithBrand(row.name, row.brand)}</p>}
                  {row.barcode && <p className="text-xs text-muted-foreground">Code-barres lu : {row.barcode}</p>}
                </li>;
              })}</ul>
              {incomplete && <p className="text-sm text-muted-foreground">Indique la quantité et l’unité de chaque produit gardé.</p>}
              {problem && <p role="alert" className="text-sm text-destructive">{problem}</p>}
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input type="checkbox" className="h-5 w-5 shrink-0" checked={keepPhotos} disabled={stage.kind === 'adding'}
                  onChange={event => setKeepPhotos(event.target.checked)} />
                Garder les photos sur mes produits (privé)
              </label>
              <Button className="min-h-11 w-full" disabled={stage.kind === 'adding' || incomplete || kept.length === 0} onClick={() => void add()}>
                {stage.kind === 'adding' ? 'Ajout…' : `Ajouter ${products(kept.length)} au stock`}
              </Button>
            </>)}
          {stage.kind === 'added' && <div className="space-y-2">
            <p role="status">{products(stage.count)} {stage.count > 1 ? 'ajoutés' : 'ajouté'} au stock.</p>
            {stage.ambiguous.length > 0 && <p className="text-sm">À préciser dans le stock (plusieurs produits possibles) : {stage.ambiguous.join(', ')}.</p>}
            {stage.photosLost && <p className="text-sm">Les photos n’ont pas pu être gardées ; les produits, eux, sont bien dans le stock.</p>}
            {problem && <p role="alert" className="text-sm text-destructive">{problem}</p>}
            {stage.actionId && <Button className="min-h-11" variant="outline" onClick={() => void cancelAdd(stage.actionId as string)}>Annuler cet ajout</Button>}
          </div>}
          {stage.kind === 'undone' && <p role="status">Ajout annulé.</p>}
        </DialogContent>
      </Dialog>
  );
}
