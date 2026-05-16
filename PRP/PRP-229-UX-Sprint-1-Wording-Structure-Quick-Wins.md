# PRP-229 — UX Sprint 1: Wording, Structure, Quick Wins

> Statut : **DRAFT — pret a challenger apres corrections review**
> Date : 2026-05-13
> Source : `docs/PAGE-UI-UX-AUDIT-2026.md` §6 P0/P1
> Objectif : appliquer les quick wins visibles qui rendent l'app plus claire sans refonte profonde.

## 0. Decisions prerequises avant code

Ces decisions viennent de l'audit v5. Elles doivent etre cochees dans la PR de
lancement avant d'ouvrir le sprint UX P1.

Ces decisions sont cochees dans la description de **PR1 — Navigation wording**,
sous un header `## Decisions §0 audit`.

- [ ] **Assistant nav order** : `Assistant` passe en premiere entree nav
  seulement quand PRP-224/233 rendent `/assistant` vraiment conversationnel.
- [ ] **`/assistant/chat`** : cache de la navigation en Sprint 1 ; redirect
  vers `/assistant` seulement si `/assistant` ne regresse pas.
- [ ] **Menus** : ne pas afficher `Menus` en nav principale tant que
  `/kitchen/meal-planning` reste legacy/Cipher.
- [ ] **Insights** : garder le hub `/insights` seulement si ses onglets ont
  de vraies donnees ; sinon preparer decision P2 de redirect vers
  `/insights/waste`.

## 1. Contexte

L'audit a valide que le premier sprint UX doit rester court : wording, labels,
liens legacy, densite du feed desktop, suppression des mock data visibles et
clarification des routes assistant/recettes.

Ce sprint ne doit pas ouvrir les gros chantiers `/assistant` conversationnel,
menus, nutrition coach ou kitchen intelligence.

## 2. Scope

### Inclus

- Wording recettes : `Feed`, `Bibliotheque`, `A verifier`, `Ajouter`.
- Labels nav : `Inventaire`, `Recettes`, `Assistant`, `Anti-gaspi`.
- Fix des liens legacy `/recipes` vers `/kitchen/recipes`.
- `/kitchen/favorites` cache de la navigation ou redirige vers recettes avec
  filtre si le filtre existe.
- `/assistant/chat` cache de la navigation si `/assistant` reste route principale.
- Audit/retrait des mock data visibles dans les surfaces touchees.
- Reduction des images feed desktop et meilleure densite de lecture.
- Retrait des logs console evidents dans les pages principales touchees.

### Exclus

- Nouvelle page assistant conversationnelle complete.
- Nouveau moteur recommandations.
- Refonte design system complete.
- Suppression massive de fichiers test/demo.
- Migration DB.
- Drop tables family/community/achievements.
- Refonte `/kitchen/meal-planning`.

## 3. Table wording avant/apres

| Surface | Actuel | Cible Sprint 1 |
|---|---|---|
| Nav | `Garde-Manger` | `Inventaire` |
| Nav | `Cuisine` | `Recettes` |
| Nav | `Analyses` | `Anti-gaspi` |
| Nav | `Assistant IA` | `Assistant` |
| Assistant | `Chat IA` | `Conversation` |
| Assistant | `IA Rapide` | `Demander` |
| Assistant | `Fonctionnalites IA` | supprimer si non branche |
| Recettes tab | `Explorer` / `Explore` | `Feed` |
| Recettes tab | `Mes Recettes` / `Library` | `Bibliotheque` |
| Recettes tab | `Inbox` | `A verifier` |
| Recettes tab | `Import` | `Ajouter` |
| Recettes copy | `Catalogue` | `Bibliotheque` ou `Feed` selon contexte |
| Cuisine | `Planification Repas` | `Menus` uniquement si la page est cachee/assumee |
| Courses | `Rayon` | `Categorie` |
| Insights | `Insights Dashboard` | `Anti-gaspi` ou hub sobre |
| Detail recette | `Cuisiner (decrementer)` dans `RecipeDetail.tsx` | `Cuisiner` / `Marquer comme cuisinee` |

Regle : changer les labels visibles, pas les URLs stables, sauf redirects
explicitement prevus.

## 4. Surfaces a modifier ou auditer

### Fichiers centraux

- `src/App.tsx`
- `src/components/navigation/NavigationHub.tsx` — fichier #1 pour labels nav.
- `src/components/navigation/AppNavigation.tsx`
- `src/components/navigation/DesktopNavigation.tsx`
- `src/components/navigation/MobileNavigation.tsx`
- `src/components/navigation/TabletNavigation.tsx`
- `src/components/navigation/LegacyRedirect.tsx`

### Recettes

- `src/pages/Recipes.tsx`
- `src/pages/RecipesPage.tsx`
- `src/pages/RecipeDetail.tsx`
- `src/pages/RecipeEdit.tsx` si wording visible touche.
- `CatalogRecipeCard` et `UserRecipeCard` dans `src/pages/Recipes.tsx`.
- `src/components/recipes/RecipeCard.tsx` seulement si `rg` confirme qu'il est
  utilise par la route recettes touchee.

