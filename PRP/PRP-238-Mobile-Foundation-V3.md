# PRP-238 — Mobile Foundation V3

> Statut : **DRAFT — pret a coder PR1**
> Date : 2026-05-21
> Sources :
>  - Audit mobile Codex 2026-05-19 (`/private/tmp/smart-pantry-mobile-audit/audit.json`)
>  - Push perf 2026-05-19/20 (commits `9a2d4e75`, `08151936`, `871032de`, `7a65678d`, `6e262815`)
>  - Bugs flash recette signales mobile 2026-05-19/20
>  - Audit performance frontend 2026-05-19 (agents `code-explorer` + `performance-optimizer`)
>  - Iterations plan V1 → V2 → V3 (conversation Claude/Codex 2026-05-20/21)
>
> Objectif : rendre l'experience mobile stable, rapide et lisible sur les routes
> coeur (Recettes, Detail recette, Inventaire, Courses, Assistant) **sans
> refonte UX bottom nav ni consolidation massive de RecipeDetail**.
> Strategie en 3 PRs etagees du moins risque au plus risque, avec preuves
> automatisees par Playwright authentifie.

---

## 0. Decisions prerequises avant code

### 0.1 Decisions techniques verrouillees

| Decision | Choix | Justification |
|---|---|---|
| Pattern auth dans PR2 | React Context `AuthSessionContext` exposant un hook public `useAuthenticatedUser()` | Plus simple que Zustand pour un cas read-only, force les pages a passer par le hook (pas de fallback `getSession()` local) |
| Implementation `useNavCounts()` | 2 `count(*)` queries via TanStack Query (PAS de RPC migration dans cette PRP) | Evite une migration SQL supplementaire dans PR1, garde le scope leger |
| Variables CSS | Centralisees dans `src/index.css` (pas un nouveau fichier dans `src/styles/`) | `src/index.css` est deja l'entry des styles globaux, evite de fragmenter |
| Hooks responsive existants a adapter | Fichiers : `src/hooks/useResponsiveZones.ts` + `src/hooks/useHybridGrid.ts`. **Note** : `useViewport` et `useBreakpoints` ne sont PAS des fichiers separes mais des exports nommes a l'interieur de `useResponsiveZones.ts` (lignes 44 et 98). On adapte donc les 4 exports `useViewport`, `useBreakpoints`, `useResponsiveZones`, `useAdaptiveHero` du meme fichier + le default `useHybridGrid` de l'autre. | Verifie par `grep -nE '^export' src/hooks/useResponsiveZones.ts src/hooks/useHybridGrid.ts` 2026-05-21 |
| Storage state Playwright path | `e2e/.auth/user.json` ajoute a `.gitignore` | Ne jamais committer un storageState authentifie |

### 0.2 Prerequis externes a regler avant PR1

| Prerequis | Statut | Bloquant pour |
|---|---|---|
| Compte utilisateur test Supabase (`E2E_TEST_USER_EMAIL` + `E2E_TEST_USER_PASSWORD`) | TODO | PR1 etape (e) |
| Recipe seed deterministe pour les tests (`E2E_RECIPE_ID`, soit hardcoded sur un seed connu, soit recupere via `recipes_catalog` first row au setup) | TODO | PR1 etape (e), test RecipeDetail |
| Variables ajoutees dans `.env.example` (pas `.env.local`) et configurees Vercel `Production`/`Preview` | TODO | PR1 etape (e) |
| Branches creees : `feat/prp-238-pr1-foundations`, `feat/prp-238-pr2-shell`, `feat/prp-238-pr3-readmodels` | TODO | par PR |

### 0.3 Decisions UX verrouillees

