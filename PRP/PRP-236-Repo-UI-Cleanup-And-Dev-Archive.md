# PRP-236 — Repo UI Cleanup And Dev Archive

> Statut : **DRAFT — remis a jour apres audit terrain**
> Date : 2026-05-13
> Source : `docs/PAGE-UI-UX-AUDIT-2026.md` §4, §5
> Objectif : sortir les pages test/demo/residuelles de `src/pages` et documenter les residuals UI sans toucher la DB.

## 1. Contexte

Le repo contient encore des pages de test, demos Material You, anciens catalogues
recettes, backups et wrappers. Meme si elles ne sont pas routees, elles
augmentent le bruit, ralentissent les recherches, et peuvent revenir par erreur
dans la navigation.

Cette PRP nettoie le repo sans supprimer de donnees Supabase.

Etat verifie 2026-05-13 :

- `git stash list` est vide. Le stash `PR3 prep WIP` mentionne par l'audit est
  caduc / non disponible dans ce workspace.
- `find src/pages -maxdepth 2 -type f -name '*.tsx' | wc -l` retourne `41`.
- Cible quantitative PRP-236 : definir `N` en Phase 1, attendu autour de `<= 27`
  si les suppressions sures sont appliquees sans archiver dans `src/pages`.

## 2. Scope

### Inclus

- Identifier pages non routees.
- Deplacer en archive dev ou supprimer.
- Supprimer imports/exports morts.
- Retirer re-exports barrel qui casseraient le build.
- Documenter residuals family/gamification si non supprimables.
- Ajouter une verification de dynamic imports.

### Exclus

- Drop tables DB.
- Suppression migrations.
- Refonte UX des pages coeur.
- Suppression hooks/services encore utilises.
- Nettoyage historique Git / filter-repo.
- Suppression globale de `useFamilyMode` tant que PRP-234 n'a pas traite Menus.

## 3. Candidats a archiver/supprimer

### Vague A — suppressions sures apres `rg`

Ces fichiers sont des pages test/demo/backups. Action par defaut : supprimer si
aucun import runtime/dynamic import n'est detecte.

- `src/pages/YouTubeTestDirect.tsx`
- `src/pages/YouTubeRecipeTest.tsx`
- `src/pages/YouTubeRecipeTestSimple.tsx`
- `src/pages/YouTubeTestBasic.tsx`
- `src/pages/YouTubeTestWorking.tsx`
- `src/pages/VideoImportTest.tsx`
- `src/pages/TestMinimal.tsx`
- `src/pages/TestMaterialYou.tsx`
- `src/pages/SimpleMaterialTest.tsx`
- `src/pages/MaterialYouDemo.tsx`
- `src/pages/RecipeSeeding.tsx`
- `src/pages/Recipes_backup.tsx`
- `src/pages/MyRecipes.tsx`
- `src/pages/demo/inventory-visualization.tsx` (~46 kB, demo visualisation)

Decision `MyRecipes.tsx` :

- supprimer maintenant. La page est orpheline et `/kitchen/recipes?tab=library`
  couvre l'intention produit.
- Ne pas attendre PRP-232 pour garder une page legacy non routee.

### Vague B — suppression avec micro-refacto

- `src/pages/LayoutOptimizationDemo.tsx`
  - Faux orphelin : re-exporte depuis `src/design-system/index.ts`.
  - Avant suppression, retirer `export { default as LayoutOptimizationDemo }`
    du barrel.

- `src/pages/RecipeCatalog.tsx`
  - Supprimer la **page**.
  - Garder `src/hooks/useRecipeCatalog.ts`, encore utilise par :
    - `src/pages/Recipes.tsx`,
    - `src/components/onboarding/RecipeOnboarding.tsx`,
    - `src/components/recipes/RecipeCustomizer.tsx`,
    - `src/hooks/useUserRecipes.ts`.

- `src/pages/Diagnostics.tsx`
  - Verifier si reference runtime.
  - Si seulement dev/admin : archiver dans `src/dev-pages`.
  - Si zero consommateur : supprimer.

### Vague C — audit seulement, pas suppression par defaut

- `src/hooks/useFamilyMode.old.ts`
  - Legacy evident. Supprimer si zero import runtime ; sinon archiver.

- `src/components/navigation/SimplifiedMorphingNav.tsx`
  - Encore reference par `src/design-system/index.ts`, tests accessibilite et
    `LayoutOptimizationDemo`.
  - Ne pas supprimer dans PRP-236 tant que PRP-231/230 n'ont pas tranche le
    systeme nav/design-system.

- `src/components/navigation/PageWrapper.tsx`
  - Encore utilise par `src/pages/InventoryPage.tsx`.
  - Ne pas supprimer dans PRP-236 sauf si `InventoryPage` est migree.

## 4. Regles de suppression

Avant suppression d'un fichier :

1. `rg -n "FileNameSansExtension|import .*FileName" src`
2. `rg -nE "import\\(.*FileNameSansExtension" src`
3. Verifier `src/App.tsx`.
4. Verifier exports barrel :
   - `src/design-system/index.ts`,
   - tout `index.ts` proche du module.
5. Si utile uniquement en dev, deplacer hors `src/pages`.
6. Si non utilise, supprimer.

Commande dynamic imports ciblee :

