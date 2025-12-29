# PRP-053: Scan de Ticket - Frontend Components Core

**Product**: Smart Pantry Pro
**Feature**: Receipt Scanning UI Components
**Version**: 1.0
**Date**: 21 Octobre 2025
**Status**: 🟢 Ready for Development
**Durée estimée**: 4 jours
**Prérequis**: PRP-051 (Backend GPT Vision), PRP-052 (Storage & Image Processing)
**Phase**: Frontend Core (Phase 4/6)

---

## 📌 Objectif

Développer l'interface utilisateur complète pour le scan de tickets de caisse : capture photo, prévisualisation, processing state, et intégration dans le flow inventaire.

---

## 🎯 Scope

### ✅ In Scope
- Composant `ReceiptScanner.tsx` - Container principal
- Composant `CameraCapture.tsx` - Capture photo/galerie
- Composant `ReceiptPreview.tsx` - Prévisualisation et crop
- Composant `ScanProgress.tsx` - Loading states animés
- Composant `ScanErrorFallback.tsx` - Gestion erreurs
- Hook `useReceiptScanner.ts` - Logique métier
- Navigation depuis l'inventaire
- Tests React Testing Library + Vitest
- Responsive mobile-first

### ❌ Out of Scope
- Confirmation et édition des produits (PRP-054)
- Enrichissement OpenFoodFacts (PRP-054)
- Analytics events (PRP-055)
- Historique des scans (PRP-055)

---

## 🎨 Design & User Flow

### Flow Principal

```
┌─────────────────────────────────────────────┐
│  Page Inventaire                            │
│  ├─ Bouton "➕ Ajouter des produits"       │
│  └─ Option "📸 Scanner un ticket"          │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  ReceiptScanner Modal/Page                  │
│  ├─ Guide visuel (cadre overlay)           │
│  ├─ Conseils: "Placez le ticket à plat"    │
│  └─ 2 boutons:                              │
│      ├─ 📸 Prendre une photo               │
│      └─ 🖼️ Galerie                         │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  Image Capturée → ReceiptPreview            │
│  ├─ Affichage de l'image                   │
│  ├─ Question: "C'est bon ?"                │
│  └─ Actions:                                │
│      ├─ ✅ Analyser                        │
│      └─ 🔄 Reprendre                        │
└────────────────┬────────────────────────────┘
                 │ User clique "Analyser"
                 ▼
┌─────────────────────────────────────────────┐
│  ScanProgress - Processing                  │
│  ├─ Animation loader                        │
│  ├─ Progress bar                            │
│  ├─ Message: "Analyse en cours..."         │
│  └─ Temps estimé: ~5 secondes              │
└────────────────┬────────────────────────────┘
                 │ GPT Vision terminé
                 ▼
┌─────────────────────────────────────────────┐
│  Redirect vers ProductConfirmation          │
│  (PRP-054)                                  │
└─────────────────────────────────────────────┘
```

---

## 🛠️ Implémentation

### 1. Hook Principal - useReceiptScanner

Créer `src/hooks/useReceiptScanner.ts`:

