import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat, Result } from '@zxing/library';
import { toast } from 'sonner';

import { apiGet, ApiError } from '@/lib/api';

interface ScanConfig {
  tryHarder: boolean;
  formats: BarcodeFormat[];
  timeout: number;
  maxTries: number;
}

interface ScanResult {
  barcode: string;
  format: string;
  confidence: number;
  processingTime: number;
}

interface ProductData {
  name: string;
  brand?: string;
  category: string;
  unit: string;
  imageUrl?: string;
  /**
   * PRP-225 PR4 — the front-end no longer cascades through multiple
   * upstream APIs. The shared `/api/products/resolve` route already
   * tries OFF behind a durable cache ; everything else falls back to
   * a local-only `manual` product.
   */
  source: 'openfoodfacts' | 'manual';
  confidence: number;
}

interface ResolveProductResponse {
  kind: 'matched' | 'created' | 'ambiguous' | 'not_found';
  product?: {
    name: string;
    brand?: string | null;
    category?: string | null;
    barcode?: string | null;
    image_url?: string | null;
  };
  candidates?: Array<{
    name: string;
    brand?: string | null;
    category?: string | null;
    image_url?: string | null;
  }>;
  confidence?: number;
}

export class EnhancedScannerService {
  private codeReader: BrowserMultiFormatReader;
  private isScanning = false;
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;

  // Configuration optimisée mobile
  private config: ScanConfig = {
    tryHarder: true,
    formats: [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39
    ],
    timeout: 15000,
    maxTries: 5
  };

  constructor() {
    this.codeReader = new BrowserMultiFormatReader();
    this.setupDecodeHints();
  }

  private setupDecodeHints() {
    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, this.config.tryHarder);
    hints.set(DecodeHintType.POSSIBLE_FORMATS, this.config.formats);
    
    // Optimisations mobile
    hints.set(DecodeHintType.PURE_BARCODE, false);
    hints.set(DecodeHintType.ASSUME_GS1, false);
    
