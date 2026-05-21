# PRP-239 - Recipe Policy, Ingredient Quality & Chef Agent

> Statut : **DRAFT - pret a challenger**
> Date : 2026-05-21
> Owner : @faizel
> Sources :
> - Discussion produit Faizel/Codex/Claude 2026-05-21
> - Audit local seeds recettes 2026-05-21 (porc, alcool, mirin, sake, vin de riz, Shaoxing, sherry, vin)
> - Retours Claude sur PRP-239 V1
> - PRP-226 Kitchen Recommendation Engine
> - PRP-233 Assistant Surface UX Integration
> - PRP-238 Mobile Foundation V3
>
> Objectif : rendre la bibliotheque de recettes compatible avec les
> contraintes utilisateur (zero porc, zero alcool), ameliorer la reconciliation
> recettes-inventaire, ajouter des filtres par famille/coupe de proteine, et
> transformer l'assistant en vrai chef agent ancre dans la BDD.

---

## 0. Decisions verrouillees

### 0.1 Politique recette

| Sujet | Decision |
|---|---|
| Porc | Remplacement strict. Aucune recette existante ou importee ne doit conserver porc, pork, bacon porc, lard, pancetta, nduja, chorizo porc, jambon, spam, pork belly. |
| Style remplacement porc | Equivalent proche. Exemple : `porc hache` -> `boeuf hache`, `pork belly` -> `boeuf gras` ou `boeuf hache` selon contexte, `jambon` -> `dinde fumee` ou `boeuf fume` selon recette. |
| Alcool | Zero alcool strict. Mirin, sake, vin de riz, vin blanc, vin rouge, Shaoxing, sherry/xeres, brandy, rhum, biere doivent etre remplaces ou supprimes. |
| Style remplacement alcool | Supprimer si possible, sinon substitution contextuelle deterministe. |
| Substitutions alcool | Etendre la table existante `public.ingredient_substitutions`; ne pas creer une table alcool dediee en V1. |
| Faux positifs autorises | `beef bacon`, `former en saucisse`, `sans porc` et textes equivalents ne doivent pas declencher de correction. |
| Provenance | Toute divergence avec la source doit etre tracee via `recipes.recipe_facets.quality_flags`. |

### 0.2 Facettes et filtres

| Sujet | Decision |
|---|---|
| Stockage facettes V1 | JSONB sur `public.recipes.recipe_facets`, pas de table dediee. |
| Raison | Volume actuel modere, read path mobile toujours centre sur `recipes`, pas de JOIN supplementaire. Migration future possible vers table dediee. |
| Granularite filtre proteine | Famille + coupe. Exemple : `poulet` large, `haut_de_cuisse` precis. |
| Vegetarian | Facette deduite par absence de proteine animale et presence de tofu/legumineuses/legumes/oeufs selon cas. |

### 0.3 Assistant chef

| Sujet | Decision |
|---|---|
| Assistant scope | BDD d'abord + idees chef hors bibliotheque. |
| Idees hors BDD | Autorisees par defaut, mais clairement separees et limitees. |
| Preference utilisateur | Utiliser `user_profiles.preferences->'chef_suggest_off_db'`, default logique `true`, pas de toggle UI dans cette PRP. |
| Model routing | Tool-calling/intention sur modele rapide, synthese chef escaladee sur modele qualite quand une recherche recette est executee. |
| Streaming | Inclus dans PR4 via route stream agent dediee, sans casser `/api/assistant/text`. |

### 0.4 Matching ingredients

| Sujet | Decision |
|---|---|
| Specificite ingredient | Canonique + note. Exemple : `concombres coreens ou kirby` -> canonical `concombre`, note conservee. |
| Matching inventaire | Exact canonical, alias, embedding unique >= 0.85, sinon `NULL` + `low_confidence_match`. |
| Ambiguite | Pas de fuzzy si plusieurs candidats. Ambiguite -> pas de lien automatique. |
| Huiles | `huile_neutre` et `huile_olive` restent distinctes. |

---

## 1. Contexte

### 1.1 Pourquoi maintenant

La base contient beaucoup de recettes importees via seeds manuels depuis des
sites asiatiques, moyen-orientaux, americains et autres sources culinaires.
Plusieurs seeds contiennent :

- du porc sous formes directes ou indirectes (`porc`, `pork belly`, `spam`,
  `bacon`, `jambon`, `nduja`, `chorizo`, `pancetta`, `lard`) ;
- de l'alcool de cuisine (`mirin`, `sake`, `vin de riz`, `Shaoxing`, `vin`,
  `sherry`, `xeres`, `biere`) ;
- des ingredients trop specifiques pour matcher l'inventaire (`concombres
  coreens ou kirby`, `oignon doux`, `eau ou bouillon`) ;
- des ingredients basiques non reconnus dans certaines recettes (`oignon`,
  `beurre`, `huile d'olive`, `eau`).

Ces problemes degradent trois surfaces :

- la confiance dans la bibliotheque ;
- les filtres et recommandations ;
- la qualite de l'assistant quand l'utilisateur demande quoi cuisiner avec son
  inventaire.

### 1.2 Etat actuel verifie

- `public.recipes` existe deja avec `source_url`, `source_type`,
  `source_platform`, `source_metadata`, `import_id`.
- `public.recipe_ingredients` porte les ingredients des recettes.
- `public.ingredient_substitutions` existe deja mais reste generaliste.
- `user_profiles.preferences` existe deja en JSONB.
- `apps/api/src/services/imports/SocialImportService.ts` centralise le save
  des recettes importees.
- `apps/api/src/services/assistant/VoiceAgentService.ts` utilise actuellement
  `gpt-4o-mini` par defaut et `gpt-4o` en fallback.
- Le prompt assistant interdit aujourd'hui d'inventer des recettes hors BDD.
- Les recommendations passent par `RecommendationEngine` et
  `CookabilityScorer`, mais sans facettes proteine/coupe.