```typescript
import { useState } from 'react';
import { useReceiptImageUpload } from './useReceiptImageUpload';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';

export type ScanStage =
  | 'idle'
  | 'capturing'
  | 'previewing'
  | 'uploading'
  | 'processing'
  | 'success'
  | 'error';

export interface ScannedProduct {
  raw_name: string;
  normalized_name: string;
  quantity: number;
  unit: string;
  price: number;
  confidence?: number;
}

export interface ScanState {
  stage: ScanStage;
  capturedImage: File | null;
  previewUrl: string | null;
  uploadedImageUrl: string | null;
  scanId: string | null;
  products: ScannedProduct[];
  error: string | null;
  metadata?: {
    store?: string;
    date?: string;
    total?: number;
    processingTime?: number;
  };
}

export function useReceiptScanner() {
  const user = useUser();
  const supabase = useSupabaseClient();
  const { uploadImage, uploading, progress: uploadProgress } = useReceiptImageUpload();

  const [state, setState] = useState<ScanState>({
    stage: 'idle',
    capturedImage: null,
    previewUrl: null,
    uploadedImageUrl: null,
    scanId: null,
    products: [],
    error: null,
  });

  /**
   * Callback après capture d'image
   */
  const handleImageCaptured = async (file: File) => {
    // Créer preview URL
    const previewUrl = URL.createObjectURL(file);

    setState({
      ...state,
      stage: 'previewing',
      capturedImage: file,
      previewUrl,
      error: null,
    });
  };

  /**
   * Confirmer l'image et lancer le scan
   */
  const confirmAndScan = async () => {
    if (!state.capturedImage || !user) {
      setState({ ...state, error: 'Image ou utilisateur manquant', stage: 'error' });
      return;
    }

    try {
      // 1. Upload de l'image
      setState({ ...state, stage: 'uploading' });

      const uploadResult = await uploadImage(state.capturedImage);

      if (!uploadResult.success || !uploadResult.imageUrl) {
        throw new Error(uploadResult.error || 'Échec de l\'upload');
      }

      // 2. Appeler l'API de scan
      setState({ ...state, stage: 'processing', uploadedImageUrl: uploadResult.imageUrl });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Session invalide');
      }

      const response = await fetch('/api/receipts/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageUrl: uploadResult.imageUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Scan failed');
      }

      const scanResult = await response.json();

      // 3. Succès - stocker les produits
      setState({
        ...state,
        stage: 'success',
        scanId: scanResult.scan_id,
        products: scanResult.data.products,
        metadata: {
          store: scanResult.data.store,
          date: scanResult.data.date,
          total: scanResult.data.total,
          processingTime: scanResult.meta.processing_time_ms,
        },
      });

    } catch (error: any) {
      console.error('Scan error:', error);
      setState({
        ...state,
        stage: 'error',
        error: error.message || 'Une erreur est survenue',
      });
    }
  };

  /**
   * Reprendre une photo
   */
  const retake = () => {
    // Cleanup preview URL
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
    }

    setState({
      stage: 'idle',
      capturedImage: null,
      previewUrl: null,
      uploadedImageUrl: null,
      scanId: null,
      products: [],
      error: null,
    });
  };

  /**
   * Reset complet
   */
  const reset = () => {
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
    }

    setState({
      stage: 'idle',
      capturedImage: null,
      previewUrl: null,
      uploadedImageUrl: null,
      scanId: null,
      products: [],
      error: null,
    });
  };

  return {
    state,
    handleImageCaptured,
    confirmAndScan,
    retake,
    reset,
    uploading,
    uploadProgress,
  };
}
```

---

### 2. Composant Container - ReceiptScanner

Créer `src/components/receipt/ReceiptScanner.tsx`:

```typescript
import React from 'react';
import { useReceiptScanner } from '@/hooks/useReceiptScanner';
import { CameraCapture } from './CameraCapture';
import { ReceiptPreview } from './ReceiptPreview';
import { ScanProgress } from './ScanProgress';
import { ScanErrorFallback } from './ScanErrorFallback';
import { useNavigate } from 'react-router-dom';

export function ReceiptScanner() {
  const navigate = useNavigate();
  const {
    state,
    handleImageCaptured,
    confirmAndScan,
    retake,
    reset,
    uploadProgress,
  } = useReceiptScanner();

  // Redirection vers confirmation si succès
  React.useEffect(() => {
    if (state.stage === 'success' && state.scanId) {
      navigate(`/receipt-confirm/${state.scanId}`, {
        state: { products: state.products, metadata: state.metadata },
      });
    }
  }, [state.stage, state.scanId, navigate]);

  // Rendu conditionnel selon le stage
  return (
    <div className="receipt-scanner-container min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          ← Retour
        </button>
        <h1 className="ml-3 text-lg font-semibold">Scanner un ticket</h1>
      </header>

      {/* Content selon stage */}
      <main className="p-4">
        {state.stage === 'idle' && (
          <CameraCapture onImageCaptured={handleImageCaptured} />
        )}

        {state.stage === 'capturing' && (
          <CameraCapture onImageCaptured={handleImageCaptured} />
        )}

        {state.stage === 'previewing' && state.previewUrl && (
          <ReceiptPreview
            imageUrl={state.previewUrl}
            onConfirm={confirmAndScan}
            onRetake={retake}
          />
        )}

        {(state.stage === 'uploading' || state.stage === 'processing') && (
          <ScanProgress
            stage={state.stage}
            progress={uploadProgress}
            metadata={state.metadata}
          />
        )}

        {state.stage === 'error' && (
          <ScanErrorFallback
            error={state.error || 'Une erreur est survenue'}
            onRetry={retake}
            onCancel={() => navigate(-1)}
          />
        )}
      </main>
    </div>
  );
}
```