### Dashboards/routes coeur

- `src/pages/pantry/PantryDashboard.tsx`
- `src/pages/Inventory.tsx`
- `src/pages/InventoryPage.tsx`
- `src/pages/kitchen/KitchenDashboard.tsx`
- `src/pages/shopping/ShoppingDashboard.tsx`
- `src/pages/SmartShoppingList.tsx`
- `src/pages/assistant/AssistantDashboard.tsx`
- `src/pages/AssistantAI.tsx`
- `src/pages/InsightsPage.tsx`
- `src/components/insights/InsightsDashboard.tsx`
- `src/pages/WasteInsightsPage.tsx`
- `src/pages/NotFound.tsx`

### A ne pas toucher dans cette PRP

- Pages test/demo listees dans PRP-236, qui existe comme PRP dediee au cleanup
  repo/UI.
- Migrations Supabase.
- Services backend assistant.
- Moteurs recommendation/nutrition.

## 5. Strategie de PR splitting

Ne pas faire une PR geante. Decoupage recommande :

1. **PR1 — Navigation wording**
   - `NavigationHub.tsx`
   - `AppNavigation.tsx`
   - `DesktopNavigation.tsx`
   - `MobileNavigation.tsx`
   - `TabletNavigation.tsx`

2. **PR2 — Recettes quick wins**
   - tabs wording ;
   - densite feed desktop ;
   - labels `Inbox` / `Import` ;
   - aucun refactor lourd de `Recipes.tsx`.

3. **PR3 — Routes/redirects faibles**
   - `/recipes` legacy ;
   - `/kitchen/favorites` cache/redirect ;
   - `/assistant/chat` cache nav ;
   - redirects dans un commit dedie obligatoire.

4. **PR4 — Donnees honnetes + console cleanup cible**
   - mocks restants visibles ;
   - console logs evidents dans pages touchees ;
   - empty states honnetes.
   - Scope limite aux fichiers touches par PR1-3 ou a leurs hooks directs.
     Pas de balayage repo-wide dans PRP-229.

Chaque PR doit etre independently revertable.

## 6. Plan d'execution

### Phase 0 — Baseline et audit

1. Capturer `git status --short`.
2. Inspecter le stash WIP mentionne par l'audit :
   - `git stash list`
   - identifier overlap wording/cleanup sans appliquer aveuglement.
3. Lister les labels actuels :
   - `rg -n "Garde-Manger|Cuisine|Analyses|Assistant IA|Chat IA|Inbox|Import|Explore|Explorer|Library|Dashboard|Planification Repas|Rayon" src/components src/pages`
4. Lister mocks visibles restants :
   - `rg -n "mock|Mock|fake|hardcoded|stats|Activite Recente|Achievements|Insights Dashboard" src/components src/pages src/hooks`
5. Lister logs visibles/restants dans surfaces principales :
   - `rg -n "console\\.(log|error|warn)" src/components/navigation src/components/insights src/pages src/hooks`
6. Capturer screenshots desktop/mobile :
   - `/kitchen/recipes`
   - `/kitchen/recipes?tab=library`
   - `/pantry`
   - `/shopping/list`
   - `/assistant`
   - `/insights`

### Phase 1 — Wording navigation

1. Modifier d'abord `src/components/navigation/NavigationHub.tsx`.
2. Propager uniquement si les labels sont dupliques dans :
   - `AppNavigation.tsx`
   - `DesktopNavigation.tsx`
   - `MobileNavigation.tsx`
   - `TabletNavigation.tsx`
3. Ne pas changer `/pantry`, `/pantry/inventory`, `/kitchen`, `/insights`.
4. Ne pas afficher `Menus` en nav principale si la page reste legacy/Cipher.

### Phase 2 — Recettes quick wins

1. Renommer onglets visibles dans `src/pages/Recipes.tsx` :
   - `Explorer` -> `Feed`
   - `Mes Recettes` -> `Bibliotheque`
   - `Inbox` -> `A verifier`
   - `Import` -> `Ajouter`
2. Garder les valeurs internes de tabs (`explore`, `library`, `inbox`, `import`)
   si cela evite une migration d'URL/state.
3. Corriger tout fallback `/recipes` vers `/kitchen/recipes`.
4. Densite media desktop :
   - `CatalogRecipeCard` : remplacer les hauteurs trop hautes par une taille
     controlee, cible `h-44 md:h-52 lg:h-56`, ou equivalent tokenise ;
   - `UserRecipeCard` en grid : ne pas depasser `h-44 md:h-52 lg:h-56` ;
   - si un composant social/feed utilise `aspect-[9/16]`, contraindre desktop
     avec `md:max-h-[500px] md:max-w-[360px] mx-auto` ;
   - mobile conserve le format vertical si utile.
5. Verifier que texte, source et actions restent visibles au-dessus du fold
   sur desktop 1440px.

### Phase 3 — Routes visibles inutiles

1. `/assistant/chat` :
   - cache de la nav en Sprint 1 ;
   - redirect vers `/assistant` seulement si smoke `/assistant` OK.
