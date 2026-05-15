# PRP-226 - Kitchen Recommendation Engine

> Statut : **Draft pret a challenger**  
> Date : 2026-05-13  
> Owner : @faizel  
> Dependances : PRP-221 Voice Action Agent, PRP-223 Memory Foundation, PRP-225 Product Intelligence  
> Objectif : recommander quoi cuisiner avec l'inventaire reel, les recettes sauvegardees, les dates de peremption, les preferences et le contexte du moment.

---

## 1. Resume executif

Smart Pantry Pro doit repondre a la question centrale :

> "Qu'est-ce que je peux cuisiner maintenant avec ce que j'ai ?"

Cette PRP definit un moteur de recommandations cuisine qui combine :

- inventaire,
- dates de peremption,
- recettes en base,
- imports en attente,
- preferences memoire,
- historique cuisine,
- temps disponible,
- objectif du moment,
- anti-gaspi.

L'objectif n'est pas un moteur IA magique. C'est un moteur hybride :

1. scoring deterministe serveur,
2. read tools pour grounding,
3. LLM pour expliquer, adapter et proposer naturellement.

---

## 2. Probleme a resoudre

L'utilisateur accumule des recettes, produits et sources. Mais quand il ouvre
l'app, il ne veut pas fouiller pendant 15 minutes.

Il veut demander :

- "Qu'est-ce que je peux faire ce soir ?"
- "Propose-moi un menu avec ce qui expire bientot."
- "J'ai 20 minutes."
- "Je veux quelque chose de leger."
- "Fais-moi une version avec ce que j'ai."
- "Il me manque quoi pour cuisiner cette recette ?"

Sans moteur de recommendation :

- l'inventaire reste passif,
- les recettes restent une bibliotheque morte,
- l'assistant risque d'halluciner,
- l'anti-gaspi n'est pas actionnable.

---

## 3. Vision cible

L'utilisateur parle ou ecrit :

> "Qu'est-ce que je peux faire ce soir ?"

L'assistant repond :

> "Je te propose le poulet tandoori, parce que tu as deja le yaourt, le poulet
> et les epices. Il te manque seulement de la coriandre. Sinon, pour eviter de
> jeter les tomates demain, je te propose aussi le saumon coconut makhani."

Chaque suggestion doit avoir :

- recette,
- taux de faisabilite,
- ingredients disponibles,
- ingredients manquants,
- temps,
- raison de recommandation,
- impact anti-gaspi,
- actions rapides : cuisiner, ajouter manquants, planifier, ouvrir recette.

---

## 4. Sources de donnees

### 4.1 Inventaire

Tables :

- `inventory`
- `products`
- enrichissements PRP-225.

Champs utiles :

- product_id,
- quantity,
- unit,
- expiration_date,
- location,
- category.

### 4.2 Recettes

Tables :

- `recipes`
- `recipes_catalog`
- `recipe_ingredients`
- `user_recipes`
- `social_recipe_imports`
- `imported_recipe_drafts`.

Decision :

- `recipes_catalog` reste catalogue seed/curated.
- `user_recipes` indique ce qui est dans la bibliotheque.
- Les imports en attente peuvent etre recommandes seulement dans une section
  "a verifier", pas comme recette fiable.

### 4.3 Memoire

PRP-223 :

- preferences cuisine,
- cuisine style,
- negative preferences,
- cooking journal,
- response style.

### 4.4 Contexte

Contexte temporaire :

- temps disponible,
- nombre de personnes,
- objectif : rapide, anti-gaspi, leger, high-protein, comfort food,
- materiel dispo,
- repas : dejeuner, diner, snack.

---

## 5. Scoring recommandation

Chaque recette obtient un score compose.

```ts
interface RecommendationScore {
  recipeId: string;
  total: number;
  cookability: number;
  expiryUrgency: number;
  preferenceMatch: number;
  timeFit: number;
  nutritionFit: number;
  novelty: number;
  effortFit: number;
  missingPenalty: number;
}
```

### 5.1 Cookability

Mesure :

- ingredients possedes / ingredients requis,
- quantite suffisante si possible,
- substitutions disponibles.

### 5.2 Expiry urgency

Bonus si la recette utilise :

- produits expires aujourd'hui,
- produits expirant dans 1-3 jours,
- produits deja souvent jetes.

### 5.3 Preference match

Bonus si match :

- cuisines preferees,
- high-protein,
- air fryer,
- indien,
- rapide,
- sans creme,
- etc.

Malus si :

- ingredient deteste,
- recette rejetee,
- trop longue,
- trop epicee si preference inverse.

### 5.4 Time fit

Compare temps recette avec contexte.

### 5.5 Novelty

Evite de proposer toujours la meme recette.

### 5.6 Missing penalty

Malus selon :

- nombre d'ingredients manquants,
- importance des ingredients,
- cout estime.

---

## 6. Substitutions intelligentes

V1 doit supporter substitutions simples :

- creme -> lait de coco / yaourt grec,
- coriandre -> persil ou omit,
- poulet thighs -> chicken breast,
- riz -> quinoa / pain / naan,
- piment serrano -> jalapeno / chili flakes.

Sources :