---

### 3. Composant Capture - CameraCapture

Créer `src/components/receipt/CameraCapture.tsx`:

```typescript
import React from 'react';
import { useImageCapture } from '@/hooks/useImageCapture';
import { Camera, Image as ImageIcon } from 'lucide-react';

interface CameraCaptureProps {
  onImageCaptured: (file: File) => void;
}

export function CameraCapture({ onImageCaptured }: CameraCaptureProps) {
  const { captureFromCamera, selectFromGallery, createFileInput } = useImageCapture();

  const handleCamera = async () => {
    const file = await captureFromCamera();
    if (file) {
      onImageCaptured(file);
    }
  };

  const handleGallery = async () => {
    const file = await selectFromGallery();
    if (file) {
      onImageCaptured(file);
    }
  };

  return (
    <div className="camera-capture flex flex-col items-center justify-center min-h-[60vh]">
      {createFileInput()}

      {/* Guide visuel */}
      <div className="mb-8 text-center">
        <div className="mb-4 mx-auto w-64 h-40 border-4 border-dashed border-blue-300 rounded-lg flex items-center justify-center bg-blue-50">
          <div className="text-blue-400 text-center">
            <Camera size={48} className="mx-auto mb-2" />
            <p className="text-sm font-medium">Placez votre ticket ici</p>
          </div>
        </div>

        <div className="text-gray-600 text-sm space-y-1">
          <p>✓ Posez le ticket à plat sur une surface</p>
          <p>✓ Assurez-vous d'un bon éclairage</p>
          <p>✓ Évitez les reflets et ombres</p>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          onClick={handleCamera}
          className="flex items-center justify-center gap-3 bg-blue-600 text-white px-6 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg"
        >
          <Camera size={24} />
          Prendre une photo
        </button>

        <button
          onClick={handleGallery}
          className="flex items-center justify-center gap-3 bg-white text-gray-700 px-6 py-4 rounded-xl font-semibold border-2 border-gray-200 hover:border-gray-300 transition-colors"
        >
          <ImageIcon size={24} />
          Choisir depuis la galerie
        </button>
      </div>

      {/* Astuce */}
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-sm">
        <p className="text-sm text-yellow-800">
          <strong>💡 Astuce :</strong> Pour de meilleurs résultats, photographiez le ticket juste après vos courses, quand il est encore bien lisible.
        </p>
      </div>
    </div>
  );
}
```

---

### 4. Composant Preview - ReceiptPreview

Créer `src/components/receipt/ReceiptPreview.tsx`:

