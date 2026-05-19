# PRP-227 - Personal Nutrition Coach

> Statut : **DRAFT executable**
> Date : 2026-05-17
> Owner : @faizel
> Sources : PRP-223, PRP-225, PRP-226, PRP-235, audit code local 2026-05-17
> Dependances : PRP-223 Memory Foundation, PRP-225 Product Intelligence, PRP-226 Kitchen Recommendation Engine, PRP-235 Settings/Memory/Nutrition/Data, PRP-237 Visual Redesign
> Objectif : livrer un coach nutrition **bien-etre** prudent, personnalise et connecte a l'inventaire/recettes/recommandations, sans devenir un outil medical ni un compteur calories culpabilisant.

---

## 0. Decisions pre-requises

Ces decisions doivent etre cochees dans la PR1 sous `## Decisions §0 PRP-227`.
Si elles ne sont pas tranchees sous 48h apres ouverture du sprint, appliquer les valeurs recommandees ci-dessous et marquer la PR `provisional/nutrition-v1`.

- [ ] **Positionnement** : coach nutrition bien-etre, pas assistant medical.
  - Recommande : langage prudent, aucune promesse de diagnostic, traitement ou perte de poids garantie.
- [ ] **Donnees sensibles V1** : ne pas demander age, poids, taille, sexe, pathologies ou traitements.
  - Recommande : objectifs qualitatifs + contraintes alimentaires + allergies, avec consentement explicite.
- [ ] **Calories/macros** : optionnelles, saisies manuellement par l'utilisateur, jamais calculees comme cible medicale.
  - Recommande : `target_calories` et `target_protein_g` restent nullable et caches par defaut.
- [ ] **Source recommandations** : PRP-226 `RecommendationEngine` reste la source de scoring.
  - Recommande : le LLM explique et adapte, il ne choisit pas seul les recettes.
- [ ] **Nutrition produits** : PRP-225 fournit `products.nutrition_json`; sans PRP-225, afficher confidence low/unknown.
  - Recommande : PRP-227 PR3 attend PRP-225 PR1-PR4 pour scoring nutrition reel.
- [ ] **Allergies** : `nutrition_profiles.allergies` est la source de verite immediate pour le scoring et le filtrage.
  - Recommande : la memoire `health_sensitive` est creee en parallele pour audit/controle utilisateur, mais le moteur n'attend pas la confirmation de memoire pour appliquer une allergie.
- [ ] **Memoire sensible** : objectifs nutrition/notes/symptomes = `assistant_memory_items` `health_sensitive` candidate ou active selon PRP-223.
  - Recommande : toute info sensible doit etre confirmable/oubliable dans Settings, sans retarder les contraintes de securite issues du profil.
- [ ] **Legacy nutrition** : ne pas exposer `HealthDashboard` / `useNutritionalAI` comme V1.
  - Recommande : les remplacer progressivement par services backend PRP-227.
- [ ] **Daily menus** : V1 genere des menus utiles et approximatifs, pas un plan alimentaire clinique.
  - Recommande : sortie structuree + confidence + shopping delta + disclaimer court.

---

## 1. Resume executif

Smart Pantry Pro doit pouvoir repondre a des demandes comme :

- "Je suis fatigue, je mange quoi avec ce que j'ai ?"
- "Fais-moi une journee plus legere."
- "Je veux un menu high-protein sans racheter plein de choses."
- "Adapte cette recette pour qu'elle soit plus rassasiante."
- "Je veux manger anti-gaspi cette semaine."

La bonne experience n'est pas un dashboard sante. C'est un assistant cuisine qui :

1. lit l'inventaire, les recettes, les dates de peremption et les preferences ;
2. applique des garde-fous sante simples ;
3. demande une clarification si le ressenti est ambigu ;
4. propose 1 a 3 repas ou un menu journee ;
5. explique pourquoi, avec une estimation nutritionnelle prudente ;
6. permet d'ajouter les manquants, planifier, cuisiner ou sauvegarder.

Positionnement public :

> Conseils cuisine et nutrition bien-etre. Pas diagnostic medical.

---

## 1.1 Etat actuel verifie

Audit local du 2026-05-17.

| Surface | Etat actuel | Decision PRP-227 |
|---|---|---|
| `nutrition_profiles` | N'existe pas en migration runtime ; seulement dans cette PRP draft | PR1 cree le schema complet |
| `wellness_checkins` | N'existe pas | PR1 cree la table |
| `meal_recommendation_plans` | N'existe pas | PR1 cree la table |
| PRP-226 engine | `RecommendationEngine` existe avec `nutritionFit: 0.5` comme valeur neutre | PR3 ajoute un vrai scorer nutrition, sans casser le moteur |
| PRP-226 events | `recommendation_events`, `recipe_recommendation_cache`, `recipe_interactions` existent | Reutiliser pour learning/feedback |
| PRP-223 memory | `assistant_memory_items`, `MemoryService`, `MemoryPanel`, `record_recipe_feedback` existent | Nutrition sensible = memoire candidate/active |
| Assistant mode | `nutrition` existe dans assistant mode enum / UI picker | PRP-227 branche les tools nutrition |
| PRP-225 product intelligence | Schema attendu dans PRP-225, pas visible comme migration runtime actuelle | PRP-227 degrade si nutrition produit absente |
| Legacy `useNutritionalAI.ts` | Cherche `user_health_profiles`, `health_goals`, `medical_conditions`, tables absentes | Ne pas exposer ; remplacer par PRP-227 services |
| Legacy `HealthDashboard.tsx` | Wording "Tableau de Bord Sante", poids, score nutritionnel, alertes sante | Ne pas utiliser en V1 |
| Legacy planning services | Plusieurs services calculent nutrition avec mocks/defaults | Ne pas reutiliser comme source produit V1 |
| Settings | PRP-235 prepare `Nutrition bien-etre` | PRP-227 fournit backend et hook de profil |

Conclusion : PRP-227 doit construire une fondation nutrition sobre, pas reactiver l'ancien module sante V2.

---

## 2. Scope

### Inclus