```bash
rg -nE "import\\(.*(YouTubeTest|YouTubeRecipeTest|TestMaterial|MaterialYouDemo|RecipeSeeding|VideoImportTest|LayoutOptimizationDemo|RecipeCatalog|Diagnostics|MyRecipes)" src
```

## 5. Archive dev

Si une page reste utile pour debug :

- deplacer dans `src/dev-pages` si elle doit encore compiler ;
- ou `docs/dev` si elle est reference/doc ;
- ne pas la laisser dans `src/pages`.

Si `src/dev-pages` est cree :

- ajouter un README court qui explique que ces fichiers ne sont pas routes en
  production ;
- ne pas les importer depuis `src/App.tsx`.

## 6. Family/gamification residuals

Plan final :

1. Retirer rendu visible via PRP-230.
2. Retirer imports `useFamilyMode` inutiles si zero consommateur runtime.
3. Decoupler `useCipherMealPlanning` ou cacher legacy via PRP-234.
4. `src/types/family-mode.ts` a encore de nombreux imports runtime ; suppression
   hors scope PRP-236, a documenter pour PRP-234.
5. Reporter cleanup schema DB vers PRP dediee si tables orphanes.

## 7. Plan d'execution

### Phase 0 — Etat repo

1. Capturer `git status --short`.
2. Capturer `git stash list` et noter `n/a` si vide.
3. Capturer compteur initial :
   - `find src/pages -maxdepth 2 -type f -name '*.tsx' | wc -l`
4. Capturer bundle initial si possible :
   - `npm run build`
   - noter taille `index-*.js` et chunks pages si disponibles.

### Phase 1 — Inventaire fichiers

1. Lister pages dans `src/pages`.
2. Croiser avec routes `src/App.tsx`.
3. Croiser avec imports `rg`.
4. Croiser avec dynamic imports.
5. Croiser avec barrels.
6. Produire une liste `delete`, `archive`, `keep`.
7. Definir cible quantitative `N` pour le compteur `src/pages/*.tsx` apres cleanup.

### Phase 2 — Vague A

1. Supprimer fichiers Vague A valides par `rg`.
2. Ne pas toucher hooks/services.
3. Re-run `rg` sur les noms supprimes.

### Phase 3 — Vague B

1. `LayoutOptimizationDemo` :
   - retirer re-export de `src/design-system/index.ts`,
   - supprimer page,
   - verifier tests/design-system.
2. `RecipeCatalog` :
   - supprimer page seulement,
   - verifier que `useRecipeCatalog` reste intact.
3. `Diagnostics` :
   - supprimer ou archiver selon audit Phase 1.

### Phase 4 — Vague C audit

1. `useFamilyMode.old.ts` : supprimer si zero import.
2. `SimplifiedMorphingNav.tsx` : documenter keep/delete futur.
3. `PageWrapper.tsx` : documenter dependance `InventoryPage`.

### Phase 5 — Verification

1. `npm run build`
2. `npx tsc --noEmit -p tsconfig.json`
3. `npm run lint`
4. `find src/pages -maxdepth 2 -type f -name '*.tsx' | wc -l`
5. `rg -n "YouTubeTest|YouTubeRecipeTest|VideoImportTest|TestMinimal|TestMaterialYou|SimpleMaterialTest|MaterialYouDemo|RecipeSeeding|Recipes_backup|MyRecipes" src`
6. Smoke routes coeur :
   - `/kitchen/recipes`
   - `/pantry/inventory`
   - `/shopping/list`
   - `/assistant`
   - `/insights`

## 8. Risques

- Une page non routee peut etre importee dynamiquement.
- Un barrel peut re-exporter une page demo.
- Une page dev peut servir a diagnostiquer une feature video.
- Supprimer une page peut laisser un hook utile intact mais mal nomme.
- Supprimer trop vite complique le debug.

Mitigation :

- archive dev quand l'utilite est plausible ;
- suppression uniquement apres `rg` + dynamic import + barrel check ;
- page et hook traites differemment quand necessaire (`RecipeCatalog`).

## 8.1 Tests post-cleanup

Commandes minimales :

```bash
npm run build
npx tsc --noEmit -p tsconfig.json
npm run lint
find src/pages -maxdepth 2 -type f -name '*.tsx' | wc -l
rg -n "YouTubeTest|MaterialYouDemo|Recipes_backup|MyRecipes|RecipeCatalog|LayoutOptimizationDemo" src
```

Le dernier `rg` doit retourner uniquement des references documentees/attendues,
ou zero pour les fichiers supprimes.

## 9. Definition of Done

- `src/pages` ne contient plus de demo/test evidente.
- Compteur `src/pages/**/*.tsx` <= cible `N` definie en Phase 1.
- `src/dev-pages/` ou `docs/dev/` cree si archivage retenu.
- Re-exports barrel mis a jour, notamment `src/design-system/index.ts`.
- `RecipeCatalog.tsx` supprime sans supprimer `useRecipeCatalog`.
- `LayoutOptimizationDemo.tsx` supprime sans re-export casse.
- Les routes coeur buildent et smokeent.
- Les imports morts sont retires.
- Dynamic imports verifies.
- Bundle `index-*.js` / chunks principaux mesures avant/apres si build dispo.
- Residuals family/gamification visibles supprimes ou documentes.
- `types/family-mode.ts` non supprime sauf zero import runtime prouve.
- Aucun fichier DB/migration supprime.

