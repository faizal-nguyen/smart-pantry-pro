import { useState } from "react";
import { deleteProductPhoto, uploadProductPhoto } from "@/lib/photoUpload";

interface UseImageManagementReturn {
  uploading: boolean;
  progress: number;
  /** Re-encodes the photo on the device and uploads it under a random name; returns its public URL. */
  uploadImage: (file: File) => Promise<string>;
  /** Deletes a product photo by its public URL. */
  deleteImage: (url: string) => Promise<void>;
}

const PROGRESS_STARTED = 30;
const PROGRESS_DONE = 100;
const PROGRESS_RESET_MS = 1000;

/** Product photos (V11-06 S2: through photoUpload, as recipe photos). */
export const useImageManagement = (): UseImageManagementReturn => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadImage = async (file: File): Promise<string> => {
    setUploading(true);
    setProgress(PROGRESS_STARTED);
    try {
      const url = await uploadProductPhoto(file);
      setProgress(PROGRESS_DONE);
      return url;
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), PROGRESS_RESET_MS);
    }
  };

  return { uploading, progress, uploadImage, deleteImage: deleteProductPhoto };
};
