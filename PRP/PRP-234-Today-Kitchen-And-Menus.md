# PRP-234 - Today Kitchen And Menus

> Statut : **Draft executable - a re-review avant implementation**
> Date : 2026-05-17
> Source : `docs/PAGE-UI-UX-AUDIT-2026.md` §3.6, §3.10, PRP-226, PRP-237
> Dependances : PRP-226 PR1-PR4, PRP-237 PR1-PR3, tables `weekly_meal_plans` / `meal_plan_entries`
> Objectif : transformer `/kitchen` en surface "Aujourd'hui" utile et remplacer `/kitchen/meal-planning` legacy/Cipher par une page Menus V1 simple, fiable et voice-first.

---

## 0. Decisions prerequises

Ces decisions doivent etre cochees dans la description de **PR1 - Today Kitchen
cleanup**, sous un header `## Decisions PRP-234`.

- [ ] **Promesse `/kitchen`** : `/kitchen` devient **Aujourd'hui en cuisine**,
  pas un dashboard general.
- [ ] **Menus visible seulement si V1 reelle** : tant que
  `/kitchen/meal-planning` re-exporte `CipherMealPlanningPage`, Menus reste
  cache ou secondaire. Apres remplacement V1, Menus peut etre expose sous
  Recettes.
- [ ] **Schema V1** : utiliser `weekly_meal_plans` et `meal_plan_entries`
  existants. Pas de nouveau schema meal planning dans PRP-234.
- [ ] **No Cipher/family/security UI** : la page Menus V1 ne doit pas afficher
  Cipher, chiffrement, profils famille, budget fake ou suggestions legacy.
- [ ] **No mock data** : aucun bloc "Activite recente", "Cette semaine",
  "Suggestions" sans source reelle.
- [ ] **Recommendation source** : les blocs "A cuisiner" consomment PRP-226
  via un **mini endpoint backend** `POST /api/recommendations/suggest`, pas une
  logique front dupliquee. CTA-only est autorise en PR1, mais pas pour Today V1.
- [ ] **Voice-first** : Menus V1 doit pouvoir etre alimente par l'assistant via
  `add_recipe_to_meal_plan`.
- [ ] **Design** : utiliser tokens/primitives PRP-237, pas Material/Cipher UI.

Fallback 48h :

- si les decisions restent ouvertes 48h apres lancement, appliquer les choix
  recommandes ci-dessus et marquer la PR `provisional-today-menus-decisions`.

---

## 1. Resume executif

`/kitchen` ne doit plus etre un hub de liens. Cette page doit repondre a :

> "Qu'est-ce que je fais maintenant en cuisine ?"

Menus ne doit plus etre une page "Planification des Repas Intelligente" branchee
sur Cipher/family/security. Elle doit devenir une page simple :

- semaine courante ;
- repas planifies ;
- ajouter une recette ;
- proposer via assistant ;
- envoyer les manquants aux courses ;
- ouvrir/cuisiner la recette.

PRP-234 est donc une consolidation UX :

- `/kitchen` devient **Aujourd'hui** ;
- `/kitchen/meal-planning` devient **Menus** seulement quand le legacy est
  remplace ;
- les actions existantes assistant et les tables existantes sont reutilisees.

---

## 1.1 Etat actuel verifie le 2026-05-17