- Schema `nutrition_profiles`, `wellness_checkins`, `meal_recommendation_plans`.
- Services backend nutrition :
  - profil ;
  - safety classifier ;
  - estimation nutrition ;
  - recommandations selon ressenti ;
  - menu journee ;
  - adaptation recette.
- Routes API nutrition authentifiees.
- Tools assistant nutrition branches au `ToolRegistry`.
- Integration PRP-226 pour choisir les recettes.
- Integration PRP-223 pour memoires sensibles et feedback.
- Integration PRP-235 Settings section `Nutrition bien-etre`.
- Cartes assistant pour :
  - repas recommande ;
  - menu journee ;
  - adaptation recette ;
  - shopping delta.
- Tests unitaires et integration autour des garde-fous.

### Exclus

- Diagnostic medical.
- Traitement de maladie.
- Suivi strict calories type MyFitnessPal.
- Demande age/poids/taille/sexe en V1.
- Calcul macro clinique.
- Dashboard sante complet.
- Supplements, prescriptions, plans alimentaires medicaux.
- Refonte complete des recettes/menus PRP-234.
- Import nutrition externe hors PRP-225.

---

## 3. Garde-fous sante

### 3.1 Regle de base

L'assistant peut proposer des repas et menus **prudents**. Il ne peut pas :

- diagnostiquer ;
- traiter une maladie ;
- promettre une perte de poids ;
- identifier une carence ;
- conseiller une restriction extreme ;
- remplacer un professionnel de sante ;
- recommander supplement, medicament ou traitement.

### 3.2 Classification safety V1

Creer `apps/api/src/services/nutrition/NutritionSafetyClassifier.ts`.

```ts
export type NutritionSafetyLevel = 'normal' | 'caution' | 'escalate';

export interface NutritionSafetyResult {
  level: NutritionSafetyLevel;
  reasons: string[];
  shouldAskClarifyingQuestion: boolean;
  allowedActions: Array<'recommend_meal' | 'generate_menu' | 'adapt_recipe' | 'save_profile' | 'record_checkin'>;
  userFacingNotice?: string;
}
```

Classification :

| Signal utilisateur | Level | Action |
|---|---|---|
| "fatigue", "manger leger", "rassasiant" | normal | proposer repas/menu |
| "digestion lourde", "stress", "pas faim" | caution | question courte + repas doux |
| douleur forte, malaise, symptomes persistants | escalate | pas de plan ; recommander aide pro |
| trouble alimentaire, restriction extreme, vomissements volontaires | escalate | reponse de soutien + aide pro |
| grossesse/allaitement + symptomes | escalate | conseiller pro |
| diabete/traitement/pathologie citee | caution/escalate selon demande | generalites alimentaires seulement, pas de conseil specifique |
| allergie | caution | contrainte forte immediate en session/profil + memoire health_sensitive candidate |
| grossesse/allaitement sans symptome | caution | disclaimer dedie + repas generaux prudents |

Couverture V1 :

- Le classifier est deterministe par rules/regex en PR1.
- Il doit couvrir les formulations directes FR + EN pour chaque categorie avec un corpus minimum de 50 phrases par categorie majeure (`normal`, `caution`, `escalate`, `allergy`, `pregnancy_lactation`).
- Pas d'appel LLM dans PR1.
- Option PR2+ : ajouter un fallback moderation API uniquement si le corpus revele trop de faux negatifs sur troubles alimentaires, auto-restriction extreme ou symptomes graves. Ce fallback doit etre documente avec latence, cout et policy de retention.

Tokens EN minimum a tester :

```text
pain, severe pain, dizzy, dizziness, faint, fainting, vomit, vomiting,
throwing up, starving, starve, binge, purge, laxative, pregnant,
breastfeeding, nursing, allergy, allergic, anaphylaxis, diabetic,
insulin, medication, treatment
```

### 3.3 Wording autorise

Dire :

- "Je peux te proposer une option simple, douce et rassasiante avec ce que tu as."
- "C'est une estimation, pas un avis medical."
- "Si ca persiste, s'aggrave, ou si tu as un doute, demande un avis professionnel."

Ne pas dire :

- "Tu as une carence."
- "Ce menu va te faire perdre X kg."
- "Mange ceci pour guerir."
- "Tu dois supprimer completement tel groupe alimentaire."

### 3.4 Confirmation sensible

Les champs suivants sont `health_sensitive` :

- allergies ;
- objectifs poids ;
- symptomes libres ;
- notes nutrition personnelles ;
- regimes lies a sante ;
- tout contenu mentionnant maladie/traitement.

Regles :

- En profil : sauvegarde seulement apres consentement.
- Allergies dans `nutrition_profiles.allergies` : appliquees immediatement par le moteur des la sauvegarde du profil.
- En memoire assistant : candidate si detecte par extraction, active seulement apres confirmation.
- Une allergie detectee en conversation doit declencher une proposition d'update profil explicite ; tant que l'utilisateur ne confirme pas l'update profil, elle peut etre traitee comme contrainte de session pour la reponse courante, mais pas comme preference durable.
- En reponse : ne jamais afficher ces infos comme verdict ; les presenter comme contraintes utilisateur.

---

## 4. Schema Supabase

Migration cible : `supabase/migrations/20260518100000_create_nutrition_coach_foundation.sql`.

### 4.1 `nutrition_profiles`

```sql
CREATE TABLE IF NOT EXISTS public.nutrition_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal TEXT NOT NULL DEFAULT 'balanced'
    CHECK (goal IN (
      'balanced',
      'weight_loss',
      'maintenance',
      'muscle_gain',
      'energy',
      'digestion',
      'anti_waste'
    )),
  activity_level TEXT
    CHECK (activity_level IS NULL OR activity_level IN ('low','moderate','high')),
  preferred_meals_per_day INTEGER
    CHECK (preferred_meals_per_day IS NULL OR preferred_meals_per_day BETWEEN 1 AND 6),
  target_calories INTEGER
    CHECK (target_calories IS NULL OR target_calories BETWEEN 800 AND 5000),
  target_protein_g INTEGER
    CHECK (target_protein_g IS NULL OR target_protein_g BETWEEN 0 AND 300),
  dietary_patterns TEXT[] NOT NULL DEFAULT '{}',
  avoided_ingredients TEXT[] NOT NULL DEFAULT '{}',
  allergies TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 2000),
  disclaimer_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nutrition_profiles_user_id_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_nutrition_profiles_user
  ON public.nutrition_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_nutrition_profiles_goal
  ON public.nutrition_profiles(goal);
```