- `RecipeLibraryTab` filtre surtout par cuisine/tags, pas par proteine.

### 1.3 Exemples concrets a couvrir

Dans `2026-05-21-add-koreanbapsang.sql` :

- `Gungjung Tteokbokki` contient `mirin`.
- `Dakgangjeong` contient `vin de riz` et `mirin`.
- `Kimchijeon` contient `porc hache ou thon`.
- `Yangnyeom Chicken` contient `vin de riz` ou `mirin`.
- `Bibimbap` contient `vin de cuisine`.
- `Kimchi Jjigae` contient `porc belly`.
- `Beoseot Gangjeong` contient `vin de riz` ou `mirin`.
- `Gamja Jorim` contient `vin de riz` ou `mirin`.
- `Oi Kimchi` contient `concombres coreens ou kirby`, qui doit matcher
  `concombre` en inventaire.

Exemples signales par l'utilisateur :

- recette `27c63579-251c-4923-9ed0-90568a3c7e12` : oignon, beurre, huile
  d'olive, eau/bouillon non reconnus correctement ;
- recette `59a32bc3-4d14-417a-b65a-a65c32cb85b2` : `concombre japonais` trop
  specifique, doit etre reconcile avec `concombre`.

---

## 2. Scope

### 2.1 Inclus

- Audit deterministic des seeds et des recettes DB exportees.
- Sanitizer porc/alcool avec whitelist versionnee.
- Manifest de corrections archive en git.
- Correction seeds + migration DB idempotente depuis manifest.
- Hook de sanitization sur les imports futurs.
- Extension de `ingredient_substitutions` pour substitutions de politique.
- Creation de `ingredient_aliases`.
- Backfill `recipe_ingredients.inventory_product_id` via aliases/canonical.
- `recipes.recipe_facets` JSONB pour proteines, coupes, dietary flags,
  quality flags.
- Filtres recettes par famille/coupe de proteine.
- Assistant chef : routing modele, prompt, tools enrichis, streaming.

### 2.2 Exclus

- Refonte visuelle complete de `RecipeDetail`.
- Nouveau workflow UI pour editer manuellement toutes les substitutions.
- Table dediee `recipe_facets` en V1.
- Toggle UI preferences assistant hors BDD.
- Import complet de nouvelles sources recipes.
- Nutrition precise par recette.
- Refonte globale du moteur de recommandations PRP-226.

### 2.3 Non-objectifs

- Ne pas garantir une equivalence culinaire parfaite avec la source originale
  apres substitution.
- Ne pas resoudre tous les problemes d'unites/quantites en une PRP.
- Ne pas autoriser l'assistant a creer automatiquement des recettes hors BDD
  sans conversion explicite.

---

## 3. Architecture cible

### 3.1 Pipeline qualite recette

```
Seeds / DB export / imported draft
  -> RecipeQualityScanner
  -> RecipePolicySanitizer
  -> correction manifest
  -> seed edits + DB migration
  -> recipe_facets.quality_flags
  -> CI guardrail
```

### 3.2 Pipeline import futur

```
SocialImportService.save()
  -> validate ImportedRecipeDraft
  -> RecipeSanitizer.run(draft)
  -> persist sanitized draft history
  -> saveImportedDraftAsRecipe()
  -> recipes.recipe_facets updated
```

La sanitization doit arriver avant l'appel RPC `save_imported_recipe`, pour
eviter que des violations entrent en DB.

### 3.3 Pipeline canonicalisation

```
recipe_ingredients.ingredient_name
  -> normalize token
  -> ingredient_aliases alias match
  -> canonical_name + canonical_note
  -> ProductResolver / inventory product match
  -> inventory_product_id or NULL
```

### 3.4 Pipeline facettes

```
recipe_ingredients canonicalises
  -> RecipeFacetExtractor
  -> protein_families / protein_cuts / dietary_flags
  -> recipes.recipe_facets JSONB
  -> RecipeLibrary filters
  -> assistant tools + RecommendationEngine context
```

### 3.5 Pipeline assistant chef

```
User: "Je peux faire quoi avec des cuisses de poulet ce soir ?"
  -> /api/assistant/text or /api/assistant/text/stream
  -> gpt-4o-mini detects intent + tool call
  -> find_recipes_using_ingredient / suggest_recipes_for_context
  -> facets + inventory + missing ingredients
  -> gpt-4o synthesis chef if recipe tool ran
  -> streamed structured answer
```

---

## 4. Changements schema

### 4.1 `public.recipes`

Migration idempotente :

```sql
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS recipe_facets JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sanitized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sanitization_versions JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_recipes_recipe_facets_gin
  ON public.recipes USING GIN (recipe_facets);
```

Shape cible :

```json
{
  "protein_families": ["poulet", "boeuf"],
  "protein_cuts": ["haut_de_cuisse", "hache"],
  "dietary_flags": ["vegetarien"],
  "quality_flags": ["porc_substituted", "alcohol_removed", "low_confidence_match"],
  "generated_at": "2026-05-21T00:00:00Z",
  "generated_by": "prp-239-v1"
}
```

Regles :

- `quality_flags` est append-only **par convention applicative et migration** :
  toutes les migrations PRP-239 doivent merger les arrays existants avec les
  nouveaux flags, jamais remplacer `recipe_facets` en entier.
- `sanitization_versions` est un objet par domaine/regle, par exemple
  `{"pork.v1":"2026-05-21","alcohol.v1":"2026-05-21"}`. Cela permet
  d'appliquer plus tard `pork.v2` sans rejouer `alcohol.v1`.
- `recipe_facets` ne doit pas contenir de donnees utilisateur sensibles.

### 4.1.1 `public.recipe_corrections_log`

Nouvelle table d'audit/rollback :

