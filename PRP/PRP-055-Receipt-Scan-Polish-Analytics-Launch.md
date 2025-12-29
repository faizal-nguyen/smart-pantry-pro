# PRP-055: Scan de Ticket - Polish, Analytics & Launch Readiness

**Product**: Smart Pantry Pro
**Feature**: Receipt Scanning - Final Polish & Launch
**Version**: 1.0
**Date**: 21 Octobre 2025
**Status**: 🟢 Ready for Development
**Durée estimée**: 3 jours
**Prérequis**: PRP-050, PRP-051, PRP-052, PRP-053, PRP-054
**Phase**: Launch Readiness (Phase 6/6)

---

## 📌 Objectif

Finaliser la fonctionnalité de scan de tickets pour le lancement : analytics, optimisations performance, onboarding, tests E2E, et documentation utilisateur. Cette PRP transforme un MVP fonctionnel en une feature production-ready.

---

## 🎯 Scope

### ✅ In Scope
- Analytics events complets (tracking user journey)
- Optimisations performance (lazy loading, code splitting)
- Onboarding tooltip "Premier scan"
- Historique des scans (page dédiée)
- Tests E2E Playwright avec vrais tickets
- Error monitoring (Sentry integration)
- Documentation utilisateur (Help Center)
- A/B testing prompt GPT (optionnel)
- Accessibility audit et fixes
- Performance benchmarks

### ❌ Out of Scope
- Partage social des tickets (V2)
- Multi-tickets en parallèle (V2)
- Scan par vidéo (V2)
- Export PDF des scans (V2)

---

## 🏗️ Architecture Analytics

```
┌─────────────────────────────────────────────┐
│  User Journey Tracking                      │
│  ├─ receipt_scan_started                   │
│  ├─ receipt_image_captured                 │
│  ├─ receipt_scan_processing                │
│  ├─ receipt_scan_completed                 │
│  ├─ receipt_products_confirmed             │
│  └─ receipt_scan_failed                    │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  Analytics Aggregation                      │
│  ├─ Daily scans count                      │
│  ├─ Success rate                           │
│  ├─ Avg processing time                    │
│  ├─ Avg products per ticket                │
│  └─ Most scanned stores                    │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  Dashboard (Admin)                          │
│  ├─ Real-time metrics                      │
│  ├─ Cost tracking (GPT API)                │
│  └─ Error rate monitoring                  │
└─────────────────────────────────────────────┘
```

---

## 🛠️ Implémentation

### 1. Service Analytics

Créer `src/services/analytics/receiptAnalytics.ts`:

```typescript
interface ReceiptAnalyticsEvent {
  event_name: string;
  user_id: string;
  timestamp: string;
  properties: Record<string, any>;
}

class ReceiptAnalyticsService {
  private supabase = createClient(/* ... */);

  /**
   * Track un événement
   */
  async track(eventName: string, properties: Record<string, any> = {}) {
    const user = await this.supabase.auth.getUser();

    if (!user.data.user) {
      console.warn('Analytics: No user logged in');
      return;
    }

    const event: ReceiptAnalyticsEvent = {
      event_name: eventName,
      user_id: user.data.user.id,
      timestamp: new Date().toISOString(),
      properties,
    };

    // 1. Envoyer vers Supabase (analytics table)
    await this.supabase.from('analytics_events').insert(event);

    // 2. Optionnel : envoyer vers service tiers (Mixpanel, Amplitude, etc.)
    // await this.sendToMixpanel(event);

    console.log('📊 Analytics:', eventName, properties);
  }

  /**
   * Events spécifiques au scan de tickets
   */
  async trackScanStarted(source: 'camera' | 'gallery') {
    return this.track('receipt_scan_started', { source });
  }

  async trackImageCaptured(fileSize: number, mimeType: string) {
    return this.track('receipt_image_captured', {
      file_size_kb: Math.round(fileSize / 1024),
      mime_type: mimeType,
    });
  }

  async trackScanProcessing(scanId: string) {
    return this.track('receipt_scan_processing', { scan_id: scanId });
  }

  async trackScanCompleted(
    scanId: string,
    productsCount: number,
    processingTimeMs: number,
    store?: string
  ) {
    return this.track('receipt_scan_completed', {
      scan_id: scanId,
      products_count: productsCount,
      processing_time_ms: processingTimeMs,
      store,
    });
  }

  async trackProductsConfirmed(
    scanId: string,
    validatedCount: number,
    editedCount: number,
    deletedCount: number,
    timeToConfirmSeconds: number
  ) {
    return this.track('receipt_products_confirmed', {
      scan_id: scanId,
      validated_count: validatedCount,
      edited_count: editedCount,
      deleted_count: deletedCount,
      time_to_confirm_s: timeToConfirmSeconds,
    });
  }

  async trackScanFailed(errorCode: string, errorMessage: string, retryCount: number) {
    return this.track('receipt_scan_failed', {
      error_code: errorCode,
      error_message: errorMessage,
      retry_count: retryCount,
    });
  }

  /**
   * Récupère les métriques agrégées (admin)
   */
  async getMetrics(startDate: Date, endDate: Date) {
    const { data, error } = await this.supabase.rpc('get_receipt_scan_metrics', {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    });

    if (error) throw error;

    return data;
  }
}

// Singleton
let analyticsInstance: ReceiptAnalyticsService | null = null;

export function getReceiptAnalytics(): ReceiptAnalyticsService {
  if (!analyticsInstance) {
    analyticsInstance = new ReceiptAnalyticsService();
  }
  return analyticsInstance;
}
```

---

### 2. Table Analytics (Migration)

```sql
-- Migration: 004_create_analytics_events.sql

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  properties JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour requêtes fréquentes
CREATE INDEX idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_timestamp ON analytics_events(timestamp DESC);

-- Vue agrégée pour dashboard
CREATE OR REPLACE VIEW receipt_scan_metrics AS
SELECT
  DATE(timestamp) as date,
  COUNT(*) FILTER (WHERE event_name = 'receipt_scan_completed') as scans_count,
  COUNT(*) FILTER (WHERE event_name = 'receipt_scan_failed') as failed_count,
  AVG((properties->>'processing_time_ms')::int) FILTER (WHERE event_name = 'receipt_scan_completed') as avg_processing_time,
  AVG((properties->>'products_count')::int) FILTER (WHERE event_name = 'receipt_scan_completed') as avg_products_count
FROM analytics_events
WHERE event_name LIKE 'receipt_%'
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Fonction pour récupérer les métriques (RPC)
CREATE OR REPLACE FUNCTION get_receipt_scan_metrics(
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  total_scans BIGINT,
  success_rate NUMERIC,
  avg_processing_time NUMERIC,
  avg_products_count NUMERIC,
  top_stores JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE event_name = 'receipt_scan_completed') as total_scans,
    (COUNT(*) FILTER (WHERE event_name = 'receipt_scan_completed')::NUMERIC /
     NULLIF(COUNT(*) FILTER (WHERE event_name IN ('receipt_scan_completed', 'receipt_scan_failed')), 0) * 100
    ) as success_rate,
    AVG((properties->>'processing_time_ms')::int) FILTER (WHERE event_name = 'receipt_scan_completed') as avg_processing_time,
    AVG((properties->>'products_count')::int) FILTER (WHERE event_name = 'receipt_scan_completed') as avg_products_count,
    (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT
          properties->>'store' as store,
          COUNT(*) as count
        FROM analytics_events
        WHERE event_name = 'receipt_scan_completed'
          AND timestamp BETWEEN start_date AND end_date
          AND properties->>'store' IS NOT NULL
        GROUP BY properties->>'store'
        ORDER BY COUNT(*) DESC
        LIMIT 5
      ) t
    ) as top_stores
  FROM analytics_events
  WHERE timestamp BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;
```

---

### 3. Onboarding Tooltip (Premier Scan)

