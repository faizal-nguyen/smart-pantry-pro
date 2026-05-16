# PRP-225 - Product Intelligence & OpenFoodFacts

> Statut : **Draft executable - a re-review avant implementation**  
> Date : 2026-05-14  
> Owner : @faizel  
> Dependances : PRP-221 Voice Action Agent, PRP-223 Assistant Memory Foundation, PRP-224/233 Assistant UX  
> Objectif : centraliser la resolution et l'enrichissement produit via OpenFoodFacts, avec cache serveur, audit, nutrition de base et integration assistant.

---

## 0. Decisions prerequises

A cocher dans la description de la PR1 sous `## Decisions PRP-225`.

- [ ] Source externe V1 : OpenFoodFacts uniquement. Pas de Barcode Spider / UPC Database en production V1.
- [ ] OpenFoodFacts est appele **depuis le backend uniquement**. Les appels front legacy sont migres vers une route API interne.
- [ ] Endpoint barcode : API OpenFoodFacts v2 par defaut, v3 seulement apres validation explicite.
- [ ] Recherche nom : utiliser l'endpoint OpenFoodFacts compatible full-text deja present (`cgi/search.pl`) ou v2 search si le cas d'usage exact est valide. Pas de recherche externe en direct a chaque frappe.
- [ ] User-Agent : `SmartPantryPro/<version> (<contact>)`, configure par env serveur.
- [ ] OFF enrichit les produits, mais la base `products` reste la source de verite de l'app.
- [ ] Aucun profil nutrition/sante utilisateur n'est envoye a OpenFoodFacts.
- [ ] Si les decisions restent ouvertes 48h apres lancement, appliquer les recommandations ci-dessus et marquer la PR comme `provisional-off-decisions`.

---

## 1. Resume executif

Quand l'utilisateur dit :

> "Ajoute 4 skyrs vanille, des oeufs et une brique de lait demi-ecreme."

L'application ne doit pas seulement creer des lignes texte. Elle doit resoudre les produits, eviter les doublons, enrichir quand c'est possible et garder une trace de ce qu'elle a decide.

Cette PRP ajoute une couche **Product Intelligence** :

- resolution par nom, alias, fuzzy match et code-barres ;
- enrichissement OpenFoodFacts cote serveur ;
- cache local durable pour eviter les appels repetes ;
- nutrition de base, marque, image, quantite standard, allergenes ;
- score de confiance + source ;
- clarification quand plusieurs produits plausibles existent ;
- integration avec l'assistant vocal sans casser `client_request_id`, `assistant_action_log`, ni l'idempotence PRP-221.

Ce n'est pas encore le coach nutrition complet. C'est la fondation produit qui lui permettra de comprendre ce que l'utilisateur possede vraiment.

---

## 1.1 Etat actuel verifie le 2026-05-14

| Surface | Etat actuel | Implication PRP-225 |
|---|---|---|
| `products` base | `id`, `name`, `category`, `unit_type`, `barcode`, `created_at`, `updated_at` existent depuis `20250803063742_...sql`. | Ne pas re-creer `barcode`. L'ajout doit etre idempotent. |
| `products.image_url` | Ajoute par migration `20250803074432_...sql`. | Ne pas supposer qu'il manque. Utiliser `ADD COLUMN IF NOT EXISTS` si necessaire. |
| PRP-221 produits | `normalized_name`, `source`, `created_by`, `pg_trgm`, `unaccent`, RPC `assistant_fuzzy_search_products`. | Reutiliser `ProductResolver`, ne pas le remplacer brutalement. |
| `ProductResolver` API | `apps/api/src/services/assistant/ProductResolver.ts` fait exact -> fuzzy -> create. | Product Intelligence doit etre une couche autour ou apres lui, pas une regression. |
| Appels OFF front | `src/hooks/useBarcodeAPI.ts` appelle `api/v0/product`, avec fallback UPC Database et logs. | A migrer vers backend en PR4. |
| Scanner legacy | `src/services/scanning/enhancedScannerService.ts` appelle OFF + Barcode Spider + UPC Database cote client. | A consolider ou marquer legacy ; pas de nouveaux appels directs front. |
| Nutrition legacy | `src/services/nutrition/openFoodFactsService.ts` contient un gros service front avec cache memoire 5 min et donnees generiques locales. | A garder temporairement pour recettes, puis brancher vers API interne. |
| Receipt matching | `apps/api/src/services/receipt/productMatcherService.ts` cherche OFF via `cgi/search.pl`, cache memoire 5 min, User-Agent present. | Peut etre migre vers le client OFF serveur commun. |
| Security config | `src/config/security.ts` whiteliste `world.openfoodfacts.org`. | Apres migration backend, verifier si ce whitelist reste necessaire pour images seulement. |