| Surface | Etat actuel | Implication PRP-234 |
|---|---|---|
| `src/pages/kitchen/KitchenDashboard.tsx` | Page "Cuisine" avec quick actions. Mock stats/recent recipes deja retires, mais il reste "Actions Rapides", "Activite Recente" comme lien sans data, wording dashboard, `useAgeAdaptiveUI`. | PR1 doit renommer, retirer le faux bloc action "Activite Recente", ajouter empty states reels. |
| `src/pages/MealPlanningPage.tsx` | Simple re-export de `CipherMealPlanningPage`. | PR2/PR3 doivent remplacer ce wrapper par une vraie page Menus V1. |
| `src/pages/CipherMealPlanningPage.tsx` | Page legacy avec Cipher, securite, family profiles, emojis, budget, navigation intelligence, `useCipherMealPlanning`. | Ne pas promouvoir. A retirer/archiver via PRP-236 ou garder hors route core. |
| `NavigationHub.tsx` | Sous-item `kitchen-meal-planning` label "Planification", path `/kitchen/meal-planning`, `isNew`. | Cacher ou renommer seulement apres Menus V1. |
| `App.tsx` | Route `/kitchen/meal-planning` pointe vers `MealPlanningPage`. | Route stable, composant a remplacer. |
| Backend assistant | `add_recipe_to_meal_plan` existe dans `apps/api/src/services/assistant/handlers/write.ts`. | Menus V1 peut s'appuyer dessus et rester voice-first. |
| Read tool | `read_meal_plan` existe et retourne `meal_plan_entries`. | Menus V1 peut lire la semaine existante. |
| `agentEvents.ts` | Invalidation pour `add_recipe_to_meal_plan` inclut `meal_plan_entries`, `weekly_meal_plans`. | Hooks Menus doivent s'abonner a ces tables. |
| DB | `weekly_meal_plans` et `meal_plan_entries` existent via migrations anciennes. | Pas besoin de recreer un schema complet. |
| PRP-226 | `recommendation_events` / `recipe_interactions` existent en migration `20260517100000_recommendation_engine_tables.sql`. | "Continuer" et recommendations peuvent consommer ces signaux quand PRP-226 PR3+ est livree. |
| Pantry | `PantryDashboard` a des CTA "Proposer recette" et "Planifier". | Ces CTA doivent pointer vers les nouvelles URLs/params Menus/Recommandations. |

Conclusion : le travail est surtout **retirer le legacy visible, brancher les
donnees reelles, puis exposer Menus seulement quand l'experience est honnete**.

---

## 2. Positionnement roadmap

Ordre recommande :

```text
1. PRP-226 PR1-PR4
   - recommendations fiables
   - event log/cache/interactions
   - assistant actions/metadata

2. PRP-237 PR1-PR3
   - tokens + shell
   - assistant polish

3. PRP-234 PR1
   - nettoyer /kitchen en Aujourd'hui sans Menus V1

4. PRP-234 PR2
   - hooks meal plan + page Menus V1 + nav visible sous Recettes

5. PRP-234 PR3
   - Today data + viewed writer + endpoint recommendations

6. PRP-234 PR4
   - assistant/menu + shopping integration

7. PRP-227
   - nutrition coach et menus nutritionnels avances
```

Exception :

- PRP-234 PR1 peut partir avant PRP-226 complet, car il retire du bruit et des
  wording legacy sans creer de moteur.

---

## 3. Scope

### Inclus

- Renommer/repenser `/kitchen` en **Aujourd'hui**.
- Supprimer les quick actions sans data reelle.
- Afficher des blocs connectes :
  - Continuer ;
  - A cuisiner avec ce que tu as ;
  - A verifier ;
  - Cette semaine ;
  - Anti-gaspi.
- Remplacer `MealPlanningPage` re-export Cipher par Menus V1.
- Utiliser `weekly_meal_plans` et `meal_plan_entries`.
- Ajouter hooks front simples pour lire/ecrire les menus.
- Brancher assistant `add_recipe_to_meal_plan`.
- Ajouter "envoyer les manquants aux courses" si PRP-226 expose les missing.
- Corriger navigation/wording.

### Exclus V1

- Nutrition coach complet.
- Generation automatique de menus optimises 7 jours.
- Budget optimisation.
- Chiffrement Cipher.
- Mode famille/parental.
- Templates publics.
- Analytics meal planning avances.
- Nouveau schema meal plan.
- Refonte visuelle profonde au-dela des tokens PRP-237.
- Recommandations externes hors base.

---

## 4. Produit cible

### 4.1 `/kitchen` - Aujourd'hui en cuisine

Objectif :

> Une page de depart qui montre les prochaines actions utiles, pas une liste de
> features.

Blocs V1 :

1. **Continuer**
   - recette ouverte recemment via `recipe_interactions.viewed` ;
   - recette recommandee/accepted recemment ;
   - import a verifier ;
   - sinon empty state "Ouvrir mes recettes".

   Gate important : PRP-226 cree l'enum `viewed`, mais aucun code ne l'ecrit
   aujourd'hui. PRP-234 doit ajouter un writer au mount de `RecipeDetail` avant
   de considerer "Continuer" comme branche.