Créer `src/components/receipt/OnboardingTooltip.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';

export function ReceiptScanOnboarding() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà vu l'onboarding
    const hasSeenOnboarding = localStorage.getItem('receipt_scan_onboarding_seen');

    if (!hasSeenOnboarding) {
      setShow(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('receipt_scan_onboarding_seen', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-yellow-500" size={24} />
            <h2 className="text-xl font-bold">Nouveau : Scan de tickets !</h2>
          </div>
          <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex gap-3">
            <div className="text-2xl">📸</div>
            <div>
              <h3 className="font-semibold mb-1">Photographiez votre ticket</h3>
              <p className="text-sm text-gray-600">
                Prenez une photo claire de votre ticket de caisse après vos courses
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="text-2xl">🤖</div>
            <div>
              <h3 className="font-semibold mb-1">L'IA fait le travail</h3>
              <p className="text-sm text-gray-600">
                Tous les produits sont automatiquement reconnus et ajoutés
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="text-2xl">✅</div>
            <div>
              <h3 className="font-semibold mb-1">Validez et c'est fini !</h3>
              <p className="text-sm text-gray-600">
                Vérifiez, ajustez si besoin, et votre inventaire est à jour
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
        >
          Compris, essayer maintenant !
        </button>
      </div>
    </div>
  );
}
```

---

### 4. Page Historique des Scans

Créer `src/pages/ReceiptHistoryPage.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { Calendar, ShoppingBag, TrendingUp } from 'lucide-react';

interface ScanHistoryItem {
  id: string;
  store_name: string;
  scan_date: string;
  products_count: number;
  total_amount: number;
  items_added_count: number;
  created_at: string;
}

export function ReceiptHistoryPage() {
  const supabase = useSupabaseClient();
  const user = useUser();

  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalScans: 0,
    totalProducts: 0,
    totalAmount: 0,
  });

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('receipt_scan_history')
      .select('*')
      .eq('user_id', user.id)
      .eq('scan_status', 'success')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setScans(data);

      // Calculer stats
      const totalScans = data.length;
      const totalProducts = data.reduce((acc, scan) => acc + (scan.products_count || 0), 0);
      const totalAmount = data.reduce((acc, scan) => acc + (scan.total_amount || 0), 0);

      setStats({ totalScans, totalProducts, totalAmount });
    }

    setLoading(false);
  };

  if (loading) {
    return <div className="p-4">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b p-4">
        <h1 className="text-2xl font-bold">Historique des scans</h1>
      </header>

      {/* Stats cards */}
      <div className="p-4 grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-blue-600 mb-1">
            <Calendar size={20} />
          </div>
          <p className="text-2xl font-bold">{stats.totalScans}</p>
          <p className="text-xs text-gray-500">Scans</p>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="text-green-600 mb-1">
            <ShoppingBag size={20} />
          </div>
          <p className="text-2xl font-bold">{stats.totalProducts}</p>
          <p className="text-xs text-gray-500">Produits</p>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="text-purple-600 mb-1">
            <TrendingUp size={20} />
          </div>
          <p className="text-2xl font-bold">{stats.totalAmount.toFixed(2)}€</p>
          <p className="text-xs text-gray-500">Total dépensé</p>
        </div>
      </div>

      {/* Liste des scans */}
      <div className="p-4 space-y-3">
        {scans.map(scan => (
          <div key={scan.id} className="bg-white p-4 rounded-lg border">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold">{scan.store_name || 'Magasin inconnu'}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(scan.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">{scan.total_amount?.toFixed(2)}€</p>
                <p className="text-xs text-gray-500">{scan.products_count} produits</p>
              </div>
            </div>

            {scan.items_added_count > 0 && (
              <div className="mt-2 px-2 py-1 bg-green-50 text-green-700 text-xs rounded inline-block">
                ✅ {scan.items_added_count} ajoutés à l'inventaire
              </div>
            )}
          </div>
        ))}

        {scans.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>Aucun scan pour le moment</p>
            <p className="text-sm">Scannez votre premier ticket pour commencer !</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### 5. Tests E2E Playwright

Créer `tests/e2e/receipt-scan.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Receipt Scan Flow', () => {
  test('should complete full scan flow with mock image', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // 2. Navigate to receipt scanner
    await page.goto('/receipt-scan');
    await expect(page.getByText('Scanner un ticket')).toBeVisible();

    // 3. Upload mock receipt image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/fixtures/receipt-carrefour.jpg');

    // 4. Preview should appear
    await expect(page.getByText('Vérifiez votre photo')).toBeVisible();

    // 5. Confirm and start scan
    await page.click('button:has-text("Analyser")');

    // 6. Wait for processing
    await expect(page.getByText('Analyse en cours')).toBeVisible();

    // 7. Wait for products confirmation page (timeout 30s)
    await expect(page.getByText('produits détectés')).toBeVisible({ timeout: 30000 });

    // 8. Verify products are displayed
    const productCards = page.locator('.product-card');
    await expect(productCards).toHaveCountGreaterThan(0);

    // 9. Confirm all products
    await page.click('button:has-text("Tout valider")');

    // 10. Should redirect to inventory with success message
    await expect(page).toHaveURL(/\/inventory/);
    await expect(page.getByText('produits ajoutés')).toBeVisible();
  });

  test('should handle scan error gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/receipts/scan', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'SCAN_FAILED',
            message: 'Impossible de lire le ticket',
            retry_allowed: true,
          },
        }),
      });
    });

    await page.goto('/receipt-scan');

    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/fixtures/receipt-bad-quality.jpg');

    await page.click('button:has-text("Analyser")');

    // Should show error
    await expect(page.getByText('Oups, une erreur est survenue')).toBeVisible();
    await expect(page.getByText('Impossible de lire le ticket')).toBeVisible();

    // Retry button should be present
    await expect(page.getByRole('button', { name: /Réessayer/i })).toBeVisible();
  });
});
```

---

### 6. Performance Optimizations

```typescript
// Lazy loading des composants lourds
import { lazy, Suspense } from 'react';