| Decision | Choix |
|---|---|
| Bottom nav destinations | **Inchangees** dans cette PRP (Aujourd'hui, Recettes, Inventaire, Courses, Plus) |
| RecipeDetail comportement fonctionnel | Inchange jusqu'a PR3 inclus |
| Action bar sticky mobile | RecipeDetail uniquement (PR1), pas d'extension a Inventory item ou Shopping item |
| AssistantFAB mobile | Cache sur `/assistant` (deja fait commit `31fdd867`), reste visible ailleurs jusqu'a decision UX bottom nav assistant |

### 0.4 Mode PR1-bis (fallback si user test pas pret)

Si les prerequis 0.2 ne sont pas regles au moment d'attaquer PR1 :

- **Skipper l'etape (e) Playwright authentifie.** PR1 ship sans captures
  authentifiees.
- **Acceptance Criteria PR1 modifies en consequence** :
  - Le critere "Captures Playwright present" devient SKIPPED avec
    justification dans la PR description.
  - Le critere "playwright.config.ts a un project setup + mobile-auth"
    devient SKIPPED.
- Une PR1-bis (`feat/prp-238-pr1-bis-auth-e2e`) shippe les tests
  authentifies des que les prerequis 0.2 sont prets, en parallele de PR2.
- PR2 ne depend PAS de PR1-bis tant que les guardrails publics existants
  passent.

Ce mode est **explicitement documente** ici pour qu'il ne contredise plus
les Acceptance Criteria PR1 section 11.

---

## 1. Contexte

### 1.1 Pourquoi maintenant

Le push perf du 2026-05-19/20 (4 commits + 2 bug fixes) a corrige les
goulots reseau les plus visibles : dedup `fetchUnifiedRecipe`, cache module
30s, batch substitutions, parallel nutrition, `products.nutrition_json` lu
en priorite. Sur RecipeDetail les fetches reseau sont passes de 7-9 a 1-3
Supabase + 0-2 OpenFoodFacts.

**Mais l'experience mobile percue reste degradee** :

- Shell qui remonte a chaque navigation (`AppNavigation` est monte par
  chaque page).
- Plusieurs `supabase.auth.getSession()` au mount par cumul de hooks.
- Bottom nav avec hauteur instable selon safe-area (corrige a
  `aa58dccd`, mais offsets `pb-20/pb-24` dispersees par page).
- Plusieurs hooks responsive (`useResponsiveZones`, `useHybridGrid`)
  installent chacun leurs propres listeners `resize` au lieu de partager
  une source unique throttled.
- `useInventory()` et `useShoppingList()` montes dans `AppNavigation` pour
  des badges → fetch complet a chaque page chargee.
- Bug recurrent "Recette non trouvee" flash au clic recette (corrige
  partiellement en `6e262815`, mais la cause profonde est l'absence d'un
  shell unifie qui pre-resout l'auth + le routing).

### 1.2 Ce qui a deja ete fait (a ne pas refaire)

- `AssistantFAB` cache sur `/assistant` (commit `31fdd867`).
- KitchenDashboard CTAs >= 44px (commit `31fdd867`).
- Shopping list sticky header collapse (commit `d3546944`).
- Inventory error retry (commit `55a5b9e1`).
- Assistant chat plein ecran mobile (commit `220ce097`).
- E2E mobile guardrails publics (commit `235b3544`).
- Cache module unified recipe + invalidation propre (commits `08151936`,
  `6e262815`).

Voir aussi : audit mobile findings P0/P1/P2 traites en commits `31fdd867`
a `220ce097`.

### 1.3 Ce qui reste douloureux malgre le push perf

Les screenshots Playwright `/private/tmp/smart-pantry-mobile-audit/` du
2026-05-19 montrent encore :

- Headers hauts qui repoussent le contenu critique (KitchenDashboard,
  RecipesPage).
- Stats / cards qui occupent le premier ecran avant les actions.
- Action primaires de RecipeDetail ("Cuisiner", "Ajouter manquants",
  "Modifier") atteignables seulement apres scroll, avec FAB qui
  flotte par dessus.
- Inventaire avec liste non virtualisee, ramene par chaque mount de
  AppNavigation.
- Spinner shell complet a chaque changement de route auth.

---

## 2. Scope V3

### 2.1 Inclus

**PR1 — Fondations Mobiles (~6-8h focus)**

- Variables CSS centralisees : `--mobile-nav-height`, `--safe-bottom`.
- `useNavCounts()` lightweight pour les badges Inventaire + Courses,
  remplace l'usage de `useInventory()` et `useShoppingList()` dans
  `AppNavigation`.
- `ResponsiveProvider` + `useResponsive()` throttled `requestAnimationFrame`,
  consomme par tous les exports responsive existants
  (`useViewport`, `useBreakpoints`, `useResponsiveZones`, `useAdaptiveHero`
  dans `useResponsiveZones.ts` ; `useHybridGrid` + cousins dans
  `useHybridGrid.ts`).
- Action bar sticky mobile sur **RecipeDetail uniquement** (Cuisiner /
  Ajouter manquants / Modifier).
- Playwright authentifie avec `storageState`, captures de reference
  mobile + desktop pour les routes : `/home`, `/kitchen`, `/kitchen/recipes`,
  `/pantry`, `/pantry/inventory`, `/shopping/list`, `/assistant`, et un
  `RecipeDetail` exemple.

**PR2 — Shell Unifie (~4-6h focus, migration atomique)**

- Layout `AuthenticatedLayout` au niveau router qui monte
  `AppNavigation` une seule fois.
- Suppression dans la meme PR de tous les wrappers `<AppNavigation>` par
  page et des `supabase.auth.getSession()` dupliques.
- `AssistantFAB` reste mounted globalement mais hide sur mobile quand la
  bottom nav contient deja l'entree Assistant (deja fait pour `/assistant`,
  on etend a tout mobile si la bottom nav garde l'entree).
- Aucun mode hybride : flag day clean.

**PR3 — Refactor Page-Level Cible (~6-10h focus, optionnel)**

- Lazy-load des surfaces lourdes recettes/import/catalogue **apres**
  stabilisation PR1+PR2 et captures de reference.
- Read-models legers ciblees si les captures revelent encore des
  lenteurs (ex: `useNutritionForRecipe(recipeId)` separe d'analyse,
  ou `useRecipeShoppingPlan(recipeId)` pour les missing).
- **Pas de mega-hook `useRecipeDetailView`**. Les hooks existants
  (`useRecipes`, `useInventory`, `useShoppingList`) restent proprietaires
  des mutations et listes.

### 2.2 Exclus de cette PRP

- Refonte UX bottom nav (changement destinations) → necessite UX validation
  separee.
- Refonte RecipeDetail en mega-hook → reporte indefiniment, on prefere
  read-models ciblees seulement si necessaire.
- Migration `useInventory` / `useRecipes` vers `useQuery` complete →
  reporte (Phase 3.2 du push perf, deja documente comme deferred).
- Service Worker → `vite-plugin-pwa` (Phase 6 du push perf, deferred).
- Virtualisation liste Inventory (Phase 4 du push perf, deferred).
- Cleanup three.js (Phase 7 du push perf, deferred).

### 2.3 Non-objectifs

- On ne refait pas l'audit mobile : on traite les findings deja identifies.
- On ne refactor pas les composants de design dans `src/components/ui/*`.
- On ne touche pas a la palette / typo / motion (PRP-237).

---

## 3. Architecture cible

### 3.1 Shell unifie (PR2)

```
src/App.tsx
  └─ <QueryClientProvider>
       └─ <ResponsiveProvider>            ← nouveau (PR1)
            └─ <AssistantProvider>
                 └─ <Routes>
                      ├─ /auth, /onboarding         (publiques)
                      └─ <AuthenticatedLayout>      ← nouveau (PR2)
                           ├─ <AppNavigation>       ← mount unique
                           └─ <Outlet>              ← rend la page sans wrapper
                                ├─ /pantry/inventory   (juste InventoryPage)
                                ├─ /kitchen/recipes    (juste RecipesPage)
                                ├─ /kitchen/recipes/:id (juste RecipeDetail)
                                └─ ...
```

### 3.2 Hierarchie des hooks de navigation

```
AuthenticatedLayout (PR2)
  ├─ useContext(AuthSessionContext) ← lit user + isLoading
  └─ <AppNavigation user={ctx.user}>   ← passe user en prop, signature inchangee
        ├─ useNavCounts(user?.id)      ← (PR1) badges, 2 count(*) TanStack, auth-passif
        └─ useResponsive()             ← (PR1) breakpoint + viewport + navHeight

Pages enfants de AuthenticatedLayout (PR2)
  └─ useAuthenticatedUser()            ← hook public, throw si pas auth
                                         (utilise par les pages qui ont besoin
                                          de user.id pour leurs queries)
```

**Note de modele auth (verrouille V3.3)** :
- `AuthenticatedLayout` lit le context une fois et passe `user` a
  `AppNavigation` via prop. Signature actuelle de AppNavigation
  preservee.
- `useAuthenticatedUser()` est utilise par les **pages enfants**, pas
  par AppNavigation. Les pages qui ont besoin de `user.id` pour leurs
  queries appellent `useAuthenticatedUser()` au lieu de
  `supabase.auth.getSession()`.
- Ce modele evite que `AppNavigation` deviennent un consommateur de
  context auth (qui forcerait un re-render plus large) et garde sa
  prop API stable.

Plus de `useInventory()` ni `useShoppingList()` dans `AppNavigation`.

### 3.3 Conventions CSS (PR1)

```css
:root {
  --mobile-nav-height: 4.5rem;      /* 72px hauteur visuelle bottom nav */
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --content-bottom-pad: calc(var(--mobile-nav-height) + var(--safe-bottom) + 0.5rem);
}

@media (min-width: 640px) {
  :root {
    --mobile-nav-height: 0px;        /* sm+ : sidebar, pas de bottom nav */
    --content-bottom-pad: 1.5rem;
  }
}

.app-content {
  padding-bottom: var(--content-bottom-pad);
}

.app-action-bar-mobile {
  position: sticky;
  bottom: var(--mobile-nav-height);  /* s'empile au-dessus de la nav */
  padding-bottom: var(--safe-bottom);
}
```

Supprime les `pb-20`, `pb-24`, `mb-safe` dispersees dans les pages.

### 3.4 Action bar RecipeDetail (PR1)

```tsx
// src/components/recipes/RecipeMobileActionBar.tsx — NOUVEAU
export function RecipeMobileActionBar({
  onCook, onAddMissing, onEdit, missingCount,
}: RecipeMobileActionBarProps) {
  // sticky bottom, safe-area, h-14 (≥ 44px tap),
  // mobile-only (sm:hidden), 3 boutons egaux
}
```

Integre dans RecipeDetail :
- mobile : `<RecipeMobileActionBar>` en sticky en bas
- desktop : `<RecipePrimaryActions>` existant inline (inchange)

---

## 4. Inventaire fichiers a toucher

### 4.1 PR1 — Fondations

| Fichier | Action | Note |
|---|---|---|
| `src/index.css` | MODIFY | Ajouter `:root` vars `--mobile-nav-height`, `--safe-bottom`, `--content-bottom-pad` + classes `.app-content`, `.app-action-bar-mobile` |
| `src/contexts/ResponsiveContext.tsx` | NOUVEAU | Provider + context value |
| `src/hooks/useResponsive.ts` | NOUVEAU | Consumer hook (`useContext(ResponsiveContext)`) |
| `src/hooks/useResponsiveZones.ts` | MODIFY | Fichier qui exporte `useViewport`, `useBreakpoints`, `useResponsiveZones`, `useAdaptiveHero`. Les 4 exports doivent consommer `useResponsive()` au lieu d'installer chacun leur listener `resize`. |
| `src/hooks/useHybridGrid.ts` | MODIFY | Fichier qui exporte `useHybridGrid`, `usePlatformAdaptiveTouch`, `useGoldenLayout`, `useContextualLayout`. Adapter pour consommer `useResponsive()`. |
| `src/hooks/useNavCounts.ts` | NOUVEAU | 2 `count(*)` TanStack queries (inventory expiring + shopping unchecked) |
| `src/components/navigation/AppNavigation.tsx` | MODIFY | Retirer `useInventory()` et `useShoppingList()` ; importer `useNavCounts(user?.id)` ; ajouter `data-testid="app-navigation"` sur le root rendu (utilise par les guardrails Playwright pour assert le shell unique) |
| `src/components/navigation/MobileNavigation.tsx` | MODIFY | `style={{ height: 'var(--mobile-nav-height)' }}` au lieu de `min-h-[56px]` ; ajouter `data-testid="mobile-bottom-nav"` |
| `src/components/recipes/RecipeMobileActionBar.tsx` | NOUVEAU | Sticky bottom, `sm:hidden`, 3 boutons h-11, `data-testid="recipe-action-bar-mobile"` |
| `src/pages/RecipeDetail.tsx` | MODIFY | Integre l'action bar mobile, retire `pb-*` ad-hoc |
| `src/pages/SmartShoppingList.tsx` | MODIFY | `className="app-content"` |
| `src/pages/Inventory.tsx` | MODIFY | `className="app-content"` |
| `src/pages/InventoryPage.tsx` | MODIFY si applicable | Idem |
| `playwright.config.ts` | MODIFY | Project `setup` + project `mobile-auth` avec `storageState` |
| `e2e/auth.setup.ts` | NOUVEAU | Login + capture storageState |
| `e2e/mobile-foundation.spec.ts` | NOUVEAU | Captures de reference 7 routes + RecipeDetail, 3 viewports |
| `e2e/mobile-guardrails.spec.ts` | MODIFY | Etendre aux routes auth |
| `e2e/README.md` | MODIFY ou NOUVEAU | Documenter procedure seed user test + regen storageState |
| `.env.example` | MODIFY | Ajouter `E2E_TEST_USER_EMAIL`, `E2E_TEST_USER_PASSWORD`, `E2E_RECIPE_ID` (commentes par defaut) |
| `.gitignore` | MODIFY | Ajouter `e2e/.auth/` |

**Important** : `.env.local` n'est PAS modifie par le commit ni listee. Le
contributeur (dev local) duplique `.env.example` vers `.env.local` et y
met ses propres valeurs. Vercel les configure cote dashboard (Production
+ Preview).

### 4.2 PR2 — Shell Unifie

| Fichier | Action | Note |
|---|---|---|
| `src/components/layout/AuthenticatedLayout.tsx` | NOUVEAU | Layout protege |
| `src/App.tsx` | MODIFY | Restructurer routes avec layout parent |
| `src/components/navigation/AppNavigation.tsx` | MODIFY | Ne s'auto-mount plus en tant que page wrapper |
| Chaque `src/pages/*.tsx` qui appelle `<AppNavigation user={...}>` | MODIFY | Retirer le wrapper et le `getSession()` |
| `src/components/assistant/AssistantProvider.tsx` | MODIFY | Hide FAB sur mobile + assistant nav (deja partiel) |

### 4.2.1 Liste exhaustive (audit `grep` 2026-05-21)

**12 pages wrappent `<AppNavigation>` ou `<PageWrapper>` aujourd'hui**
(verifie par `grep -rln "<AppNavigation\|<PageWrapper" src/pages`) :

```
src/pages/AssistantAI.tsx
src/pages/InsightsPage.tsx
src/pages/InventoryPage.tsx
src/pages/RecipesPage.tsx
src/pages/Settings.tsx
src/pages/SmartShoppingList.tsx
src/pages/WasteInsightsPage.tsx
src/pages/assistant/AssistantDashboard.tsx
src/pages/kitchen/KitchenDashboard.tsx
src/pages/kitchen/MenusPage.tsx
src/pages/pantry/PantryDashboard.tsx
src/pages/shopping/ShoppingDashboard.tsx
```

**14 pages contiennent un `supabase.auth.getSession()` ou
`.auth.getUser()` direct** (verifie par
`grep -rln "auth\.getSession\|auth\.getUser" src/pages`) :

```
src/pages/AssistantAI.tsx
src/pages/Auth.tsx                   ← EXCLUDE (page login, pas migree)
src/pages/CipherMealPlanningPage.tsx
src/pages/Index.tsx
src/pages/InsightsPage.tsx
src/pages/RecipeDetail.tsx
src/pages/RecipesPage.tsx
src/pages/Settings.tsx
src/pages/SmartShoppingList.tsx
src/pages/assistant/AssistantDashboard.tsx
src/pages/kitchen/KitchenDashboard.tsx
src/pages/kitchen/MenusPage.tsx
src/pages/pantry/PantryDashboard.tsx
src/pages/shopping/ShoppingDashboard.tsx
```

**Union des 2 listes** (15 pages a migrer dans PR2, hors `Auth.tsx`
publique et hors `Inventory.tsx` qui n'a ni wrapper ni `getSession`) :

| Page | Wrapper a retirer | `getSession()` a remplacer | Notes |
|---|---|---|---|
| `Index.tsx` | non | oui | Home authentifiee |
| `pantry/PantryDashboard.tsx` | oui | oui | |
| `InventoryPage.tsx` | oui | non | Possibly via `<PageWrapper>` |
| `kitchen/KitchenDashboard.tsx` | oui | oui | |
| `RecipesPage.tsx` | oui | oui | |
| `RecipeDetail.tsx` | non | oui | Pas de wrapper mais `getSession()` pour `viewed` |
| `kitchen/MenusPage.tsx` | oui | oui | |
| `CipherMealPlanningPage.tsx` | non | oui | Page secondaire menus, pas de wrapper actuellement |
| `SmartShoppingList.tsx` | oui | oui | |
| `shopping/ShoppingDashboard.tsx` | oui | oui | |
| `assistant/AssistantDashboard.tsx` | oui | oui | |
| `AssistantAI.tsx` | oui | oui | Page assistant secondaire |
| `InsightsPage.tsx` | oui | oui | |
| `WasteInsightsPage.tsx` | oui | non | |
| `Settings.tsx` | oui | oui | |

**Note `Inventory.tsx`** : ce fichier n'a ni wrapper ni `getSession()`.
Il est probablement importe par `InventoryPage.tsx` comme composant
interne. **Hors PR2.** Verifier au moment de PR2 que rien n'a change.

**Action concrete au moment de PR2** : refaire le grep ci-dessous pour
verifier que la liste reste valable :

```bash
grep -rln "<AppNavigation\|<PageWrapper" src/pages --include="*.tsx"
grep -rln "auth\.getSession\|auth\.getUser" src/pages --include="*.tsx" \
  | grep -v "Auth.tsx"
```

Si une page nouvelle apparait entre l'ecriture de la PRP et la PR, la
checklist doit etre regeneree.

### 4.3 PR3 — Read-models cibles (si necessaire)

Decide apres captures PR2. Candidats :

- `src/hooks/useNutritionForRecipe.ts` — separe la nutrition de l'analyse.
- `src/hooks/useRecipeShoppingPlan.ts` — pre-calcule la "missing list".
- Lazy split `src/pages/Recipes.tsx` par tab (library / import / catalog).

---

## 5. PR splitting

### PR1 — `feat/prp-238-pr1-foundations`

**Scope** : etapes (a) a (e) ci-dessous, dans l'ordre.
**Risque** : faible. Pas de routing, pas de mutations.
**Commit unitaire par etape** pour faciliter le bisect.

### PR2 — `feat/prp-238-pr2-shell`

**Scope** : `AuthenticatedLayout` + migration atomique de toutes les
pages protegees. **Single commit** pour eviter un etat hybride sur main.
**Pre-requis** : PR1 merged + screenshots de reference disponibles.

### PR3 — `feat/prp-238-pr3-readmodels` (optionnel)

**Scope** : decide en fonction des captures post-PR2.
**Pre-requis** : PR2 stable depuis au moins 48h, retours utilisateur
positifs ou mesures Lighthouse en amelioration.

---

## 6. PR1 — Plan d'execution detaille

### (a) Variables CSS centralisees [~30 min]

1. Ajouter le bloc `:root` ci-dessus a `src/index.css`.
2. Definir `.app-content` et `.app-action-bar-mobile` classes utilitaires.
3. Grep tout l'app pour `pb-20`, `pb-24`, `mb-safe`, `padding-bottom: 5rem`
   etc. Remplacer par `className="app-content"` (JSX, 1 a 1) dans les pages cibles :
   `Inventory.tsx`, `SmartShoppingList.tsx`, `RecipeDetail.tsx`,
   `KitchenDashboard.tsx`.
4. `MobileNavigation.tsx` : utiliser `style={{ height: 'var(--mobile-nav-height)' }}` au lieu de `min-h-[56px]`.

**Sortie commit** : `feat(mobile): centralise safe-area + nav height via CSS variables`.

### (b) ResponsiveProvider + useResponsive [~1h]

1. Creer `src/contexts/ResponsiveContext.tsx` avec un Provider unique.
2. Le provider expose `{ viewport, breakpoint, isMobile, navHeight }` via
   un listener `resize` throttled en `requestAnimationFrame`.
3. Wrapper `<App>` autour de `<ResponsiveProvider>` dans `src/App.tsx`.
4. Adapter les hooks responsive existants pour consommer `useResponsive()`
   au lieu d'installer chacun leur listener `resize` :
   - Dans `src/hooks/useResponsiveZones.ts` : `useViewport` (l.44),
     `useBreakpoints` (l.98), `useResponsiveZones` (l.135),
     `useAdaptiveHero` (l.270).
   - Dans `src/hooks/useHybridGrid.ts` : `useHybridGrid` (l.24),
     `usePlatformAdaptiveTouch`, `useGoldenLayout`, `useContextualLayout`.
   - Les signatures publiques de tous ces hooks restent identiques ;
     seule l'implementation interne change pour lire depuis le context.

**Sortie commit** : `perf(mobile): single ResponsiveProvider with rAF-throttled resize listener`.

### (c) useNavCounts + retrait hooks lourds [~1h30]

**Decisions verrouillees section 0** :
- 2 `count(*)` queries via TanStack Query (PAS de RPC, PAS de migration SQL)
- **Hook auth-passif** : `useNavCounts(userId)` recoit l'id en parametre,
  pas de `getSession()` ni de `useAuthenticatedUser()` cache dedans.
  AppNavigation possede deja le `user` en prop, il transmet `user.id`.
  Ca evite d'introduire en PR1 le pattern auth qui n'arrive qu'en PR2.

1. Creer `src/hooks/useNavCounts.ts` qui retourne
   `{ expiringSoonCount, shoppingOpenCount, isLoading }`.

2. Implementation auth-passive :
   ```ts
   export function useNavCounts(userId: string | null | undefined) {
     const enabled = Boolean(userId);

     const expiring = useQuery({
       queryKey: ['nav-counts', 'expiring', userId],
       enabled,
       queryFn: async () => {
         if (!userId) return 0; // narrowing pour TS, enabled garantit pas d'appel
         const sevenDaysFromNow = new Date(Date.now() + 7 * 86400_000).toISOString();
         const { count, error } = await supabase
           .from('inventory')
           .select('*', { count: 'exact', head: true })
           .eq('user_id', userId)
           .lte('expiry_date', sevenDaysFromNow);
         if (error) throw error;
         return count ?? 0;
       },
       staleTime: 60_000,
       refetchOnWindowFocus: false,
     });

     const shopping = useQuery({
       queryKey: ['nav-counts', 'shopping', userId],
       enabled,
       queryFn: async () => {
         if (!userId) return 0;
         const { count, error } = await supabase
           .from('shopping_list_items')
           .select('*', { count: 'exact', head: true })
           .eq('user_id', userId)
           .eq('purchased', false);
         if (error) throw error;
         return count ?? 0;
       },
       staleTime: 60_000,
       refetchOnWindowFocus: false,
     });

     return {
       expiringSoonCount: expiring.data ?? 0,
       shoppingOpenCount: shopping.data ?? 0,
       isLoading: enabled && (expiring.isLoading || shopping.isLoading),
     };
   }
   ```

3. Dans `AppNavigation.tsx` :
   - Retirer `useInventory()` et `useShoppingList()`.
   - AppNavigation recoit deja `user` en prop (signature actuelle
     `<AppNavigation user={user}>`). Appeler
     `useNavCounts(user?.id)`.
   - Lire les badges depuis le retour du hook.

4. Apres PR2, AppNavigation pourra etre simplifie pour lire `user`
   depuis le context plutot qu'en prop, mais le hook reste appele de la
   meme facon (`useNavCounts(user.id)`). Aucune migration de signature
   necessaire entre PR1 et PR2.

5. Verifier qu'aucune autre logique dans AppNavigation ne depend de la
   liste complete d'items (sinon refactor cible).

**Sortie commit** : `perf(nav): lightweight useNavCounts() replaces full inventory+shopping fetches in AppNavigation`.

### (d) Action bar mobile RecipeDetail [~1h]

1. Creer `src/components/recipes/RecipeMobileActionBar.tsx` (sticky
   bottom, safe-area, mobile-only, 3 boutons h-11).
2. Integrer dans `RecipeDetail.tsx` :
   ```tsx
   <div className="sm:hidden">
     <RecipeMobileActionBar
       onCook={handleCook}
       onAddMissing={handleAddMissingToShopping}
       onEdit={() => navigate(`/kitchen/recipes/${id}/edit`)}
       missingCount={inventoryAnalysis?.missingIngredients.length ?? 0}
     />
   </div>
   <div className="hidden sm:block">
     <RecipePrimaryActions {...} />
   </div>
   ```
3. Ajouter `data-testid="recipe-action-bar-mobile"` pour les tests.
4. Verifier qu'il ne se chevauche pas avec la bottom nav (utilise
   `--mobile-nav-height` pour s'empiler).

**Sortie commit** : `feat(recipe): sticky mobile action bar with primary actions reachable without scroll`.

### (e) Playwright authentifie + captures [~2-3h]

1. Creer `e2e/auth.setup.ts` :
   ```ts
   import { test as setup } from '@playwright/test';
   setup('authenticate', async ({ page }) => {
     await page.goto('/auth');
     await page.fill('input[type=email]', process.env.E2E_TEST_USER_EMAIL!);
     await page.fill('input[type=password]', process.env.E2E_TEST_USER_PASSWORD!);
     await page.click('button[type=submit]');
     await page.waitForURL((url) => !url.pathname.startsWith('/auth'));
     await page.context().storageState({ path: 'e2e/.auth/user.json' });
   });
   ```
2. Modifier `playwright.config.ts` pour ajouter un `setup` project + un
   project `mobile-auth` qui utilise `storageState: 'e2e/.auth/user.json'`.

3. Ajouter `e2e/.auth/` a `.gitignore` (le storageState contient un
   token de session — ne JAMAIS le committer).

4. **Strategie `E2E_RECIPE_ID` deterministe** : 3 options, choisir une :
   - **a) Seed connu (preferable)** : ajouter une migration ou un seed
     dev qui inserte une recette test avec id deterministe (ex:
     `00000000-0000-0000-0000-000000000001`). Verrouille `E2E_RECIPE_ID`
     a cette valeur dans `.env.example`.
   - **b) Query first row au setup** : dans `auth.setup.ts`, apres
     login, query `recipes_catalog` pour le 1er id et l'expose via
     `process.env.E2E_RECIPE_ID` pour le run.
   - **c) Hardcode un id du compte test** : si le user test a une
     bibliotheque seedee, hardcoder l'id d'une recette qu'il possede.

   **Choix verrouille** : option (a) si on accepte d'ajouter un seed,
   sinon (b) pour eviter la migration. Le contributeur PR1 tranche dans
   sa PR description et met a jour `.env.example`.