2. **A cuisiner avec ce que tu as**
   - top 3 PRP-226 ;
   - si moteur absent : CTA "Demander a l'assistant".

3. **A verifier**
   - imports inbox / drafts ;
   - pas de chiffre fake ;
   - lien vers `/kitchen/recipes?tab=inbox`.

4. **Cette semaine**
   - prochains `meal_plan_entries` ;
   - si aucun : CTA "Creer un menu".

5. **Anti-gaspi**
   - produits proches peremption ;
   - CTA "Voir recettes pour utiliser".

### 4.2 `/kitchen/meal-planning` - Menus

Objectif :

> Planifier la semaine en quelques gestes, avec l'assistant comme raccourci.

Sections V1 :

- semaine courante ;
- grille simple 7 jours x repas ;
- bouton "Ajouter recette" ;
- bouton "Demander a l'assistant" ;
- ingredients manquants ;
- envoyer aux courses ;
- historique minimal des menus si data disponible.

Wording visible :

- Page title : **Menus**
- Subtitle : **Organiser les repas de la semaine avec tes recettes et ton inventaire.**
- CTA primary : **Ajouter une recette**
- CTA assistant : **Demander a l'assistant**
- CTA shopping : **Ajouter les manquants aux courses**

---

## 5. Data sources V1

| Besoin | Source primaire | Fallback |
|---|---|---|
| Recettes recentes | `recipe_interactions` type `viewed` / `accepted` | localStorage ring buffer si deja implemente, sinon empty state |
| Suggestions cuisine | `POST /api/recommendations/suggest` qui appelle `RecommendationEngine.suggestForUser` | CTA assistant uniquement en PR1 |
| Imports a verifier | `social_recipe_imports`, `imported_recipe_drafts` ou hook PRP-220 existant | Empty state |
| Menus semaine | `weekly_meal_plans` + `meal_plan_entries` | Empty state |
| Anti-gaspi | `inventory.expiry_date` + products | Empty state |
| Missing ingredients | PRP-226 recommended recipe output | Afficher "a calculer" seulement si action non disponible |

No fake data rule :

- si la source n'existe pas ou n'est pas branchee, afficher un empty state
  honnete ;
- ne pas afficher "Activite recente" avec une liste hardcodee ;
- ne pas afficher "Budget" ou "Securite" si non core.

Decision endpoint :

- PRP-234 Today V1 utilise un mini endpoint backend
  `POST /api/recommendations/suggest`.
- Cet endpoint appelle le moteur PRP-226 directement, sans passer par le LLM.
- Request V1 :

```ts
{
  goal?: 'tonight' | 'quick' | 'anti_waste' | 'light' | 'high_protein' | 'comfort' | 'batch_cooking';
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  timeLimitMinutes?: number;
  servings?: number;
  query?: string;
  limitPerBucket?: number;
}
```

- Response V1 : `RecommendationResult` PRP-226, avec les buckets
  `cookable_now`, `almost_cookable`, `recent_suggestions`.
- Auth/rate-limit : proteger avec le meme pattern que les routes assistant
  (`createAuthMiddleware` + `userRateLimit`), user-scoped only.
- Si l'endpoint n'existe pas encore, le bloc "A cuisiner avec ce que tu as"
  reste en CTA-only et la PR ne peut pas etre marquee Today V1 complete.

---

## 6. Types front cible

### 6.1 Today model

```ts
export interface TodayKitchenData {
  continueItems: TodayContinueItem[];
  recommendedRecipes: TodayRecipeSuggestion[];
  inboxCount: number;
  upcomingMeals: TodayMealPlanEntry[];
  expiringItems: TodayExpiringItem[];
}

export interface TodayContinueItem {
  id: string;
  type: 'recipe' | 'import' | 'menu';
  title: string;
  subtitle?: string;
  href: string;
  timestamp?: string;
}

export interface TodayMealPlanEntry {
  id: string;
  day_of_week: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe_id: string | null;
  recipe_name: string | null;
  servings: number | null;
}
```