```sql
CREATE TABLE IF NOT EXISTS public.recipe_corrections_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  old_value TEXT NOT NULL,
  new_value TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  quality_flag TEXT,
  manifest_version INT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_by TEXT NOT NULL DEFAULT 'prp-239',
  UNIQUE (recipe_id, field, old_value, new_value, rule_id, manifest_version)
);

ALTER TABLE public.recipe_corrections_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipe_corrections_log_read_own"
  ON public.recipe_corrections_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.recipes r
      WHERE r.id = recipe_corrections_log.recipe_id
        AND r.user_id = auth.uid()
    )
  );
```

RLS V1 :

- service role/admin peut inserer ;
- utilisateur authentifie peut lire les corrections de ses propres recettes via
  sub-query correlee `EXISTS`, pas via `JOIN` direct dans la policy ;
- l'index utile sur `recipe_id` est couvert par la contrainte unique
  `(recipe_id, field, old_value, new_value, rule_id, manifest_version)`.

Objectifs :

- expliquer pourquoi une recette diverge de sa source ;
- permettre un rollback cible ;
- eviter de se reposer uniquement sur `recipe_facets.quality_flags`.

### 4.1.2 `public.recipe_policy_skipped_log`

Nouvelle table de review des skips PR1b :

```sql
CREATE TABLE IF NOT EXISTS public.recipe_policy_skipped_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_version INT NOT NULL,
  recipe_id UUID,
  recipe_name TEXT,
  source_url TEXT,
  field TEXT NOT NULL,
  expected_old_value TEXT NOT NULL,
  actual_value TEXT,
  rule_id TEXT NOT NULL,
  reason_skip TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recipe_policy_skipped_log ENABLE ROW LEVEL SECURITY;
```

Cette table complete les `RAISE NOTICE`. Le review PR1b doit inclure un export
lisible de ces skips si la table n'est pas vide.

RLS V1 :

- aucune policy client ;
- service role/admin seulement pour insert/read/export.

### 4.2 `public.ingredient_substitutions`

Etendre la table existante :

```sql
ALTER TABLE public.ingredient_substitutions
  ADD COLUMN IF NOT EXISTS substitution_kind TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS context TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS rule_id TEXT,
  ADD COLUMN IF NOT EXISTS is_policy_rule BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS replacement_components JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_ingredient_substitutions_policy
  ON public.ingredient_substitutions(substitution_kind, context)
  WHERE is_policy_rule = true;
```

Substitutions alcool V1 :

| Alcool | Contexte | Remplacement |
|---|---|---|
| mirin | sauce/marinade | `replacement_components=[vinaigre de riz:3, sucre:1, eau:3]`; `ratio` reste `1.0` |
| mirin | dessert | sirop de riz dilue |
| sake | cuisson/marinade | bouillon dashi ou bouillon leger |
| vin de riz | cuisson/marinade | bouillon leger + pointe vinaigre de riz |
| vin de Shaoxing | stir-fry/sauce | bouillon de poulet + vinaigre de cidre |
| vin blanc | deglacage/sauce | bouillon + jus citron |
| vin rouge | mijote | bouillon corse + vinaigre balsamique |
| sherry/xeres | cuisson | bouillon + vinaigre de cidre |
| biere | pate/sauce | eau gazeuse ou bouillon selon contexte |

Regles :

- `ratio DECIMAL(4,2)` reste reserve aux substitutions simples 1:1, 0.5,
  0.75, etc.
- Les recettes multi-composants (`3:1:3`) utilisent
  `replacement_components`, pas `ratio`.
- Le texte humain complet est conserve dans `notes`.

### 4.3 `public.ingredient_aliases`

Nouvelle table :

```sql
CREATE TABLE IF NOT EXISTS public.ingredient_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias TEXT NOT NULL,
  alias_normalized TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  canonical_name_normalized TEXT NOT NULL,
  canonical_note TEXT,
  kind TEXT NOT NULL DEFAULT 'ingredient',
  locale TEXT NOT NULL DEFAULT 'fr',
  confidence NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (alias_normalized, locale)
);

ALTER TABLE public.ingredient_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingredient_aliases_read_all"
  ON public.ingredient_aliases FOR SELECT
  USING (true);
```

Normalisation :

- Mirror de `products.normalized_name` : `lower(unaccent(trim(value)))`.
- Ne pas utiliser une colonne generated si `unaccent` n'est pas immutable dans
  l'environnement Postgres ; utiliser une colonne normale maintenue par trigger,
  comme `public.products.normalized_name`.
- Le resolver doit toujours lookup sur `alias_normalized`, jamais sur `alias`.

Trigger cible :

```sql
CREATE OR REPLACE FUNCTION public.set_ingredient_alias_normalized()
RETURNS TRIGGER AS $$
BEGIN
  NEW.alias_normalized := lower(unaccent(trim(NEW.alias)));
  NEW.canonical_name_normalized := lower(unaccent(trim(NEW.canonical_name)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ingredient_aliases_normalized
  ON public.ingredient_aliases;

CREATE TRIGGER trg_ingredient_aliases_normalized
  BEFORE INSERT OR UPDATE
  ON public.ingredient_aliases
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ingredient_alias_normalized();
```

Ne pas limiter le trigger avec `UPDATE OF alias, canonical_name` : une future
migration qui modifie `locale`, `kind` ou une autre colonne doit quand meme
rafraichir les colonnes normalisees pour eviter toute desynchronisation
silencieuse.

Aliases de depart :

