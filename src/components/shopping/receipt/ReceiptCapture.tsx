/**
 * V11-01 E5b — one receipt photo, taken or picked, scaled down on the phone (2048 px, JPEG, HEIC
 * included) and read by the API. The reading may take half a minute: it can be cancelled. A failure
 * says what to do (the server's words): take the photo again, or check the purchases by hand.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, ImageUp } from 'lucide-react';
import type { ReceiptScan } from '@smart/shared';
import { Button } from '@/components/ui/button';
import { RECEIPT_PHOTO_SIDE, resizePhoto } from '@/lib/photoResize';
import { scanReceipt } from '@/services/receipts';

interface ReceiptCaptureProps {
  owner: string;
  onScanned: (scan: ReceiptScan) => void;
}

export default function ReceiptCapture({ owner, onScanned }: ReceiptCaptureProps) {
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const read = async (file: File | undefined) => {
    if (!file || controller.current) return;
    const mine = new AbortController();
    controller.current = mine;
    setReading(true); setError(null);
    try {
      const photo = await resizePhoto(file, RECEIPT_PHOTO_SIDE, 0.85);
      if (mine.signal.aborted) return;
      const scan = await scanReceipt(owner, photo, mine.signal);
      if (!mine.signal.aborted) onScanned(scan);
    } catch (failure) {
      if (mine.signal.aborted) return;
      setError(failure instanceof Error ? failure.message : 'La lecture du ticket a échoué. Réessaie.');
    } finally {
      if (controller.current === mine) { controller.current = null; setReading(false); }
    }
  };
  const cancel = () => { controller.current?.abort(); controller.current = null; setReading(false); };
  const picked = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; event.target.value = ''; void read(file); };

  return <section className="kitchen-receipt-capture" aria-labelledby="receipt-capture-title">
    <h2 id="receipt-capture-title">Photographie ton ticket</h2>
    <p className="text-sm text-muted-foreground">Ticket à plat, entier et bien éclairé. Seul le texte lu est gardé, jamais la photo ; rien n’est écrit avant que tu valides.</p>
    {reading
      ? <div role="status" className="kitchen-receipt-reading">
        <p>Lecture du ticket… cela peut prendre une trentaine de secondes.</p>
        <Button type="button" variant="outline" className="min-h-11" onClick={cancel}>Annuler la lecture</Button>
      </div>
      : <div className="kitchen-receipt-capture-actions">
        <Button type="button" className="min-h-11 gap-2" onClick={() => camera.current?.click()}><Camera className="h-4 w-4" aria-hidden="true" />Prendre une photo</Button>
        <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => picker.current?.click()}><ImageUp className="h-4 w-4" aria-hidden="true" />Choisir une image</Button>
      </div>}
    {/* The buttons open these fields; they stay out of the tab order. */}
    <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-label="Photo du ticket" onChange={picked} />
    <input ref={picker} type="file" accept="image/*,.heic,.heif" className="sr-only" tabIndex={-1} aria-label="Image du ticket" onChange={picked} />
    {error && <div role="alert" className="kitchen-proposal-error">
      <p>{error}</p>
      <Link className="inline-flex min-h-11 items-center underline underline-offset-2" to="/shopping/list">Cocher mes achats à la main</Link>
    </div>}
  </section>;
}