Conclusion : le vrai travail n'est pas "ajouter OpenFoodFacts". C'est **centraliser, cacher, auditer et rendre fiable** ce qui existe deja en plusieurs chemins.

---

## 2. References OpenFoodFacts verifiees

Points a respecter :

- Production : `https://world.openfoodfacts.org`.
- Staging : `https://world.openfoodfacts.net`.
- Les operations READ ne demandent pas d'authentification, mais doivent utiliser un User-Agent custom.
- Le User-Agent doit identifier l'app au format `AppName/Version (ContactEmail)`.
- Les endpoints acceptent un parametre `fields` pour limiter le payload.
- Les donnees sont contributives : incompletes, parfois inexactes, donc toujours afficher source/confiance.
- Les rate limits existent par endpoint. La PRP ne fige pas de chiffre dur : les limites internes doivent etre configurables et conservatrices.

References :

- OpenFoodFacts API intro : https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/
- Tutoriel API v2 product/search : https://openfoodfacts.github.io/openfoodfacts-server/api/tutorial-off-api/
- API v3 product by barcode : https://openfoodfacts.github.io/documentation/docs/Product-Opener/v3/products/get-api-v3-product-code/
- Conditions API / User-Agent / rate limits : https://support.openfoodfacts.org/help/en-gb/12-api-data-reuse/94-are-there-conditions-to-use-the-api

---

## 3. Scope

### Inclus

- Schema `products` enrichi : marque, quantite, nutrition, allergenes, statut d'enrichissement.
- Tables `product_aliases`, `product_enrichment_cache`, `product_resolution_events`.
- Client serveur `OpenFoodFactsClient`.
- Service `ProductIntelligenceService`.
- Normalisation produit FR/EN.
- Resolution barcode + nom.
- Cache serveur durable.
- Endpoints API internes pour scan/enrichissement.
- Integration progressive avec `ProductResolver` et l'assistant.
- Migration des appels front directs vers backend.
- Tests unitaires et integration.

### Exclus V1

- Contribution write vers OpenFoodFacts.
- Upload d'images vers OpenFoodFacts.
- Diagnostic medical ou recommandations sante avancees.
- Objectifs nutrition personnalisables complets.
- Pricing / scrapers magasin.
- Barcode Spider / UPC Database en fallback production.
- Recherche externe en search-as-you-type.
- Vector search produits.
- Refonte UI complete inventaire/recettes.

---

## 4. Principes produit

### 4.1 Base interne source de verite

OpenFoodFacts enrichit. Il ne decide pas seul de l'inventaire utilisateur.

`products` reste la ligne canonique utilisee par :

- `inventory`,
- `shopping_list`,
- `recipe_ingredients`,
- assistant action handlers,
- waste tracking.

### 4.2 Cache first

Un affichage ne doit jamais appeler OpenFoodFacts.

Les appels reseau sont autorises uniquement dans :

- resolution explicite barcode/nom ;
- action "Enrichir" ;
- enrichissement best-effort apres ajout vocal ;
- re-sync manuel ou planifie.

### 4.3 Barcode > alias > local exact > local fuzzy > OFF > create

Pipeline cible :

1. barcode local exact ;
2. alias local ;
3. `normalized_name` exact ;
4. RPC fuzzy `assistant_fuzzy_search_products` ;
5. OpenFoodFacts barcode si barcode present ;
6. OpenFoodFacts search si query exploitable ;
7. clarification si ambigu ;
8. creation produit generique si action simple et details non critiques.

### 4.4 Clarification quand ambigu

Si plusieurs candidats plausibles :

- l'assistant demande une clarification ;
- l'UI propose un choix ;
- l'utilisateur peut choisir "Produit generique".

