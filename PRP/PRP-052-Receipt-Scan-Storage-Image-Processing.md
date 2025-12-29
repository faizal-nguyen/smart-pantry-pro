# PRP-052: Scan de Ticket - Storage & Image Processing

**Product**: Smart Pantry Pro
**Feature**: Receipt Image Upload & Processing
**Version**: 1.0
**Date**: 21 Octobre 2025
**Status**: 🟢 Ready for Development
**Durée estimée**: 2 jours
**Prérequis**: PRP-050 (Infrastructure & Database)
**Phase**: Image Processing (Phase 3/6)

---

## 📌 Objectif

Implémenter la gestion complète des images de tickets : upload vers Supabase Storage, compression côté client, suppression des métadonnées EXIF (privacy), validation, et cleanup automatique.

---

## 🎯 Scope

### ✅ In Scope
- Hook `useImageUpload.ts` pour upload Supabase Storage
- Compression d'images côté client (avec `browser-image-compression`)
- Suppression EXIF metadata (privacy/RGPD)
- Validation format, taille, et dimensions
- Gestion des erreurs d'upload
- Auto-rotation basée sur EXIF avant suppression
- Preview avec crop/rotate (optionnel)
- Tests unitaires des utilitaires

### ❌ Out of Scope
- Capture caméra (PRP-053)
- Interface UI de preview (PRP-053)
- Traitement GPT Vision (PRP-051)
- Analytics (PRP-055)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│   User selects image                        │
│   (Camera or Gallery)                       │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│   Image Validation                          │
│   ├─ Check format (JPEG/PNG/WEBP)          │
│   ├─ Check size (< 10MB)                   │
│   └─ Check dimensions (min 400x400)        │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│   EXIF Processing                           │
│   ├─ Read EXIF orientation                 │
│   ├─ Auto-rotate if needed                 │
│   └─ Strip ALL EXIF metadata               │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│   Image Compression                         │
│   ├─ Target: < 1MB                         │
│   ├─ Max dimensions: 2000x2000             │
│   ├─ Quality: 0.85                         │
│   └─ Format: JPEG (optimal)                │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│   Upload to Supabase Storage                │
│   ├─ Bucket: receipts-temp                 │
│   ├─ Path: {userId}/{timestamp}-{random}   │
│   ├─ Progress tracking                     │
│   └─ Get public URL                        │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│   Return URL for GPT Vision (PRP-051)       │
└─────────────────────────────────────────────┘
```

---

## 🛠️ Implémentation

### 1. Utilitaires Image Processing

Créer `src/lib/imageProcessing.ts`:

```typescript
import imageCompression from 'browser-image-compression';

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export interface ImageProcessingOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  quality: number;
}

/**
 * Valide qu'un fichier est une image acceptable
 */
export function validateImageFile(file: File): ImageValidationResult {
  // 1. Vérifier le type MIME
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Format non supporté. Utilisez JPEG, PNG ou WEBP.`,
    };
  }

  // 2. Vérifier la taille (10MB max)
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Image trop volumineuse (max 10MB). Taille actuelle: ${(file.size / 1024 / 1024).toFixed(1)}MB`,
    };
  }

  return { valid: true };
}

/**
 * Lit les dimensions d'une image
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Compresse une image avec suppression EXIF automatique
 */
export async function compressImage(
  file: File,
  options: Partial<ImageProcessingOptions> = {}
): Promise<File> {
  const defaultOptions: ImageProcessingOptions = {
    maxSizeMB: 1, // Cible 1MB
    maxWidthOrHeight: 2000, // Suffisant pour GPT Vision
    useWebWorker: true,
    quality: 0.85,
    ...options,
  };

  try {
    // browser-image-compression supprime automatiquement les EXIF
    const compressedFile = await imageCompression(file, {
      maxSizeMB: defaultOptions.maxSizeMB,
      maxWidthOrHeight: defaultOptions.maxWidthOrHeight,
      useWebWorker: defaultOptions.useWebWorker,
      initialQuality: defaultOptions.quality,
      // Options EXIF
      exifOrientation: undefined, // Rotation automatique basée sur EXIF
      preserveExif: false, // IMPORTANT: Supprimer EXIF pour privacy
    });

    return compressedFile;
  } catch (error) {
    console.error('Image compression error:', error);
    throw new Error('Échec de la compression de l\'image');
  }
}

