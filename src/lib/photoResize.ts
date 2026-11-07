/**
 * Grocery photos are scaled down on the phone before they leave it: 1600 px
 * on the long side keeps labels legible for the vision model, weighs about
 * 300 KB in JPEG (4 photos stay under the 4.5 MB request limit) and caps the
 * image tokens billed. Decoding through createImageBitmap also turns an
 * iPhone HEIC photo into a JPEG the provider accepts.
 */
export const PHOTO_MAX_SIDE = 1600;

export function fitWithin(width: number, height: number, max = PHOTO_MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function resizePhoto(file: Blob, max = PHOTO_MAX_SIDE, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const size = fitWithin(bitmap.width, bitmap.height, max);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Cette photo ne peut pas être lue sur cet appareil.');
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  const jpeg = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!jpeg) throw new Error('Cette photo ne peut pas être lue sur cet appareil.');
  return jpeg;
}
