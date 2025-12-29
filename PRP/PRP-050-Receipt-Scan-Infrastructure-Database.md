# PRP-050: Scan de Ticket - Infrastructure & Database Foundation

**Product**: Smart Pantry Pro
**Feature**: Receipt Scanning Infrastructure
**Version**: 1.0
**Date**: 21 Octobre 2025
**Status**: 🟢 Ready for Development
**Durée estimée**: 2 jours
**Prérequis**: Aucun
**Phase**: Foundation (Phase 1/6)

---

## 📌 Objectif

Mettre en place l'infrastructure de base pour la fonctionnalité de scan de tickets de caisse : schema database, storage Supabase, et configuration environnement.

Cette PRP constitue la **fondation technique** sur laquelle toutes les autres PRPs du scan de tickets viendront s'appuyer.

---

## 🎯 Scope

### ✅ In Scope
- Migration Supabase pour table `receipt_scan_history`
- Extension de table `pantry_items` avec colonnes de traçabilité
- Création bucket Supabase Storage `receipts-temp`
- Configuration Row Level Security (RLS)
- Variables d'environnement pour OpenAI API
- Documentation schema

### ❌ Out of Scope
- Implémentation du service GPT Vision (PRP-051)
- Composants frontend (PRP-053)
- Logique de parsing (PRP-051)
- UI de confirmation (PRP-054)

---

## 🏗️ Database Schema

### 1. Nouvelle Table: `receipt_scan_history`

```sql
-- Migration: 001_create_receipt_scan_history.sql

-- Extension UUID si pas déjà activée
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table principale pour l'historique des scans
CREATE TABLE IF NOT EXISTS receipt_scan_history (
  -- Identifiant
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Image & données du scan
  image_url TEXT,
  image_storage_path TEXT,
  image_deleted_at TIMESTAMP WITH TIME ZONE,

  -- Résultats du scan
  store_name TEXT,
  scan_date DATE,
  total_amount DECIMAL(10,2),
  currency TEXT DEFAULT 'EUR',
  products_count INTEGER DEFAULT 0,
  products_matched_count INTEGER DEFAULT 0,
  products_not_matched_count INTEGER DEFAULT 0,

  -- Métadonnées de traitement
  gpt_model_used TEXT DEFAULT 'gpt-4o-mini',
  gpt_cost_usd DECIMAL(6,4),
  processing_time_ms INTEGER,
  scan_status TEXT NOT NULL DEFAULT 'processing'
    CHECK (scan_status IN ('processing', 'success', 'partial', 'failed')),
  error_code TEXT,
  error_message TEXT,

  -- Actions utilisateur
  confirmed_at TIMESTAMP WITH TIME ZONE,
  items_added_count INTEGER DEFAULT 0,

  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_receipt_history_user_id ON receipt_scan_history(user_id);
CREATE INDEX idx_receipt_history_scan_date ON receipt_scan_history(scan_date DESC);
CREATE INDEX idx_receipt_history_status ON receipt_scan_history(scan_status);
CREATE INDEX idx_receipt_history_created_at ON receipt_scan_history(created_at DESC);

-- Trigger pour updated_at automatique
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_receipt_scan_history_updated_at
  BEFORE UPDATE ON receipt_scan_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Commentaires pour documentation
COMMENT ON TABLE receipt_scan_history IS 'Historique des scans de tickets de caisse avec métadonnées de traitement';
COMMENT ON COLUMN receipt_scan_history.scan_status IS 'Status: processing, success, partial, failed';
COMMENT ON COLUMN receipt_scan_history.gpt_cost_usd IS 'Coût de l''appel GPT Vision en USD';
```

### 2. Extension Table: `pantry_items`

```sql
-- Migration: 002_extend_pantry_items_receipt_tracking.sql

-- Ajout colonnes de traçabilité pour source du produit
ALTER TABLE pantry_items
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual'
  CHECK (source_type IN ('manual', 'barcode', 'receipt', 'assistant', 'import'));

ALTER TABLE pantry_items
ADD COLUMN IF NOT EXISTS receipt_scan_id UUID
  REFERENCES receipt_scan_history(id) ON DELETE SET NULL;

ALTER TABLE pantry_items
ADD COLUMN IF NOT EXISTS openfoodfacts_code TEXT;

ALTER TABLE pantry_items
ADD COLUMN IF NOT EXISTS raw_receipt_name TEXT;

-- Index pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_pantry_items_receipt_scan
  ON pantry_items(receipt_scan_id) WHERE receipt_scan_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pantry_items_source_type
  ON pantry_items(source_type);

-- Commentaires
COMMENT ON COLUMN pantry_items.source_type IS 'Origine du produit: manual, barcode, receipt, assistant, import';
COMMENT ON COLUMN pantry_items.receipt_scan_id IS 'Référence vers le scan de ticket d''origine';
COMMENT ON COLUMN pantry_items.openfoodfacts_code IS 'Code OpenFoodFacts pour enrichissement';
COMMENT ON COLUMN pantry_items.raw_receipt_name IS 'Nom brut extrait du ticket (backup)';
```