/**
 * Génère un nom de fichier unique et sécurisé
 */
export function generateSecureFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';

  return `${timestamp}-${random}.${extension}`;
}

/**
 * Convertit une image File en base64 (pour preview)
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert to base64'));
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
```

---

### 2. Hook Upload Supabase

Créer `src/hooks/useReceiptImageUpload.ts`:

```typescript
import { useState } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import {
  validateImageFile,
  compressImage,
  generateSecureFileName,
  getImageDimensions,
} from '@/lib/imageProcessing';
import { receiptScanConfig } from '@/config/receiptScan';

export interface UploadProgress {
  stage: 'validating' | 'compressing' | 'uploading' | 'complete' | 'error';
  percent: number;
  message: string;
}

export interface UploadResult {
  success: boolean;
  imageUrl?: string;
  storagePath?: string;
  error?: string;
  originalSize?: number;
  compressedSize?: number;
}

export function useReceiptImageUpload() {
  const supabase = useSupabaseClient();
  const user = useUser();

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    stage: 'validating',
    percent: 0,
    message: '',
  });

  /**
   * Upload une image de ticket vers Supabase Storage
   */
  const uploadImage = async (file: File): Promise<UploadResult> => {
    if (!user) {
      return { success: false, error: 'Utilisateur non authentifié' };
    }

    setUploading(true);
    const originalSize = file.size;

    try {
      // 1. Validation
      setProgress({
        stage: 'validating',
        percent: 10,
        message: 'Validation de l\'image...',
      });

      const validation = validateImageFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Vérifier dimensions minimales
      const dimensions = await getImageDimensions(file);
      if (dimensions.width < 400 || dimensions.height < 400) {
        throw new Error('Image trop petite. Dimensions minimales: 400x400px');
      }

      // 2. Compression + Suppression EXIF
      setProgress({
        stage: 'compressing',
        percent: 30,
        message: 'Compression et optimisation...',
      });

      const compressedFile = await compressImage(file, {
        maxSizeMB: receiptScanConfig.storage.maxSizeMB,
        maxWidthOrHeight: 2000,
      });

      console.log(`Image compressed: ${(originalSize / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);

      // 3. Upload vers Supabase Storage
      setProgress({
        stage: 'uploading',
        percent: 60,
        message: 'Envoi vers le serveur...',
      });

      const fileName = generateSecureFileName(file.name);
      const storagePath = `${user.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(receiptScanConfig.storage.bucket)
        .upload(storagePath, compressedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // 4. Récupérer l'URL publique
      const { data: urlData } = supabase.storage
        .from(receiptScanConfig.storage.bucket)
        .getPublicUrl(storagePath);

      if (!urlData.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      setProgress({
        stage: 'complete',
        percent: 100,
        message: 'Upload terminé !',
      });

      setUploading(false);

      return {
        success: true,
        imageUrl: urlData.publicUrl,
        storagePath,
        originalSize,
        compressedSize: compressedFile.size,
      };

    } catch (error: any) {
      console.error('Upload error:', error);

      setProgress({
        stage: 'error',
        percent: 0,
        message: error.message || 'Erreur d\'upload',
      });

      setUploading(false);

      return {
        success: false,
        error: error.message || 'Une erreur est survenue lors de l\'upload',
      };
    }
  };

  /**
   * Supprime une image du storage
   */
  const deleteImage = async (storagePath: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from(receiptScanConfig.storage.bucket)
        .remove([storagePath]);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  };

  return {
    uploadImage,
    deleteImage,
    uploading,
    progress,
  };
}
```

---

### 3. Hook pour Capture Image (Mobile + Desktop)

Créer `src/hooks/useImageCapture.ts`:

```typescript
import { useState, useRef } from 'react';

export interface CaptureOptions {
  facingMode?: 'user' | 'environment'; // 'environment' = caméra arrière
  maxWidth?: number;
  maxHeight?: number;
}

export function useImageCapture() {
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Ouvre le sélecteur de fichier (galerie)
   */
  const selectFromGallery = (): Promise<File | null> => {
    return new Promise((resolve) => {
      if (!fileInputRef.current) {
        resolve(null);
        return;
      }

      const handleChange = (e: Event) => {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0] || null;
        fileInputRef.current?.removeEventListener('change', handleChange);
        resolve(file);
      };

      fileInputRef.current.addEventListener('change', handleChange);
      fileInputRef.current.click();
    });
  };

  /**
   * Ouvre la caméra native (mobile)
   * Sur desktop, ouvre le file picker avec capture
   */
  const captureFromCamera = (): Promise<File | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Caméra arrière préférée

      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0] || null;
        resolve(file);
      };

      input.click();
    });
  };

  /**
   * Crée un input caché pour la galerie
   */
  const createFileInput = () => (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/jpg,image/png,image/webp"
      style={{ display: 'none' }}
    />
  );

  return {
    capturing,
    error,
    selectFromGallery,
    captureFromCamera,
    createFileInput,
  };
}
```

---

## 📦 Dépendances NPM

```json
{
  "dependencies": {
    "browser-image-compression": "^2.0.2"
  },
  "devDependencies": {
    "@types/browser-image-compression": "^1.0.0"
  }
}
```

Installation:
```bash
npm install browser-image-compression
```

---

## 🧪 Tests Unitaires

Créer `src/lib/__tests__/imageProcessing.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  validateImageFile,
  generateSecureFileName,
} from '../imageProcessing';

