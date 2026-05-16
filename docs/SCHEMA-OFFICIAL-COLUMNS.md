# Schema Official Columns — Source de vérité

> Verrouillé : 2026-05-08, validé contre la DB prod (Supabase Studio
> `information_schema.columns`).
> Précédent : `docs/J0-SCHEMA-AUDIT.md` (audit du drift).
> Bloque : PRP-221 (Voice Action Agent), tout futur tool qui écrit en
> base.

## Décision J0

**La DB prod est la source de vérité. Elle matche exactement les
migrations versionnées sous `supabase/migrations/`.** Aucun
`ALTER TABLE` non-trackée. Aucun drift côté DB.

Le drift était **uniquement côté code serveur** :
- `apps/api/src/types/supabase.ts` est un fichier écrit à la main qui
  décrit un schéma fictif (avec `is_checked`, `expiration_date`,
  `title`, `prep_time_minutes`, `ingredients JSONB inline`, etc.).
- Les services `ShoppingService`, `InventoryService`, `RecipeService`
  sont codés contre ces types fiction.
- Conséquence : ces services écrivent dans des colonnes qui n'existent
  pas en prod et reçoivent des erreurs Supabase qui sont soit
  ignorées soit pas propagées au front.

## Stratégie d'alignement

### Pour l'assistant agent V1 (PRP-221)
**Repositories dédiés** qui parlent le schéma prod directement, sans
passer par les services drifted. Pattern :
- `apps/api/src/services/assistant/repos/AssistantInventoryRepository.ts`
- `apps/api/src/services/assistant/repos/AssistantShoppingRepository.ts`
- `apps/api/src/services/assistant/repos/AssistantRecipeRepository.ts`

Avec des `Row` / `Insert` / `Update` types **handcrafted contre les
colonnes ci-dessous** (pas via `Database['public']['Tables'][...]` du
fichier fiction).

### Pour le reste de l'app (cleanup ultérieur)
Hors scope de cette PRP : assainir `apps/api/src/types/supabase.ts` +
réécrire ShoppingService / InventoryService / RecipeService. À
trancher après la livraison de l'assistant V1 (ou avant, si on
découvre que les services sont vraiment cassés en prod et bloquent
des features).

## Colonnes officielles par table

> Ces signatures sont la **seule** vérité que les tools de l'assistant
> doivent suivre. Toute divergence est un bug à corriger côté code,
> pas une migration à écrire.

### `public.inventory`

```typescript
interface InventoryRow {
  id: string;                  // uuid, PK, default gen_random_uuid()
  user_id: string;             // uuid, NOT NULL
  product_id: string;          // uuid, NOT NULL, FK → products(id)
  quantity: number;            // numeric, NOT NULL, default 0
  expiry_date: string | null;  // date, nullable
  location: string | null;     // text, nullable
  created_at: string;          // timestamptz, default now()
  updated_at: string;          // timestamptz, default now()
}
```

Rappels :
- Pas de `name`, `category`, `unit` directement — ces infos viennent
  du JOIN sur `products(name, category, unit_type)`.
- Pas de `freshness` ni `expiration_date` (le champ s'appelle
  `expiry_date`).

### `public.shopping_list`

```typescript
interface ShoppingListRow {
  id: string;
  user_id: string;
  product_id: string;             // NOT NULL, FK → products(id)
  quantity: number;               // default 0
  is_purchased: boolean;          // NOT NULL, default false
  priority: number | null;        // default 1
  estimated_price: number | null;
  store_section: string | null;
  created_at: string;
  updated_at: string;
}
```

Rappels :
- C'est `is_purchased`, **pas** `is_checked`.
- Pas de `list_id` ni `shopping_list_id` — la table est plate, scopée
  par `user_id`. Pas de "listes multiples" en V1.
- Pas de `name`, `category`, `unit`, `notes` — viennent du JOIN sur
  `products`.

### `public.products`

```typescript
interface ProductRow {
  id: string;
  name: string;            // NOT NULL
  category: string;        // NOT NULL
  unit_type: string;       // NOT NULL — c'est `unit_type`, pas `unit`
  barcode: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}
```