Exemple :

> "J'ai trouve deux skyrs possibles : nature et vanille. Tu veux lequel ?"

### 4.5 Nutrition prudente

La nutrition sert a :

- afficher des informations utiles ;
- aider des menus bien-etre ;
- adapter des quantites ;
- estimer grossierement des macros.

Elle ne sert pas a :

- diagnostiquer une carence ;
- promettre un resultat medical ;
- remplacer un professionnel de sante.

---

## 5. Schema cible

### 5.1 `products` augmentation

Colonnes existantes a ne pas casser :

- `barcode` existe deja.
- `image_url` existe deja.
- `normalized_name`, `source`, `created_by` sont ajoutes par PRP-221.

Ajouts V1 :

```sql
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS quantity_label TEXT,
  ADD COLUMN IF NOT EXISTS ingredients_text TEXT,
  ADD COLUMN IF NOT EXISTS nutrition_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS allergens_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS off_product_code TEXT,
  ADD COLUMN IF NOT EXISTS off_last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS off_raw_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enrichment_status TEXT NOT NULL DEFAULT 'none'
    CHECK (enrichment_status IN ('none','pending','enriched','ambiguous','failed','stale')),
  ADD COLUMN IF NOT EXISTS enrichment_source TEXT NOT NULL DEFAULT 'none'
    CHECK (enrichment_source IN ('none','openfoodfacts','manual','assistant','barcode_scan')),
  ADD COLUMN IF NOT EXISTS enrichment_confidence NUMERIC NOT NULL DEFAULT 0
    CHECK (enrichment_confidence >= 0 AND enrichment_confidence <= 1);
```

Indexes :

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_unique
  ON public.products(barcode)
  WHERE barcode IS NOT NULL AND barcode <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_off_code_unique
  ON public.products(off_product_code)
  WHERE off_product_code IS NOT NULL AND off_product_code <> '';

CREATE INDEX IF NOT EXISTS idx_products_enrichment_status
  ON public.products(enrichment_status)
  WHERE enrichment_status <> 'none';

CREATE INDEX IF NOT EXISTS idx_products_brand
  ON public.products(brand)
  WHERE brand IS NOT NULL;
```

### 5.2 `product_aliases`

Les alias sont globaux au produit, avec provenance utilisateur/assistant/import.

```sql
CREATE TABLE IF NOT EXISTS public.product_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'user'
    CHECK (source IN ('user','assistant','import','openfoodfacts','receipt')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, normalized_alias)
);

CREATE INDEX IF NOT EXISTS idx_product_aliases_normalized
  ON public.product_aliases(normalized_alias);

CREATE INDEX IF NOT EXISTS idx_product_aliases_product
  ON public.product_aliases(product_id);
```

Pas de `UNIQUE(normalized_alias)` global : un alias simple comme `lait` peut pointer vers plusieurs produits selon marque/type. L'ambiguite se gere au niveau service.

### 5.3 `product_enrichment_cache`

Cache non user-scoped : il ne doit contenir que des donnees produit publiques et des requetes normalisees.

```sql
CREATE TABLE IF NOT EXISTS public.product_enrichment_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'openfoodfacts'
    CHECK (provider IN ('openfoodfacts')),
  cache_key TEXT NOT NULL,
  query TEXT,
  response_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'hit'
    CHECK (status IN ('hit','miss','ambiguous','error')),
  http_status INTEGER,
  error_code TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_product_enrichment_cache_expiry
  ON public.product_enrichment_cache(expires_at);
```

RLS :

- activer RLS ;
- aucune policy `anon` / `authenticated` V1 ;
- acces via service role uniquement.

### 5.4 `product_resolution_events`

Journal user-scoped des resolutions produit.

```sql
CREATE TABLE IF NOT EXISTS public.product_resolution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_input TEXT NOT NULL,
  barcode TEXT,
  resolved_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  method TEXT NOT NULL CHECK (method IN (
    'barcode_local',
    'alias',
    'exact',
    'fuzzy',
    'openfoodfacts_barcode',
    'openfoodfacts_search',
    'manual_create',
    'clarification',
    'failed'
  )),
  confidence NUMERIC NOT NULL DEFAULT 0
    CHECK (confidence >= 0 AND confidence <= 1),
  candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_resolution_events_user_created
  ON public.product_resolution_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_resolution_events_product
  ON public.product_resolution_events(resolved_product_id)
  WHERE resolved_product_id IS NOT NULL;
