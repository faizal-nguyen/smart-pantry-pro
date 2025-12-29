/**
 * Receipt Scan Types - Phase A Implementation
 * Types for receipt scanning and product matching
 */

export interface ScannedProduct {
  raw_name: string;
  normalized_name: string;
  quantity: number;
  unit_price?: number;
  total_price: number;
  confidence: number;
}

export interface EnrichedProduct extends ScannedProduct {
  // Matching
  matched: boolean;
  matched_product?: {
    id?: string;
    name: string;
    barcode?: string;
    brand?: string;
    nutriscore?: string;
    image_url?: string;
  };
  match_confidence: number;
  match_method: 'alias' | 'fuzzy' | 'off_api' | 'llm' | 'none';

  // Enrichissement
  estimated_expiry_date?: string;
  suggested_location: 'frigo' | 'congelateur' | 'placard' | 'autre';
  category?: string;
}

export interface ReceiptScanResult {
  success: boolean;
  data?: {
    store: string | null;
    date: string | null;
    products: ScannedProduct[];
    subtotal: number | null;
    total: number | null;
  };
  error?: {
    code: string;
    message: string;
  };
  metadata: {
    processing_time_ms: number;
    gpt_model: string;
    gpt_cost_usd: number;
    tokens_used?: {
      input: number;
      output: number;
    };
  };
}

export interface ReceiptProcessResult {
  success: boolean;
  data?: {
    store: string | null;
    date: string | null;
    products: EnrichedProduct[];
    total: number | null;
    stats: {
      total_products: number;
      matched_products: number;
      unmatched_products: number;
      low_confidence_products: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
  metadata: {
    processing_time_ms: number;
    gpt_cost_usd: number;
    scan_id: string;
  };
}

export interface AddToInventoryRequest {
  products: Array<{
    product_id?: string;
    name: string;
    quantity: number;
    unit?: string;
    expiry_date?: string;
    location?: 'frigo' | 'congelateur' | 'placard' | 'autre';
    category?: string;
    barcode?: string;
    nutriscore?: string;
  }>;
  receipt_scan_id?: string;
}

export interface OpenFoodFactsProduct {
  code: string;
  product_name: string;
  brands?: string;
  categories?: string;
  nutriscore_grade?: string;
  image_url?: string;
}

export interface MatchResult {
  matched: boolean;
  confidence: number;
  method: 'alias' | 'fuzzy' | 'off_api' | 'none';
  product?: OpenFoodFactsProduct;
}