describe('imageProcessing', () => {
  describe('validateImageFile', () => {
    it('should accept valid JPEG file', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = validateImageFile(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid file type', () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const result = validateImageFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Format non supporté');
    });

    it('should reject file > 10MB', () => {
      // Créer un fichier de 11MB
      const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });

      const result = validateImageFile(largeFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('trop volumineuse');
    });
  });

  describe('generateSecureFileName', () => {
    it('should generate unique filename with timestamp', () => {
      const name1 = generateSecureFileName('photo.jpg');
      const name2 = generateSecureFileName('photo.jpg');

      expect(name1).not.toBe(name2);
      expect(name1).toMatch(/^\d+-[a-z0-9]+\.jpg$/);
    });

    it('should preserve file extension', () => {
      const pngName = generateSecureFileName('image.png');
      const webpName = generateSecureFileName('image.webp');

      expect(pngName).toMatch(/\.png$/);
      expect(webpName).toMatch(/\.webp$/);
    });
  });
});
```

---

## ✅ Definition of Done

- [ ] Utilitaires `imageProcessing.ts` créés et testés
- [ ] Hook `useReceiptImageUpload` implémenté
- [ ] Hook `useImageCapture` implémenté
- [ ] Compression d'images fonctionnelle (< 1MB)
- [ ] Suppression EXIF automatique validée
- [ ] Upload vers Supabase Storage avec progress
- [ ] Validation format et taille opérationnelle
- [ ] Tests unitaires passent (coverage > 80%)
- [ ] Tests manuels sur mobile et desktop
- [ ] Documentation d'utilisation complétée

---

## 🧪 Tests de Validation Manuelle

### Test 1: Upload d'une image volumineuse

```typescript
// Dans la console navigateur
const largeImageFile = ... // Sélectionner image > 5MB

const { uploadImage } = useReceiptImageUpload();
const result = await uploadImage(largeImageFile);