---

## 🗄️ Supabase Storage

### Création du Bucket `receipts-temp`

```sql
-- À exécuter dans Supabase Dashboard > Storage > Policies
-- Ou via Supabase CLI

-- 1. Créer le bucket (via UI ou SQL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts-temp',
  'receipts-temp',
  false, -- Privé
  10485760, -- 10MB max
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/heic']
);

-- 2. Politique RLS pour upload
CREATE POLICY "Users can upload their own receipt images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts-temp' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- 3. Politique RLS pour lecture
CREATE POLICY "Users can read their own receipt images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts-temp' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- 4. Politique RLS pour suppression
CREATE POLICY "Users can delete their own receipt images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts-temp' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- 5. Politique RLS pour service_role (cleanup auto)
CREATE POLICY "Service role can delete old receipts"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'receipts-temp');
```

### Structure de Fichiers

```
receipts-temp/
├── {user_id}/
│   ├── {timestamp}-{random}.jpg
│   ├── {timestamp}-{random}.jpg
│   └── ...
```

---

## 🔐 Row Level Security (RLS)

### Policies pour `receipt_scan_history`

```sql
-- Migration: 003_receipt_scan_history_rls.sql

-- Activer RLS
ALTER TABLE receipt_scan_history ENABLE ROW LEVEL SECURITY;

-- Politique SELECT: utilisateurs voient uniquement leurs scans
CREATE POLICY "Users can view their own receipt scans"
ON receipt_scan_history FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Politique INSERT: utilisateurs peuvent créer leurs scans
CREATE POLICY "Users can create their own receipt scans"
ON receipt_scan_history FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Politique UPDATE: utilisateurs peuvent modifier leurs scans
CREATE POLICY "Users can update their own receipt scans"
ON receipt_scan_history FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Politique DELETE: utilisateurs peuvent supprimer leurs scans
CREATE POLICY "Users can delete their own receipt scans"
ON receipt_scan_history FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Politique service_role (backend API)
CREATE POLICY "Service role has full access"
ON receipt_scan_history FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

---

## ⚙️ Configuration Environnement

### Variables d'Environnement

Ajouter dans `.env.example` et `.env.local`:

```bash
# OpenAI Configuration (serveur uniquement, ne PAS exposer côté client)
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_GPT_MODEL=gpt-4o-mini  # ou gpt-4o pour meilleure précision
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.1  # Faible pour consistance

# Supabase Storage
NEXT_PUBLIC_SUPABASE_RECEIPTS_BUCKET=receipts-temp
SUPABASE_RECEIPTS_MAX_SIZE_MB=10
SUPABASE_RECEIPTS_RETENTION_HOURS=24

# Rate Limiting (scans)
RECEIPT_SCAN_RATE_LIMIT_PER_HOUR=10
RECEIPT_SCAN_RATE_LIMIT_PER_DAY=50
```

### Configuration TypeScript

Créer `src/config/receiptScan.ts`:

```typescript
export const receiptScanConfig = {
  storage: {
    bucket: process.env.NEXT_PUBLIC_SUPABASE_RECEIPTS_BUCKET || 'receipts-temp',
    maxSizeMB: parseInt(process.env.SUPABASE_RECEIPTS_MAX_SIZE_MB || '10'),
    retentionHours: parseInt(process.env.SUPABASE_RECEIPTS_RETENTION_HOURS || '24'),
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic'
    ],
  },

  gpt: {
    model: process.env.OPENAI_GPT_MODEL || 'gpt-4o-mini',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.1'),
    timeout: 15000, // 15s
  },

  rateLimit: {
    perHour: parseInt(process.env.RECEIPT_SCAN_RATE_LIMIT_PER_HOUR || '10'),
    perDay: parseInt(process.env.RECEIPT_SCAN_RATE_LIMIT_PER_DAY || '50'),
  },

  processing: {
    minConfidenceScore: 0.6,
    maxRetries: 2,
    retryDelayMs: 1000,
  }
} as const;

