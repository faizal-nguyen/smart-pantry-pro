# J0 — Schema Contract Audit

> Statut : **DRAFT**, attend la confirmation prod.
> Date : 2026-05-08.
> Bloque : PRP-221 (Voice Action Agent), tout futur tool qui écrit
> dans les tables `inventory`, `shopping_list`, `products`, `recipes`.

## Verdict

**Le drift n'est pas seulement "shopping/inventory" — il touche
`recipes` aussi.** Trois sources se contredisent, deux par paire,
aucune triplet aligné.

`apps/api/src/types/supabase.ts` est écrit à la main (pas de marqueur
"auto-generated") et décrit un schéma **différent** de ce que
définissent les migrations versionnées. Les services serveur
(ShoppingService, InventoryService, RecipeService) sont codés contre
ces types-fiction. Le front `src/integrations/supabase/types.ts`
matche les migrations (donc l'API et le front parlent deux schémas
différents pour les mêmes tables).

## Tableau de drift par table

### `inventory`

| Colonne | Migrations DB | Front types.ts | API types/supabase.ts | Service utilise ? |
|---|---|---|---|---|
| `id` | UUID PK | ✅ | ✅ | ✅ |
| `user_id` | UUID NOT NULL | ✅ | ✅ | ✅ |
| `product_id` | UUID FK NOT NULL | ✅ | ✅ | partiel |
| `quantity` | DECIMAL | ✅ | ✅ (number) | ✅ |
| `expiry_date` | DATE | ✅ | ❌ → `expiration_date` | ❌ lit `expiration_date` |
| `expiration_date` | ❌ absent | ❌ absent | ✅ | ✅ |
| `name` | ❌ absent | ❌ absent | ✅ | ✅ |
| `category` | ❌ absent | ❌ absent | ✅ | ✅ |
| `unit` | ❌ absent | ❌ absent | ✅ | ✅ |
| `freshness` | ❌ absent | ❌ absent | ✅ | ✅ |
| `location` | TEXT | ✅ TEXT | ✅ JSONB | ❓ |

### `shopping_list`

| Colonne | Migrations DB | Front types.ts | API types/supabase.ts | Service utilise ? |
|---|---|---|---|---|
| `id` | UUID PK | ✅ | ✅ | ✅ |
| `user_id` | UUID NOT NULL | ✅ | ✅ | ✅ |
| `product_id` | UUID FK NOT NULL | ✅ | ❌ absent | ❌ |
| `quantity` | DECIMAL | ✅ | ✅ | ✅ |
| `is_purchased` | BOOLEAN | ✅ | ❌ → `is_checked` | ❌ écrit `is_checked` |
| `is_checked` | ❌ absent | ❌ absent | ✅ | ✅ écrit |
| `list_id` | ❌ absent | ❌ absent | ✅ | ✅ écrit (`shopping_list_id` aussi vu) |
| `name` | ❌ absent | ❌ absent | ✅ | ✅ écrit |
| `category` | ❌ absent | ❌ absent | ✅ | ✅ écrit |
| `unit` | ❌ absent | ❌ absent | ✅ | ✅ écrit |
| `notes` | ❌ absent | ❌ absent | ✅ | ❓ |
| `priority` | INT (alter) | ✅ | ✅ | ❓ |
| `estimated_price` | DECIMAL (alter) | ✅ | ❓ | ❓ |
| `store_section` | TEXT (alter) | ✅ | ❓ | ❓ |

### `products`

| Colonne | Migrations DB | Front types.ts | API types/supabase.ts |
|---|---|---|---|
| `id` | UUID PK | ✅ | ✅ |
| `name` | TEXT NOT NULL | ✅ | ✅ |
| `category` | TEXT NOT NULL | ✅ string | ✅ string \| null (relax) |
| `unit_type` | TEXT NOT NULL | ✅ | ❌ absent |
| `barcode` | TEXT | ✅ | ✅ |
| `brand` | ❌ absent | ❌ absent | ✅ |
| `image_url` | TEXT (alter) | ✅ | ❌ absent |

### `recipes`

| Colonne | Migrations DB (avec ALTER) | Front types.ts | API types/supabase.ts |
|---|---|---|---|
| `id` | UUID PK | ✅ | ✅ |
| `user_id` | UUID NOT NULL | ✅ | ✅ |
| `name` | TEXT NOT NULL | ✅ | ❌ → `title` |
| `title` | ❌ absent | ❌ absent | ✅ |
| `instructions` | TEXT NOT NULL | ✅ | ❌ TEXT \| null (relax NOT NULL) |
| `prep_time` | INTEGER NOT NULL DEFAULT 0 | ✅ | ❌ → `prep_time_minutes` |
| `prep_time_minutes` | ❌ absent | ❌ absent | ✅ |
| `cook_time` | INTEGER (alter) | ✅ | ❌ absent |
| `servings` | INTEGER NOT NULL DEFAULT 1 | ✅ | ✅ |
| `difficulty` | INTEGER (alter, 1-5) | ✅ | ❌ → `string` |
| `is_public` | BOOLEAN (alter) | ✅ | ❌ → `is_favorite` |
| `is_favorite` | ❌ absent | ❌ absent | ✅ |
| `image_url` | TEXT (alter) | ✅ | ❓ |
| `description` | TEXT (alter) | ✅ | ✅ |
| `cuisine_category` | VARCHAR (alter) | ✅ | ❌ → `category` |
| `category` | ❌ absent | ❌ absent | ✅ |
| `tags` | TEXT[] (alter) | ✅ | ❓ |
| `source_url` | TEXT (alter) | ✅ | ❓ |
| `ingredients` | ❌ (via `recipe_ingredients` FK) | ❌ FK | ✅ JSONB inline ⚠️ |

