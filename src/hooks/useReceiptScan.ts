/**
 * useReceiptScan Hook
 * Handles receipt scanning workflow and inventory addition
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ScannedProduct {
  raw_name: string;
  normalized_name: string;
  quantity: number;
  unit_price?: number;
  total_price: number;
  confidence: number;
  matched: boolean;
  match_confidence: number;
  match_method: string;
  suggested_location: 'frigo' | 'congelateur' | 'placard' | 'autre';
  category?: string;
  estimated_expiry_date?: string;
  matched_product?: {
    id?: string;
    name: string;
    barcode?: string;
    brand?: string;
    nutriscore?: string;
    image_url?: string;
  };
}

export interface ScanResult {
  store: string | null;
  date: string | null;
  products: ScannedProduct[];
  total: number | null;
  stats: {
    total_products: number;
    matched_products: number;
    unmatched_products: number;
    low_confidence_products: number;
  };
}

export interface ScanMetadata {
  processing_time_ms: number;
  gpt_cost_usd: number;
  scan_id: string;
}

export interface UseReceiptScanReturn {
  // State
  isScanning: boolean;
  scanResult: ScanResult | null;
  scanMetadata: ScanMetadata | null;
  error: string | null;
  selectedProducts: Set<string>;
  isAddingToInventory: boolean;

  // Actions
  scanReceipt: (file: File) => Promise<void>;
  scanReceiptBase64: (base64: string, mimeType?: string) => Promise<void>;
  toggleProduct: (index: number) => void;
  selectAll: () => void;
  deselectAll: () => void;
  addToInventory: () => Promise<{ success: boolean; count: number }>;
  reset: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3030';

export const useReceiptScan = (): UseReceiptScanReturn => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanMetadata, setScanMetadata] = useState<ScanMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isAddingToInventory, setIsAddingToInventory] = useState(false);

  /**
   * Scan a receipt from a File object
   */
  const scanReceipt = useCallback(async (file: File) => {
    setIsScanning(true);
    setError(null);
    setScanResult(null);
    setScanMetadata(null);

    try {
      // Get auth token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Non authentifie. Veuillez vous connecter.');
      }

      // Prepare FormData
      const formData = new FormData();
      formData.append('receipt', file);

      console.log('[useReceiptScan] Sending scan request...');

      // API call
      const response = await fetch(`${API_URL}/api/v1/receipts/scan`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Echec du scan');
      }

      console.log('[useReceiptScan] Scan successful:', result.data?.stats);

      setScanResult(result.data);
      setScanMetadata(result.metadata);

      // Select all products by default
      if (result.data?.products) {
        const allIndices = new Set(
          result.data.products.map((_: ScannedProduct, i: number) => String(i))
        );
        setSelectedProducts(allIndices);
      }
    } catch (err) {
      console.error('[useReceiptScan] Scan error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du scan');
    } finally {
      setIsScanning(false);
    }
  }, []);

  /**
   * Scan a receipt from base64 data
   */
  const scanReceiptBase64 = useCallback(async (base64: string, mimeType = 'image/jpeg') => {
    setIsScanning(true);
    setError(null);
    setScanResult(null);
    setScanMetadata(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Non authentifie. Veuillez vous connecter.');
      }

      const response = await fetch(`${API_URL}/api/v1/receipts/scan-base64`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ image: base64, mimeType }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Echec du scan');
      }

      setScanResult(result.data);
      setScanMetadata(result.metadata);

      if (result.data?.products) {
        const allIndices = new Set(
          result.data.products.map((_: ScannedProduct, i: number) => String(i))
        );
        setSelectedProducts(allIndices);
      }
    } catch (err) {
      console.error('[useReceiptScan] Scan error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du scan');
    } finally {
      setIsScanning(false);
    }
  }, []);

  /**
   * Toggle product selection
   */
  const toggleProduct = useCallback((index: number) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      const key = String(index);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  /**
   * Select all products
   */
  const selectAll = useCallback(() => {
    if (!scanResult) return;
    const allIndices = new Set(
      scanResult.products.map((_, i) => String(i))
    );
    setSelectedProducts(allIndices);
  }, [scanResult]);

  /**
   * Deselect all products
   */
  const deselectAll = useCallback(() => {
    setSelectedProducts(new Set());
  }, []);

  /**
   * Add selected products to inventory
   */
  const addToInventory = useCallback(async (): Promise<{ success: boolean; count: number }> => {
    if (!scanResult) return { success: false, count: 0 };

    setIsAddingToInventory(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Non authentifie');
      }

      // Filter selected products
      const productsToAdd = scanResult.products
        .filter((_, i) => selectedProducts.has(String(i)))
        .map((p) => ({
          name: p.normalized_name,
          quantity: p.quantity,
          expiry_date: p.estimated_expiry_date,
          location: p.suggested_location,
          category: p.category,
          barcode: p.matched_product?.barcode,
          nutriscore: p.matched_product?.nutriscore,
        }));

      if (productsToAdd.length === 0) {
        throw new Error('Aucun produit selectionne');
      }

      console.log(`[useReceiptScan] Adding ${productsToAdd.length} products to inventory...`);

      const response = await fetch(`${API_URL}/api/v1/receipts/add-to-inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          products: productsToAdd,
          receipt_scan_id: scanMetadata?.scan_id,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || "Echec de l'ajout");
      }

      console.log(`[useReceiptScan] Successfully added ${result.data.added_count} items`);

      return { success: true, count: result.data.added_count };
    } catch (err) {
      console.error('[useReceiptScan] Add to inventory error:', err);
      setError(err instanceof Error ? err.message : "Erreur lors de l'ajout");
      return { success: false, count: 0 };
    } finally {
      setIsAddingToInventory(false);
    }
  }, [scanResult, selectedProducts, scanMetadata]);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setIsScanning(false);
    setScanResult(null);
    setScanMetadata(null);
    setError(null);
    setSelectedProducts(new Set());
    setIsAddingToInventory(false);
  }, []);

  return {
    isScanning,
    scanResult,
    scanMetadata,
    error,
    selectedProducts,
    isAddingToInventory,
    scanReceipt,
    scanReceiptBase64,
    toggleProduct,
    selectAll,
    deselectAll,
    addToInventory,
    reset,
  };
};

export default useReceiptScan;
