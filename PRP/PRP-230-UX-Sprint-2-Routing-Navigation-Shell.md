# PRP-230 — UX Sprint 2: Routing, Navigation, Shell Diet

> Statut : **DRAFT — remis a jour apres PRP-222/229**
> Date : 2026-05-13
> Source : `docs/PAGE-UI-UX-AUDIT-2026.md` §2.2, §3, §5, §6 P2
> Objectif : traiter uniquement le reliquat routing/navigation/shell apres PRP-222 et PRP-229, sans casser les surfaces coeur.

## 0. Decisions prerequises avant code

Ces decisions doivent etre cochees dans la description de **PR1 — Nav order**,
sous un header `## Decisions §0 audit`.

- [ ] **`/shopping`** : redirect vers `/shopping/list`.
  - Justification : la liste est l'experience principale ; le hub ajoute un clic.
- [ ] **`/insights`** : garder hub sobre si deux onglets ont vraies donnees,
  sinon redirect vers `/insights/waste`.
  - Fallback PRP-230 : ne pas changer `/insights` tant que la decision produit
    n'est pas tranchee.
  - Si non tranchee a 48h : garder `/insights` a 2 onglets, no-change.
- [ ] **`/kitchen/favorites`** : redirect vers
  `/kitchen/recipes?filter=favorites`.
  - Si le filtre n'existe pas encore, garder la route mais supprimer toute
    entree nav.
- [ ] **`/settings/appearance`** : redirect vers
  `/settings?section=appearance`.
- [ ] **Menus** : cacher de la nav principale tant que la page reste
  legacy/Cipher.
- [ ] **Nav order V1** : `Recettes`, `Inventaire`, `Courses`, `Anti-gaspi`,
  `Assistant`.
  - `Assistant` passe en premiere position seulement apres PRP-233.

Si ces decisions ne sont pas tranchees dans les 48h apres ouverture du sprint,
partir avec les fallbacks recommandes ci-dessus et marquer la PR
`provisional/awaiting-product-decision`.

Prerequis git : ne pas ouvrir PRP-230 tant que `main` GitHub n'est pas a jour
avec PRP-222, PRP-229 et PRP-231 mergees/poussees. Si le push reste bloque par
le nettoyage d'historique Git, terminer le mirror-clean/force-push avant ce
sprint.

## 1. Contexte

PRP-222 et PRP-229 ont deja retire beaucoup de bruit produit. PRP-230 ne doit
pas refaire ce qui est acquis. Elle doit nettoyer le reliquat :

- routes wrapper encore exposees ;
- ordre nav encore herite de l'ancien modele ;
- champs family/gamification encore presents dans la config ;
- routes techniques a transformer en redirects ;
- shell a aligner avec PRP-231.

## 1.5 Etat actuel apres PRP-222 + PRP-229

Deja acquis localement ou attendu comme acquis avant PRP-230 :

- Labels nav principaux corriges :
  - `Garde-Manger` -> `Inventaire`,
  - `Cuisine` -> `Recettes`,
  - `Assistant IA` -> `Assistant`,
  - `Analyses` -> `Anti-gaspi`.
- `/assistant/chat` n'est plus un subitem visible dans `NavigationHub`.
- Redirects anciens deja presents dans `src/App.tsx` :
  - `/games`,
  - `/games/*`,
  - `/shopping/store-mode`,
  - `/shopping/history`,
  - `/pantry/scanner`,
  - `/pantry/alerts`,
  - `/assistant/suggestions`,
  - `/assistant/nutrition`,
  - `/settings/family`,
  - `/settings/parental`.
- `/recipes` dev redirect pointe vers `/kitchen/recipes`.
- Achievements visibles retires des insights.
- Une partie du cleanup family/community services a deja ete faite par PRP-222.

Reliquat confirme par audit code :

- `src/App.tsx` route encore `/shopping` vers `ShoppingDashboard`.
- `src/App.tsx` route encore `/kitchen/favorites` vers `RecipesPage` sans filtre.
- `src/App.tsx` route encore `/settings/appearance` vers `Settings`.
- `src/App.tsx` garde `/assistant/chat` comme route legacy.
- `src/components/navigation/NavigationHub.tsx` contient encore :
  - `funName`,
  - `minAge`,
  - `requiresSupervision`,
  - `availableInChildMode`,
  - `childFriendlyName`,
  - `gamification`.
- `MobileNavigation.tsx` recree encore un item `more` avec champs family.
- `useFamilyMode` / `useAgeAdaptiveUI` restent consommes dans plusieurs fichiers
  et ne doivent pas etre supprimes brutalement.
- `NotFound.tsx` n'a plus de `console.error`, mais le wording reste a moderniser.

## 2. Scope reel PRP-230

### Inclus

- Reordonner la navigation V1 selon la decision §0.
- Cacher `Menus` si la page reste legacy/Cipher.
- Transformer `/shopping` en redirect `/shopping/list`.
- Gerer `/kitchen/favorites`.
- Gerer `/settings/appearance`.
- Garder `/assistant/chat` comme route legacy redirect/cache, pas nav.
- Nettoyer champs family/gamification dans `NavigationHub.tsx` quand ils ne sont
  plus rendus.