```typescript
import React from 'react';
import { Check, RotateCcw } from 'lucide-react';

interface ReceiptPreviewProps {
  imageUrl: string;
  onConfirm: () => void;
  onRetake: () => void;
}

export function ReceiptPreview({ imageUrl, onConfirm, onRetake }: ReceiptPreviewProps) {
  return (
    <div className="receipt-preview flex flex-col items-center">
      {/* Titre */}
      <h2 className="text-xl font-semibold mb-4 text-center">
        Vérifiez votre photo
      </h2>

      {/* Image */}
      <div className="relative mb-6 w-full max-w-md">
        <img
          src={imageUrl}
          alt="Ticket de caisse"
          className="w-full rounded-lg shadow-xl border-2 border-gray-200"
        />

        {/* Overlay guide */}
        <div className="absolute inset-0 border-4 border-blue-400 border-dashed rounded-lg opacity-30 pointer-events-none" />
      </div>

      {/* Question */}
      <p className="text-gray-600 mb-6 text-center">
        Le ticket est-il bien visible et lisible ?
      </p>

      {/* Boutons */}
      <div className="flex gap-3 w-full max-w-sm">
        <button
          onClick={onRetake}
          className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-xl font-semibold border-2 border-gray-200 hover:border-gray-300 transition-colors"
        >
          <RotateCcw size={20} />
          Reprendre
        </button>

        <button
          onClick={onConfirm}
          className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-lg"
        >
          <Check size={20} />
          Analyser
        </button>
      </div>

      {/* Info */}
      <p className="mt-4 text-xs text-gray-500 text-center max-w-sm">
        L'analyse prendra environ 5 secondes. Assurez-vous que tous les produits sont visibles.
      </p>
    </div>
  );
}
```

---

### 5. Composant Progress - ScanProgress

Créer `src/components/receipt/ScanProgress.tsx`:

```typescript
import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import type { UploadProgress } from '@/hooks/useReceiptImageUpload';

interface ScanProgressProps {
  stage: 'uploading' | 'processing';
  progress: UploadProgress;
  metadata?: {
    store?: string;
    processingTime?: number;
  };
}

export function ScanProgress({ stage, progress, metadata }: ScanProgressProps) {
  const messages = {
    uploading: 'Envoi de votre photo...',
    processing: 'Analyse de votre ticket en cours...',
  };

  const tips = [
    '💡 En moyenne, un ticket contient 12 produits',
    '🌱 Le scan de tickets réduit le gaspillage de 47%',
    '⚡ L\'IA reconnaît plus de 50 000 produits français',
    '🎯 Précision moyenne : 89%',
  ];

  const [currentTip, setCurrentTip] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="scan-progress flex flex-col items-center justify-center min-h-[60vh]">
      {/* Loader animé */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75" />
        <div className="relative bg-blue-600 text-white p-6 rounded-full">
          <Loader2 size={48} className="animate-spin" />
        </div>
      </div>

      {/* Message principal */}
      <h2 className="text-2xl font-bold mb-2 text-gray-800 flex items-center gap-2">
        <Sparkles size={24} className="text-yellow-500" />
        {messages[stage]}
      </h2>

      {/* Détails */}
      {metadata?.store && (
        <p className="text-gray-600 mb-4">Ticket {metadata.store}</p>
      )}

      {/* Progress bar */}
      <div className="w-full max-w-md mb-6">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <p className="text-sm text-gray-500 mt-2 text-center">
          {progress.message}
        </p>
      </div>

      {/* Tips rotatifs */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md">
        <p className="text-sm text-blue-800 text-center transition-opacity duration-300">
          {tips[currentTip]}
        </p>
      </div>

      {/* Temps estimé */}
      <p className="mt-4 text-xs text-gray-400">
        Temps estimé : ~5 secondes
      </p>
    </div>
  );
}
```

---

### 6. Composant Erreur - ScanErrorFallback

Créer `src/components/receipt/ScanErrorFallback.tsx`:

