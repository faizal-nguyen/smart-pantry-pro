import { PHOTO_MAX_SIDE, resizePhoto } from '@/lib/photoResize';
import { supabase } from '@/integrations/supabase/client';

/**
 * V11-06 S1: a recipe photo leaves the device re-encoded as a JPEG through a canvas, so the
 * metadata a phone writes in the original (position, device, date) stays behind. recipe-images is
 * a public bucket, read through these URLs. HEIC photos are decoded on the way (resizePhoto).
 * The file name is random: no collision between two uploads, no name another account could take in
 * advance (any signed-in user may upload to the bucket), no public URL to guess.
 */
const BUCKET = 'recipe-images';
const UPLOAD_FAILED = 'Impossible de télécharger l’image.';
const UNREADABLE = 'Cette photo ne peut pas être lue sur cet appareil.';

/** A failure worded for the person, without the storage detail. */
export class RecipePhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecipePhotoError';
  }
}

/** Uploads the re-encoded photo and returns its public URL. */
export async function uploadRecipePhoto(file: Blob): Promise<string> {
  let jpeg: Blob;
  try {
    jpeg = await resizePhoto(file, PHOTO_MAX_SIDE);
  } catch (error) {
    throw new RecipePhotoError(error instanceof Error && error.message ? error.message : UNREADABLE);
  }
  const path = `recipe-${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, jpeg, { contentType: 'image/jpeg' });
  if (error) throw new RecipePhotoError(UPLOAD_FAILED);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