5. Creer `e2e/mobile-foundation.spec.ts` qui visite les routes auth et
   capture screenshots de reference :
   - `/home`, `/kitchen`, `/kitchen/recipes`, `/pantry/inventory`,
     `/shopping/list`, `/assistant`, `RecipeDetail` (avec
     `process.env.E2E_RECIPE_ID`).
   - 3 viewports : iPhone SE (390x844), iPhone Pro Max (430x932),
     Pixel 7 (default).
4. Etendre `e2e/mobile-guardrails.spec.ts` aux routes auth :
   - Aucun scroll horizontal.
   - Tap targets >= 44px sur les `data-testid="primary-action"`.
   - Aucun element fixed couvrant `primary-action`.
   - Spinner pas bloque > 8s.
5. Ajouter doc dans `e2e/README.md` : comment seeder le user test et
   regenerer le storageState.

**Sortie commit** : `test(e2e): authenticated mobile screenshots + extended guardrails`.

### (f) Verification PR1

| Critere | Methode |
|---|---|
| Aucun `pb-20` / `pb-24` dans `src/pages` | `grep -r 'pb-20\|pb-24' src/pages` retourne vide ou justification |
| AppNavigation ne mount plus useInventory / useShoppingList | Test unitaire ou `grep -r 'useInventory\|useShoppingList' src/components/navigation` |
| ResponsiveProvider unique | `grep -r 'addEventListener.*resize' src/hooks src/contexts` doit montrer 1 seul listener |
| Captures Playwright present | `ls e2e/screenshots/mobile-foundation/` |
| TypeScript clean | `pnpm tsc --noEmit` zero erreur |
| Lighthouse mobile (manuel) | Score >= 80 sur perf, accessibilite >= 95 |