| Alias | Canonique | Note |
|---|---|---|
| oignon doux | oignon | type doux |
| oignon jaune | oignon | type jaune |
| oignon rouge | oignon | type rouge |
| oignon nouveau | oignon vert | scallion |
| concombres coreens ou kirby | concombre | coreen/kirby accepte |
| concombre japonais | concombre | type japonais |
| eau ou bouillon | eau | bouillon accepte |
| bouillon d'anchois ou eau | eau | bouillon d'anchois accepte |
| huile de cuisson | huile neutre | cuisson haute temperature |
| huile vegetale | huile neutre | cuisson neutre |
| beurre doux | beurre | non sale |
| ail emince | ail | emince |
| gingembre rape | gingembre | rape |
| hauts de cuisse de poulet | haut de cuisse de poulet | coupe poulet |
| cuisses de poulet | cuisse de poulet | coupe poulet |
| pilons de poulet | pilon de poulet | coupe poulet |
| ailes de poulet | aile de poulet | coupe poulet |
| escalope de poulet | blanc de poulet | coupe poulet |
| viande hachee | boeuf hache | default policy |

---

## 5. PR split

| PR | Branche | Sujet | Dependances |
|---|---|---|---|
| PR1a | `feat/prp-239-pr1a-recipe-quality-audit` | Sanitizer + audit + CI guardrail | aucune |
| PR1b | `feat/prp-239-pr1b-policy-data-application` | Manifest application : seeds + migration + import hook | PR1a |
| PR2 | `feat/prp-239-pr2-ingredient-canonicalization` | Aliases + canonicalisation + backfill matching | PR1a recommande, independant data |
| PR3 | `feat/prp-239-pr3-protein-facets-filters` | `recipe_facets` JSONB + filtres UI | PR2 |
| PR4 | `feat/prp-239-pr4-chef-agent-streaming` | Chef agent + model routing + streaming | PR3 |

PR5 alcool dediee est volontairement refusee : les substitutions alcool sont
pliees dans PR1a/PR1b via `ingredient_substitutions` et `RecipePolicySanitizer`.

---

## 6. PR1a - Sanitizer, audit et guardrail

### 6.1 Fichiers

Creer :

- `apps/api/src/services/recipeQuality/policyTypes.ts`
- `apps/api/src/services/recipeQuality/porkRules.ts`
- `apps/api/src/services/recipeQuality/alcoholRules.ts`
- `apps/api/src/services/recipeQuality/whitelist.ts`
- `apps/api/src/services/recipeQuality/RecipePolicySanitizer.ts`
- `apps/api/src/services/recipeQuality/RecipeQualityScanner.ts`
- `apps/api/src/services/recipeQuality/__tests__/RecipePolicySanitizer.test.ts`
- `apps/api/src/services/recipeQuality/__tests__/RecipeQualityScanner.test.ts`
- `scripts/audit-recipe-policy.ts`

Modifier :

- `package.json` pour ajouter script `recipe:policy:audit`
- CI si workflow existant : ajouter guardrail dry-run

### 6.2 Contrat sanitizer

Le sanitizer prend un objet recette generique :

```ts
interface RecipePolicyInput {
  recipeId?: string;
  sourceUrl?: string | null;
  name: string;
  description?: string | null;
  instructions: string[] | string;
  ingredients: Array<{
    name: string;
    quantity?: number | null;
    unit?: string | null;
    notes?: string | null;
    isEssential?: boolean;
  }>;
}
```

Il retourne :

```ts
interface RecipePolicyResult {
  sanitized: RecipePolicyInput;
  changes: Array<{
    ruleId: string;
    field: string;
    oldValue: string;
    newValue: string;
    reason: 'pork_substitution' | 'alcohol_removed' | 'alcohol_substitution';
  }>;
  qualityFlags: string[];
  violationsRemaining: string[];
}
```

### 6.3 Regles porc

Regles initiales :

- `porc hache` -> `boeuf hache`
- `porc hache ou thon` -> `boeuf hache ou thon`
- `pork belly` / `porc belly` -> `boeuf gras`
- `porc gras` -> `boeuf gras`
- `jambon` -> `dinde fumee`
- `spam` -> `boeuf fume`
- `bacon` -> `beef bacon` sauf si deja `beef bacon`
- `lard` -> `graisse de boeuf`
- `lardons` -> `beef bacon` en dés
- `pancetta` -> `beef bacon`
- `nduja` -> `saucisse de boeuf epicee`
- `chorizo` -> `chorizo de boeuf`
- `petit sale` -> `boeuf sale`
- `saucisson sec` -> `saucisson de boeuf`
- `rillettes` -> `effiloche de boeuf`
- `chair a saucisse` -> `boeuf hache assaisonne`
- `saucisse de porc` -> `saucisse de boeuf`

### 6.4 Regles alcool

Regles initiales :

- `mirin` en sauce/marinade -> `melange vinaigre de riz-sucre-eau`
- `sake` -> `bouillon dashi`
- `vin de riz` -> `bouillon leger + vinaigre de riz`
- `vin de cuisine` -> `bouillon leger`
- `vin de Shaoxing` -> `bouillon de poulet + vinaigre de cidre`
- `vin blanc` -> `bouillon + jus de citron`
- `vin rouge` -> `bouillon corse + vinaigre balsamique`
- `sherry` / `xeres` -> `bouillon + vinaigre de cidre`
- `biere` -> `eau gazeuse` si pate, sinon `bouillon`

### 6.5 Whitelist versionnee

`whitelist.ts` doit exporter des entrees typees avec raison obligatoire :

```ts
// All matching runs against normalizePolicyText(input):
// lowercase + unaccent + trim + whitespace collapse.
export const RECIPE_POLICY_WHITELIST = [
  {
    pattern: /(^|[^a-z0-9])beef bacon([^a-z0-9]|$)/,
    reason: 'Allowed non-pork substitute; do not rewrite.',
  },
  {
    pattern: /(^|[^a-z0-9])former en saucisse([^a-z0-9]|$)/,
    reason: 'Verb phrase, not an ingredient.',
  },
  {
    pattern: /(^|[^a-z0-9])sans porc([^a-z0-9]|$)/,
    reason: 'Negative mention, not a violation.',
  },
] as const;
```