Notes :

- Pas d'age/poids/taille/sexe V1.
- `target_calories` et `target_protein_g` sont optionnels et manuels.
- `allergies` est source de verite immediate pour le moteur.
- `allergies` doit aussi produire/mettre a jour une memoire `constraint` `health_sensitive` candidate pour controle utilisateur, sans bloquer le filtrage.
- `disclaimer_accepted_at` est set uniquement par `POST /api/nutrition/disclaimer`. PRP-235 Settings appelle cet endpoint au premier opt-in.

### 4.2 `wellness_checkins`

```sql
CREATE TABLE IF NOT EXISTS public.wellness_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID,
  energy_level INTEGER CHECK (energy_level IS NULL OR energy_level BETWEEN 1 AND 5),
  hunger_level INTEGER CHECK (hunger_level IS NULL OR hunger_level BETWEEN 1 AND 5),
  digestion TEXT
    CHECK (digestion IS NULL OR digestion IN ('good','neutral','heavy','sensitive','unknown')),
  mood TEXT
    CHECK (mood IS NULL OR mood IN ('good','neutral','stressed','tired','unknown')),
  symptoms_text TEXT CHECK (symptoms_text IS NULL OR char_length(symptoms_text) <= 1000),
  safety_level TEXT NOT NULL DEFAULT 'normal'
    CHECK (safety_level IN ('normal','caution','escalate')),
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wellness_checkins_user_created
  ON public.wellness_checkins(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wellness_checkins_safety
  ON public.wellness_checkins(user_id, safety_level, created_at DESC);
```

Notes :

- `conversation_id` reste sans FK volontairement pour eviter de bloquer si une conversation est archivee/supprimee.
- `symptoms_text` ne doit jamais etre envoye a OpenFoodFacts ou autre fournisseur externe.
- Pas de policy UPDATE en V1 : un check-in est un evenement append-only. Correction = nouveau check-in ou suppression par l'utilisateur.

### 4.3 `meal_recommendation_plans`

```sql
CREATE TABLE IF NOT EXISTS public.meal_recommendation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  goal TEXT
    CHECK (goal IS NULL OR goal IN (
      'balanced',
      'weight_loss',
      'maintenance',
      'muscle_gain',
      'energy',
      'digestion',
      'anti_waste'
    )),
  meals JSONB NOT NULL DEFAULT '[]'::jsonb,
  nutrition_estimate JSONB NOT NULL DEFAULT '{}'::jsonb,
  shopping_delta JSONB NOT NULL DEFAULT '[]'::jsonb,
  rationale TEXT CHECK (rationale IS NULL OR char_length(rationale) <= 3000),
  confidence TEXT NOT NULL DEFAULT 'low'
    CHECK (confidence IN ('low','medium','high')),
  created_from_conversation_id UUID,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','archived','deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_reco_plans_user_date
  ON public.meal_recommendation_plans(user_id, plan_date DESC);

CREATE INDEX IF NOT EXISTS idx_meal_reco_plans_user_status
  ON public.meal_recommendation_plans(user_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_reco_plans_one_active_per_day
  ON public.meal_recommendation_plans(user_id, plan_date)
  WHERE status = 'active';
```

Notes :

- Historique autorise via `archived` / `deleted`, mais une seule version `active` par utilisateur et par date.
- Suppression utilisateur V1 = soft-delete `status = 'deleted'`. Hard-delete/RGPD global passe par PRP-235 data deletion, pas par l'UI menu.

### 4.4 Triggers `updated_at`

Reutiliser la fonction existante `public.update_updated_at_column()` si presente. Sinon creer une fonction idempotente :

```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nutrition_profiles_updated_at
  ON public.nutrition_profiles;
CREATE TRIGGER trg_nutrition_profiles_updated_at
  BEFORE UPDATE ON public.nutrition_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_meal_reco_plans_updated_at
  ON public.meal_recommendation_plans;
CREATE TRIGGER trg_meal_reco_plans_updated_at
  BEFORE UPDATE ON public.meal_recommendation_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

### 4.5 RLS

```sql
ALTER TABLE public.nutrition_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellness_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_recommendation_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nutrition_profiles_select_own ON public.nutrition_profiles;
CREATE POLICY nutrition_profiles_select_own
  ON public.nutrition_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS nutrition_profiles_insert_own ON public.nutrition_profiles;
CREATE POLICY nutrition_profiles_insert_own
  ON public.nutrition_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS nutrition_profiles_update_own ON public.nutrition_profiles;
CREATE POLICY nutrition_profiles_update_own
  ON public.nutrition_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS nutrition_profiles_delete_own ON public.nutrition_profiles;
CREATE POLICY nutrition_profiles_delete_own
  ON public.nutrition_profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS wellness_checkins_select_own ON public.wellness_checkins;
CREATE POLICY wellness_checkins_select_own
  ON public.wellness_checkins
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS wellness_checkins_insert_own ON public.wellness_checkins;
CREATE POLICY wellness_checkins_insert_own
  ON public.wellness_checkins
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS wellness_checkins_delete_own ON public.wellness_checkins;
CREATE POLICY wellness_checkins_delete_own
  ON public.wellness_checkins
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS meal_reco_plans_select_own ON public.meal_recommendation_plans;
CREATE POLICY meal_reco_plans_select_own
  ON public.meal_recommendation_plans
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS meal_reco_plans_insert_own ON public.meal_recommendation_plans;
CREATE POLICY meal_reco_plans_insert_own
  ON public.meal_recommendation_plans
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS meal_reco_plans_update_own ON public.meal_recommendation_plans;
CREATE POLICY meal_reco_plans_update_own
  ON public.meal_recommendation_plans
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## 5. Data contracts

### 5.1 Nutrition profile