const ReceiptScanner = lazy(() => import('@/components/receipt/ReceiptScanner'));
const ReceiptConfirmPage = lazy(() => import('@/pages/ReceiptConfirmPage'));

// Dans le router
<Route
  path="/receipt-scan"
  element={
    <Suspense fallback={<LoadingSpinner />}>
      <ReceiptScanner />
    </Suspense>
  }
/>
```

**Code splitting** dans `vite.config.ts`:

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'receipt-scan': [
            './src/components/receipt/ReceiptScanner',
            './src/hooks/useReceiptScanner',
            './src/services/vision/gptVisionService',
          ],
        },
      },
    },
  },
});
```

---

### 7. Accessibility Improvements

```typescript
// Dans CameraCapture.tsx
<button
  onClick={handleCamera}
  aria-label="Prendre une photo du ticket de caisse"
  className="..."
>
  <Camera size={24} aria-hidden="true" />
  Prendre une photo
</button>

// Dans ProductCard.tsx
<div
  role="article"
  aria-label={`Produit: ${product.normalized_name}, ${product.quantity} ${product.unit}, ${product.price} euros`}
>
  {/* ... */}
</div>

// Keyboard navigation
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
    if (e.key === 'Enter' && e.ctrlKey) {
      onConfirm();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## ✅ Definition of Done (Launch Criteria)

### Must-Have (Blockers)
- [ ] Taux de réussite scan ≥ 80% sur 50 tickets réels testés
- [ ] Temps de traitement ≤ 10s (p95)
- [ ] Zero critical bugs (blocker/critical severity)
- [ ] Analytics events tous fonctionnels
- [ ] Accessibility score ≥ 90 (Lighthouse)
- [ ] Tests E2E passent (100% success rate)
- [ ] Documentation utilisateur publiée
- [ ] Error monitoring configuré (Sentry/LogRocket)

### Should-Have
- [ ] Onboarding tooltip implémenté
- [ ] Historique des scans fonctionnel
- [ ] Performance benchmarks atteints
- [ ] OpenFoodFacts match rate ≥ 70%
- [ ] Mobile Safari testé et validé

### Nice-to-Have
- [ ] A/B test prompt GPT configuré
- [ ] Admin dashboard metrics
- [ ] Export analytics CSV

---

## 📊 Performance Benchmarks

| Métrique | Target | Mesure |
|----------|--------|--------|
| **Bundle size** (receipt-scan chunk) | < 150KB | |
| **First paint** ReceiptScanner | < 1s | |
| **Upload time** (image 5MB) | < 3s | |
| **GPT Vision response** | < 5s (p50) | |
| **Total flow** (capture → confirmation) | < 15s | |

---

## 🧪 Tests de Validation

### Test 1: 50 Tickets Réels

Tester avec tickets de:
- Carrefour (10 tickets)
- Leclerc (10 tickets)
- Lidl (10 tickets)
- Auchan (10 tickets)
- Bio/Monoprix (10 tickets)

**Critères de succès**:
- Taux reconnaissance ≥ 80%
- Magasin correctement identifié ≥ 90%
- Prix total exact ≥ 85%

### Test 2: Edge Cases

- Ticket froissé
- Ticket avec reflet
- Ticket en noir et blanc
- Ticket multipage (facture)
- Ticket trop petit (< 400px)

### Test 3: Performance Load

- 100 scans consécutifs (même user)
- Mesurer rate limiting
- Vérifier pas de memory leaks
- Valider cleanup storage (24h)

---

## 📚 Documentation Utilisateur

Créer `docs/user/RECEIPT_SCAN_GUIDE.md`:

```markdown
# Guide : Scanner un Ticket de Caisse