```

RLS :

- user peut lire ses propres events ;
- inserts/updates serveur uniquement.

### 5.5 Triggers

Utiliser la fonction existante du projet si disponible :

```sql
DROP TRIGGER IF EXISTS trg_product_enrichment_cache_updated_at
  ON public.product_enrichment_cache;

CREATE TRIGGER trg_product_enrichment_cache_updated_at
  BEFORE UPDATE ON public.product_enrichment_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

Si `public.update_updated_at_column()` n'existe pas dans un environnement local, la migration doit la creer de facon idempotente avant le trigger.

---

## 6. Contrat donnees nutrition

Stocker brut + projection normalisee.

### 6.1 Projection minimale

```ts
export interface ProductNutritionProjection {
  per: '100g' | 'serving';
  energyKcal?: number;
  proteinG?: number;
  carbsG?: number;
  sugarG?: number;
  fatG?: number;
  saturatedFatG?: number;
  fiberG?: number;
  saltG?: number;
  nutriScore?: 'a' | 'b' | 'c' | 'd' | 'e' | 'unknown';
  novaGroup?: 1 | 2 | 3 | 4;
}
```

### 6.2 JSON stocke

`nutrition_json` doit contenir :

```json
{
  "source": "openfoodfacts",
  "per100g": {
    "energyKcal": 46,
    "proteinG": 3.3,
    "carbsG": 4.8,
    "sugarG": 4.8,
    "fatG": 1.5,
    "saturatedFatG": 1,
    "fiberG": 0,
    "saltG": 0.1
  },
  "serving": {
    "label": "250 ml",
    "quantity": 250,
    "unit": "ml"
  },
  "scores": {
    "nutriScore": "b",
    "novaGroup": 1,
    "ecoscore": "c"
  },
  "rawFieldVersion": 1
}
```

`allergens_json` doit contenir :

```json
{
  "source": "openfoodfacts",
  "allergensTags": ["en:milk"],
  "tracesTags": [],
  "labelsTags": ["en:organic"]
}
```

---

## 7. Backend cible

### 7.1 Fichiers a creer

```txt
apps/api/src/services/products/OpenFoodFactsClient.ts
apps/api/src/services/products/ProductNormalizer.ts
apps/api/src/services/products/ProductEnrichmentRepository.ts
apps/api/src/services/products/ProductIntelligenceService.ts
apps/api/src/services/products/productTypes.ts
apps/api/src/routes/products.intelligence.ts
apps/api/src/services/products/__tests__/
```

### 7.2 Fichiers a modifier

```txt
apps/api/src/services/assistant/ProductResolver.ts
apps/api/src/services/assistant/handlers/write.ts
apps/api/src/services/receipt/productMatcherService.ts
apps/api/src/routes/index.ts
apps/api/src/types/supabase.ts
src/hooks/useBarcodeAPI.ts
src/services/scanning/enhancedScannerService.ts
src/services/nutrition/openFoodFactsService.ts
src/components/inventory/AddProductDialog.tsx
src/hooks/useImageRecognition.ts
src/components/recipes/RecipeNutrition.tsx
```

Modification de `ProductResolver` : progressive. PR1-PR3 ne doivent pas casser son comportement exact/fuzzy/create actuel.

### 7.3 `OpenFoodFactsClient`

Responsabilites :

- `getProductByBarcode(barcode, options)`;
- `searchProducts(query, options)`;
- mapping API -> `ExternalProductCandidate`;
- User-Agent obligatoire ;
- timeout court ;
- retry limite ;
- rate limiter interne ;
- `fields` toujours explicite ;
- aucun stockage user.

Champs OFF V1 :

```txt
code,
product_name,
generic_name,
brands,
quantity,
image_front_url,
image_url,
categories,
categories_tags,
nutriments,
nutrition_grades,
nutriscore_grade,
nova_group,
ecoscore_grade,
serving_size,
allergens_tags,
traces_tags,
labels_tags,
ingredients_text,
countries_tags,
lang,
last_modified_t
```