---

## 7. PR2 — Plan d'execution detaille

### (a) AuthenticatedLayout + AuthSession Context [~1h30]

**Pattern verrouille en section 0** : React Context + hook public
`useAuthenticatedUser()`. Les pages NE PEUVENT PLUS appeler
`supabase.auth.getSession()` directement.

1. Creer `src/contexts/AuthSessionContext.tsx` :
   ```tsx
   interface AuthSessionContextValue {
     user: User | null;
     isLoading: boolean;
     // Ne pas exposer setUser : transitions gerees par onAuthStateChange.
   }

   const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

   export function AuthSessionProvider({ children }: { children: ReactNode }) {
     const [user, setUser] = useState<User | null>(null);
     const [isLoading, setIsLoading] = useState(true);

     useEffect(() => {
       let mounted = true;
       supabase.auth.getSession().then(({ data }) => {
         if (mounted) {
           setUser(data.session?.user ?? null);
           setIsLoading(false);
         }
       });
       const { data: { subscription } } = supabase.auth.onAuthStateChange(
         (_event, session) => {
           if (mounted) setUser(session?.user ?? null);
         },
       );
       return () => { mounted = false; subscription.unsubscribe(); };
     }, []);

     return (
       <AuthSessionContext.Provider value={{ user, isLoading }}>
         {children}
       </AuthSessionContext.Provider>
     );
   }
   ```