Clarification :

- `TodayMealPlanEntry` est un **view-model UI**, pas la row Supabase brute.
- Les hooks convertissent `meal_plan_entries` une seule fois vers ce format.
- Les composants Today/Menus ne doivent pas reparcourir ou reparsing les rows
  Supabase.

### 6.2 Menu model

```ts
export interface WeeklyMenuView {
  id: string;
  week_start_date: string;
  entries: MenuEntryView[];
}

export interface MenuEntryView {
  id: string;
  day_of_week: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe_id: string | null;
  recipe_name: string | null;
  servings: number | null;
  prep_time?: number | null;
  cook_time?: number | null;
}
```

---

## 7. Architecture

### 7.1 Files cible

| Fichier | Action |
|---|---|
| `src/pages/kitchen/KitchenDashboard.tsx` | Remplacer hub actions rapides par Today Kitchen V1. |
| `src/pages/MealPlanningPage.tsx` | Remplacer re-export Cipher par Menus V1 ou import nouvelle page. |
| `src/pages/kitchen/MenusPage.tsx` | Creer si on veut isoler la nouvelle page. |
| `src/hooks/useTodayKitchen.ts` | Aggregation front des donnees Today. |
| `src/hooks/useWeeklyMenu.ts` | Lecture/ecriture simple weekly menus. |
| `src/services/mealPlanningApi.ts` | Optionnel si API backend dediee ; sinon Supabase direct avec RLS. |
| `src/components/kitchen/TodayContinuePanel.tsx` | Bloc Continuer. |
| `src/components/kitchen/TodayRecommendationsPanel.tsx` | Bloc A cuisiner. |
| `src/components/kitchen/TodayWeekPanel.tsx` | Bloc Cette semaine. |
| `src/components/kitchen/TodayAntiWastePanel.tsx` | Bloc Anti-gaspi. |
| `src/components/meal-planning/MenuWeekGrid.tsx` | Grille semaine V1. |
| `src/components/meal-planning/MenuEntryCard.tsx` | Item repas. |
| `src/components/meal-planning/AddRecipeToMenuDialog.tsx` | Ajouter recette a un slot. |
| `src/components/navigation/NavigationHub.tsx` | Wording Menus / visibilite. |
| `src/pages/pantry/PantryDashboard.tsx` | Corriger CTA "Planifier" / "Proposer recette". |
| `src/lib/agentEvents.ts` | Verifier invalidation tables meal plan si nouveaux tools. |

### 7.2 Data strategy

V1 peut lire via Supabase client front pour :

- `weekly_meal_plans`;
- `meal_plan_entries`;
- `inventory`;
- `products`.

Pour recommendations PRP-226 :

- preferer endpoint backend si disponible ;
- sinon utiliser l'assistant comme CTA au lieu de dupliquer le scoring.

Decision :

- aucun scoring recommendation ne vit dans `useTodayKitchen`.
- `useTodayKitchen` orchestre seulement les donnees.
- `useTodayKitchen` lance les sources independantes en parallele, pas en chaine.
- Pattern recommande : React Query si disponible sur ces surfaces ; sinon
  `Promise.all` + state local par bloc.
- Chaque bloc a son propre loading/error/empty state pour eviter le flicker
  global.
- Invalidation :
  - `weekly_meal_plans` / `meal_plan_entries` pour Menus ;
  - `recipe_interactions` pour Continuer ;
  - `inventory` / `products` pour Anti-gaspi ;
  - recommendation query key pour "A cuisiner".

---

## 8. PR splitting

### PR1 - Today Kitchen cleanup

Taille : **S/M**.

Scope :

- `/kitchen` devient "Aujourd'hui" ;
- supprimer/renommer quick actions legacy ;
- retirer "Activite recente" si pas de data ;
- ajouter empty states honnetes ;
- cacher ou declasser Menus si encore Cipher ;
- aucun changement schema.

Files :

- `src/pages/kitchen/KitchenDashboard.tsx`
- `src/components/navigation/NavigationHub.tsx`
- `src/pages/pantry/PantryDashboard.tsx`

Verification :