Regle Unicode :

- Ne pas utiliser `\b` directement sur le texte brut : les accents FR ne sont
  pas fiables avec `\b` JS.
- Toujours matcher sur texte normalise `lowercase + unaccent + trim + collapse
  whitespace`.

### 6.6 Audit script

`npm run recipe:policy:audit -- --seeds supabase/seeds --out output/recipe-policy-manifest.json`

Sortie manifest :

```json
{
  "version": 1,
  "generated_at": "2026-05-21T00:00:00.000Z",
  "changes": [
    {
      "source_file": "supabase/seeds/2026-05-21-add-koreanbapsang.sql",
      "recipe_name": "Kimchi Jjigae (Ragout de Kimchi)",
      "field": "ingredient_name",
      "old_value": "porc belly",
      "new_value": "boeuf gras",
      "rule_id": "pork.belly.to_beef_fatty",
      "quality_flag": "porc_substituted"
    }
  ],
  "violations_remaining": []
}
```

Stabilite :

- Le manifest doit etre trie deterministiquement :
  `source_file ASC`, `recipe_name ASC`, `field ASC`, `rule_id ASC`,
  `old_value ASC`.
- Le test de stabilite execute deux runs consecutifs sur la meme fixture et
  compare le JSON serialise apres tri.

### 6.7 Tests obligatoires

- `beef bacon` -> no-op.
- `former en saucisse` -> no-op.
- `sans porc` -> no-op.
- `porc hache ou thon` -> `boeuf hache ou thon`.
- `porc belly` -> `boeuf gras`.
- `lardons` -> `beef bacon` en dés.
- `petit sale` -> `boeuf sale`.
- `saucisson sec` -> `saucisson de boeuf`.
- `rillettes` -> `effiloche de boeuf`.
- recette avec porc + Shaoxing -> deux changements dans le bon ordre.
- `mirin` en sauce -> substitution contextuelle.
- `vin de riz ou mirin` -> texte final sans alcool.
- Manifest stable entre deux runs sur memes fixtures.

### 6.8 Acceptance Criteria PR1a

- `npm run test:api -- RecipePolicySanitizer` passe.
- `npm run recipe:policy:audit -- --seeds supabase/seeds --check` detecte les violations actuelles.
- Le guardrail CI peut echouer sur violations non whitelist sans modifier les fichiers.
- Le module ne depend pas de Supabase pour les tests unitaires.

---

## 7. PR1b - Application manifest, seeds, migration DB, import hook

### 7.1 Fichiers

Creer :

- `output/recipe-policy-manifest-v1.json` ou `supabase/seeds/manifests/2026-05-21-recipe-policy-v1.json`
- migration Supabase creee via `supabase migration new recipe_policy_v1`

Modifier :

- seeds concernes dans `supabase/seeds/*.sql`
- `apps/api/src/services/imports/SocialImportService.ts`
- `apps/api/src/services/imports/__tests__/SocialImportService.save.test.ts`
- `apps/api/src/services/imports/saveContract.ts` si necessaire pour porter metadata/flags

### 7.2 Regle manifest-driven

La migration ne doit pas refaire une sanitization dynamique. Elle applique le
manifest archive.

Pour chaque changement :

- matcher par `recipe_id` si present ;
- sinon matcher par `user_id + normalized(name) + source_url` ;
- refuser d'appliquer si le fallback ne retourne pas exactement une recette ;
- verifier que `old_value` est encore present ;
- appliquer `new_value` seulement si la cle `sanitization_versions[domain.vN]`
  n'est pas deja presente ;
- append `quality_flag` dans `recipes.recipe_facets.quality_flags` ;
- inserer une ligne `recipe_corrections_log` ;
- update `sanitized_at` et `sanitization_versions`.

Normalisation fallback :

- `normalized(name)` = `lower(unaccent(trim(name)))` + collapse whitespace.
- Si deux lignes matchent le fallback, skip + log dans
  `recipe_policy_skipped_log`.

### 7.3 Protection modifications utilisateur

Si `old_value` ne matche pas exactement, la migration skip et logge dans un
bloc `RAISE NOTICE` **et** dans `recipe_policy_skipped_log`. Elle ne doit
jamais ecraser un texte modifie manuellement.

Reasons de skip autorisees :

- `recipe_not_found`
- `recipe_match_ambiguous`
- `old_value_not_found`
- `already_applied`
- `field_not_supported`

### 7.4 Import hook

Dans `SocialImportService.save()` :

- valider le draft ;
- passer le draft dans `RecipePolicySanitizer.run()` ;
- persister la version sanitisee comme nouveau draft si changements ;
- appeler `saveImportedDraftAsRecipe()` avec le draft sanitise ;
- ajouter les flags dans `source_metadata` ou `recipe_facets` selon point
  d'ecriture disponible.

### 7.5 Acceptance Criteria PR1b

- Seeds ne contiennent plus de violation porc/alcool non whitelist.
- Migration rejouable sans double correction.
- Manifest archive en git.
- `recipe_corrections_log` contient chaque correction appliquee.
- `recipe_policy_skipped_log` est vide ou exporte/revu explicitement.
- Test import avec `pork belly + mirin` cree une recette sans porc/alcool.
- `quality_flags` contient `porc_substituted` et/ou `alcohol_removed`.
- Les recettes importees apres merge ne peuvent pas contourner la politique.

---

## 8. PR2 - Canonicalisation ingredients et matching inventaire

### 8.1 Fichiers

Creer :

- migration `ingredient_aliases`
- `apps/api/src/services/ingredients/IngredientAliasResolver.ts`
- `apps/api/src/services/ingredients/__tests__/IngredientAliasResolver.test.ts`
- script `scripts/backfill-recipe-ingredient-canonical.ts`

Modifier :

