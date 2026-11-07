/**
 * GroceryPhotoCapture — « mes courses en photo ».
 *
 * Up to 4 photos, resized on the phone, are read by the server (nothing is
 * written, the photos are not kept). The owner reviews the list — keeps,
 * fixes or drops each product — then one stock add runs through the
 * assistant's add_inventory_items action, which tops up matching lots and
 * can be undone.
 */
import { useId, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { dispatchAgentDbChanged } from '@/lib/agentEvents';
import { resizePhoto } from '@/lib/photoResize';
import {
  newClientRequestId,
  postAssistantUndo,
  postGroceryPhotos,
  postKeptGroceries,
  type RecognizedGrocery,
} from '@/services/assistantApi';

const MAX_PHOTOS = 4;
const UNITS = ['piece', 'g', 'kg', 'ml', 'cl', 'l', 'paquet', 'boîte', 'sachet', 'bouteille', 'pot', 'brique'];

interface Row {
  keep: boolean;
  name: string;
  quantity: string;
  unit: string;
  expiry: string;
  brand: string | null;
  confidence: RecognizedGrocery['confidence'];
}
type Stage =
  | { kind: 'reading' }
  | { kind: 'error'; message: string }
  | { kind: 'review' }
  | { kind: 'adding' }
  | { kind: 'added'; count: number; ambiguous: string[]; actionId: string | null }
  | { kind: 'undone' };

const toRow = (item: RecognizedGrocery): Row => ({
  keep: true, name: item.name, quantity: item.quantity == null ? '' : String(item.quantity),
  unit: item.unit ?? '', expiry: item.expiry_date ?? '', brand: item.brand, confidence: item.confidence,
});
const parseQuantity = (value: string) => {
  const quantity = Number(value.replace(',', '.'));
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
};
const products = (count: number) => `${count} produit${count > 1 ? 's' : ''}`;

export default function GroceryPhotoCapture({ owner, disabled }: { owner?: string; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const photos = useRef<Blob[]>([]);
  const request = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: 'reading' });
  const [rows, setRows] = useState<Row[]>([]);
  const [trimmed, setTrimmed] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const unitsId = useId();

  const read = async () => {
    setStage({ kind: 'reading' });
    try {
      const { items } = await postGroceryPhotos({ photos: photos.current, expectedUserId: owner });
      setRows(items.map(toRow));
      // One identity per reviewed list: a retried add returns its first result.
      request.current = newClientRequestId();
      setStage({ kind: 'review' });
    } catch (error) {
      setStage({ kind: 'error', message: error instanceof Error ? error.message : 'La lecture des photos a échoué. Réessaie.' });
    }
  };

  const choose = async (files: FileList | null) => {
    const chosen = Array.from(files ?? []);
    if (input.current) input.current.value = '';
    if (chosen.length === 0) return;
    setTrimmed(chosen.length > MAX_PHOTOS);
    setRows([]); setProblem(null); setOpen(true); setStage({ kind: 'reading' });
    try {
      photos.current = await Promise.all(chosen.slice(0, MAX_PHOTOS).map(file => resizePhoto(file)));
    } catch (error) {
      setStage({ kind: 'error', message: error instanceof Error ? error.message : 'Cette photo ne peut pas être lue sur cet appareil.' });
      return;
    }
    await read();
  };

  const kept = rows.filter(row => row.keep);
  const incomplete = kept.some(row => !row.name.trim() || parseQuantity(row.quantity) === null || !row.unit.trim());
  const update = (index: number, patch: Partial<Row>) => setRows(previous => previous.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const add = async () => {
    if (!request.current || incomplete || kept.length === 0) return;
    setProblem(null); setStage({ kind: 'adding' });
    try {
      const { action } = await postKeptGroceries({
        clientRequestId: request.current, expectedUserId: owner,
        items: kept.map(row => ({
          name: row.name.trim(), quantity: parseQuantity(row.quantity) as number, unit: row.unit.trim(),
          ...(row.expiry ? { expiry_date: row.expiry } : {}),
        })),
      });
      const result = action.result as { added?: unknown[]; ambiguous?: Array<{ name: string }> } | null;
      dispatchAgentDbChanged(['inventory']);
      setStage({ kind: 'added', count: result?.added?.length ?? kept.length,
        ambiguous: (result?.ambiguous ?? []).map(entry => entry.name), actionId: action.reversible ? action.action_id : null });
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
    <>
      <input
        ref={input} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1}
        aria-label="Photos de mes courses" onChange={event => void choose(event.target.files)}
      />
      <Button
        type="button" size="icon" variant="ghost" disabled={disabled}
        aria-label="Ajouter mes courses en photo" className="min-w-[44px] min-h-[44px]"
        onClick={() => input.current?.click()}
      >
        <Camera className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Dialog open={open} onOpenChange={next => { if (!next && stage.kind !== 'adding') setOpen(false); }}>
        <DialogContent className="max-w-2xl min-w-0 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mes courses en photo</DialogTitle>
            <DialogDescription>Les photos ne sont pas conservées : seule la liste que tu valides entre dans le stock.</DialogDescription>
          </DialogHeader>
          {trimmed && <p className="text-sm text-muted-foreground">{MAX_PHOTOS} photos au plus : les {MAX_PHOTOS} premières sont lues.</p>}
          {stage.kind === 'reading' && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Lecture des photos…</p>}
          {stage.kind === 'error' && <div className="space-y-2">
            <p role="alert" className="text-sm text-destructive">{stage.message}</p>
            {photos.current.length > 0 && <Button className="min-h-11" variant="outline" onClick={() => void read()}>Réessayer</Button>}
          </div>}
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
                  <div className="grid grid-cols-3 gap-2">
                    <Input aria-label={`Quantité du produit ${n}`} inputMode="decimal" placeholder="Quantité" value={row.quantity} disabled={busy || !row.keep}
                      onChange={event => update(index, { quantity: event.target.value })} />
                    <Input aria-label={`Unité du produit ${n}`} list={unitsId} placeholder="Unité" value={row.unit} disabled={busy || !row.keep}
                      onChange={event => update(index, { unit: event.target.value })} />
                    <Input aria-label={`Date limite du produit ${n}`} type="date" value={row.expiry} disabled={busy || !row.keep}
                      onChange={event => update(index, { expiry: event.target.value })} />
                  </div>
                  {row.brand && <p className="text-xs text-muted-foreground">Marque lue : {row.brand}</p>}
                </li>;
              })}</ul>
              {incomplete && <p className="text-sm text-muted-foreground">Indique la quantité et l’unité de chaque produit gardé.</p>}
              {problem && <p role="alert" className="text-sm text-destructive">{problem}</p>}
              <Button className="min-h-11 w-full" disabled={stage.kind === 'adding' || incomplete || kept.length === 0} onClick={() => void add()}>
                {stage.kind === 'adding' ? 'Ajout…' : `Ajouter ${products(kept.length)} au stock`}
              </Button>
            </>)}
          {stage.kind === 'added' && <div className="space-y-2">
            <p role="status">{products(stage.count)} {stage.count > 1 ? 'ajoutés' : 'ajouté'} au stock.</p>
            {stage.ambiguous.length > 0 && <p className="text-sm">À préciser dans le stock (plusieurs produits possibles) : {stage.ambiguous.join(', ')}.</p>}
            {problem && <p role="alert" className="text-sm text-destructive">{problem}</p>}
            {stage.actionId && <Button className="min-h-11" variant="outline" onClick={() => void cancelAdd(stage.actionId as string)}>Annuler cet ajout</Button>}
          </div>}
          {stage.kind === 'undone' && <p role="status">Ajout annulé.</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}