- table existante `ingredient_substitutions` si disponible,
- regles statiques,
- memoire utilisateur,
- LLM uniquement pour expliquer, pas pour ecrire la source de verite.

Tool :

```txt
suggest_substitutions({ recipe_id, missing_ingredients[] })
```

---

## 7. Schema cible

### 7.1 recommendation_events

```sql
CREATE TABLE public.recommendation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_text TEXT,
  context JSONB NOT NULL DEFAULT '{}',
  candidate_count INTEGER NOT NULL DEFAULT 0,
  results JSONB NOT NULL DEFAULT '[]',
  selected_recipe_id UUID,
  accepted BOOLEAN,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 7.2 recipe_recommendation_cache

```sql
CREATE TABLE public.recipe_recommendation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  result_json JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, cache_key)
);
```

Cache court : 5 a 30 minutes, car inventaire change.

### 7.3 recipe_interactions

```sql
CREATE TABLE public.recipe_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'viewed',
    'recommended',
    'accepted',
    'dismissed',
    'cooked',
    'added_missing_to_shopping',
    'planned'
  )),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 8. Services backend

### 8.1 RecommendationEngine

Responsabilites :

- charger inventaire,
- charger recettes candidates,
- calculer scores,
- retourner top N,
- expliquer les raisons brutes.

### 8.2 RecipeCookabilityService

Responsabilites :

- matcher ingredients recette -> inventory products,
- gerer units approximatives,
- identifier manquants,
- identifier substitutions.

### 8.3 AntiWasteScorer

Responsabilites :

- prioriser dates proches,
- utiliser food waste events PRP-222 Phase 5,
- expliquer "utilise X avant demain".

### 8.4 RecommendationExplainer

Utilise LLM pour transformer scores en reponse humaine, mais ne choisit pas les
recettes seul.

---

## 9. Tools assistant

| Tool | Type | Args | Retour |
|---|---|---|---|
| `find_cookable_recipes` | read | `{ max_missing_ingredients?, max_prep_time?, goal? }` | recipes scored |
| `recommend_meals` | read | `{ meal_type?, goal?, time_limit?, servings? }` | recommendations |
| `explain_recipe_fit` | read | `{ recipe_id }` | raisons |
| `adapt_recipe_to_inventory` | read | `{ recipe_id }` | substitutions/adaptation |
| `add_missing_ingredients_to_shopping` | low | `{ recipe_id, ingredient_names[] }` | shopping items |
| `mark_recipe_cooked` | low | `{ recipe_id, feedback? }` | interaction/journal |

---

## 10. UX

### Dans `/assistant`

Reponse sous forme de cartes :

- meilleure option,
- options alternatives,
- "pour anti-gaspi",
- "rapide",
- "plus healthy".

### Dans `/kitchen/recipes`

Ajouter filtres :

- faisable maintenant,
- presque faisable,
- utilise produits a finir,
- rapide.

### Dans `/pantry`

Sur produits proches peremption :

- "Voir recettes pour utiliser".

---

## 11. Data flow

```txt
User asks "quoi cuisiner ce soir"
  -> Assistant read_inventory
  -> RecommendationEngine candidates
  -> score deterministic
  -> LLM explains top 3
  -> assistant message + cards
  -> user taps "cuisiner" or "ajouter manquants"
```

---

## 12. Phases implementation

### Phase 1 - Cookability basics

- matcher ingredients/inventory,
- score cookability,
- API read.

### Phase 2 - RecommendationEngine

- scoring compose,
- anti-gaspi simple,
- cache court,
- event log.

### Phase 3 - Assistant integration

- tools,
- response cards,
- explanations.

### Phase 4 - UI filters

- library filters,
- pantry "recettes pour utiliser".

### Phase 5 - Learning loop

- accepted/dismissed/cooked,
- feed memory PRP-223.

---

## 13. Tests

Unitaires :

- ingredient matching,
- missing ingredients,
- expiry bonus,
- preference malus,
- scoring deterministic.

Integration :

- inventory + recipes -> top recommendations,
- missing -> add to shopping,
- feedback -> interaction event.

Manual QA :

- no inventory,
- lots of inventory,
- no recipes,
- recipe without ingredients,
- near expiry products.

---

## 14. Definition of Done

- L'assistant peut recommander 3 recettes basees sur l'inventaire.
- Chaque recommandation explique pourquoi.
- Les ingredients manquants sont visibles.
- Les produits proches peremption influencent le score.
- Les preferences memoire influencent le score.
- L'utilisateur peut ajouter les manquants a la liste.
- Les interactions sont enregistrees.

---

## 15. Non-objectifs

- Pas de nutrition coach complet.
- Pas d'optimisation prix magasin.
- Pas de generation de nouvelles recettes de zero en source de verite.
- Pas de substitutions complexes avec conversions nutritionnelles exactes.

---

## 16. Questions ouvertes

1. Recommander des recettes externes hors base ?
   - Reco V1 : non, seulement base + imports.
2. Utiliser LLM pour scorer ?
   - Reco : non, score serveur, LLM explique.
3. Cache combien de temps ?
   - Reco : 15 minutes, invalidation sur inventaire/recette.