- `scripts/backfill-recipe-ingredient-fk.ts`
- `apps/api/src/services/assistant/ProductResolver.ts` si utile
- RPC `assistant_match_recipe_ingredients_to_inventory` via migration
- `src/hooks/useRecipeInventoryAnalysis.ts` seulement si le contrat RPC change

### 8.2 Strategie matching

Ordre strict :

1. exact `canonical_name` -> un seul candidat ;
2. alias match -> un seul candidat ;
3. embedding similarity >= 0.85 -> un seul candidat ;
4. sinon `NULL` et flag `low_confidence_match`.

Pas de fuzzy si plusieurs candidats.

Embedding :

- Utiliser l'`EmbeddingService` existant, modele `text-embedding-3-small`,
  vecteur 1536 dimensions.
- Reutiliser `public.products.embedding` et RPC
  `assistant_semantic_search_products` pour les produits.
- Ajouter un cache ingredients si necessaire :

```sql
CREATE TABLE IF NOT EXISTS public.ingredient_embeddings (
  ingredient_text TEXT PRIMARY KEY,
  ingredient_text_normalized TEXT NOT NULL,
  embedding vector(1536),
  embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  embedding_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ingredient_embeddings ENABLE ROW LEVEL SECURITY;
```

- Le backfill batch les embeddings et laisse `NULL` si `OPENAI_API_KEY` est
  absente ou si l'appel echoue.
- Budget PR2 : pas de re-embedding massif des produits, seulement ingredients
  candidats non resolus par exact/alias.
- RLS V1 : aucune policy client ; table technique lue/ecrite par backend/service
  role uniquement.

### 8.3 Cas a couvrir

- `oignon doux`, `oignon jaune`, `oignon rouge` -> `oignon`
- `beurre doux` -> `beurre`
- `huile d'olive` reste distinct de `huile neutre`
- `huile vegetale`, `huile de cuisson` -> `huile neutre`
- `eau ou bouillon` -> `eau`
- `bouillon d'anchois ou eau` -> `eau`
- `concombres coreens ou kirby` -> `concombre`
- `concombre japonais` -> `concombre`

### 8.4 Acceptance Criteria PR2

- Les deux recettes signalees par l'utilisateur ont leurs basiques reconcilies.
- Aucun match automatique si deux produits inventaire sont plausibles.
- `low_confidence_match` est ajoute dans `recipe_facets.quality_flags` quand
  le backfill refuse de matcher.
- Tests unitaires couvrent aliases, exact match, ambiguity, embedding mock.

---

## 9. PR3 - Facettes proteine/coupe et filtres UI

### 9.1 Fichiers

Creer :

- `apps/api/src/services/recipes/RecipeFacetExtractor.ts`
- `apps/api/src/services/recipes/__tests__/RecipeFacetExtractor.test.ts`
- script `scripts/backfill-recipe-facets.ts`

Modifier :

- migration ajout `recipes.recipe_facets`
- `apps/api/src/services/recommendations/RecommendationEngine.ts`
- `apps/api/src/services/assistant/handlers/read.ts`
- `apps/api/src/services/assistant/schemas/tools.ts`
- `src/hooks/useUserRecipes.ts`
- `src/components/recipes/tabs/RecipeLibraryTab.tsx`

### 9.2 Taxonomie V1

Familles :

- `poulet`
- `boeuf`
- `agneau`
- `poisson`
- `fruits_de_mer`
- `tofu`
- `oeuf`
- `mixte`

Flags alimentaires :

- `vegetarien`
- `vegan`
- `sans_porcin`
- `sans_alcool`

Regle modele :

- `protein_families` liste uniquement des sources de proteine positives.
- `vegetarien` vit dans `dietary_flags`, pas dans `protein_families`.
- Cote UI, "Vegetarien" est un toggle separe du picker famille proteine.

Coupes poulet :

- `cuisse`
- `haut_de_cuisse`
- `pilon`
- `aile`
- `blanc`
- `escalope`
- `entier`
- `hache`

Coupes boeuf :

- `hache`
- `steak`
- `tranche`
- `jarret`
- `chuck`
- `gras`

Poisson/fruits de mer :

- `saumon`
- `thon`
- `crevette`
- `poisson_blanc`

### 9.3 UX filtres

Sur la bibliotheque recettes :

- conserver le filtre cuisine existant ;
- ajouter un groupe filtre "Proteine" ;
- si `poulet` selectionne, exposer les coupes disponibles dans les resultats ;
- permettre filtres combinables cuisine + proteine + coupe ;
- labels FR lisibles : `Poulet`, `Hauts de cuisse`, `Pilons`, `Boeuf hache`.

### 9.4 Acceptance Criteria PR3

- "Poulet" retourne toutes les recettes poulet.
- "Hauts de cuisse" retourne les recettes avec hauts de cuisse ou equivalent
  canonical.
- "Boeuf hache" retourne les recettes viande hachee/boeuf hache.
- "Vegetarien" exclut viande/poisson/fruits de mer.
- Les tools assistant acceptent famille/coupe en arguments.
- Pas de regression du filtre cuisine.

---

## 10. PR4 - Chef agent, model routing et streaming

### 10.1 Fichiers

Modifier :

- `apps/api/src/routes/assistant.agent.ts`
- `apps/api/src/services/assistant/VoiceAgentService.ts`
- `apps/api/src/services/assistant/schemas/tools.ts`
- `apps/api/src/services/assistant/handlers/read.ts`
- `apps/api/src/services/recommendations/RecommendationEngine.ts`
- `src/components/assistant/AssistantResultDialog.tsx`
- `src/components/assistant/AssistantRecipeProposals.tsx`
- frontend assistant API client si necessaire
- composants assistant stream si route consommee par UI

### 10.2 Routes

Conserver :

- `POST /api/assistant/text`
- `POST /api/assistant/voice`

Ajouter :

- `POST /api/assistant/text/stream`