2. `/kitchen/favorites` :
   - si filtre favoris existe : redirect vers `/kitchen/recipes?filter=favorites` ;
   - sinon : route conservee mais entree nav supprimee.
3. Redirects obligatoirement dans un commit dedie.

### Phase 4 — Donnees honnetes

Audit actuel a verifier en Phase 0. Candidats connus :

- `src/components/insights/InsightsDashboard.tsx` :
  - titre `Insights Dashboard` ;
  - verifier que les chiffres viennent de donnees reelles.
- `src/pages/InsightsPage.tsx` :
  - hero `Insights Dashboard` ;
  - ne pas remettre de `dashboardStats` mock.
- `src/hooks/useInsightsData.ts` :
  - `mockData` historique ;
  - ne pas afficher comme stats fiables en prod.
- `src/hooks/useChartData.ts` :
  - commentaires/mock waste/nutrition timeline ;
  - verifier si visible via UI.
- `src/lib/analytics/smart-input.ts` :
  - mock analytics avec `console.log`, hors UI mais a documenter.
- `src/pages/kitchen/KitchenDashboard.tsx`,
  `src/pages/shopping/ShoppingDashboard.tsx`,
  `src/pages/assistant/AssistantDashboard.tsx` :
  - verifier qu'aucune section "Activite Recente", stats ou recommandations
    non sourcees ne reste visible.

Regle de fin :

- si la source reelle n'existe pas, remplacer par empty state honnete ;
- si la source existe, ajouter commentaire court ou query claire ;
- ne pas ajouter de faux chiffres.

### Phase 5 — Console cleanup cible

Ne pas nettoyer tout le repo dans ce sprint. Cible uniquement surfaces touchees.

Candidats a verifier :

- `src/pages/NotFound.tsx`
- `src/pages/SmartShoppingList.tsx`
- `src/pages/Recipes.tsx`
- `src/pages/pantry/PantryDashboard.tsx`
- `src/pages/kitchen/KitchenDashboard.tsx`
- `src/pages/shopping/ShoppingDashboard.tsx`
- `src/pages/assistant/AssistantDashboard.tsx`
- `src/components/navigation/LegacyRedirect.tsx`
- hooks directement touches par ces pages si les logs polluent la prod.

Regle :

- aucun nouveau `console.log` ;
- `console.error` garde seulement les erreurs non silencieuses, ou passe par un
  logger/dev guard ;
- ne pas masquer les erreurs critiques.

## 7. Tests et verification

### Commandes

Le repo contient `package-lock.json` et des scripts npm. Commandes canoniques :

- `npm run build`
- `npx tsc --noEmit -p tsconfig.app.json`
- `npm run lint`

Note : `npm run build` execute deja `shared:build`, `api:build:ts` et
`vite build`.

Equivalent Vite-only acceptable si le sprint est execute dans un environnement
pnpm :

- `pnpm exec vite build`

### Smoke manuel ou Playwright

- `/kitchen/recipes`
- `/kitchen/recipes?tab=library`
- `/pantry`
- `/shopping/list`
- `/assistant`
- `/insights`
- `/kitchen/favorites`
- `/assistant/chat`

### Assertions visuelles

- Aucun onglet recette n'utilise encore `Explorer`, `Library`, `Inbox`, `Import`
  en texte visible.
- Les medias recettes desktop ne rendent pas la page illisible.
- La nav ne montre pas `Garde-Manger`, `Analyses`, `Assistant IA`.
- Aucun ecran blanc pendant navigation.
- Empty states honnetes si data vide.
- Aucun bouton principal ne mene vers une page test/demo.
- Aucun gros bundle route ne grossit de plus de 10 kB gzip sans justification
  dans la PR.

## 8. Risques

- Changer des labels peut casser des tests textes.
- Rediriger `/kitchen/favorites` peut casser des bookmarks.
- Modifier `Recipes.tsx` peut toucher une page deja lourde.
- Supprimer trop largement des logs peut masquer une erreur utile.
- Nettoyer des mocks sans source reelle peut laisser des sections vides si les
  empty states ne sont pas poses.

## 9. Rollback

- Revert PR si une route principale casse.
- Les changements wording sont low-risk et peuvent etre revertes par fichier.
- Les redirects doivent etre isoles dans un commit separe obligatoire.
- PR4 cleanup doit rester separee pour pouvoir restaurer une instrumentation
  utile sans annuler le wording.

## 10. Definition of Done

- Les 4 decisions prerequises §0 sont cochees dans la PR de lancement.
- PR description coche chaque item P0/P1 couvert.
- `npm run build` passe.
- `npx tsc --noEmit -p tsconfig.app.json` passe.
- `npm run lint` passe ou les erreurs preexistantes sont listees explicitement.
- Screenshots avant/apres joints pour desktop et mobile.
- Aucun nouveau `console.log` ajoute.
- Aucun fichier PRP-236 pages test/demo touche par accident.
- Aucun scope P2/P3 implemente par accident.
- Si une mutation server-state est touchee par accident, son invalidation
  cache/query est verifiee avant merge.
- Redirects isoles dans un commit dedie.
- Bundle/perf note ajoutee si la page Recettes est modifiee.
