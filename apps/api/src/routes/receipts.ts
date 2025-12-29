/**
 * Receipt Scanning Routes
 * Phase A Implementation: Scan French grocery receipts
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Json } from '../types/supabase.js';
import { getReceiptProcessingService } from '../services/receipt/index.js';
import { AddToInventoryRequest } from '../types/receipt.types.js';

// Configure Multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporte. Utilisez JPEG, PNG, WebP ou HEIC.'));
    }
  },
});

/**
 * Create receipts router
 */
export function createReceiptsRouter(supabaseAdmin: SupabaseClient<Database>) {
  const router = Router();

  /**
   * POST /api/v1/receipts/scan
   * Scan a receipt image and extract products
   */
  router.post('/scan', upload.single('receipt'), async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_FILE', message: 'Aucun fichier fourni' },
        });
      }

      console.log(`[Receipts] Scan request from user ${userId}, file size: ${req.file.size} bytes`);

      // Upload to Supabase Storage
      const fileName = `${userId}/${Date.now()}-receipt.jpg`;
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('receipt-scans')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        console.error('[Receipts] Storage upload error:', uploadError);

        // If bucket doesn't exist, try creating with base64
        if (uploadError.message?.includes('not found')) {
          console.log('[Receipts] Bucket not found, using base64 instead');

          // Use base64 directly
          const base64Data = req.file.buffer.toString('base64');
          const service = getReceiptProcessingService();
          const result = await service.processReceiptFromBase64(
            base64Data,
            req.file.mimetype,
            userId
          );
          return res.json(result);
        }

        return res.status(500).json({
          success: false,
          error: { code: 'UPLOAD_ERROR', message: 'Erreur upload image' },
        });
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('receipt-scans')
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // Process the receipt
      const service = getReceiptProcessingService();
      const result = await service.processReceipt(imageUrl, userId);

      // Optionally clean up the image after processing
      // await supabaseAdmin.storage.from('receipt-scans').remove([fileName]);

      return res.json(result);
    } catch (error) {
      console.error('[Receipts] Scan error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Erreur interne',
        },
      });
    }
  });

  /**
   * POST /api/v1/receipts/scan-base64
   * Scan a receipt from base64 image data (alternative endpoint)
   */
  router.post('/scan-base64', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const { image, mimeType = 'image/jpeg' } = req.body;

      if (!image) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_IMAGE', message: 'Image base64 non fournie' },
        });
      }

      console.log(`[Receipts] Scan-base64 request from user ${userId}`);

      // Process the receipt directly from base64
      const service = getReceiptProcessingService();
      const result = await service.processReceiptFromBase64(image, mimeType, userId);

      return res.json(result);
    } catch (error) {
      console.error('[Receipts] Scan-base64 error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Erreur interne',
        },
      });
    }
  });

  /**
   * POST /api/v1/receipts/add-to-inventory
   * Add scanned products to inventory
   */
  router.post('/add-to-inventory', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const userClient = req.supabaseClient;

      if (!userId || !userClient) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const { products, receipt_scan_id } = req.body as AddToInventoryRequest;

      if (!products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PRODUCTS', message: 'Liste de produits invalide' },
        });
      }

      console.log(`[Receipts] Adding ${products.length} products to inventory for user ${userId}`);

      // First, ensure products exist in the products table (create if needed)
      const productResults = [];

      for (const product of products) {
        // Check if product exists or create it
        let productId = product.product_id;

        if (!productId) {
          // Try to find existing product by name
          const { data: existingProduct } = await userClient
            .from('products')
            .select('id')
            .ilike('name', product.name)
            .single();

          if (existingProduct) {
            productId = existingProduct.id;
          } else {
            // Create new product
            const { data: newProduct, error: productError } = await userClient
              .from('products')
              .insert({
                name: product.name,
                category: product.category || 'Autres',
                unit_type: product.unit || 'unite',
                barcode: product.barcode || null,
              })
              .select('id')
              .single();

            if (productError) {
              console.error('[Receipts] Error creating product:', productError);
              continue; // Skip this product
            }
            productId = newProduct.id;
          }
        }

        // Add to inventory
        const inventoryItem = {
          user_id: userId,
          product_id: productId,
          name: product.name,
          quantity: product.quantity || 1,
          expiration_date: product.expiry_date || null,
          location: { zone: product.location || 'placard' } as Json,
          category: product.category || 'Autres',
        };

        const { data: inventoryData, error: inventoryError } = await userClient
          .from('inventory')
          .insert(inventoryItem)
          .select('*, product:products(*)')
          .single();

        if (inventoryError) {
          console.error('[Receipts] Error adding to inventory:', inventoryError);
          continue;
        }

        productResults.push(inventoryData);
      }

      console.log(`[Receipts] Successfully added ${productResults.length} items to inventory`);

      return res.json({
        success: true,
        data: {
          added_count: productResults.length,
          items: productResults,
          receipt_scan_id: receipt_scan_id || null,
        },
      });
    } catch (error) {
      console.error('[Receipts] Add to inventory error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Erreur interne',
        },
      });
    }
  });

  /**
   * GET /api/v1/receipts/history
   * Get user's receipt scan history
   */
  router.get('/history', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      // List files in user's folder in storage
      const { data: files, error } = await supabaseAdmin.storage
        .from('receipt-scans')
        .list(userId, {
          limit: 20,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) {
        console.error('[Receipts] History error:', error);
        return res.status(500).json({
          success: false,
          error: { code: 'STORAGE_ERROR', message: 'Erreur recuperation historique' },
        });
      }

      const history = files.map((file) => ({
        id: file.id,
        name: file.name,
        created_at: file.created_at,
        size: file.metadata?.size,
      }));

      return res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      console.error('[Receipts] History error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Erreur interne',
        },
      });
    }
  });

  return router;
}

export default createReceiptsRouter;