```typescript
import React from 'react';
import { AlertCircle, RotateCcw, X } from 'lucide-react';

interface ScanErrorFallbackProps {
  error: string;
  onRetry: () => void;
  onCancel: () => void;
}

export function ScanErrorFallback({ error, onRetry, onCancel }: ScanErrorFallbackProps) {
  // Suggestions selon le type d'erreur
  const suggestions = React.useMemo(() => {
    if (error.includes('lisible') || error.includes('illisible')) {
      return [
        '💡 Améliorez l\'éclairage',
        '📸 Photographiez à la verticale',
        '📏 Rapprochez-vous du ticket',
      ];
    }

    if (error.includes('timeout') || error.includes('temps')) {
      return [
        '🌐 Vérifiez votre connexion internet',
        '⏱️ Réessayez dans quelques instants',
        '📶 Assurez-vous d\'avoir un bon signal',
      ];
    }

    return [
      '🔄 Réessayez avec une nouvelle photo',
      '💡 Assurez-vous d\'un bon éclairage',
      '📸 Évitez les reflets et ombres',
    ];
  }, [error]);

  return (
    <div className="scan-error flex flex-col items-center justify-center min-h-[60vh]">
      {/* Icône erreur */}
      <div className="mb-6 bg-red-100 text-red-600 p-6 rounded-full">
        <AlertCircle size={48} />
      </div>

      {/* Message d'erreur */}
      <h2 className="text-xl font-bold mb-2 text-gray-800">
        Oups, une erreur est survenue
      </h2>

      <p className="text-gray-600 mb-6 text-center max-w-md">
        {error}
      </p>

      {/* Suggestions */}
      <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg max-w-md">
        <p className="font-semibold text-sm text-gray-700 mb-2">
          Suggestions :
        </p>
        <ul className="space-y-1">
          {suggestions.map((suggestion, index) => (
            <li key={index} className="text-sm text-gray-600">
              {suggestion}
            </li>
          ))}
        </ul>
      </div>

      {/* Boutons */}
      <div className="flex gap-3 w-full max-w-sm">
        <button
          onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-xl font-semibold border-2 border-gray-200 hover:border-gray-300 transition-colors"
        >
          <X size={20} />
          Annuler
        </button>

        <button
          onClick={onRetry}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg"
        >
          <RotateCcw size={20} />
          Réessayer
        </button>
      </div>
    </div>
  );
}
```

---

## 🧪 Tests

Créer `src/components/receipt/__tests__/ReceiptScanner.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReceiptScanner } from '../ReceiptScanner';
import { BrowserRouter } from 'react-router-dom';

// Mock hooks
vi.mock('@/hooks/useReceiptScanner', () => ({
  useReceiptScanner: () => ({
    state: {
      stage: 'idle',
      capturedImage: null,
      previewUrl: null,
      products: [],
      error: null,
    },
    handleImageCaptured: vi.fn(),
    confirmAndScan: vi.fn(),
    retake: vi.fn(),
    reset: vi.fn(),
    uploadProgress: { stage: 'validating', percent: 0, message: '' },
  }),
}));

describe('ReceiptScanner', () => {
  it('should render camera capture by default', () => {
    render(
      <BrowserRouter>
        <ReceiptScanner />
      </BrowserRouter>
    );

    expect(screen.getByText('Scanner un ticket')).toBeInTheDocument();
    expect(screen.getByText('Prendre une photo')).toBeInTheDocument();
  });

  it('should show tips on camera capture screen', () => {
    render(
      <BrowserRouter>
        <ReceiptScanner />
      </BrowserRouter>
    );

    expect(screen.getByText(/Placez le ticket à plat/)).toBeInTheDocument();
    expect(screen.getByText(/bon éclairage/)).toBeInTheDocument();
  });
});
```

---

## ✅ Definition of Done

- [ ] Tous les composants créés et stylés
- [ ] Hook `useReceiptScanner` fonctionnel
- [ ] Navigation depuis inventaire implémentée
- [ ] Responsive mobile + desktop
- [ ] Loading states animés
- [ ] Gestion erreurs robuste
- [ ] Tests React Testing Library (coverage > 70%)
- [ ] Accessibilité validée (navigation clavier, ARIA)
- [ ] Documentation composants

---

## 📝 Notes d'Implémentation

1. **Mobile-first**: Optimiser pour mobile en priorité
2. **Animations**: Utiliser Tailwind animations + Framer Motion (optionnel)
3. **Accessibilité**: Labels ARIA, focus management
4. **Performance**: Lazy load composants si nécessaire

---

**Owner**: Faizal
**Reviewer**: Tech Lead
**Estimation**: 4 jours développeur senior