console.log('Original size:', result.originalSize);
console.log('Compressed size:', result.compressedSize);
console.log('Compression ratio:', ((1 - result.compressedSize! / result.originalSize!) * 100).toFixed(1) + '%');
```

### Test 2: Vérifier suppression EXIF

```bash
# Avant upload: vérifier EXIF
exiftool original-photo.jpg

# Après upload: télécharger l'image uploadée
curl -O https://your-supabase.storage/.../uploaded-image.jpg

# Vérifier EXIF supprimés
exiftool uploaded-image.jpg
# Devrait afficher: No EXIF data found
```

### Test 3: Test mobile (caméra arrière)

1. Ouvrir l'app sur mobile
2. Cliquer "Scanner un ticket"
3. Sélectionner "Prendre une photo"
4. Vérifier que la caméra ARRIÈRE s'ouvre (pas selfie)
5. Prendre photo d'un ticket
6. Vérifier compression et upload

---

## 📚 Documentation d'Utilisation

### Exemple d'Utilisation dans un Composant

```typescript
import { useReceiptImageUpload } from '@/hooks/useReceiptImageUpload';
import { useImageCapture } from '@/hooks/useImageCapture';

function ReceiptScanner() {
  const { uploadImage, uploading, progress } = useReceiptImageUpload();
  const { captureFromCamera, selectFromGallery, createFileInput } = useImageCapture();

  const handleCameraCapture = async () => {
    const file = await captureFromCamera();
    if (!file) return;

    const result = await uploadImage(file);
    if (result.success) {
      console.log('Image uploaded:', result.imageUrl);
      // Appeler l'API de scan (PRP-051)
    }
  };

  const handleGallerySelect = async () => {
    const file = await selectFromGallery();
    if (!file) return;

    const result = await uploadImage(file);
    if (result.success) {
      console.log('Image uploaded:', result.imageUrl);
    }
  };

  return (
    <div>
      {createFileInput()}

      <button onClick={handleCameraCapture} disabled={uploading}>
        📸 Prendre une photo
      </button>

      <button onClick={handleGallerySelect} disabled={uploading}>
        🖼️ Choisir depuis la galerie
      </button>

      {uploading && (
        <div>
          <p>{progress.message}</p>
          <progress value={progress.percent} max={100} />
        </div>
      )}
    </div>
  );
}
```

---

## 🔐 Sécurité & Privacy

### EXIF Metadata Suppression

Les métadonnées EXIF peuvent contenir:
- Localisation GPS
- Modèle d'appareil
- Date/heure exacte
- Paramètres caméra

**browser-image-compression** supprime automatiquement toutes ces données avec `preserveExif: false`.

### Validation Côté Serveur

Même si validation côté client, **toujours valider côté serveur**:

```typescript
// Dans l'API /api/receipts/scan
const fileType = req.headers['content-type'];
if (!['image/jpeg', 'image/png', 'image/webp'].includes(fileType)) {
  return res.status(400).json({ error: 'Invalid file type' });
}
```

---

## 📝 Notes d'Implémentation

1. **Compression**:
   - Utiliser qualité 0.85 (bon compromis qualité/taille)
   - Max dimensions 2000x2000 (suffisant pour GPT Vision)
   - Cible < 1MB (économie storage + upload rapide)

2. **Mobile Safari**:
   - iOS Safari supporte `capture="environment"` depuis iOS 11
   - Tester orientation auto-rotate sur photos iPhone

3. **Performance**:
   - Compression dans Web Worker (non-bloquant)
   - Progress tracking pour UX

4. **Cleanup**:
   - Images auto-supprimées après 24h (Edge Function dans PRP-050)
   - Supprimer immédiatement après scan si utilisateur annule

---

## 🔗 Prochaines Étapes

- **PRP-053**: Frontend Components Core (utilise ce hook)
- **PRP-054**: Product Enrichment (reçoit l'imageUrl)

---

**Owner**: Faizal
**Reviewer**: Tech Lead
**Estimation**: 2 jours développeur senior