```bash
rg -n "Dashboard cuisine|Actions Rapides|Activite Recente|Planification Repas|Créer la Magie|Mode Famille|Cipher" src/pages/kitchen src/components/navigation src/pages/pantry
npx tsc -p tsconfig.json --noEmit
npm run build
npm run lint
```

DoD :

- `/kitchen` a un titre "Aujourd'hui" ou "Aujourd'hui en cuisine" ;
- aucun bloc fake recent activity ;
- Menus n'est pas vendu comme core si Cipher encore branche ;
- CTA pointent vers routes existantes.

### PR2 - Menus V1 hooks + page + nav

Taille : **M/L**.

Scope :

- creer `useWeeklyMenu`;
- lire/creer weekly plan ;
- ajouter/retirer une entree ;
- s'abonner aux invalidations agent ;
- remplacer `MealPlanningPage` re-export Cipher ;
- creer Menus V1 ;
- grille semaine ;
- dialog ajouter recette ;
- la liste de recettes du dialog vient de `GET /api/v1/recipes` si disponible
  ou du hook existant recettes/user-recipes. Ne pas appeler le tool assistant
  `search_recipes` depuis le front ;
- ouvrir recette ;
- CTA assistant.
- renommer visible "Planification" -> "Menus" dans la nav seulement apres
  route V1 ;
- retirer `isNew` du sous-item `kitchen-meal-planning`.

Files :

- `src/hooks/useWeeklyMenu.ts`
- `src/pages/MealPlanningPage.tsx`
- `src/pages/kitchen/MenusPage.tsx`
- `src/components/meal-planning/MenuWeekGrid.tsx`
- `src/components/meal-planning/MenuEntryCard.tsx`
- `src/components/meal-planning/AddRecipeToMenuDialog.tsx`
- `src/components/navigation/NavigationHub.tsx`
- `src/lib/agentEvents.ts` si tables/tools nouveaux
- `src/integrations/supabase/types.augmented.ts` si types manquants

Verification :

```bash
rg -n "CipherMealPlanningPage|useCipherMealPlanning|Planification des Repas Intelligente|Mode Famille|Sécuriser|Créer la Magie|isNew" src/pages src/components/meal-planning src/components/navigation
npx tsc -p tsconfig.json --noEmit
npm run build
npm run lint
```

DoD :

- `/kitchen/meal-planning` affiche Menus V1, pas Cipher ;
- aucun wording Cipher/famille/security ;
- route stable ;
- page utilisable mobile/desktop ;
- empty state clair si aucun menu.
- lecture semaine courante fonctionne ;
- add/remove slot fonctionne via RLS ;
- action assistant `add_recipe_to_meal_plan` rafraichit la page.

### PR3 - Today Kitchen V1 data + viewed writer + recommendations endpoint

Taille : **M**.

Scope :

- creer `useTodayKitchen`;
- brancher `POST /api/recommendations/suggest` ;
- ecrire `recipe_interactions.viewed` au mount de `RecipeDetail` ;
- brancher inbox/imports si dispo ;
- brancher anti-gaspi depuis inventory ;
- brancher upcoming meals.

Files :

- `apps/api/src/routes/recommendations.routes.ts`
- `apps/api/src/index.ts`
- `src/services/recommendationsApi.ts`
- `src/hooks/useTodayKitchen.ts`
- `src/components/kitchen/TodayContinuePanel.tsx`
- `src/components/kitchen/TodayRecommendationsPanel.tsx`
- `src/components/kitchen/TodayWeekPanel.tsx`
- `src/components/kitchen/TodayAntiWastePanel.tsx`
- `src/pages/kitchen/KitchenDashboard.tsx`
- `src/pages/RecipeDetail.tsx`

Verification :

```bash
npx tsc -p apps/api/tsconfig.json
npx tsc -p tsconfig.json --noEmit
npm run build
npm run lint
```

DoD :

- `/kitchen` montre au moins les blocs avec sources reelles ou empty states ;
- le bloc "A cuisiner" affiche top 3 reel via endpoint ou reste CTA-only si
  endpoint absent, mais dans ce cas la PR n'est pas Today V1 complete ;