> **Attention sur `recipes.ingredients`** : l'API types prétend que les
> ingrédients sont JSONB inline. Les migrations utilisent une table
> `recipe_ingredients` séparée (FK vers `products`). C'est l'une des
> divergences les plus graves : code serveur qui lit
> `recipe.ingredients` ne lira jamais rien si la prod suit les
> migrations.

## Conclusion sur l'état réel de la prod

**Inconnu sans confirmation directe.** Il faut runner trois `\d` dans
Supabase Studio sur la base prod (et idéalement sur la base locale
si elle existe). Sans ça on ne peut PAS trancher entre :

- **Hypothèse A** — la prod matche les migrations versionnées. Alors
  `apps/api/src/types/supabase.ts` est une fiction et tous les services
  qui l'utilisent crashent silencieusement (writes ignorés ou erreurs
  500 jamais remontées).
- **Hypothèse B** — la prod matche les API types (qqn a fait des
  `ALTER TABLE` directs en SQL Studio sans les commit). Alors les
  services tournent et c'est le front qui lit du vide quand il
  cherche `expiry_date`, `is_purchased`, `name` (recette), etc.

Les deux hypothèses sont compatibles avec un produit qui "marche un
peu" : si l'utilisateur teste avec quelques recettes manuelles de
base, certaines colonnes communes (`id, user_id, quantity`) suffisent
à donner l'illusion d'un produit fonctionnel.

## Procédure de vérification (à faire AVANT toute décision)

Dans Supabase Studio → SQL Editor, exécuter :

```sql
-- 1. Inventory
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'inventory'
ORDER BY ordinal_position;

-- 2. Shopping list
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'shopping_list'
ORDER BY ordinal_position;

-- 3. Products
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'products'
ORDER BY ordinal_position;

-- 4. Recipes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'recipes'
ORDER BY ordinal_position;

-- 5. Vérification annexe : recipe_ingredients existe-t-elle réellement ?
SELECT count(*) FROM public.recipe_ingredients;
```

Coller les résultats ici (ou dans un PR de réponse) → on aligne.

## Plan une fois la prod connue

### Si Hypothèse A (prod = migrations)

Action : kill `apps/api/src/types/supabase.ts`, régénérer depuis prod
via `supabase gen types typescript --project-id <id> > apps/api/src/types/supabase.ts`,
réécrire ShoppingService / InventoryService / RecipeService pour parler
le vrai schéma (avec FK `product_id`, JOIN sur `products` pour les
champs `name/category/unit_type`).

Effort : ~1 jour. Risque : code mort à supprimer dans tout le serveur,
pas de migration DB à appliquer.

### Si Hypothèse B (prod a dérivé)

Action : créer **une migration de normalisation** qui formalise le
drift en SQL versionné :

```sql
-- supabase/migrations/20260508120000_normalize_inventory_shopping_recipes.sql
-- Purpose: legalize the prod drift discovered in J0 audit so versioned
-- migrations match the actual prod schema. This is a SCHEMA-NORMALIZATION
-- migration, no data changes.

-- inventory
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS freshness NUMERIC,
  ADD COLUMN IF NOT EXISTS expiration_date DATE;

-- (si expiration_date est la colonne réelle, on supprime expiry_date,
--  sinon on garde expiry_date et on supprime expiration_date)
-- Décision : ALIGNE sur ce qui existe vraiment en prod.

-- shopping_list
ALTER TABLE public.shopping_list
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS list_id UUID,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS is_checked BOOLEAN DEFAULT FALSE;

-- products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand TEXT;

-- recipes
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Backfill (si les colonnes legacy ont des valeurs et qu'on veut migrer)
-- UPDATE public.inventory SET expiration_date = expiry_date WHERE expiration_date IS NULL;
-- UPDATE public.shopping_list SET is_checked = is_purchased WHERE ...;
-- UPDATE public.recipes SET title = name WHERE title IS NULL;
-- UPDATE public.recipes SET prep_time_minutes = prep_time WHERE prep_time_minutes IS NULL;

-- Régénérer ensuite src/integrations/supabase/types.ts pour aligner front.
```

Effort : ~0,5 jour migration + ~0,5 jour régénération types front.
Risque : si la prod n'a PAS ces colonnes, on les ajoute (no-op
neutre). Si elle les a, `IF NOT EXISTS` no-op aussi. Migration safe à
re-runner.

### Stratégie hybride (pragmatique)

Pour les **tables que l'agent va toucher en V1** : aligner via la
voie qui se révèle vraie en prod (A ou B selon le `\d`). Pour
`recipes.ingredients` JSONB vs `recipe_ingredients` FK, **on ne
touche pas** dans cette PRP — c'est un débat séparé qui mérite sa
propre PRP.

## Décision attendue de la part du user

1. Run les 5 SELECTs ci-dessus en Supabase Studio.
2. Coller le résultat (ou screenshot).
3. Sur la base de ça, on choisit la stratégie A / B / hybride.
4. **Sortie de J0** : un fichier `docs/SCHEMA-OFFICIAL-COLUMNS.md`
   qui devient la source de vérité pour les futurs tools de PRP-221.

## Ce qui peut continuer en parallèle (non bloquant)

- Test curl Butter Chicken avec un Bearer valide (validation OpenAI).
- Critique de PRP-221 sur des points qui ne dépendent pas du
  schéma : signature des read tools, UX du FAB, format de
  l'`AssistantPlanResponse`.
- Draft des SQL J1 (assistant_action_log, products augmentation) en
  appendix non-mergée — la table `assistant_action_log` est
  indépendante du drift, et l'augmentation `products` est compatible
  avec les deux hypothèses.