La route stream doit emettre des SSE compatibles avec le frontend existant :

```text
data: {"type":"delta","text":"..."}

data: {"type":"tool_result","tool":"suggest_recipes_for_context","payload":{...}}

data: {"type":"policy_warning","violations":["alcohol_detected"],"action":"redacted"}

data: {"type":"done","response":{...}}
```

### 10.3 Routing modele

Regle :

- Round intention/tool-calling : modele rapide existant, cap 800 tokens.
- Si aucun tool recette n'est appele : garder synthese courte.
- Si `suggest_recipes_for_context` ou `find_recipes_using_ingredient` est
  appele : synthese chef sur modele qualite, cap 2000 tokens.
- Ne pas escalader pour conversation simple, shopping list, confirmation ou
  actions non culinaires.
- Le round 2 chef doit recevoir explicitement dans son system prompt :
  zero porc, zero alcool, allergies, preferences utilisateur, preference
  `chef_suggest_off_db`, et les `quality_flags` des recettes retournees.

### 10.4 Prompt chef

Remplacer l'interdiction absolue "DO NOT invent recipes" par :

- BDD d'abord.
- Proposer exactement les recettes BDD retournees par tools quand elles sont
  pertinentes.
- Si la BDD est insuffisante et preference `chef_suggest_off_db` active,
  ajouter au maximum 2 idees chef hors bibliotheque.
- Les idees hors BDD doivent respecter zero porc, zero alcool, allergies,
  preferences alimentaires, et ne pas dupliquer une recette BDD equivalente.
- Les idees hors BDD sont marquees `Idees chef hors bibliotheque`.
- En V1, les idees hors BDD sont non actionnables directement : pas de bouton
  "Ajouter a mes recettes". Le CTA peut etre masque ou desactive avec libelle
  "Conversion recette a venir".
- Toute future conversion hors BDD -> recette devra repasser par
  `RecipePolicySanitizer.run()`.

Garde-fou deterministe :

- Le post-check `RecipePolicySanitizer.detectOnly(text)` est active seulement
  quand un tool recette a ete execute et que le round 2 chef est lance.
- Les reponses simples de round 1 sans tool recette ne passent pas par ce
  post-check, afin de permettre les explications pedagogiques du type
  "pourquoi le mirin est exclu" sans redaction abusive.
- La reponse finale complete du round 2 chef passe dans
  `RecipePolicySanitizer.detectOnly(text)` avant envoi final.
- Si violation detectee :
  - route non-streaming : ne pas renvoyer le texte brut ; renvoyer une version
    redactee ou une reponse courte demandant reformulation interne ;
  - route streaming : emettre `policy_warning`, puis `done` avec texte redige
    sans violation.
- Pour les sorties round 2, l'AC "Aucune suggestion porc/alcool" depend de ce
  post-check, pas seulement du prompt.

Structure reponse :

1. phrase resume ;
2. 3 recettes BDD max, chacune 2-3 lignes ;
3. ingredients manquants ou substitutions utiles ;
4. 2 idees hors BDD max, chacune 2-3 lignes ;
5. question finale seulement si necessaire.

### 10.5 Tools enrichis

`find_recipes_using_ingredient` accepte :

```ts
{
  ingredient?: string;
  protein_family?: string;
  protein_cut?: string;
  meal_type?: string;
  max_prep_time?: number;
  limit?: number;
}
```

`suggest_recipes_for_context` accepte :

```ts
{
  query?: string;
  protein_family?: string;
  protein_cut?: string;
  max_prep_time?: number;
  meal_type?: string;
  goal?: string;
  servings?: number;
  limit_per_bucket?: number;
}
```

### 10.6 Acceptance Criteria PR4

- "Je peux faire quoi avec des cuisses de poulet ce soir ?" retourne des
  recettes BDD avec famille `poulet` et coupe `cuisse`/`haut_de_cuisse` si
  disponibles.
- La reponse explique pourquoi chaque recette matche l'inventaire.
- Les ingredients manquants restent concis.
- Idees hors BDD max 2 et clairement separees.
- Aucune suggestion porc/alcool dans les sorties chef issues d'un tool recette.
- Une sortie modele round 2 contenant volontairement `pork belly` ou `mirin`
  est bloquee/redigee par `detectOnly`.
- Route non-streaming continue de fonctionner.
- Route streaming emet deltas + final done.

---

## 11. Tests E2E et fixtures

### 11.1 Fixtures data

Ajouter une fixture SQL minimale pour tests :

- recette avec `pork belly + mirin` ;
- recette poulet haut de cuisse ;
- recette vegetarienne tofu ;
- inventaire avec `oignon`, `beurre`, `huile d'olive`, `eau`, `concombre`,
  `hauts de cuisse de poulet`.

### 11.1.1 Fixture integration mixte obligatoire

Ajouter une recette fixture unique avec :

- une violation porc (`lardons`) ;
- une violation alcool (`vin de Shaoxing`) ;
- un ingredient ambigu (`huile de cuisson`) ;
- un ingredient whitelist (`beef bacon`) ;
- un ingredient specifique (`concombre japonais`).

Ce cas doit traverser PR1a -> PR1b -> PR2 -> PR3 en test integration :

- `lardons` corrige ;
- `vin de Shaoxing` corrige ;
- `beef bacon` conserve ;
- `huile de cuisson` canonicalisee `huile_neutre`, sans matcher
  `huile_olive` ;
- `concombre japonais` canonicalise `concombre`.

### 11.2 Tests API

- `RecipePolicySanitizer.test.ts`
- `RecipeQualityScanner.test.ts`
- `IngredientAliasResolver.test.ts`
- `RecipeFacetExtractor.test.ts`
- `RecommendationEngine.test.ts` enrichi avec facettes
- `VoiceAgentService.test.ts` pour model routing chef
- `assistant.agent.stream.test.ts` si route testable dans harness actuel