- `recipe_interactions.viewed` est ecrit quand une recette est ouverte ;
- `recipe_interactions.viewed` est dedupe ou rate-limite par recette/session pour
  eviter un insert a chaque hot reload/navigation rapide ;
- aucun appel OpenFoodFacts/front direct ;
- aucune logique de scoring dupliquee ;
- les actions ouvrent les bonnes surfaces.

### PR4 - Assistant and shopping integration

Taille : **M**.

Scope :

- depuis Menus, proposer "Demander a l'assistant" avec contexte week/slot ;
- ajouter manquants aux courses depuis une recette planifiee si PRP-226 expose
  missing ingredients ;
- enregistrer `recipe_interactions.planned` si PRP-226 PR3+ existe.

Files :

- `src/components/meal-planning/MenuEntryCard.tsx`
- `src/components/meal-planning/AddRecipeToMenuDialog.tsx`
- `src/services/assistantApi.ts`
- `src/services/recommendationsApi.ts` si existant
- `apps/api/src/services/assistant/handlers/write.ts` seulement si action
  manquante.

Verification :

```bash
npx tsc -p tsconfig.json --noEmit
npx tsc -p apps/api/tsconfig.json
npm run build
npm run lint
```

DoD :

- planifier via assistant met a jour Menus ;
- ajouter manquants ne duplique pas les items de courses si handler existant ;
- cache/invalidation recommendations reste coherent.

---

## 9. Wording

| Ancien | Nouveau |
|---|---|
| Cuisine | Aujourd'hui |
| Dashboard cuisine | Aujourd'hui en cuisine |
| Actions Rapides | Actions utiles / retirer si simple nav |
| Parcourir les Recettes | Ouvrir mes recettes |
| Planification Repas | Menus |
| Planification | Menus |
| Activite Recente | Continuer |
| Recommandations IA | Suggestions de l'assistant |
| Generer Plan | Demander a l'assistant |
| Créer la Magie | Retirer |
| Mode Famille | Retirer |
| Plan sécurisé avec Cipher | Retirer |

Regle :

- le wording dit ce que l'utilisateur peut faire maintenant ;
- pas de wording technologie sauf "assistant" ;
- pas de promesse "intelligente" si la source de data est absente.

---

## 10. UX states

### Accessibilite

Menus V1 introduit une grille semaine + dialog. Exigences :

- la grille a un label visible et une structure clavier claire ;
- chaque slot repas est focusable ou contient une action focusable ;
- `Enter` / `Space` ouvre le slot ou le dialog d'ajout ;
- le dialog `AddRecipeToMenuDialog` a focus trap, Escape, focus initial et retour
  focus ;
- les boutons icones ont `aria-label` ;
- target minimum `44x44` sur mobile ;
- les badges "vide", "planifie", "manquants" ne reposent pas seulement sur la
  couleur.

### Loading

- skeletons par bloc ;
- pas de spinner global si seule une section charge ;
- Menus garde la grille visible si entries se rechargent.

### Empty states

`/kitchen` :

- pas de recette continuee -> CTA "Ouvrir mes recettes" ;
- pas de suggestion -> CTA "Demander a l'assistant" ;
- pas d'import -> texte court ;
- pas de menu -> CTA "Creer un menu" ;
- pas d'anti-gaspi -> "Rien a finir aujourd'hui".

Menus :

- aucun repas planifie -> grille vide + CTA "Ajouter une recette" ;
- aucun resultat recipe picker -> CTA "Importer une recette" ;
- assistant indisponible -> message sobre + action manuelle.

### Error

- erreurs Supabase par bloc ;
- retry local ;
- pas de page blanche ;
- logs console seulement en dev si necessaire.

---

## 10.1 KPI V1

Metrics a logger ou mesurer quand les evenements existent :

- `kitchen_today_opened` : ouverture `/kitchen` ;
- `today_recipe_opened` : recette ouverte depuis Today ;
- `today_recommendation_clicked` : suggestion cliquee ;
- `menu_entry_created` : entree menu ajoutee ;
- `menu_missing_added_to_shopping` : manquants envoyes aux courses.

Objectifs qualitatifs V1 :

- Today doit mener vers une recette ou un menu en moins de 2 clics ;
- Menus doit permettre d'ajouter une recette a la semaine sans passer par Cipher
  ou une page legacy ;