2. Creer `src/hooks/useAuthenticatedUser.ts` :
   ```tsx
   /**
    * Hook public pour les pages PROTEGEES. Throw si l'user est null,
    * car le layout AuthenticatedLayout a deja redirige sur /auth dans
    * ce cas. Garantit a l'appelant que user existe.
    */
   export function useAuthenticatedUser(): User {
     const ctx = useContext(AuthSessionContext);
     if (!ctx) throw new Error('useAuthenticatedUser must be used inside AuthSessionProvider');
     if (!ctx.user) throw new Error('useAuthenticatedUser called outside an authenticated route');
     return ctx.user;
   }
   ```

3. Creer `src/components/layout/AuthenticatedLayout.tsx` :
   ```tsx
   export function AuthenticatedLayout() {
     const ctx = useContext(AuthSessionContext);
     if (!ctx) throw new Error('AuthenticatedLayout requires AuthSessionProvider');
     if (ctx.isLoading) return <PageLoader />;
     if (!ctx.user) return <Navigate to="/auth" replace />;
     return (
       <AppNavigation user={ctx.user}>
         <Outlet />
       </AppNavigation>
     );
   }
   ```

4. Wrapper `<App>` autour de `<AuthSessionProvider>` dans `App.tsx`.

### (b) Restructurer App.tsx [~30 min]