## Comment ça marche ?

1. **Prenez une photo** de votre ticket juste après vos courses
2. **L'IA analyse** automatiquement tous les produits
3. **Validez** et c'est ajouté à votre inventaire !

## Conseils pour un bon scan

✅ **À faire**:
- Posez le ticket à plat sur une surface
- Photographiez dans un endroit bien éclairé
- Assurez-vous que tout le ticket est visible
- Évitez les reflets et ombres

❌ **À éviter**:
- Ticket froissé ou déchiré
- Mauvais éclairage
- Flash qui crée des reflets
- Ticket trop petit dans l'image

## Dépannage

**"Impossible de lire le ticket"**
→ Améliorez l'éclairage et reprenez la photo

**"Traitement trop long"**
→ Vérifiez votre connexion internet

**"Certains produits manquent"**
→ Vous pouvez les ajouter manuellement après

## Questions fréquentes

**Q: Quels magasins sont supportés ?**
R: Tous les supermarchés français (Carrefour, Leclerc, Lidl, Auchan, etc.)

**Q: Que faire si un produit est mal reconnu ?**
R: Vous pouvez l'éditer avant de valider

**Q: Mes données sont-elles sécurisées ?**
R: Oui, les images sont supprimées après 24h et toutes les métadonnées EXIF sont effacées.
```

---

## 📝 Notes d'Implémentation

1. **Analytics**: Ne pas bloquer le flow utilisateur si analytics fail
2. **Error monitoring**: Capturer tous les errors avec contexte
3. **Performance**: Lazy load composants lourds
4. **A11y**: Tester avec lecteur d'écran
5. **Mobile**: Tester sur vrais devices iOS/Android

---

## 🚀 Plan de Lancement

### J-7: Pre-launch
- [ ] Tests E2E sur staging
- [ ] Load testing (100 users simultanés)
- [ ] Documentation review

### J-3: Beta
- [ ] Lancer en beta (10% users)
- [ ] Monitor metrics 24/7
- [ ] Collect feedback

### J-0: Launch
- [ ] Rollout progressif (25% → 50% → 100%)
- [ ] Communication email utilisateurs
- [ ] Post blog/social media

### J+7: Post-launch
- [ ] Review analytics
- [ ] Identify optimizations
- [ ] Plan V2 features

---

**Owner**: Faizal
**Reviewer**: Tech Lead + QA
**Estimation**: 3 jours développeur senior + 1 jour QA