    this.codeReader.hints = hints;
  }

  async initializeCamera(
    constraints: MediaStreamConstraints = {}
  ): Promise<HTMLVideoElement> {
    try {
      // Contraintes optimisées mobile
      const defaultConstraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' }, // Caméra arrière préférée
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
          focusMode: { ideal: 'continuous' } as any,
          exposureMode: { ideal: 'continuous' } as any,
          whiteBalanceMode: { ideal: 'continuous' } as any
        }
      };

      const mergedConstraints = {
        ...defaultConstraints,
        ...constraints,
        video: { ...defaultConstraints.video, ...(typeof constraints.video === 'object' ? constraints.video : {}) }
      };

      // Demande de permission et stream
      this.stream = await navigator.mediaDevices.getUserMedia(mergedConstraints);
      
      // Création élément vidéo optimisé
      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.stream;
      this.videoElement.autoplay = true;
      this.videoElement.playsInline = true; // Important pour iOS
      this.videoElement.muted = true;

      // Styles optimisés mobile
      this.videoElement.style.width = '100%';
      this.videoElement.style.height = '100%';
      this.videoElement.style.objectFit = 'cover';

      await this.videoElement.play();
      
      console.log('📷 Camera initialized successfully');
      return this.videoElement;

    } catch (error) {
      console.error('📷 Camera initialization failed:', error);
      throw this.handleCameraError(error);
    }
  }

  private handleCameraError(error: any): Error {
    const errorMessages = {
      'NotAllowedError': 'Permission caméra refusée. Autorisez l\'accès dans les paramètres.',
      'NotFoundError': 'Aucune caméra trouvée sur cet appareil.',
      'NotReadableError': 'Caméra utilisée par une autre application.',
      'OverconstrainedError': 'Contraintes caméra non supportées.',
      'SecurityError': 'Contexte non sécurisé. Utilisez HTTPS.',
      'AbortError': 'Opération annulée par l\'utilisateur.'
    };

    const message = errorMessages[error.name as keyof typeof errorMessages] || 
                   `Erreur caméra: ${error.message}`;
    
    toast.error(message);
    return new Error(message);
  }

  async scanBarcode(
    videoElement?: HTMLVideoElement,
    maxAttempts: number = this.config.maxTries
  ): Promise<ScanResult> {
    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    const video = videoElement || this.videoElement;
    if (!video) {
      throw new Error('No video element available');
    }

    this.isScanning = true;
    const startTime = Date.now();
    let attempts = 0;

    try {
      // Attendre que la vidéo soit prête
      await this.waitForVideoReady(video);

      // Boucle de scan avec retry intelligent
      while (attempts < maxAttempts) {
        attempts++;
        console.log(`🔍 Scan attempt ${attempts}/${maxAttempts}`);

        try {
          const result = await this.performScan(video);
          const processingTime = Date.now() - startTime;

          const scanResult: ScanResult = {
            barcode: result.getText(),
            format: result.getBarcodeFormat().toString(),
            confidence: this.calculateConfidence(result),
            processingTime
          };

          console.log('✅ Barcode scanned successfully:', scanResult);
          return scanResult;

        } catch (scanError) {
          console.log(`⚠️ Scan attempt ${attempts} failed:`, scanError);
          
          if (attempts < maxAttempts) {
            // Pause entre tentatives avec feedback
            await this.pauseBetweenAttempts(attempts);
          }
        }
      }

      throw new Error(`Impossible de scanner après ${maxAttempts} tentatives`);

    } finally {
      this.isScanning = false;
    }
  }

  private async waitForVideoReady(video: HTMLVideoElement): Promise<void> {
    return new Promise((resolve, reject) => {
      if (video.readyState >= 2) { // HAVE_CURRENT_DATA
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Video timeout'));
      }, 5000);

      video.addEventListener('loadeddata', () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
    });
  }

  private async performScan(video: HTMLVideoElement): Promise<Result> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Scan timeout'));
      }, 3000);

      this.codeReader.decodeFromVideoElement(video)
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private calculateConfidence(result: Result): number {
    // Calcul de confiance basé sur la qualité du scan
    const text = result.getText();
    const format = result.getBarcodeFormat().toString();

    let confidence = 0.5; // Base

    // Bonus format
    if (['EAN_13', 'UPC_A'].includes(format)) confidence += 0.3;
    if (['EAN_8', 'UPC_E'].includes(format)) confidence += 0.2;

    // Bonus longueur
    if (text.length >= 12) confidence += 0.2;

    // Bonus checksum (pour EAN/UPC)
    if (this.validateChecksum(text, format)) confidence += 0.3;

    return Math.min(confidence, 1.0);
  }

  private validateChecksum(barcode: string, format: string): boolean {
    if (!['EAN_13', 'UPC_A', 'EAN_8'].includes(format)) return true;

    const digits = barcode.split('').map(Number);
    if (digits.some(isNaN)) return false;

    if (format === 'EAN_13' || format === 'UPC_A') {
      // Checksum EAN-13/UPC-A
      const sum = digits.slice(0, -1).reduce((acc, digit, index) => {
        return acc + digit * (index % 2 === 0 ? 1 : 3);
      }, 0);
      
      const checksum = (10 - (sum % 10)) % 10;
      return checksum === digits[digits.length - 1];
    }

    return true; // Simplification pour EAN-8
  }

  private async pauseBetweenAttempts(attempt: number): Promise<void> {
    const delay = Math.min(attempt * 500, 2000); // Max 2s
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Fetch product data for a scanned barcode.
   *
   * PRP-225 PR4 — single round-trip to the server-side proxy
   * `/api/products/resolve`. The proxy handles the OpenFoodFacts
   * cascade (cache → OFF API), so the front-end keeps zero secrets
   * and no third-party API keys. Local fallback is returned when the
   * backend has nothing.
   */
  async fetchProductData(barcode: string): Promise<ProductData> {
    try {
      const data = await apiGet<ResolveProductResponse>('/products/resolve', { barcode });
      if (data.kind === 'not_found') {
        return this.createManualProduct(barcode);
      }
      const source = data.product ?? data.candidates?.[0];
      if (!source) return this.createManualProduct(barcode);
      const category = this.mapCategory(source.category ?? undefined);
      return {
        name: source.name || `Produit ${barcode}`,
        brand: source.brand ?? undefined,
        category,
        unit: this.suggestUnit(category),
        imageUrl: source.image_url ?? undefined,
        source: 'openfoodfacts',
        confidence: data.confidence ?? 0.85,
      };
    } catch (err) {
      if (!(err instanceof ApiError)) {
        console.log('⚠️ /api/products/resolve failed:', err);
      }
      return this.createManualProduct(barcode);
    }
  }

  private createManualProduct(barcode: string): ProductData {
    return {
      name: `Produit ${barcode}`,
      category: 'Autres',
      unit: 'unité(s)',
      source: 'manual',
      confidence: 0.3
    };
  }

  private mapCategory(apiCategory?: string): string {
    // Mapping intelligent des catégories API vers app
    const categoryMap: Record<string, string> = {
      'dairy': 'Produits laitiers',
      'meat': 'Viandes et poissons',
      'fruits': 'Fruits et légumes',
      'vegetables': 'Fruits et légumes',
      'beverages': 'Boissons',
      'snacks': 'Gâteaux et biscuits',
      'cereals': 'Pâtes, riz et féculents',
      'canned': 'Conserves',
      'frozen': 'Surgelés',
      'bakery': 'Pain et viennoiseries'
    };

    if (!apiCategory) return 'Autres';

    const category = apiCategory.toLowerCase();
    for (const [key, value] of Object.entries(categoryMap)) {
      if (category.includes(key)) return value;
    }

    return 'Autres';
  }

  private suggestUnit(category?: string): string {
    if (!category) return 'unité(s)';
    
    const unitMap: Record<string, string> = {
      'Produits laitiers': 'L',
      'Viandes et poissons': 'kg',
      'Fruits et légumes': 'kg',
      'Boissons': 'L',
      'Pâtes, riz et féculents': 'paquet(s)',
      'Pain et viennoiseries': 'unité(s)'
    };

    const mappedCategory = this.mapCategory(category);
    return unitMap[mappedCategory] || 'unité(s)';
  }

  // Nettoyage des ressources
  stopScanning() {
    this.isScanning = false;
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
      });
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    this.codeReader.reset();
  }

  // Diagnostic des capacités
  async getCapabilities() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      
      return {
        hasCamera: cameras.length > 0,
        cameraCount: cameras.length,
        hasMultipleCameras: cameras.length > 1,
        supportedFormats: this.config.formats.map(f => BarcodeFormat[f]),
        permissions: await this.checkPermissions()
      };
    } catch (error) {
      return {
        hasCamera: false,
        cameraCount: 0,
        hasMultipleCameras: false,
        supportedFormats: [],
        permissions: 'denied'
      };
    }
  }

  private async checkPermissions(): Promise<string> {
    try {
      const result = await navigator.permissions.query({ 
        name: 'camera' as any 
      });
      return result.state;
    } catch {
      return 'unknown';
    }
  }
}

// Export singleton
export const scannerService = new EnhancedScannerService();