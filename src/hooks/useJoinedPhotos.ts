/**
 * The photos joined to the next assistant message, resized on the phone.
 * Their object URLs (thumbnails) are released with them.
 */
import { useEffect, useRef, useState } from 'react';
import { resizePhoto } from '@/lib/photoResize';

export const MAX_JOINED_PHOTOS = 4;
export interface JoinedPhoto { blob: Blob; url: string }

/** The photos joined to the next message. Object URLs are released with them. */
export function useJoinedPhotos() {
  const [photos, setPhotos] = useState<JoinedPhoto[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const live = useRef<JoinedPhoto[]>([]);
  live.current = photos;
  useEffect(() => () => live.current.forEach(photo => URL.revokeObjectURL(photo.url)), []);

  const add = async (files: readonly File[]) => {
    const room = MAX_JOINED_PHOTOS - live.current.length;
    if (files.length === 0) return;
    setProblem(files.length > room ? `${MAX_JOINED_PHOTOS} photos au plus par message.` : null);
    setPreparing(true);
    try {
      // One photo at a time: a decoded 24 MP iPhone photo holds about 100 MB.
      for (const file of files.slice(0, Math.max(room, 0))) {
        const blob = await resizePhoto(file);
        setPhotos(previous => [...previous, { blob, url: URL.createObjectURL(blob) }]);
      }
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'Cette photo ne peut pas être lue sur cet appareil.');
    } finally {
      setPreparing(false);
    }
  };
  const remove = (index: number) => {
    const photo = live.current[index];
    if (photo) URL.revokeObjectURL(photo.url);
    setPhotos(previous => previous.filter(other => other !== photo));
    setProblem(null);
  };
  const clear = () => {
    live.current.forEach(photo => URL.revokeObjectURL(photo.url));
    setPhotos([]);
    setProblem(null);
  };
  return { photos, problem, preparing, add, remove, clear };
}
