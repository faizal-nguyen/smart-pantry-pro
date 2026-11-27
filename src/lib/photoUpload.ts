import { KEPT_PHOTO_SIDE, PHOTO_MAX_SIDE, resizePhoto } from '@/lib/photoResize';
import { supabase } from '@/integrations/supabase/client';

/**
 * V11-06 S1 and S2: a photo leaves the device re-encoded as a JPEG through a canvas, so the metadata
 * a phone writes in the original (position, device, date) stays behind. recipe-images and
 * product-images are public buckets, read through these URLs. HEIC photos are decoded on the way
 * (resizePhoto), and a photo the device cannot read is never sent.
 * The file name is random: no collision between two uploads, no name another account could take in
 * advance (any signed-in user may upload to these buckets), no public URL to guess.
 */
const RECIPE_BUCKET = 'recipe-images';
const PRODUCT_BUCKET = 'product-images';
/** A product photo only needs to be recognised. */
const PRODUCT_QUALITY = 0.8;
const UPLOAD_FAILED = 'Impossible de télécharger l’image.';
const UNREADABLE = 'Cette photo ne peut pas être lue sur cet appareil.';
const NOT_A_PRODUCT_PHOTO = 'Cette photo n’est pas une photo de produit.';
const DELETE_FAILED = 'La photo n’a pas pu être supprimée.';
const PROBE = 'probe.jpg';

/** A failure worded for the person, without the storage detail. */
export class PhotoUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhotoUploadError';
  }
}

interface PhotoTarget {
  bucket: string;
  prefix: string;
  maxSide: number;
  quality?: number;
}

/** Uploads the re-encoded photo and returns its public URL. */
async function uploadPhoto(file: Blob, { bucket, prefix, maxSide, quality }: PhotoTarget): Promise<string> {
  let jpeg: Blob;
  try {
    jpeg = quality === undefined ? await resizePhoto(file, maxSide) : await resizePhoto(file, maxSide, quality);
  } catch (error) {
    throw new PhotoUploadError(error instanceof Error && error.message ? error.message : UNREADABLE);
  }
  const path = `${prefix}-${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(bucket).upload(path, jpeg, { contentType: 'image/jpeg' });
  if (error) throw new PhotoUploadError(UPLOAD_FAILED);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export function uploadRecipePhoto(file: Blob): Promise<string> {
  return uploadPhoto(file, { bucket: RECIPE_BUCKET, prefix: 'recipe', maxSide: PHOTO_MAX_SIDE });
}

export function uploadProductPhoto(file: Blob): Promise<string> {
  return uploadPhoto(file, { bucket: PRODUCT_BUCKET, prefix: 'product', maxSide: KEPT_PHOTO_SIDE, quality: PRODUCT_QUALITY });
}

/**
 * The path inside product-images of one of its public URLs, or null for any other address: another
 * site, another bucket, a path leaving the bucket. Former photos sit at the bucket root under
 * random numeric names; their full URLs are stored on the products, so they stay readable.
 */
function productPhotoPath(url: string): string | null {
  const probe = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(PROBE).data.publicUrl;
  let target: URL;
  let root: URL;
  try {
    target = new URL(url);
    root = new URL(probe.slice(0, -PROBE.length));
  } catch {
    return null;
  }
  if (target.origin !== root.origin || !target.pathname.startsWith(root.pathname)) return null;
  let path: string;
  try {
    path = decodeURIComponent(target.pathname.slice(root.pathname.length));
  } catch {
    return null;
  }
  const parts = path.split('/');
  return path && parts.every(part => part !== '' && part !== '.' && part !== '..') ? path : null;
}

/** Deletes a product photo by its public URL; says so when nothing was deleted. */
export async function deleteProductPhoto(url: string): Promise<void> {
  const path = productPhotoPath(url);
  if (!path) throw new PhotoUploadError(NOT_A_PRODUCT_PHOTO);
  const { data, error } = await supabase.storage.from(PRODUCT_BUCKET).remove([path]);
  if (error || !data?.length) throw new PhotoUploadError(DELETE_FAILED);
}