```tsx
const baseRoutes: RouteObject[] = [
  { path: "/auth", element: <Auth /> },
  { path: "/onboarding", element: withSuspense(OnboardingPage) },
  { path: "/share-target", element: withSuspense(ShareTarget) },
  {
    element: <AuthenticatedLayout />,
    children: [
      { path: "/", element: <Index /> },
      { path: "/pantry", element: withSuspense(PantryDashboard) },
      { path: "/pantry/inventory", element: withSuspense(InventoryPage) },
      { path: "/kitchen", element: withSuspense(KitchenDashboard) },
      { path: "/kitchen/recipes", element: withSuspense(RecipesPage) },
      { path: "/kitchen/recipes/:id", element: withSuspense(RecipeDetail) },
      { path: "/kitchen/recipes/:id/edit", element: withSuspense(RecipeEdit) },
      { path: "/kitchen/meal-planning", element: withSuspense(MealPlanningPage) },
      { path: "/shopping/list", element: withSuspense(SmartShoppingList) },
      { path: "/assistant", element: withSuspense(AssistantDashboard) },
      { path: "/insights/waste", element: withSuspense(WastePage) },
      { path: "/settings", element: withSuspense(SettingsPage) },
      // ...
    ],
  },
];
```

### (c) Migration atomique des pages [~2-3h]

Pour chaque page auth listee section 4.2 :

1. Supprimer l'import `AppNavigation` et `useAuth*` redondant.
2. Supprimer le wrapper `<AppNavigation user={user}>` et son `if (!user)
   return <Navigate to="/auth" />`.