Configuration :

```txt
OPENFOODFACTS_BASE_URL=https://world.openfoodfacts.org
OPENFOODFACTS_USER_AGENT=SmartPantryPro/1.0 (contact@smartpantry.app)
OPENFOODFACTS_TIMEOUT_MS=4000
OPENFOODFACTS_RATE_LIMIT_PER_MINUTE=10
```

`OPENFOODFACTS_USER_AGENT` manquant :

- en dev : warning + fallback explicite ;
- en prod : log error et desactiver appels OFF pour eviter un User-Agent generique.

### 7.4 `ProductNormalizer`

Normalise :

- accents ;
- casse ;
- espaces ;
- pluriels simples FR ;
- abreviations (`lait demi ecreme` -> `lait demi-ecreme`) ;
- categories OFF vers categories app ;
- nutriments OFF vers projection app ;
- allergenes/tags.

Exemples V1 :

| Input | Normalise |
|---|---|
| `oeufs` | `oeuf` |
| `lait demi ecreme` | `lait demi-ecreme` |
| `yaourts grecs` | `yaourt grec` |
| `skyrs vanille` | `skyr vanille` |
| `huile olive` | `huile d'olive` |

### 7.5 `ProductEnrichmentRepository`

Responsabilites :

- lire/ecrire `product_enrichment_cache` ;
- lire/ecrire `product_aliases` ;
- mettre a jour `products` ;
- enregistrer `product_resolution_events` ;
- garantir les upserts idempotents.

### 7.6 `ProductIntelligenceService`

Contrat principal :

```ts
type ResolveProductInput = {
  userId: string;
  rawInput?: string;
  name?: string;
  barcode?: string;
  categoryHint?: string;
  unitHint?: string;
  allowExternalLookup?: boolean;
  allowCreate?: boolean;
};

type ResolveProductResult =
  | { kind: 'matched'; product: ProductRow; confidence: number; via: ResolveMethod }
  | { kind: 'created'; product: ProductRow; confidence: number }
  | { kind: 'ambiguous'; candidates: ProductCandidate[]; confidence: number }
  | { kind: 'not_found'; reason: string };
```

Pipeline :

1. barcode local ;
2. alias local ;
3. `ProductResolver.resolve()` exact/fuzzy/create selon options ;
4. OFF barcode ;
5. OFF search ;
6. enrich product ;
7. event log.

Important : si `ProductResolver.resolve()` cree un produit generique, `ProductIntelligenceService` peut ensuite l'enrichir best-effort, mais ne doit pas changer le `product_id` deja utilise par l'action sans journaliser une fusion explicite.

---

## 8. API interne

Toutes les routes sont authentifiees. Les routes write utilisent user session ou service-role selon pattern existant API.

| Methode | Route | Effet |
|---|---|---|
| `GET` | `/api/products/resolve?name=&barcode=` | Resolution simple pour UI/scanner. |
| `POST` | `/api/products/resolve` | Resolution richer pour assistant/receipt, avec options. |
| `GET` | `/api/products/external/search?q=&limit=` | Recherche externe explicite, cachee, jamais search-as-you-type. |
| `POST` | `/api/products/:id/enrich` | Enrichit ou re-sync un produit. |
| `GET` | `/api/products/:id/enrichment` | Retourne statut + source + nutrition. |
| `POST` | `/api/products/:id/aliases` | Ajoute un alias confirme. |

Pagination :

- `external/search` limite par defaut 5, max 10.
- Pas de cursor V1 pour search externe.
- `resolution_events` n'est pas expose V1 sauf debug/admin.

Erreurs :

| Code | Cas |
|---|---|
| `OFF_DISABLED` | User-Agent/prod config manquante ou feature flag OFF off. |
| `OFF_TIMEOUT` | Timeout reseau. |
| `OFF_RATE_LIMITED` | 429 ou limite interne. |
| `PRODUCT_AMBIGUOUS` | Plusieurs candidats plausibles. |
| `PRODUCT_NOT_FOUND` | Rien de fiable. |

---

## 9. Cache et rate limit

### 9.1 Cache keys

```txt
barcode:<normalized_barcode>
search:<locale>:<normalized_query>:<limit>
```