### 11.3 Tests frontend

- `RecipeLibraryTab` filtre proteine/coupe.
- Assistant streaming affiche deltas sans casser les cards existantes.
- Les sections BDD et hors bibliotheque sont visuellement distinctes.

### 11.4 Tests assistant policy

- Test unitaire : mock synthese chef renvoie `pork belly` -> response finale
  bloquee/redigee.
- Test unitaire : mock synthese chef renvoie `mirin` -> response finale
  bloquee/redigee.
- Test streaming : violation detectee apres accumulation du texte -> event
  `policy_warning` puis `done` sans violation.

---

## 12. Observabilite

Ajouter logs structures :

- `recipe_policy.sanitized`
- `recipe_policy.violation_blocked`
- `recipe_policy.low_confidence_match`
- `recipe_policy.correction_applied`
- `recipe_policy.correction_skipped`
- `assistant.chef.escalated_model`
- `assistant.chef.off_db_suggestion`
- `assistant.chef.policy_postcheck_blocked`

Champs minimum :

- `user_id` si disponible ;
- `recipe_id` si disponible ;
- `rule_id` ;
- `quality_flags` ;
- `source` (`seed`, `migration`, `import`, `assistant`).

---

## 13. Risques et mitigations

| Risque | Mitigation |
|---|---|
| PR1 trop grosse | Split PR1a outillage et PR1b data. |
| Diff data difficile a review | Manifest archive, review mecanique old/new/rule_id. |
| Ecraser une modification utilisateur | Migration applique seulement si `old_value` exact et version non appliquee. |
| Faux positifs porc/alcool | Whitelist versionnee + tests obligatoires. |
| Import en queue au moment du merge | Sanitizer dans `SocialImportService.save()` + audit periodique possible. |
| Alias trop agressif | Candidat unique obligatoire ; ambiguite -> `NULL`. |
| Huile vegetale matchee huile d'olive | Canonical separe `huile_neutre` vs `huile_olive`. |
| Assistant invente trop | Hors BDD limite a 2, labellise, preference utilisateur, dedupe BDD. |
| Assistant viole porc/alcool malgre prompt | Post-check deterministe `RecipePolicySanitizer.detectOnly()` sur la sortie finale du round 2 chef uniquement. |
| Streaming casse client existant | Nouvelle route stream en parallele, route non-streaming intacte. |
| Cout GPT-4o trop eleve | Escalade seulement apres tool recette. |

---

## 14. Definition of Done globale

- PR1a mergeable seule avec sanitizer/audit/CI.
- PR1b applique manifest seeds + DB sans violation restante.
- PR1b alimente `recipe_corrections_log` et expose les skips via
  `recipe_policy_skipped_log`.
- Toute nouvelle recette importee passe par sanitizer.
- `ingredient_aliases` couvre les basiques et les exemples utilisateur.
- `ingredient_aliases` matche via `alias_normalized`, pas `alias` brut.
- Matching inventaire corrige les deux recettes signalees.
- `recipes.recipe_facets` est backfilled pour toutes les recettes utilisateur seedees.
- Filtres proteine/coupe disponibles dans la bibliotheque recettes.
- Assistant chef repond avec recettes BDD + inventaire + manquants + idees hors
  BDD separees.
- Assistant chef post-check les sorties round 2 contre porc/alcool.
- Route streaming verifiee.
- Logs disponibles pour sanitization, low-confidence matches et escalade chef.

---

## 15. Estimations

| PR | Estimation |
|---|---|
| PR1a sanitizer/audit/CI | 5-7h |
| PR1b data/migration/import hook | 10-14h selon volume manifest |
| PR2 canonicalisation/matching | 6-8h |
| PR3 facettes/filtres | 6-8h |
| PR4 chef agent/streaming | 12-18h |

Total estime : 39-55h focus, avec PR1b dependant fortement du volume de data
a corriger.

---

## 16. Changelog

### V1 - 2026-05-21

- Premiere consolidation Codex apres brainstorming utilisateur.
- Decisions initiales : zero porc, zero alcool, filtres famille+coupe,
  assistant BDD + idees chef.

### V2 - 2026-05-21

- Integre review Claude.
- Split PR1 en PR1a/PR1b.
- Migration manifest-driven.
- `recipe_facets` en JSONB sur `recipes`.
- Substitutions alcool via extension `ingredient_substitutions`.
- Hook import explicite dans `SocialImportService.save()`.
- Routing modele par tool execute.
- Streaming inclus en PR4.
- Ajout tests faux positifs et whitelist versionnee.

### V3 - 2026-05-21

- Corrige schema substitutions multi-composants via `replacement_components`.
- Remplace `sanitization_version INT` par `sanitization_versions JSONB`.
- Ajoute `recipe_corrections_log` et `recipe_policy_skipped_log`.
- Normalise `ingredient_aliases` via `alias_normalized` + trigger style
  `products.normalized_name`.
- Etend les regles porc : lardons, petit sale, saucisson sec, rillettes,
  chair a saucisse.
- Ajoute garde-fou deterministe `detectOnly` sur la sortie chef.
- Clarifie embeddings `text-embedding-3-small` et cache ingredient optionnel.
- Sort `vegetarien` de `protein_families` vers `dietary_flags`.
- Ajoute fixture integration mixte et estimations revisees.

### V3.1 - 2026-05-21

- Retire `UPDATE OF` du trigger `ingredient_aliases` pour eviter toute
  desynchronisation future des colonnes normalisees.
- Ajoute la policy RLS explicite `recipe_corrections_log_read_own` avec
  `EXISTS` correle sur `recipes.user_id`.
- Liste les composants frontend assistant a modifier pour les idees hors BDD
  non actionnables.
- Limite `detectOnly` aux sorties round 2 chef apres tool recette, pour ne pas
  rediger les reponses pedagogiques simples.
