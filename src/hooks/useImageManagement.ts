import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ImageUploadOptions {
  maxWidth?: number;
  quality?: number;
  format?: string;
}

interface UseImageManagementReturn {
  uploading: boolean;
  progress: number;
  uploadImage: (file: File, options?: ImageUploadOptions) => Promise<string>;
  deleteImage: (url: string) => Promise<void>;
  compressImage: (file: File, options?: ImageUploadOptions) => Promise<File>;
}

export const useImageManagement = (): UseImageManagementReturn => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const compressImage = async (
    file: File, 
    options: ImageUploadOptions = {}
  ): Promise<File> => {
    const { maxWidth = 800, quality = 0.8, format = 'webp' } = options;

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate dimensions maintaining aspect ratio
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: `image/${format}`,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          `image/${format}`,
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const uploadImage = async (
    file: File, 
    options: ImageUploadOptions = {}
  ): Promise<string> => {
    setUploading(true);
    setProgress(0);

    try {
      // Compress image before upload
      const compressedFile = await compressImage(file, options);
      
      // Generate unique filename
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      setProgress(30);

      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('product-images')
        .upload(filePath, compressedFile);

      if (uploadError) {
        throw uploadError;
      }

      setProgress(70);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setProgress(100);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const deleteImage = async (url: string): Promise<void> => {
    try {
      // Extract file path from URL
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      const { error } = await supabase.storage
        .from('product-images')
        .remove([fileName]);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  };

  return {
    uploading,
    progress,
    uploadImage,
    deleteImage,
    compressImage,
  };
};