### 9.2 TTL V1

| Resultat | TTL |
|---|---|
| Barcode hit | 30 jours |
| Barcode miss | 24h |
| Search hit | 7 jours |
| Search ambiguous | 24h |
| Erreur reseau | 30 minutes |
| Rate limited | 15 minutes |

### 9.3 Rate limit interne

Objectif : rester conservateur face aux limites publiees par OpenFoodFacts.

V1 :

- max 10 requetes OFF/minute/process par defaut ;
- pas de burst non controle ;
- retry maximum 1 fois sur 429/5xx ;
- backoff court ;
- `Retry-After` respecte si present.

### 9.4 Cache invalidation

Re-sync manuel :

- si `off_last_synced_at` > 30 jours ;
- si utilisateur clique "Mettre a jour" ;
- si produit a `enrichment_status = 'failed'` et dernier essai > 24h.

---

## 10. Integration assistant

### 10.1 Principe

L'assistant peut utiliser Product Intelligence sans modifier le contrat PRP-221.

Ne jamais remplacer :

- `client_request_id`,
- `assistant_action_log`,
- `ActionLogWriter`,
- undo/reversible action,
- risk classification.

### 10.2 Integration handlers

Dans les handlers qui ajoutent des produits :

- `add_inventory_items`,
- `add_shopping_items`,
- flux receipt si applicable.

Apres resolution locale :

1. si barcode ou nom tres clair : tenter enrichissement best-effort ;
2. timeout court, ne pas bloquer la reponse vocale ;
3. si OFF est down : continuer avec produit generique ;
4. enregistrer `product_resolution_events`.

### 10.3 Clarification

Si `ProductIntelligenceService` retourne `ambiguous` :

- tool handler retourne une erreur typable `PRODUCT_AMBIGUOUS` ;
- VoiceAgentService transforme en message de clarification ;
- aucune action write finale ne doit etre executee sans choix utilisateur si le produit impacte fortement l'action.

### 10.4 Tools assistant

Les tools suivants sont ajoutes dans `ToolRegistry` seulement apres PR4 backend stable.

| Tool | Tier | Args | Effet |
|---|---|---|---|
| `search_product_candidates` | read | `{ query, limit? }` | Retourne candidats locaux + OFF caches. |
| `resolve_product_by_barcode` | read | `{ barcode }` | Retourne produit/candidat. |
| `enrich_product` | low | `{ product_id }` | Fetch/cache OFF pour un produit. |
| `confirm_product_candidate` | low | `{ raw_input, product_id, alias? }` | Ajoute alias + event. |

Risk classifier :

- read tools restent read ;
- `enrich_product` low car modifie metadata produit partagable mais reversible non critique ;
- `confirm_product_candidate` low si alias seulement, medium si fusion/merge produit future (hors V1).

---

## 11. Integration UI

### 11.1 Inventaire

Quand un produit est pauvre :

- badge `A completer` ;
- bouton `Enrichir` ;
- source `OpenFoodFacts` si enrichi ;
- source `Produit generique` si non enrichi ;
- image si disponible.

Pas de promesse du type "nutrition certifiee".

### 11.2 Ajout produit / scan barcode

Remplacer les appels front directs par :

```txt
useBarcodeAPI -> /api/products/resolve?barcode=...
enhancedScannerService.fetchProductData -> /api/products/resolve
useImageRecognition barcode path -> /api/products/resolve
```

Si ambigu :

- modal choix produit ;
- option "Produit generique" ;
- option "Creer nouveau".

### 11.3 Recettes / nutrition

`RecipeNutrition.tsx` peut continuer a utiliser ses estimations V1, mais les appels OFF directs doivent etre isoles puis migres vers API interne.

Decision V1 :

- ne pas refondre tout le calcul nutrition recette dans PRP-225 ;
- exposer assez de donnees produit pour PRP nutrition/coaching plus tard.

### 11.4 Assistant

Message exemple :

> "J'ai ajoute le skyr. Je l'ai reconnu comme Skyr vanille, marque X, source OpenFoodFacts. Tu peux corriger si ce n'est pas le bon."

Si donnees externes :

> "Donnees nutritionnelles issues d'OpenFoodFacts, a verifier."