- Moderniser wording 404.
- Documenter les usages restants de `useFamilyMode` au lieu de les casser.
- Respecter tokens/patterns PRP-231 pour tout shell modifie.

### Exclus

- Suppression DB family/community/achievements.
- Refonte complete de `/assistant`.
- Refonte complete de `/kitchen/meal-planning`.
- Refonte visuelle design system profonde.
- Suppression de `useFamilyMode` si `useCipherMealPlanning` ou nav responsive
  en dependent encore.
- Nettoyage repo des pages test/demo, couvert par PRP-236.

## 3. Fichiers a modifier/auditer

### Routing

- `src/App.tsx`
- `src/components/navigation/LegacyRedirect.tsx`

### Navigation shell

- `src/components/navigation/NavigationHub.tsx`
- `src/components/navigation/AppNavigation.tsx`
- `src/components/navigation/DesktopNavigation.tsx`
- `src/components/navigation/MobileNavigation.tsx`
- `src/components/navigation/TabletNavigation.tsx`
- `src/components/navigation/SimplifiedMorphingNav.tsx` si encore utilise.
- `src/components/navigation/PageWrapper.tsx` si visible dans le shell actif.

### Pages

- `src/pages/NotFound.tsx`
- `src/pages/shopping/ShoppingDashboard.tsx` seulement si `/shopping` devient redirect.
- `src/pages/InsightsPage.tsx` seulement si decision `/insights` est prise.
- `src/pages/Settings.tsx` si `?section=appearance` doit ancrer l'onglet.
- `src/pages/Recipes.tsx` seulement si filtre favorites doit etre branche.

### Hooks/types a auditer, pas supprimer par defaut

- `src/hooks/useFamilyMode.ts`
- `src/hooks/useCipherMealPlanning.ts`
- `src/types/family-mode.ts`
- `src/components/navigation/SmartSuggestionsPanel.tsx`
  - lit `useFamilyMode` ; auditer la consommation et decider le plan de retrait
    avec PRP-234.

## 4. Navigation cible

### V1 apres PRP-230

1. Recettes
2. Inventaire
3. Courses
4. Anti-gaspi
5. Assistant

Migration ordre depuis l'etat actuel :

| Section | Avant | Apres PRP-230 |
|---|---:|---:|
| Inventaire | 1 | 2 |
| Recettes | 2 | 1 |
| Courses | 3 | 3 |
| Assistant | 4 | 5 |
| Anti-gaspi | 5 | 4 |

Pourquoi Assistant n'est pas encore premier :

- PRP-221 FAB existe ;
- `/assistant` n'est pas encore l'experience conversationnelle PRP-224/233 ;
- mettre Assistant premier trop tot promettrait plus que la page ne livre.

### Apres PRP-233

1. Assistant
2. Recettes
3. Inventaire
4. Courses
5. Menus
6. Anti-gaspi

Ce second changement doit rester dans PRP-233/234, pas PRP-230.

## 5. Routes V1 tranchees

| Route | Decision PRP-230 |
|---|---|
| `/shopping` | redirect `/shopping/list` |
| `/shopping/list` | experience principale courses |
| `/kitchen/favorites` | redirect `/kitchen/recipes?filter=favorites` si filtre existe ; sinon route conservee mais cachee nav |
| `/assistant/chat` | route legacy cachee ; redirect vers `/assistant` seulement si `/assistant` smoke OK |
| `/settings/appearance` | redirect `/settings?section=appearance` ; `Settings` lit `section=appearance` si un ancrage est implemente |
| `/insights` | pas de changement sans decision produit ; si tranche, redirect `/insights/waste` ou hub sobre |
| `/kitchen/meal-planning` | cache nav si legacy/Cipher |
| routes games/family/store | redirects existants a conserver |

## 6. Strategie de PR splitting

### PR1 — Nav order + Menus cache

Fichiers probables :

- `NavigationHub.tsx`
- `AppNavigation.tsx`
- `DesktopNavigation.tsx`
- `MobileNavigation.tsx`
- `TabletNavigation.tsx`

Livrable :

- ordre V1 ;
- Menus cache si legacy ;
- aucun Assistant-first avant PRP-233.

### PR2 — Routes/redirects tranchees

Fichiers probables :

- `src/App.tsx`
- `LegacyRedirect.tsx`
- `Settings.tsx` si ancrage ;
- `Recipes.tsx` si filtre favorites.

Livrable :

- `/shopping` redirect ;
- `/kitchen/favorites` decision appliquee ;
- `/settings/appearance` decision appliquee ;
- `/assistant/chat` cache/redirect si safe.

### PR3 — Shell cleanup config family/gamification

Fichiers probables :

- `NavigationHub.tsx`
- `MobileNavigation.tsx`
- `TabletNavigation.tsx`
- `AppNavigation.tsx`

Livrable :