3. Le `return` direct devient le contenu de la page (plus de double
   wrapper).
4. Verifier que les pages utilisent toujours `<div className="page-container app-content">`.

Script suggere pour aider :

```bash
grep -l "AppNavigation user" src/pages -r --include="*.tsx"
# Pour chaque fichier, lire, supprimer le wrapper, verifier.
```

### (d) AssistantFAB mobile [~15 min]

Dans `AssistantProvider.tsx` (deja en partie fait au commit `31fdd867`) :

```tsx
const hideFab =
  location.pathname.startsWith('/assistant') ||
  (isMobile && hasAssistantInBottomNav);
```

Si la bottom nav garde l'entree Assistant, le FAB devient desktop-only.

### (e) Verification PR2

| Critere | Methode |
|---|---|
| Aucun double rendu `AppNavigation` | Captures Playwright + test `await page.locator('[data-testid=app-navigation]').count()` === 1 |
| `getSession()` appele 1 fois par navigation | DevTools Network filtre + verification manuelle |
| Pas de regression desktop | Captures dektop avant/apres |
| Transitions route mobile sans spinner shell complet | Captures video Playwright |

---

## 8. PR3 — Decision tree (post-stabilisation)

A faire **apres** PR1+PR2 merged + 48h de stabilite.

```
Captures mobile montrent encore un delai > 1s sur RecipeDetail ?
├─ Oui → considerer un read-model `useRecipeShoppingPlan(id)` separe
│         pour pre-calculer la missing list cote serveur (RPC)
│
├─ Non → mais Lighthouse Mobile < 80 ?
│        └─ Oui → lazy split Recipes.tsx par tab (library / import / catalog)
│        └─ Non → PR3 pas necessaire, fermer la PRP
│
└─ Bonus : si Recipes.tsx > 300KB bundle non-gz → lazy split obligatoire
```

---

## 9. Hook Policy

### 9.1 Regles strictes

1. **`useInventory()` et `useShoppingList()` ne sont plus montes dans
   `AppNavigation`.** Ils restent montes dans les pages metier (Inventory,
   SmartShoppingList) et dans les composants qui en ont besoin pour les
   mutations.

2. **Les hooks existants restent valides pour les pages metier et les
   mutations.** Aucune migration TanStack Query forcee, on n'introduit pas
   de duplicate state.

3. **Les nouveaux hooks de navigation ou de detail doivent etre read-only,
   cibles, sans subscription realtime lourde par defaut.** Ex:
   `useNavCounts()` fait un count(*) toutes les 60s, pas une subscription
   sur `inventory` table entiere.

4. **Aucun ancien hook ne doit etre remplace tant qu'un ecran n'a pas une
   capture mobile ou desktop equivalente.** Avant/apres obligatoires.

### 9.2 Anti-patterns a eviter

- ❌ Creer un mega-hook `useRecipeDetailView` qui agrege 5 sources : on
  perd la separation des responsabilites et on accumule les abonnements
  realtime.
- ❌ Mounter `useInventory` dans un composant de navigation pour un
  unique compteur : utiliser un count RPC dedie.
- ❌ Plusieurs `useEffect(() => addEventListener('resize', ...))` dans
  des hooks differents : un seul listener via `ResponsiveProvider`.
- ❌ Wrappers `<AppNavigation>` par page (PR2 corrige).
- ❌ Mode hybride (ancien shell + nouveau layout coexistant sur main).

---

## 10. Tests et verification

### 10.1 Tests E2E mobile authentifies (livre par PR1)

Suite `e2e/mobile-foundation.spec.ts` :

```ts
test.describe('mobile foundation', () => {
  test('home authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid=app-navigation]')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/mobile-foundation/home.png' });
  });

  test('recipe detail mobile action bar visible', async ({ page }) => {
    await page.goto(`/kitchen/recipes/${process.env.E2E_RECIPE_ID}`);
    const bar = page.locator('[data-testid=recipe-action-bar-mobile]');
    await expect(bar).toBeVisible();
    const cookBtn = bar.locator('button', { hasText: 'Cuisiner' });
    expect((await cookBtn.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  });

  // ... routes /pantry, /shopping/list, /assistant ...
});
```

### 10.2 Guardrails etendus (extension de `mobile-guardrails.spec.ts`)

Pour chaque route auth :

- `await assertNoHorizontalScroll(page)`
- `await assertNoFixedOverlap(page, '[data-testid=primary-action]')`
- `await assertAllTapTargets44px(page, 'button, [role=button]')`
- `await assertNoStuckSpinner(page, 8000)`

### 10.3 Non-regression desktop

Captures desktop avant/apres pour chaque route :
- Sidebar lisible
- Drawer secondaire intact
- AssistantFAB visible en bas droite (sauf `/assistant`)
- Aucun layout shift

### 10.4 Verification manuelle obligatoire

| Etape | Procedure |
|---|---|
| Smoke mobile post-PR1 | iPhone Safari + Chrome Android sur deploy preview |
| Smoke desktop post-PR1 | Chrome + Firefox + Safari sur deploy preview |
| Smoke mobile post-PR2 | Idem, focus sur transitions de route (pas de spinner shell) |
| Lighthouse Mobile | Score >= 80 perf, >= 95 a11y sur `/kitchen/recipes/:id` |
| Lighthouse Desktop | Score >= 90 perf sur la meme route |

---

## 11. Acceptance Criteria

### PR1

- [ ] Aucun `pb-20` / `pb-24` ad-hoc dans `src/pages/*.tsx` (sauf
      justifications listees dans la PR).
- [ ] `AppNavigation` ne monte ni `useInventory()` ni `useShoppingList()`.
- [ ] `useNavCounts()` est cache 60s avec `refetchOnWindowFocus: false`.
- [ ] `ResponsiveProvider` est l'unique source de viewport / breakpoint /
      navHeight. Anciens hooks deviennent des adaptateurs.
- [ ] `RecipeMobileActionBar` est visible sur mobile (< 640px) et son
      bouton Cuisiner mesure >= 44px de hauteur.
- [ ] `RecipePrimaryActions` desktop reste inchange.
- [ ] `playwright.config.ts` a un project `setup` + `mobile-auth`.
- [ ] `e2e/mobile-foundation.spec.ts` capture les 7 routes + RecipeDetail.
- [ ] Les bottom nav destinations ne changent pas.
- [ ] PR1 ne touche pas au routing auth global.