---

## 12. Legacy a consolider

### 12.1 Appels directs interdits apres PRP-225

Apres PR4, ce grep ne doit retourner aucun appel runtime front direct :

```bash
rg -n "world\\.openfoodfacts|api/v0/product|cgi/search\\.pl" src apps/api/src
```

Exceptions autorisees :

- `apps/api/src/services/products/OpenFoodFactsClient.ts`
- tests du client OFF ;
- docs / PRP.

### 12.2 Fallback APIs

Les fallbacks existants :

- UPC Database dans `useBarcodeAPI.ts`,
- Barcode Spider / UPC Database dans `enhancedScannerService.ts`,

ne sont pas retenus en V1 production. Ils peuvent etre :

- supprimes ;
- ou gardes derriere feature flag `PRODUCT_FALLBACK_PROVIDERS_ENABLED=false` ;
- mais ils ne doivent pas etre appeles silencieusement.

---

## 13. PR splitting

### PR1 - Schema + types

Scope :

- migration `products` augmentation ;
- tables `product_aliases`, `product_enrichment_cache`, `product_resolution_events` ;
- RLS/indexes/triggers ;
- types API/DB mis a jour.

Verification :

- migration idempotente ;
- `npx tsc -p tsconfig.json` ;
- tests SQL/RLS si disponibles.

### PR2 - OpenFoodFacts client serveur + cache

Scope :

- `OpenFoodFactsClient` ;
- `ProductNormalizer` ;
- `ProductEnrichmentRepository` cache ;
- tests fetch mockes.

Verification :

- barcode hit ;
- barcode miss ;
- search hit ;
- timeout ;
- 429 ;
- cache hit sans reseau ;
- User-Agent obligatoire.

### PR3 - ProductIntelligenceService

Scope :

- pipeline resolution ;
- alias lookup ;
- update `products` ;
- event log ;
- integration douce avec `ProductResolver` sans changer les handlers.

Verification :

- exact local ;
- alias ;
- fuzzy ;
- OFF barcode ;
- OFF search ambiguous ;
- create generic ;
- events user-scoped.

### PR4 - API routes + migration front scanner

Scope :

- routes `/api/products/*` ;
- `useBarcodeAPI` migre vers backend ;
- `enhancedScannerService` ne fetch plus OFF directement ;
- `useImageRecognition` migre si barcode path actif ;
- cleanup logs bruyants.

Verification :

- scan barcode -> produit resolu ;
- aucun secret/API externe cote client ;
- grep appels OFF direct conforme §12.

### PR5 - Assistant integration

Scope :

- handlers write utilisent Product Intelligence best-effort ;
- ambiguity -> clarification ;
- tools `search_product_candidates`, `resolve_product_by_barcode`, `enrich_product`, `confirm_product_candidate` ;
- cache invalidation via events existants si produit/inventory change.

Verification :

- voice add inventory fonctionne si OFF down ;
- retry `client_request_id` reste idempotent ;
- `assistant_action_log` conserve le bon statut ;
- ambiguous product ne cree pas d'action dangereuse.

### PR6 - UI enrichment light

Scope :

- badges `A completer` / `OpenFoodFacts` ;
- bouton `Enrichir` ;
- modal candidats simple ;
- wording source/confiance.

Verification :

- desktop/mobile ;
- empty/loading/error states ;
- pas de medical wording.

---

## 14. Tests

### Unitaires

- normalisation accents/pluriels ;
- categorie OFF -> categorie app ;
- nutriments OFF -> projection app ;
- barcode cache hit ;
- search cache hit ;
- 429 -> `OFF_RATE_LIMITED` ;
- timeout -> fallback ;
- alias duplicate ignore ;
- confidence scoring.

### Integration API

- `GET /api/products/resolve?barcode=` enrichit si OFF hit ;
- `POST /api/products/resolve` retourne `ambiguous` si candidats proches ;
- `POST /api/products/:id/enrich` met a jour `products` ;
- cache evite deux appels reseau ;
- RLS : user A ne lit pas events user B ;
- cache non user-scoped ne stocke pas de user_id.

### Assistant