- supprimer champs config non rendus :
  - `funName`,
  - `minAge`,
  - `requiresSupervision`,
  - `availableInChildMode`,
  - `childFriendlyName`,
  - `gamification`,
  si plus aucun consommateur ne les lit.
- documenter les champs conserves temporairement.

### PR4 — 404 + useFamilyMode audit

Fichiers probables :

- `NotFound.tsx`
- `useFamilyMode.ts`
- `useCipherMealPlanning.ts`
- `SmartSuggestionsPanel.tsx`

Livrable :

- 404 wording :
  - "Cette page n'existe plus."
  - CTA "Retour aux recettes"
  - CTA secondaire "Ouvrir l'assistant"
- `console.error` 404 deja absent, verifier seulement.
- audit `useFamilyMode` :
  - supprimer seulement si zero consommateur runtime ;
  - sinon documenter suppression future dans PRP-234.

### PR5 — Family live service cleanup optionnel

Ouvrir seulement si l'audit Phase 0 revele un service family encore live qui
alimente le shell alors qu'il devrait disparaitre.

Livrable :

- documenter le consommateur ;
- decider suppression maintenant ou report PRP-234 ;
- ne pas supprimer de schema DB dans PRP-230.

## 7. Plan d'execution

### Phase 0 — Audit imports

```bash
rg -n "useFamilyMode|useAgeAdaptiveUI|FamilyProfileSelector|funName|minAge|requiresSupervision|availableInChildMode|childFriendlyName|gamification|achievements|/games|/family|/parental" src
rg -n "/shopping|/insights|/kitchen/favorites|/settings/appearance|/assistant/chat" src/App.tsx src/components/navigation src/pages
rg -n "NavigationHub|SimplifiedMorphingNav|AppNavigation|DesktopNavigation|MobileNavigation|TabletNavigation" src
```

Classer chaque occurrence :

- visible shell ;
- config data non rendue ;
- route legacy ;
- service/hook encore consomme ;
- page test/demo hors scope.

### Phase 1 — Navigation config

1. Modifier `NavigationHub.tsx` en premier.
2. Appliquer ordre V1.
3. Cacher Menus si legacy.
4. Verifier que les nav responsive ne reintroduisent pas l'ancien ordre.
5. Utiliser tokens/patterns PRP-231 pour tout style touche.

### Phase 2 — Redirects

1. Isoler redirects dans un commit dedie.
2. `/shopping` -> `/shopping/list`.
3. `/settings/appearance` -> `/settings?section=appearance` ou ancrage.
4. `/kitchen/favorites` selon decision filtre.
5. `/assistant/chat` redirect seulement si `/assistant` smoke OK.
6. Tester anciens liens sans page blanche.

### Phase 3 — Shell family/gamification

1. Retirer champs config non utilises.
2. Ne pas casser `useAgeAdaptiveUI` si encore consomme par mobile/tablet.
3. Ne pas supprimer `useFamilyMode` tant que `useCipherMealPlanning` depend de
   lui.
4. Documenter tout stub restant avec fichier et raison.

### Phase 4 — 404

1. Remplacer wording anglais par francais utile.
2. Ajouter deux CTA :
   - `/kitchen/recipes`
   - `/assistant`
3. Verifier absence `console.error`.

## 8. Tests et verification

### Commandes

- `npm run build`
- `npx tsc --noEmit -p tsconfig.json`
- `npm run lint`

### Smoke desktop/mobile/tablet

- `/`
- `/kitchen/recipes`
- `/pantry/inventory`
- `/shopping`
- `/shopping/list`
- `/assistant`
- `/assistant/chat`
- `/insights`
- `/insights/waste`
- `/kitchen/favorites`
- `/settings/appearance`
- route inconnue ex : `/does-not-exist`

### A11y / clavier

- Tab order sur navigation desktop.
- Bottom nav mobile utilisable au clavier/emulation.
- Menu mobile ouvre/ferme.
- Escape ferme drawer/dialog si present.
- `aria-label` sur boutons icones ajoutés/modifiés.
- Axe dev ou checklist PRP-231 pour les routes touchees.

### Perf / bundle

- Ajouter une note bundle si `App.tsx`, shell nav ou lazy imports changent.
- Aucune route principale ne doit grossir sans justification.

## 9. Definition of Done

- Decisions §0 cochees dans PR1.
- `npm run build` passe.
- `npx tsc --noEmit -p tsconfig.json` passe.
- `npm run lint` passe ou erreurs preexistantes listees.
- Screenshots desktop + mobile + tablet de la nav joints.
- Aucun fichier hors scope touche.
- Routes coeur accessibles et smokees.
- Redirects legacy documentes.
- Redirects isoles dans un commit dedie.
- Shell ne contient plus de champs family/gamification non rendus, ou chaque
  champ restant est documente comme temporaire.
- 404 en francais, avec CTA utiles, sans console prod.
- Compatible PRP-231 : tokens/patterns utilises dans shell modifie.
- Si une mutation server-state est touchee par accident, son invalidation
  cache/query est verifiee avant merge.