export type ReceiptScanConfig = typeof receiptScanConfig;
```

---

## 🧹 Auto-Cleanup Cron Job

### Supabase Edge Function: `cleanup-old-receipts`

Créer `supabase/functions/cleanup-old-receipts/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const retentionHours = 24;
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - retentionHours);

    // 1. Récupérer les scans à nettoyer
    const { data: oldScans, error: fetchError } = await supabaseAdmin
      .from('receipt_scan_history')
      .select('id, image_storage_path')
      .lt('created_at', cutoffDate.toISOString())
      .is('image_deleted_at', null);

    if (fetchError) throw fetchError;

    let deletedCount = 0;

    // 2. Supprimer les images du storage
    for (const scan of oldScans || []) {
      if (scan.image_storage_path) {
        const { error: deleteError } = await supabaseAdmin.storage
          .from('receipts-temp')
          .remove([scan.image_storage_path]);

        if (!deleteError) {
          // 3. Marquer comme supprimé dans la DB
          await supabaseAdmin
            .from('receipt_scan_history')
            .update({ image_deleted_at: new Date().toISOString() })
            .eq('id', scan.id);

          deletedCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount,
        message: `Cleaned up ${deletedCount} old receipt images`
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

### Configuration Cron (Vercel ou Supabase)

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-receipts",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

## 📊 Types TypeScript

Créer `src/types/receiptScan.ts`:

```typescript
export interface ReceiptScanHistory {
  id: string;
  user_id: string;

  // Image
  image_url: string | null;
  image_storage_path: string | null;
  image_deleted_at: string | null;

  // Scan results
  store_name: string | null;
  scan_date: string | null;
  total_amount: number | null;
  currency: string;
  products_count: number;
  products_matched_count: number;
  products_not_matched_count: number;

  // Processing metadata
  gpt_model_used: string;
  gpt_cost_usd: number | null;
  processing_time_ms: number | null;
  scan_status: 'processing' | 'success' | 'partial' | 'failed';
  error_code: string | null;
  error_message: string | null;

  // User actions
  confirmed_at: string | null;
  items_added_count: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface PantryItemWithReceipt {
  id: string;
  source_type: 'manual' | 'barcode' | 'receipt' | 'assistant' | 'import';
  receipt_scan_id: string | null;
  openfoodfacts_code: string | null;
  raw_receipt_name: string | null;
  // ... autres champs pantry_items
}
```

---

## ✅ Definition of Done

- [ ] Migration `receipt_scan_history` exécutée avec succès
- [ ] Migration extension `pantry_items` exécutée
- [ ] Bucket `receipts-temp` créé avec RLS
- [ ] Toutes les policies RLS testées
- [ ] Variables d'environnement documentées
- [ ] Config `receiptScanConfig.ts` créée
- [ ] Types TypeScript définis
- [ ] Edge Function cleanup créée et déployée
- [ ] Documentation technique complétée
- [ ] Tests manuels des policies RLS passés

---

## 🧪 Tests de Validation

### Test 1: Vérifier les Tables

```sql
-- Vérifier existence
SELECT
  tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('receipt_scan_history', 'pantry_items');

-- Vérifier colonnes pantry_items
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'pantry_items'
  AND column_name IN ('source_type', 'receipt_scan_id', 'openfoodfacts_code');
```

### Test 2: Vérifier RLS

```sql
-- En tant qu'utilisateur authentifié
SET ROLE authenticated;
SET request.jwt.claim.sub = 'test-user-uuid';

-- Devrait réussir
INSERT INTO receipt_scan_history (user_id, scan_status)
VALUES ('test-user-uuid', 'processing');

-- Devrait échouer (autre user)
INSERT INTO receipt_scan_history (user_id, scan_status)
VALUES ('other-user-uuid', 'processing');
```

### Test 3: Vérifier Storage Bucket

```typescript
// Test upload basique
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, anonKey);

const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
const { data, error } = await supabase.storage
  .from('receipts-temp')
  .upload(`${userId}/test-${Date.now()}.jpg`, file);

console.log('Upload success:', !error);
```

---

## 📚 Documentation

### README à Créer

Créer `docs/RECEIPT_SCAN_INFRASTRUCTURE.md` avec:
- Architecture database
- Schema reference
- Storage policies
- Configuration guide
- Troubleshooting

---

## 🔗 Dépendances

### Prérequis
- Supabase projet configuré
- Compte OpenAI avec API key
- Permissions admin Supabase

### Prochaines PRPs
- **PRP-051**: Backend GPT Vision Service (dépend de cette PRP)
- **PRP-052**: Storage & Image Processing (dépend de cette PRP)

---

## 📝 Notes d'Implémentation

1. **Ordre d'exécution des migrations**:
   - D'abord `001_create_receipt_scan_history.sql`
   - Ensuite `002_extend_pantry_items_receipt_tracking.sql`
   - Enfin `003_receipt_scan_history_rls.sql`

2. **Sécurité**:
   - Ne JAMAIS exposer `OPENAI_API_KEY` côté client
   - Toujours utiliser `service_role_key` pour les opérations admin
   - Vérifier les RLS policies en environnement de test

3. **Performance**:
   - Les index sont cruciaux pour les queries sur `user_id` et `scan_date`
   - Prévoir un cleanup régulier (cron quotidien)

4. **Coûts**:
   - Storage: ~$0.021/GB (Supabase)
   - GPT-4o-mini: ~$0.15/1M tokens input, ~$0.60/1M tokens output
   - Estimation: $0.005-0.01 par scan

---

**Owner**: Faizal
**Reviewer**: Tech Lead
**Estimation**: 2 jours développeur senior