### PR2

- [ ] `AuthenticatedLayout` est mounted une et une seule fois pour les
      routes protegees.
- [ ] Toutes les pages protegees sont migrees dans la meme PR (pas de
      mode hybride).
- [ ] `supabase.auth.getSession()` n'est plus appele par les pages
      individuelles, seulement par `AuthSessionProvider` dans le shell.
      Les pages qui ont besoin du `user` utilisent
      `useAuthenticatedUser()` (et lui seul).
- [ ] Playwright assert qu'il y a exactement 1 `AppNavigation` rendered
      sur chaque route auth.
- [ ] Aucun double rendu visible (manual + Playwright).
- [ ] Captures desktop non-regression confirmees.

### PR3 (si shippe)

- [ ] Decision tree section 8 a ete suivi explicitement.
- [ ] Aucun ancien hook remplace sans capture equivalente avant/apres.
- [ ] Lazy splits documentes dans le commit message avec bundle sizes
      avant/apres.

---

## 12. Definition of Done (PRP entiere)

- [ ] PR1 merged sur main.
- [ ] PR2 merged sur main, 48h sans regression user-reported.
- [ ] PR3 shipped ou explicitement skipped avec justification.
- [ ] Captures Playwright a jour dans `e2e/screenshots/mobile-foundation/`.
- [ ] Doc `e2e/README.md` mise a jour pour la procedure user test.
- [ ] PRP-238 marque `DONE` avec un changelog des commits.
- [ ] Vercel preview testee sur device reel (iPhone + Android).

---

## 13. Estimations

| PR | Effort focus | Calendar realistic |
|---|---|---|
| PR1 | 6-8h | 1 journee dev |
| PR2 | 4-6h | 1/2 journee dev + 1 nuit d'observation main |
| PR3 | 6-10h | 1-2 journees dev, optionnel |

**Total estime** : 2-3 journees dev pour PR1+PR2. PR3 optionnel.

---

## 14. Risques et mitigations

| Risque | Probabilite | Impact | Mitigation |
|---|---|---|---|
| User test Supabase introuvable / pas pret | Moyen | Bloquant pour PR1 (e) | Mode PR1-bis section 0.4 : PR1 ship sans tests auth, suite en PR1-bis parallele a PR2 |
| ResponsiveProvider casse `useResponsiveZones` ou `useHybridGrid` | Moyen | Mid | Adapter en preservant la signature publique des hooks ; TS strict + smoke captures |
| Migration PR2 oublie une page | Moyen | High (double mount) | Section 4.2.1 contient la liste authoritative (grep audit 2026-05-21) ; refaire le grep au moment de PR2 |
| Page utilise getSession() apres PR2 sans passer par `useAuthenticatedUser` | Moyen | Mid | Lint rule custom `no-direct-supabase-auth-getSession` envisagee post-PR2 ; sinon code review |
| Storage state Playwright committe par accident | Moyen | High (token leak) | `.gitignore` ajoute en PR1 (verifie `git ls-files e2e/.auth/`) |
| `E2E_RECIPE_ID` non deterministe | Faible | Mid | Section 6 (e) option (a) seed connu ou (b) query first row |
| Action bar mobile cache la bottom nav | Faible | Mid | Z-index + sticky `bottom: var(--mobile-nav-height)`, teste Playwright |
| Regression desktop | Faible | High | Captures avant/apres obligatoires sur 7 routes |
| Bundle size augmente | Faible | Low | Lighthouse + bundle analyzer en CI optionnel |

---

## 15. References

- Audit mobile Codex 2026-05-19 : `/private/tmp/smart-pantry-mobile-audit/`
- Push perf 2026-05-19/20 : commits `9a2d4e75` a `6e262815` sur `main`
- PRP-230 (Routing Navigation Shell, V2) : a coordonner sur la
  structure du shell post-PR2
- PRP-233 (Assistant Surface UX Integration) : impact sur la decision
  bottom nav assistant + FAB
- PRP-237 (World Class Visual Redesign 2026) : `--mobile-nav-height` et
  `--safe-bottom` devront s'aligner avec les design tokens PRP-237

---

## 16. Changelog

| Date | Auteur | Change |
|---|---|---|
| 2026-05-21 | Claude/Codex iteration | Draft initial V3 (apres V1, V2, V3 plans dans la conversation) |
| 2026-05-21 | Claude apres revue Codex | V3.1 : verrouillage decisions (Context auth + 2 count queries + `src/index.css`) ; liste pages PR2 authoritative basee sur grep repo ; mode PR1-bis explicite section 0.4 ; correction phantoms `useViewport`/`useBreakpoints` (existent pas) → adaptateurs sur `useResponsiveZones` + `useHybridGrid` reels ; `.env.local` retire de la liste des fichiers a modifier ; `e2e/.auth/` ajoute a `.gitignore` ; strategie `E2E_RECIPE_ID` deterministe ; checkboxes AC/DoD remises a `[ ]` |
| 2026-05-21 | Claude apres revue Codex V3.1 | V3.2 : `useNavCounts(userId)` auth-passif (parametre au lieu de hook auth interne), evite de tirer PR2 dans PR1 ; table PR2 reduite a 15 pages (Inventory.tsx clarifie hors-PR2) ; ajout `data-testid="app-navigation"` + `data-testid="mobile-bottom-nav"` dans l'inventaire PR1 ; AC PR2 reformule `AuthSessionProvider` + `useAuthenticatedUser` (plus de mention `useAuthSession`) ; wording "RPC ou count" supprime ; corrige `class=` → `className=` (JSX) |
| 2026-05-21 | Claude apres revue Codex V3.2 | V3.3 : diagramme hierarchie hooks 3.2 corrige pour refleter le modele reel (AuthenticatedLayout lit context, AppNavigation recoit `user` en prop, useAuthenticatedUser utilise par les pages enfants pas AppNavigation) ; clarification que `useViewport` et `useBreakpoints` ne sont PAS des fichiers separes mais des exports nommes dans `useResponsiveZones.ts` (l.44, l.98) — toutes les references dans la PRP s'alignent sur ce fait verifie ; etape (b) PR1 liste explicitement les 8 exports a adapter dans les 2 fichiers reels |

