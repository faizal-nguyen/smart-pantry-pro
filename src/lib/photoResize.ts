/**
 * Grocery photos are scaled down on the phone before they leave it: 1600 px
 * on the long side keeps labels legible for the vision model, weighs about
 * 300 KB in JPEG (4 photos stay under the 4.5 MB request limit) and caps the
 * image tokens billed. The provider only reads JPEG, PNG and WebP, so every
 * photo leaves as a JPEG — iPhone HEIC photos included.
 */
export const PHOTO_MAX_SIDE = 1600;
/** A photo kept on a product only needs to be recognised: about 150 KB. */
export const KEPT_PHOTO_SIDE = 1024;

const UNREADABLE = 'Cette photo ne peut pas être lue sur cet appareil.';
const CONVERTER_UNAVAILABLE = 'La conversion de la photo HEIC n’a pas pu démarrer. Vérifie ta connexion et réessaie.';
// HEIF major brands (ISO/IEC 23008-12): iPhone photos are « heic ».
const HEIF_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1']);

export function fitWithin(width: number, height: number, max = PHOTO_MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** True when the bytes open with an ISO-BMFF « ftyp » box of a HEIF brand. */
export function isHeifHeader(head: Uint8Array): boolean {
  if (head.length < 12) return false;
  const text = String.fromCharCode(...head.subarray(4, 12));
  return text.startsWith('ftyp') && HEIF_BRANDS.has(text.slice(4));
}

async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    // Safari decodes HEIC itself; Chrome, Firefox and Edge do not. libheif
    // (WebAssembly, about 800 KB compressed) is then loaded, only for HEIC.
    if (!isHeifHeader(new Uint8Array(await file.slice(0, 12).arrayBuffer()))) throw new Error(UNREADABLE);
  }
  let heicTo: typeof import('heic-to').heicTo;
  try {
    ({ heicTo } = await import('heic-to'));
  } catch {
    throw new Error(CONVERTER_UNAVAILABLE);
  }
  try {
    return await heicTo({ blob: file, type: 'bitmap' });
  } catch {
    throw new Error(UNREADABLE);
  }
}

export async function resizePhoto(file: Blob, max = PHOTO_MAX_SIDE, quality = 0.82): Promise<Blob> {
  const bitmap = await decode(file);
  const size = fitWithin(bitmap.width, bitmap.height, max);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) { bitmap.close(); throw new Error(UNREADABLE); }
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  const jpeg = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!jpeg) throw new Error(UNREADABLE);
  return jpeg;
}