- ajout vocal produit connu -> product_id stable ;
- ajout vocal produit inconnu -> create generic + enrichment best-effort ;
- OFF down -> action continue ;
- ambiguous -> clarification ;
- retry meme `client_request_id` -> pas de doublon inventaire/action.

### Front smoke

- `AddProductDialog` scan barcode ;
- scanner mobile ;
- inventaire affiche badge/source ;
- bouton `Enrichir` loading/error/success ;
- `RecipeNutrition` ne casse pas.

Commandes :

```bash
npx tsc -p tsconfig.json
npm run build
npm run test:api -- --runInBand
```

Si `npm run lint` existe au moment de l'implementation, il devient gate obligatoire.

---

## 15. Definition of Done

- `products` supporte marque, quantite, nutrition, allergenes, statut et source d'enrichissement.
- `barcode` et `image_url` existants ne sont pas re-crees de facon destructive.
- Cache serveur durable en place.
- OpenFoodFacts appele depuis backend uniquement.
- User-Agent custom present sur tous les appels OFF.
- Aucun profil utilisateur/sante/envie/menu n'est envoye a OFF.
- `ProductResolver` PRP-221 continue de passer ses tests existants.
- Assistant conserve `client_request_id`, `assistant_action_log`, undo et risk classification.
- Ambiguite produit geree par clarification.
- OFF down ne bloque pas l'ajout inventaire/courses.
- `rg -n "world\\.openfoodfacts|api/v0/product|cgi/search\\.pl" src apps/api/src` ne retourne que le client serveur OFF, tests ou docs.
- `npx tsc -p tsconfig.json` green.
- `npm run build` green.
- Tests API ajoutes pour cache, timeout, ambiguity, idempotence.
- UI affiche clairement `Donnees OpenFoodFacts, a verifier` quand pertinent.

---

## 16. Risques et mitigations

### Donnees externes inexactes

Mitigation :

- source visible ;
- confidence score ;
- produit generique possible ;
- correction/alias utilisateur.

### Rate limits

Mitigation :

- cache ;
- pas de search-as-you-type ;
- rate limiter interne ;
- re-sync manuel limite ;
- `Retry-After` respecte.

### Donnees sensibles

Mitigation :

- pas de profil utilisateur envoye ;
- requete limitee au produit/barcode ;
- cache non user-scoped sans user_id ;
- events user-scoped en RLS.

### Regression assistant

Mitigation :

- Product Intelligence best-effort ;
- pas de changement `assistant_action_log` ;
- tests retry/idempotence ;
- OFF down = fallback local.

### Dette legacy front

Mitigation :

- PR4 dediee ;
- grep obligatoire ;
- ne pas supprimer `RecipeNutrition` tant que PRP nutrition ne le remplace pas.

---

## 17. Non-objectifs

- Pas de write OpenFoodFacts.
- Pas de contribution images/donnees vers OFF.
- Pas de scraping magasin/prix.
- Pas de nutrition coach complet.
- Pas de diagnostic medical.
- Pas de suppression immediate de tout le service nutrition legacy.
- Pas de migration de toutes les recettes.
- Pas de fusion automatique de produits existants.

---

## 18. Questions tranchees

| Question | Decision V1 |
|---|---|
| OFF cote front ou backend ? | Backend uniquement. |
| API v2 ou v3 ? | v2 pour barcode V1, v3 a evaluer plus tard. |
| Search externe as-you-type ? | Non. Recherche explicite seulement. |
| Fallback Barcode Spider/UPC ? | Non en production V1. |
| Cache user-scoped ? | Non, cache produit public uniquement. Events user-scoped. |
| Peut-on continuer si OFF est down ? | Oui, produit generique/local. |
| ProductResolver remplace ? | Non, il est conserve et entoure progressivement. |
| Donnees nutrition fiables ? | Utiles mais contributives, toujours a verifier. |

---

## 19. Backlog V2

- Dedup/fusion produit assistee.
- Jobs cron de re-sync produits stale.
- Moderation des alias utilisateur.
- OFF v3 si besoin de knowledge panels/metadata plus riche.
- Vector search produits.
- Import nutrition depuis plusieurs sources compatibles licences.
- UI correction produit en masse.
- Contribution optionnelle vers OpenFoodFacts avec consentement explicite.