```ts
export type NutritionGoal =
  | 'balanced'
  | 'weight_loss'
  | 'maintenance'
  | 'muscle_gain'
  | 'energy'
  | 'digestion'
  | 'anti_waste';

export interface NutritionProfile {
  id: string;
  userId: string;
  goal: NutritionGoal;
  activityLevel?: 'low' | 'moderate' | 'high' | null;
  preferredMealsPerDay?: number | null;
  targetCalories?: number | null;
  targetProteinG?: number | null;
  dietaryPatterns: string[];
  avoidedIngredients: string[];
  allergies: string[];
  notes?: string | null;
  disclaimerAcceptedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### 5.2 Nutrition estimate

```ts
export interface NutritionEstimate {
  confidence: 'low' | 'medium' | 'high';
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
  saltG?: number;
  sourceBreakdown: Array<'products' | 'recipe_nutrition' | 'manual' | 'fallback'>;
  missingDataReasons: string[];
  noteCode:
    | 'ok_product_coverage'
    | 'low_confidence_low_coverage'
    | 'fallback_no_product_data'
    | 'manual_user_targets'
    | 'recipe_declared_nutrition';
  note: string;
}
```

Regles :

- Si moins de 60% des ingredients ont une nutrition fiable, `confidence = low`.
- Si nutrition vient de PRP-225 OpenFoodFacts, afficher "donnees contributives, a verifier".
- Ne jamais inventer vitamines/mineraux non presents dans les sources.
- `note` est derivee de `noteCode` via mapping texte ; ne pas generer du wording libre dans chaque service.
- Mapping `noteCode` / `confidence` :
  - `low_confidence_low_coverage` -> `confidence = 'low'`
  - `fallback_no_product_data` -> `confidence = 'low'`
  - `manual_user_targets` -> `confidence = 'medium'` sauf si aucune source recette/produit n'est disponible
  - `recipe_declared_nutrition` -> `confidence = 'medium'`
  - `ok_product_coverage` -> `confidence = 'medium'` ou `high` selon couverture ingredients

### 5.3 Menu journee

```ts
export interface DailyMenuPlan {
  date: string;
  goal: NutritionGoal;
  meals: Array<{
    slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    recipeId?: string;
    title: string;
    rationale: string;
    availableNow: boolean;
    missingIngredients: string[];
    nutritionEstimate: NutritionEstimate;
  }>;
  shoppingDelta: Array<{ name: string; quantity?: number; unit?: string; reason: string }>;
  overallEstimate: NutritionEstimate;
  safetyNotice?: string;
}
```

### 5.4 Adaptation recette

```ts
export interface RecipeNutritionAdaptation {
  recipeId: string;
  goal: NutritionGoal | RecommendationNutritionGoal;
  changes: Array<{
    type: 'portion' | 'ingredient_swap' | 'reduce' | 'add' | 'serve_with';
    label: string;
    reason: string;
  }>;
  nutritionDelta?: {
    calories?: 'lower' | 'similar' | 'higher';
    protein?: 'lower' | 'similar' | 'higher';
    confidence: 'low' | 'medium' | 'high';
  };
  saveAsVariantAvailable: boolean;
}
```

V1 ne modifie jamais la recette source directement. `saveAsVariantAvailable` est force a `false` en V1 ; il devient `true` uniquement dans une PR future qui livre la creation de variante de recette avec confirmation utilisateur.

Precondition compile PR3 : `RecommendationNutritionGoal` doit etre exporte depuis `apps/api/src/services/recommendations/types.ts` avant d'etre importe dans `RecipeNutritionAdaptation`.

---

## 6. Backend architecture

### 6.1 Fichiers a creer

```text
apps/api/src/services/nutrition/NutritionProfileService.ts
apps/api/src/services/nutrition/NutritionSafetyClassifier.ts
apps/api/src/services/nutrition/NutritionEstimator.ts
apps/api/src/services/nutrition/NutritionCoachService.ts
apps/api/src/services/nutrition/NutritionPlanRepository.ts
apps/api/src/services/nutrition/types.ts
apps/api/src/services/nutrition/__tests__/NutritionSafetyClassifier.test.ts
apps/api/src/services/nutrition/__tests__/NutritionEstimator.test.ts
apps/api/src/services/nutrition/__tests__/NutritionCoachService.test.ts
apps/api/src/services/assistant/handlers/__tests__/NutritionToolHandlers.test.ts
apps/api/src/routes/nutrition.ts
```

### 6.2 Fichiers a modifier

| Fichier | Action |
|---|---|
| `apps/api/src/app.ts` | Monter `nutritionRouter` |
| `apps/api/src/services/assistant/schemas/tools.ts` | Ajouter specs tools nutrition |
| `apps/api/src/services/assistant/ToolRegistry.ts` | S'assurer que les specs sont chargees |
| `apps/api/src/services/assistant/RiskClassifier.ts` | Escalade allergies/symptomes/objectifs sensibles |
| `apps/api/src/services/assistant/handlers/` | Ajouter `nutrition.ts` |
| `apps/api/src/routes/assistant.agent.ts` | Register handlers nutrition avec services |
| `apps/api/src/services/recommendations/RecommendationEngine.ts` | Brancher scorer `nutritionFit` PR3 |
| `apps/api/src/services/recommendations/types.ts` | Ajouter contexte nutrition optionnel |
| `src/services/assistantApi.ts` | Types front + appels nutrition si necessaire |
| `src/pages/Settings.tsx` / composants PRP-235 | Lire/sauvegarder profil nutrition |
| `src/components/assistant/*` | Afficher cartes nutrition/menu/adaptation |

### 6.3 API routes

Routes sous `/api/nutrition`.

Middleware obligatoire :

- `createAuthMiddleware`
- `userRateLimit`
- validation Zod.

```text
GET    /api/nutrition/profile
PATCH  /api/nutrition/profile
DELETE /api/nutrition/profile
POST   /api/nutrition/checkins
GET    /api/nutrition/checkins?limit=20
POST   /api/nutrition/recommend-meal
POST   /api/nutrition/daily-menu
POST   /api/nutrition/adapt-recipe
POST   /api/nutrition/plans
GET    /api/nutrition/plans?from=&to=&limit=
PATCH  /api/nutrition/plans/:id
POST   /api/nutrition/disclaimer
```

Rate limits recommandes :

| Route | Free | Premium | Window |
|---|---:|---:|---:|
| profile read/write | 120 | 600 | 1h |
| checkins | 30 | 120 | 1h |
| recommend/adapt | 30 | 300 | 1h |
| daily-menu | 10 | 80 | 1h |
| save plan | 30 | 200 | 1h |
| disclaimer | 120 | 600 | 1h |

---

## 7. Service behavior

### 7.1 `NutritionProfileService`

Responsabilites :

- lire profil ;
- upsert profil ;
- delete profil ;
- synchroniser allergies/objectifs avec `MemoryService` si service fourni ;
- refuser les champs hors V1 (age, poids, taille, sexe, pathologies).
- appliquer immediatement `allergies` comme contraintes moteur.
- creer/mettre a jour en parallele une memoire candidate `constraint` `health_sensitive` pour chaque allergie nouvelle.
- ecrire `disclaimer_accepted_at` uniquement via `POST /api/nutrition/disclaimer`.

Source canonique disclaimer :

- `POST /api/nutrition/disclaimer` est le seul writer autorise.
- PRP-235 Settings appelle cet endpoint ; elle ne met pas a jour directement `nutrition_profiles.disclaimer_accepted_at`.
- L'endpoint est idempotent : si `disclaimer_accepted_at` est deja present, il retourne le profil courant sans changer la date sauf parametre explicite futur.

Validation :

- `dietaryPatterns`, `avoidedIngredients`, `allergies` max 50 items chacun ;
- chaque item max 100 caracteres ;
- `notes` max 2000 caracteres ;
- `targetCalories` nullable et manuel seulement.

### 7.2 `NutritionSafetyClassifier`

Responsabilites :

- classifier texte utilisateur avant tools nutrition ;
- retourner `escalate` si symptomes graves ;
- bloquer `generate_daily_menu` si la demande implique restriction extreme ;
- ajouter notice utilisateur.

Implementation V1 :

- rules/regex deterministes ;
- pas d'appel LLM en PR1 ;
- tests sur francais + anglais simple ;
- corpus minimum 50 phrases par categorie majeure ;
- fallback moderation API optionnel PR2+ si les tests revelent une couverture insuffisante.

### 7.3 `NutritionEstimator`

Sources par ordre :

1. `recipes.nutrition_info` / `nutrition_json` si present ;
2. `products.nutrition_json` PRP-225 via ingredients lies ;
3. quantites ingredients si disponibles ;
4. fallback low confidence.

Regles :

- Calcul par portion si servings connu.
- Ne pas calculer micronutriments V1.
- Ne pas afficher calories/proteines si confidence low et valeur basee sur trop peu de sources.

### 7.4 `NutritionCoachService`

Flow `recommendMealForFeeling` :

```text
input
  -> NutritionSafetyClassifier
  -> check disclaimer_accepted_at
  -> profile + memories + inventory + recipes
  -> RecommendationEngine.suggestForUser(goal/time/mealType)
  -> NutritionEstimator on candidates
  -> deterministic shortlist
  -> LLM explanation constrained by facts
  -> cards/actions
```

Flow `generateDailyMenu` :

```text
input goal/date
  -> safety
  -> check disclaimer_accepted_at
  -> cache lookup (user_id + goal + date + meals/time limit) TTL 60s
  -> profile
  -> 3-4 RecommendationEngine calls by meal type
  -> dedupe recipes
  -> estimate nutrition
  -> shopping delta
  -> structured DailyMenuPlan
```

Contraintes latence/cout :

- `RecommendationEngine` reste deterministe ; les 3-4 appels meal type ne doivent pas declencher 3-4 appels LLM.
- Le LLM peut etre appele une fois pour le wording final, apres shortlist deterministe.
- Cible p95 : `< 5s` pour `generateDailyMenu` hors cold start.
- Cache court : 60s par `(user_id, goal, date, meals, time_limit_minutes)` pour eviter de consommer quota/latence sur double clic ou retry.
- Si `disclaimer_accepted_at` est absent, `recommendMealForFeeling`, `generateDailyMenu` et `adaptRecipeForGoal` refusent avec une invitation claire a accepter le disclaimer nutrition bien-etre.

Flow `adaptRecipeForGoal` :

```text
recipe_id + goal
  -> read recipe + ingredients
  -> profile constraints/allergies
  -> deterministic adaptation rules
  -> optional LLM wording
  -> RecipeNutritionAdaptation
```

---

### 7.5 Telemetry minimale

Ne pas logger de texte libre sensible. Logger uniquement des compteurs/metadata non textuels :

- `nutrition_safety_classification`
  - `level`
  - `reason_codes`
  - `tool_name`
  - `has_profile`
  - `has_disclaimer`
- `nutrition_recommendation_generated`
  - `goal`
  - `meal_type`
  - `confidence`
  - `candidate_count`
  - `cache_hit`
- `nutrition_recommendation_blocked`
  - `level`
  - `reason_codes`
  - `tool_name`

Interdits :

- `symptoms_text`
- notes utilisateur libres
- allergies en clair
- contenu de conversation complet

Ces events peuvent aller dans le systeme analytics existant si disponible, sinon rester en logs backend structures niveau info.

---

## 8. Assistant tools

Ajouter les specs dans `apps/api/src/services/assistant/schemas/tools.ts` et les handlers dans `apps/api/src/services/assistant/handlers/nutrition.ts`.

| Tool | Tier | Reversible | Args | Retour |
|---|---|---:|---|---|
| `read_nutrition_profile` | read | false | `{}` | `NutritionProfile \| null` |
| `update_nutrition_profile` | medium | true | `{ patch }` | `NutritionProfile` |
| `record_wellness_checkin` | low/medium | true | `{ energy_level?, hunger_level?, digestion?, mood?, symptoms_text? }` | checkin |
| `recommend_meal_for_feeling` | read | false | `{ feeling, meal_type?, time_limit_minutes? }` | recommendations |
| `generate_daily_menu` | read | false | `{ goal, date?, meals?, time_limit_minutes? }` | `DailyMenuPlan` |
| `adapt_recipe_for_goal` | read | false | `{ recipe_id, goal }` | `RecipeNutritionAdaptation` |
| `save_meal_recommendation_plan` | low | true | `{ plan }` | saved plan |

RiskClassifier :

- `read_nutrition_profile` = read.
- `update_nutrition_profile` = medium par defaut en V1.
- Option PR4+ : ajouter une escalation post-validation par args dans `RiskClassifier.ts`, avec tests, pour descendre certains patchs non sensibles en low. Tant que ce pattern n'existe pas, ne pas specifier un tier dynamique par contenu.
- `record_wellness_checkin` = medium if `symptoms_text`, blocked/escalated if safety `escalate`.
- `recommend_meal_for_feeling`, `generate_daily_menu`, `adapt_recipe_for_goal` = read but safety classifier may short-circuit.
- `save_meal_recommendation_plan` = low reversible.

System prompt addition :

```text
Tu es un assistant cuisine et nutrition bien-etre. Tu peux proposer des repas,
menus et adaptations prudentes. Tu ne fais pas de diagnostic, ne traites pas de
maladie, ne promets pas de perte de poids, et tu refuses les demandes de
restriction extreme. Si l'utilisateur mentionne des symptomes graves ou
persistants, conseille de consulter un professionnel de sante et propose
seulement des options alimentaires generales et douces si approprie.
```

---

## 9. Integration PRP-226

Le coach nutrition ne choisit pas les recettes directement via LLM.

Types de goal PRP-226 :

```ts
export type RecommendationNutritionGoal =
  | 'balanced'
  | 'light'
  | 'high_protein'
  | 'comfort'
  | 'anti_waste'
  | 'batch_cooking';
```

Avant PR3, verifier/etendre `apps/api/src/services/recommendations/types.ts` pour accepter exactement ces valeurs et exporter `RecommendationNutritionGoal`. Si PRP-226 expose deja un enum different, ajouter un adapter explicite au lieu de passer des strings non supportees. Sans cet export, le contrat §5.4 `RecipeNutritionAdaptation` ne compile pas.

Mapping complet :

| Nutrition goal / feeling | RecommendationContext |
|---|---|
| `balanced` | `goal: 'balanced'` |
| `weight_loss` | `goal: 'light'` |
| `maintenance` | `goal: 'balanced'` |
| `muscle_gain` | `goal: 'high_protein'` |
| `energy` | `goal: 'comfort'` avec boost protein/fiber si donnees fiables |
| `digestion` | `goal: 'light'`, filtre effort faible |
| `anti_waste` | `goal: 'anti_waste'` |
| fatigue | `goal: 'comfort'` ou `goal: 'high_protein'` selon profil + inventaire |
| manger leger | `goal: 'light'` |
| perte de poids | `goal: 'light'` |
| high-protein | `goal: 'high_protein'` |
| batch cooking | `goal: 'batch_cooking'` |

PR3 ajoute un scorer nutrition :

```ts
export interface NutritionFitInput {
  profile: NutritionProfile | null;
  recipeNutrition: NutritionEstimate;
  recipeTags: string[];
  mealType?: RecommendationMealType;
}

export function scoreNutritionFit(input: NutritionFitInput): number;
```

Regles V1 :

- retourner exactement `0.5` si `profile === null` pour ne pas modifier le classement actuel des utilisateurs non opt-in ;
- retourner `0.5` si confidence nutrition low, sauf allergie/ingredient evite connu ;
- boost high-protein si protein connue et recette compatible ;
- penalite hard si allergie du profil apparait dans ingredient ou allergen metadata ;
- penalite si ingredient evite apparait ;
- boost anti-waste reste gere par ExpiryScorer PRP-226 ;
- jamais exclure une recette uniquement pour calories sauf demande explicite + confidence medium/high.

---

## 10. UX

### 10.1 Assistant

Surface principale : `/assistant`.

Mode :

- label : `Nutrition bien-etre`.
- enum backend : `nutrition`.

Reponse type :

1. phrase naturelle courte ;
2. 1 a 3 cartes repas ;
3. raison deterministic facts ;
4. estimation nutrition si disponible ;
5. actions :
   - ouvrir recette ;
   - ajouter manquants ;
   - planifier ;
   - sauvegarder menu ;
   - dire "pas celui-la".

### 10.2 Settings

Via PRP-235 section `Nutrition bien-etre` :

- objectif actuel ;
- allergies/aliments evites ;
- preferences alimentaires ;
- disclaimer/consentement ;
- suppression profil.

### 10.3 Today / Menus

Via PRP-234 :

- Daily menu peut etre sauvegarde dans `meal_recommendation_plans`.
- PRP-234 menus hebdo restent la surface planning ; PRP-227 fournit les suggestions nutrition.

### 10.4 Legacy a masquer

Ne pas exposer en V1 :

- `src/components/nutrition/HealthDashboard.tsx`
- `src/hooks/useNutritionalAI.ts`
- `src/services/ai/nutritionalAIService.ts`

Ces fichiers peuvent rester temporairement dans le repo, mais ne doivent pas etre routes/nav visibles tant qu'ils parlent de "profil sante", poids, pathologies ou score sante.

---

## 11. Plan d'execution

### Ordre recommande

```text
PRP-223 PR6-PR7        -> memoire + journal cuisine disponibles
PRP-226 PR1-PR6        -> recommendation engine + interactions disponibles
PRP-225 PR1-PR4        -> nutrition produit disponible pour estimates medium/high
PRP-235 PR1-PR3        -> Settings shell disponible
PRP-227 PR1-PR2        -> schema + profil
PRP-227 PR3-PR7        -> estimates/tools/menus/adaptation/learning
```

PRP-227 PR1-PR2 peuvent partir avant PRP-225, mais PR3 doit degrader en confidence low tant que `products.nutrition_json` n'est pas disponible.

### PR1 - Schema + safety classifier

Scope :

- Migration `20260518100000_create_nutrition_coach_foundation.sql`.
- Types Supabase regen si workflow disponible.
- `NutritionSafetyClassifier`.
- Tests classifier.

Verification :

```bash
npx tsc -p apps/api/tsconfig.json --noEmit
npm run test:api -- NutritionSafetyClassifier
supabase db reset
rg -n "user_health_profiles|health_goals|medical_conditions" apps/api/src src
```

Attendu :

- Pas de nouvelle dependance aux tables legacy.
- Classifier couvre normal/caution/escalate.
- Migration applique proprement sur Supabase local fresh.
- Corpus safety FR/EN atteint 50+ phrases par categorie majeure.

### PR2 - Nutrition profile API + Settings hook

Scope :

- `NutritionProfileService`.
- Routes profile.
- Hook front `src/hooks/useNutritionProfile.ts`.
- PRP-235 section nutrition peut lire/sauvegarder profil.
- Appliquer allergies immediatement comme source de verite profil.
- Synchroniser allergies/objectifs avec memoire candidate via `MemoryService` si disponible.
- Refuser recommandations nutrition si `disclaimer_accepted_at` est absent et l'utilisateur n'a pas accepte le disclaimer.

Verification :

```bash
npx tsc -p tsconfig.json --noEmit
npx tsc -p apps/api/tsconfig.json --noEmit
npm run test:api -- NutritionProfileService
```

Smoke :

- `/settings?section=nutrition` affiche empty profile.
- Sauvegarde objectif `balanced`.
- Allergy cree/prepare memoire health_sensitive candidate.
- Allergy est appliquee immediatement par le profil, sans attendre confirmation de memoire.
- Premier `recommend_meal_for_feeling` sans disclaimer -> refus clair + invitation a accepter.

### PR3 - Nutrition estimator + RecommendationEngine nutritionFit

Scope :

- `NutritionEstimator`.
- `scoreNutritionFit`.
- Brancher `nutritionFit` dans PRP-226 engine.
- Supporter absence PRP-225 avec fallback low.

Verification :

```bash
npx tsc -p apps/api/tsconfig.json --noEmit
npm run test:api -- NutritionEstimator
npm run test:api -- RecommendationEngine
```

Tests requis :

- recipe nutrition_info -> confidence medium/high ;
- products nutrition_json absent -> confidence low ;
- allergy -> penalty hard ;
- high_protein -> boost si protein connue.
- profile null -> `scoreNutritionFit` retourne exactement `0.5`.
- confidence low -> `scoreNutritionFit` retourne `0.5` sauf allergie/ingredient evite.

### PR4 - Assistant tools nutrition

Scope :

- Specs tools.
- Handlers nutrition.
- RiskClassifier.
- Register dans `assistant.agent.ts`.
- Prompt guardrail.

Verification :

```bash
npx tsc -p apps/api/tsconfig.json --noEmit
npm run test:api -- ToolRegistry
npm run test:api -- RiskClassifier
npm run test:api -- NutritionToolHandlers
```

Smoke assistant :

- "Je veux manger leger ce soir" -> `recommend_meal_for_feeling`.
- "Souviens-toi que je suis allergique aux noix" -> memoire candidate health_sensitive.
- "Je suis allergique aux noix, propose-moi un repas" -> contrainte de session appliquee immediatement, puis invitation a sauvegarder dans profil.
- "J'ai une douleur forte..." -> escalation, pas de menu.

### PR5 - Daily menu + saved plans

Scope :

- `NutritionCoachService.generateDailyMenu`.
- `NutritionPlanRepository`.
- Routes daily-menu/plans.
- Assistant action `save_meal_recommendation_plan`.
- Cartes assistant menu journee.

Verification :

```bash
npx tsc -p apps/api/tsconfig.json --noEmit
npx tsc -p tsconfig.json --noEmit
npm run test:api -- NutritionCoachService
```

Smoke :

- "Fais-moi une journee anti-gaspi" -> menu structure.
- Sauvegarder menu -> row `meal_recommendation_plans`.
- Ajouter manquants -> action shopping existante ou CTA clair.
- Double clic/regeneration immediate -> cache 60s, pas double consommation de quota.
- p95 cible documentee `< 5s` hors cold start.

### PR6 - Recipe adaptation

Scope :

- `adaptRecipeForGoal`.
- Deterministic adaptation rules.
- Assistant card adaptation.
- Pas de modification de recette source.

Verification :

```bash
npx tsc -p apps/api/tsconfig.json --noEmit
npm run test:api -- NutritionCoachService
```

Tests requis :

- reduce oil -> change `reduce`;
- high protein -> `add`/`serve_with`;
- no cream -> `ingredient_swap`;
- allergy conflict -> warning + no unsafe suggestion.

### PR7 - Wellness checkins + learning loop

Scope :

- `record_wellness_checkin`.
- Recent checkins in ContextBuilder optional.
- recipe feedback already in PRP-223 feeds preferences.
- PRP-226 interactions updated when user accepts/dismisses nutrition suggestion.

Verification :

```bash
npx tsc -p apps/api/tsconfig.json --noEmit
npm run test:api -- NutritionCoachService
rg -n "wellness_checkins|meal_recommendation_plans|nutrition_profiles" apps/api/src src
```

Smoke :

- "Je me sens lourd apres cette recette" -> checkin caution + feedback possible.
- "Pas cette recette, trop lourde" -> preference/interaction updates.

---

## 12. Tests et QA

### Commandes

```bash
npx tsc -p apps/api/tsconfig.json --noEmit
npx tsc -p tsconfig.json --noEmit
npm run test:api
npm run build
npm run lint
npm run test
```

Si `npm run lint` ou `npm run test` n'existent pas, documenter "script absent" dans la PR.

### Tests unitaires minimum

- `NutritionSafetyClassifier.test.ts`
  - fatigue -> normal ;
  - digestion lourde -> caution ;
  - douleur forte -> escalate ;
  - restriction extreme -> escalate ;
  - allergie -> caution ;
  - grossesse/allaitement sans symptome -> caution + disclaimer, pas refusal ;
  - grossesse/allaitement avec symptome -> escalate ;
  - corpus FR/EN 50+ phrases par categorie majeure.
- `NutritionProfileService.test.ts`
  - upsert profil ;
  - rejette champs hors V1 ;
  - allergies -> memory candidate ;
  - allergies -> contraintes profil immediates ;
  - disclaimer absent -> recommandation refusee avec invitation opt-in ;
  - delete profil.
- `NutritionEstimator.test.ts`
  - recipe nutrition present ;
  - products nutrition present ;
  - data missing ;
  - confidence rules.
- `NutritionCoachService.test.ts`
  - recommend meal ;
  - daily menu ;
  - daily menu cache 60s ;
  - adaptation ;
  - safety escalation.
- `NutritionToolHandlers.test.ts`
  - `update_nutrition_profile` medium ;
  - allergie conversationnelle appliquee a la reponse courante ;
  - escalation bloque les tools nutrition.

### Smoke UX

Routes :

```text
/assistant?mode=nutrition
/settings?section=nutrition
/kitchen
/kitchen/meal-planning
```

Prompts :

```text
Je suis fatigue, je mange quoi ?
Fais-moi une journee plus legere avec ce que j'ai.
Adapte cette recette pour plus de proteines.
Je veux manger anti-gaspi cette semaine.
J'ai une douleur forte au ventre depuis hier, tu me proposes quoi ?
```

Attendu :

- Les quatre premiers donnent repas/menu/adaptation prudents.
- Le dernier escalade et ne donne pas de plan nutrition personnalise.

### Grep gates

```bash
rg -nE "guerir|gu[eé]rir|perdre [0-9]+ ?kg|diagnostiquer|carence|traitement miracle|medecin IA|médecin IA" apps/api/src src
rg -n "user_health_profiles|health_goals|medical_conditions" apps/api/src src
rg -n "HealthDashboard|useNutritionalAI|nutritionalAIService" src/App.tsx src/pages src/components/navigation src/components/settings
```

Attendu :

- Premier grep : seulement tests/safety classifier autorises.
- Deuxieme grep : zero nouveau hit.
- Troisieme grep : zero route/nav/settings visible vers legacy health dashboard.

---

## 13. Definition of Done

- L'utilisateur peut creer, modifier et supprimer un profil nutrition bien-etre optionnel.
- Le profil ne demande pas age/poids/taille/sexe/pathologies en V1.
- Les allergies sauvegardees dans le profil sont appliquees immediatement par le moteur.
- Les allergies/objectifs sensibles sont aussi confirmables/oubliables via memoire PRP-223 pour controle utilisateur.
- Une allergie conversationnelle est appliquee comme contrainte de session dans la reponse courante.
- L'assistant peut recommander un repas selon ressenti avec inventaire/recettes.
- L'assistant peut generer un menu journee structure.
- L'assistant peut adapter une recette sans modifier la source.
- Les estimations nutrition affichent une confidence.
- PRP-226 reste source deterministic du choix recette.
- Les demandes a risque escaladent au lieu de proposer un plan.
- Aucun module legacy `HealthDashboard`/`useNutritionalAI` n'est expose.
- RLS protege les trois nouvelles tables.
- `wellness_checkins` est append-only en V1, sauf suppression utilisateur.
- `meal_recommendation_plans` autorise une seule version active par user/date.
- `disclaimer_accepted_at` est exige avant recommandations nutrition persistantes.
- Daily menu utilise un cache court 60s et respecte la cible p95 `< 5s` hors cold start.
- Migration applique cleanly sur Supabase local fresh (`supabase db reset`) ou blocage documente.
- Tests API couvrent safety/profile/estimator/coach.
- `tsc` + build green ou erreurs pre-existantes documentees.

---

## 14. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Derive medicale | Produit dangereux | Safety classifier + prompt + tests escalation |
| Donnees nutrition incompletes | Mauvaises recommandations | Confidence + fallback low + PRP-225 dependency |
| Experience culpabilisante | Abandon utilisateur | Ton bienveillant, pas de score moral, objectifs modifiables |
| Legacy HealthDashboard reapparait | UX medicale fausse | Grep gate + non-objectifs |
| LLM invente macros | Perte de confiance | LLM explique seulement, estimates deterministes |
| Allergie mal geree | Risque utilisateur | Profil source de verite immediate + contrainte de session + memory candidate + tests |
| Schema trop sensible | Compliance/data risk | Pas age/poids/pathologies V1, RLS strict |
| Safety regex faux negatif | Reponse risquee | Corpus FR/EN 50+ phrases/categorie + fallback moderation API optionnel PR2+ |
| Daily menu lent/couteux | UX lente/quota consomme | Engine deterministe, un seul LLM wording max, cache 60s, p95 cible |

---

## 15. Non-objectifs

- Pas de diagnostic medical.
- Pas de traitement de maladie.
- Pas de plan alimentaire clinique.
- Pas de tracking calories strict.
- Pas de demande poids/age/taille/sexe en V1.
- Pas de score sante global.
- Pas de supplements.
- Pas de promesse de perte de poids.
- Pas de dashboards nutrition avances avant donnees fiables.

---

## 16. Questions tranchees

1. **Demander taille/poids/age ?**
   - Non en V1.

2. **Calories cible ?**
   - Optionnel, manuel, cache par defaut, jamais impose.

3. **Check-in quotidien ?**
   - Opt-in uniquement, via conversation ou action explicite.

4. **Le LLM choisit-il les recettes ?**
   - Non. PRP-226 choisit ; LLM explique.

5. **Peut-on dire "sante" dans l'UI ?**
   - Eviter en V1. Utiliser "Nutrition bien-etre".

6. **Est-ce qu'on garde `HealthDashboard` ?**
   - Pas visible en V1. Archive/suppression possible dans PRP-236.

7. **Que faire sans nutrition OpenFoodFacts ?**
   - Recommander quand meme, mais afficher confidence low ou cacher les macros.

8. **Les allergies attendent-elles la confirmation de memoire ?**
   - Non. Une allergie sauvegardee dans `nutrition_profiles.allergies` est appliquee immediatement. La memoire candidate sert au controle utilisateur, pas au filtrage de securite.

9. **RiskClassifier dynamique selon args ?**
   - Non en V1. `update_nutrition_profile` est medium par defaut. Une escalation par contenu peut arriver plus tard avec tests dedies.

10. **Safety classifier appelle-t-il un LLM ?**
    - Non en PR1. Il est rules/regex + corpus tests. Un fallback moderation API peut etre ajoute PR2+ si les faux negatifs sont trop nombreux.