Rappels :
- Pas de `brand` (l'API types fiction l'a, la prod ne l'a pas).
- `category` et `unit_type` sont **NOT NULL** — toute insertion doit
  fournir une valeur (le ProductResolver de PRP-221 doit catégoriser
  via GPT ou défaulter à `'autres'` / `'unit'`).
- **Pas de `created_by`, `source`, `normalized_name` aujourd'hui.**
  PRP-221 J1 ajoutera ces colonnes via une migration dédiée.

### `public.recipes`

```typescript
interface RecipeRow {
  id: string;
  user_id: string;
  name: string;                          // NOT NULL — pas `title`
  instructions: string;                  // NOT NULL TEXT — pas nullable
  prep_time: number;                     // NOT NULL, default 0 — pas `prep_time_minutes`
  servings: number;                      // NOT NULL, default 1
  cook_time: number | null;              // default 0
  rest_time: number | null;
  difficulty: number | null;             // INTEGER 1-5 — pas string
  is_public: boolean | null;             // default false — pas `is_favorite`
  image_url: string | null;
  description: string | null;
  cuisine_category: string | null;       // varchar — pas `category`
  meal_type: string | null;
  tags: string[] | null;
  source_type: string | null;            // default 'manual'
  source_url: string | null;
  source_name: string | null;            // default 'kannammacooks.com'
  source_platform: string | null;
  source_metadata: Record<string, unknown>;  // jsonb NOT NULL default '{}'
  import_id: string | null;              // uuid, FK → social_recipe_imports(id)
  nutrition_info: Record<string, unknown> | null;  // jsonb
  rating: number | null;
  rating_count: number | null;           // default 0
  original_language: string | null;      // char(2), default 'en'
  translated_title: string | null;
  translated_description: string | null;
  translation_quality_score: number | null;
  allergen_info: Record<string, unknown>;   // jsonb NOT NULL default '{}'
  allergen_warnings: string[] | null;       // text[] default '{}'
  dietary_tags: string[] | null;            // text[] default '{}'
  spice_level: number | null;
  indian_cuisine_type: string | null;
  meal_timing: string | null;
  festival_occasions: string[] | null;
  safety_validated: boolean | null;         // default false
  safety_validated_at: string | null;       // timestamp without time zone
  safety_validator_notes: string | null;
  created_at: string;
  updated_at: string;
}
```

Rappels :
- `name`, **pas** `title`.
- `prep_time` (INTEGER, en minutes), **pas** `prep_time_minutes`.
- `difficulty` est INTEGER 1-5, **pas** string.
- `is_public` (visibilité), **pas** `is_favorite`.
- `cuisine_category` (varchar), pas `category`.
- **Aucune colonne `ingredients` JSONB inline.** Les ingrédients
  vivent dans `recipe_ingredients` (FK → products). Confirmé : 214
  rows en prod.

### `public.recipe_ingredients`

**Surprise importante :** la table est **plus permissive** que ce que les
migrations originelles laissent croire. Le lien vers `products` est
nullable, et le nom de l'ingrédient vit directement sur la row.

```typescript
interface RecipeIngredientRow {
  id: string;                              // uuid, PK, default gen_random_uuid()
  recipe_id: string;                       // uuid, NOT NULL, FK → recipes(id)
  inventory_product_id: string | null;     // ⚠️ NULLABLE — note le nom étrange,
                                           // sans doute FK → products(id)
  ingredient_name: string;                 // varchar, NOT NULL — le nom vit ici,
                                           // pas via JOIN sur products
  quantity: number;                        // numeric, NOT NULL, default 0
  unit: string | null;                     // varchar, nullable
  notes: string | null;                    // text, nullable
  is_essential: boolean | null;            // default true
  order_index: number | null;              // integer pour ordonner
  calories_per_unit: number | null;        // numeric
  nutrition_data: Record<string, unknown> | null;  // jsonb
  created_at: string;
  updated_at: string | null;               // timestamp WITHOUT time zone
}
```

**Conséquences pour les tools de PRP-221 :**

1. **Écrire une recette** ne nécessite **pas** le ProductResolver. INSERT
   direct avec `ingredient_name + unit + quantity`. La FK `inventory_product_id`
   reste null si on ne veut pas (ou peut pas) la résoudre tout de suite.

2. **Lire une recette** : pas de JOIN sur `products`, lecture directe.

3. **`find_cookable_recipes` V1** : ne considère **que les recettes dont
   tous les `recipe_ingredients` ont `inventory_product_id IS NOT NULL`**.
   Les recettes legacy (créées sans product link) sont silencieusement
   exclues. C'est explicite, prévisible, et ça force le ProductResolver
   à devenir le mécanisme de "promotion" d'une recette legacy en recette
   "cuisinable" quand l'utilisateur ré-édite.

4. **`consume_inventory_items` après cuisson** : idem, ne déduit que les
   lignes où `inventory_product_id IS NOT NULL`. Pour les autres, on
   loggue dans `extractionWarnings` et on demande à l'utilisateur de
   linker manuellement.

5. **V1.1 / V2** : ajout d'un fuzzy resolver qui rétro-link
   `ingredient_name` → `products(id)` au moment où l'agent en a besoin.
   Mais pas en V1 — on commence strict.

## Conséquences pour PRP-221

Tools impactés et leur signature corrigée :

### `read_inventory({ filters })`
SQL :
```sql
SELECT i.id, i.product_id, i.quantity, i.expiry_date, i.location,
       p.name, p.category, p.unit_type, p.image_url
FROM public.inventory i
JOIN public.products p ON p.id = i.product_id
WHERE i.user_id = auth.uid()
ORDER BY i.created_at DESC;
```

Output au LLM : flatten le JOIN, expose `name/category/unit_type` à
côté de `quantity/expiry_date`.

### `add_inventory_items({ items: ResolvedItem[] })`
- Pour chaque `ResolvedItem`, le ProductResolver retourne un
  `product_id` (existing ou nouveau).
- INSERT INTO inventory (user_id, product_id, quantity, expiry_date,
  location).
- **Pas** de `name`, `category`, `unit` à passer à inventory — ils
  vivent sur le product déjà résolu.

### `add_shopping_items({ items: ResolvedItem[] })`
- Idem : INSERT INTO shopping_list (user_id, product_id, quantity,
  is_purchased=false, priority?, estimated_price?, store_section?).
- **Pas** de `is_checked`, `list_id`, `name`.

### `mark_shopping_items_bought({ shopping_item_ids[] })`
SQL :
```sql
UPDATE public.shopping_list
   SET is_purchased = true, updated_at = now()
 WHERE id = ANY($1) AND user_id = auth.uid();
```

### `consume_inventory_items({ items: { inventory_id, quantity }[] })`
SQL : UPDATE inventory SET quantity = quantity - $X (avec garde
`quantity >= $X`, sinon escalade en `ask_clarification`).

### `find_cookable_recipes({ max_missing? })`
SQL avec JOIN sur `recipe_ingredients` + `inventory`. **V1 strict** :
ne considère que les recettes dont **tous les ingrédients essentiels
ont `inventory_product_id IS NOT NULL`**. Les recettes legacy sans
product link sont exclues.

```sql
WITH essential_ings AS (
  SELECT recipe_id,
         count(*) AS total_essential,
         count(*) FILTER (WHERE inventory_product_id IS NULL) AS unlinked
  FROM public.recipe_ingredients
  WHERE coalesce(is_essential, true) = true
  GROUP BY recipe_id
)
SELECT r.id, r.name, r.prep_time, r.cook_time, r.image_url,
       count(*) FILTER (WHERE inv.id IS NULL) AS missing_count
  FROM public.recipes r
  JOIN essential_ings e ON e.recipe_id = r.id AND e.unlinked = 0
  JOIN public.recipe_ingredients ri
    ON ri.recipe_id = r.id
   AND coalesce(ri.is_essential, true) = true
  LEFT JOIN public.inventory inv
    ON inv.user_id = auth.uid()
   AND inv.product_id = ri.inventory_product_id
   AND inv.quantity >= ri.quantity
 WHERE r.user_id = auth.uid()
 GROUP BY r.id
HAVING count(*) FILTER (WHERE inv.id IS NULL) <= $1
 ORDER BY missing_count ASC, r.created_at DESC
 LIMIT 20;
```

### Update PRP-221 §5.1 read tools — exemple corrigé
```typescript
interface InventoryItem {
  id: string;
  product_id: string;
  product_name: string;
  category: string;
  unit_type: string;
  image_url: string | null;
  quantity: number;
  expiry_date: string | null;
  location: string | null;
}
```

(au lieu du `name/category/unit` direct sur la row inventory que
les types fiction laissaient croire)

## TODO suite J0

- [ ] Vérifier les colonnes exactes de `recipe_ingredients` (le
      `count = 214` confirme l'existence; le shape complet reste à
      compléter ci-dessus avec `unit`, `notes`, `is_essential`
      éventuels).
- [ ] **Ne pas toucher** `apps/api/src/types/supabase.ts` ni les
      services drifted dans cette PRP — c'est une dette à part.
- [ ] PRP-221 § Sprint 1 : implémenter les 3 repos dédiés
      (`AssistantInventoryRepository`, `AssistantShoppingRepository`,
      `AssistantRecipeRepository`) contre les types ci-dessus.
- [ ] Migration J1 (PRP-221) ajoute uniquement
      `assistant_action_log` + augmentation `products`
      (`normalized_name`, `source`, `created_by`).