- les empty states doivent proposer une prochaine action claire.

---

## 11. Tests et QA

### Commands

```bash
npx tsc -p tsconfig.json --noEmit
npx tsc -p apps/api/tsconfig.json
npm run build
npm run lint
npm run test
```

### Smoke routes

- `/kitchen`
- `/kitchen/recipes`
- `/kitchen/recipes?tab=inbox`
- `/kitchen/meal-planning`
- `/shopping/list`
- `/pantry`

### Manual scenarios

- user has no recipes ;
- user has recipes but no inventory ;
- user has recommendations ;
- user has no meal plan ;
- user has a week with entries ;
- assistant adds recipe to meal plan while Menus is open ;
- inventory has expiring products ;
- mobile viewport 390px ;
- dark mode.

### Grep gates

```bash
rg -n "CipherMealPlanningPage|useCipherMealPlanning|Plan sécurisé|Créer la Magie|Mode Famille|Dashboard cuisine|Activite Recente" src/pages src/components
rg -n "mock|fake|hardcoded|carbonara|risotto|César" src/pages/kitchen src/components/kitchen src/pages/MealPlanningPage.tsx src/components/meal-planning
```

Interpretation :

- Cipher terms must be absent from core route after PR3.
- Mock food names must not appear in Today/Menus core UI.
- Some legacy files may still exist if archived/unused, but not imported by
  `/kitchen/meal-planning`.

---

## 12. Definition of Done globale

- `/kitchen` a une promesse claire : Aujourd'hui.
- Aucun bloc fake ou mock data visible.
- `/kitchen/meal-planning` n'affiche plus Cipher/family/security.
- Menus V1 utilise `weekly_meal_plans` et `meal_plan_entries`.
- L'assistant peut ajouter une recette au menu et l'UI se rafraichit.
- Les CTA inventory -> recipes/menus pointent vers des surfaces utiles.
- Menus n'est promu dans la navigation qu'apres remplacement du legacy.
- Mobile et desktop sont utilisables.
- `npm run build`, `tsc`, `lint` passent.
- Les empty states sont honnetes et actionnables.

---

## 13. Non-objectifs

- Pas de coach nutrition complet.
- Pas de budget meal planning.
- Pas de family/parental mode.
- Pas de Cipher/encryption UI.
- Pas de generation automatique 7 jours sans validation.
- Pas de nouvelle architecture DB meal planning.
- Pas de refonte totale de Recettes.
- Pas de moteur recommendation duplique dans le front.

---

## 14. Questions tranchees

1. Menus devient-il top-level dans la nav ?
   - **Pas en V1.** Sous Recettes apres PRP-234 PR2, puis top-level seulement
     si l'usage le justifie apres validation produit.
2. Est-ce qu'on garde CipherMealPlanningPage ?
   - **Non sur la route core.** Peut etre archive via PRP-236 si utile comme reference.
3. Est-ce qu'on cree de nouvelles tables meal plan ?
   - **Non.** Utiliser `weekly_meal_plans` / `meal_plan_entries`.
4. Est-ce qu'on affiche des stats menu/nutrition ?
   - **Non V1**, sauf data reelle et source claire.
5. Est-ce que PRP-234 depend de PRP-226 ?
   - **PR1 non**, PR3/PR4 oui pour recommendations et missing ingredients.
6. Endpoint recommendations ou CTA-only ?
   - **Endpoint pour Today V1.** CTA-only est acceptable en PR1 cleanup, pas
     comme etat final de PRP-234.

---

## 15. Prochaine action recommandee

Avant d'ouvrir PRP-234 :

1. verifier que PRP-237 PR1-PR3 est mergee ou que les tokens/primitives sont
   disponibles ;
2. verifier que PRP-226 PR1-PR4 est mergee si on veut afficher "A cuisiner" ;
3. lancer PRP-234 PR1 pour nettoyer `/kitchen` meme si Menus V1 attend ;
4. remplacer `MealPlanningPage` par Menus V1 en PR2 ;
5. brancher Today data + viewed writer + endpoint en PR3 ;
6. terminer assistant/shopping integration en PR4.
