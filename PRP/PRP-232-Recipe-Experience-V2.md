# PRP-232 — Recipe Experience V2

> Statut : **DRAFT — remis a jour apres audit terrain**
> Date : 2026-05-13
> Source : `docs/PAGE-UI-UX-AUDIT-2026.md` §3.7-§3.9
> Objectif : faire de `/kitchen/recipes` l'experience recette unique, moderne,
> lisible et linkable.

## 1. Contexte

Les recettes sont le coeur produit. Aujourd'hui, `src/pages/Recipes.tsx` est un
composant monolithique de 854 lignes, les onglets ne sont pas controles par
l'URL, le feed desktop peut afficher des medias trop grands, et plusieurs
concepts concurrents existent encore.

Cette PRP transforme les recettes en experience claire :

- Feed ;
- Bibliotheque ;
- A verifier ;
- Ajouter ;
- Detail ;
- Edition.

## 1.1 Bug actuel a corriger en premier

Audit verifie 2026-05-13 :

- `src/pages/Recipes.tsx:72` initialise `activeTab` en local state :
  `useState<'explore' | 'library' | 'inbox' | 'import'>('explore')`.
- `src/pages/Recipes.tsx` ne lit pas `useSearchParams`.
- `src/pages/ShareTarget.tsx` redirige vers `/kitchen/recipes?tab=inbox`.

Consequence : apres un partage mobile, l'utilisateur arrive sur l'onglet par
defaut au lieu de l'inbox. PR1 doit corriger ce bug avant tout split UI.

## 2. Dependances

- PRP-229 pour wording quick wins.
- PRP-230 pour routing/navigation shell.
- PRP-231 pour tokens, media responsive, loading/empty states et a11y.
- PRP-236 pour nettoyage pages demo/test.
- PRP-220.22 pour feed vertical/social vault si implementation media avancee.
- PRP-220.23 pour newsletter ingestion.
- PRP-220.24 pour media storage/pipeline.

## 2.1 Audit composants existants

Ne pas creer les modules ex nihilo. La PRP doit wrapper/recomposer ce qui existe
deja.

| Composant existant | Statut PRP-232 | Action |
| --- | --- | --- |
| `src/components/recipes/RecipeCard.tsx` | existe | reutiliser dans `RecipeLibraryTab` |
| `src/components/recipes/RecipeInbox.tsx` | existe | wrapper dans `RecipeInboxTab` |
| `src/components/recipes/InboxQuotaBadge.tsx` | existe | garder dans inbox |
| `src/components/recipes/inbox/*` | existe | garder pour inbox fine-grained |
| `src/components/recipes/AddRecipeDialog.tsx` | existe | wrapper dans `RecipeImportTab` |
| `src/components/recipes/ExtractedRecipeModal.tsx` | existe | garder pour verification |
| `src/components/recipes/InstagramVideoExtractor.tsx` | existe | conserver, mais ne pas etendre |
| `src/components/recipes/InstagramRecipeImport.tsx` | existe | auditer usage, eviter doublon UI |
| `src/components/recipes/InstagramThumbnailExtractor.tsx` | existe | auditer usage, probablement dev/debug |
| `src/components/recipes/InstagramDebugExtractor.tsx` | existe | candidat PRP-236/dev archive |
| `src/components/recipes/RecipeBookScanner.tsx` | existe | garder pour import photo/livre |
| `src/components/recipes/RecipeVoiceInput.tsx` | existe | garder ou masquer selon PRP-221 |
| `src/components/recipes/ClipboardSuggestion.tsx` | existe | garder dans inbox/import |
| `src/components/recipes/BulkImportButton.tsx` | existe | garder dans inbox/import |
| `src/components/recipes/RecipeSourceCard.tsx` | existe | wrapper dans `RecipeSourcePreview` |
| `src/components/recipes/ConfidenceBadge.tsx` | existe | utiliser dans `A verifier` |
| `src/components/recipes/PlatformIcon.tsx` | existe | utiliser dans source/platform UI |
| `src/components/recipes/RecipeNutrition.tsx` | existe | hors refonte nutrition, garder |
| `src/components/recipes/RecipeCustomizer.tsx` | existe | garder, pas de refonte ici |
| `src/components/recipes/RecipeCollections.tsx` | existe | garder, pas scope principal |

Modules nouveaux autorises seulement s'ils orchestrent ou encadrent ces pieces :

- `RecipeFeedTab`
- `RecipeLibraryTab`
- `RecipeInboxTab`
- `RecipeImportTab`
- `RecipeMediaFrame`
- `RecipeSourcePreview`
- `RecipePrimaryActions`

## 3. Scope

### Inclus

- Fix URL state `?tab=` et bug ShareTarget.
- Split technique de `Recipes.tsx`.
- Feed desktop lisible.
- Bibliotheque dense avec filtres.
- Inbox "A verifier" pour imports.
- Tab "Ajouter" pour URL/texte/photo/video/email.
- Detail recette avec media/source/actions claires.
- Edition recette avec sections.
- Preview lien video/source sans stockage obligatoire.
- Cleanup residues PRP-230 autour de `/kitchen/favorites`.

### Exclus

- Download illegal/automatique de videos plateformes.
- Realtime assistant.
- Recommendation engine complet.
- Nutrition coach.
- Refonte des parsers video/social existants.
- Migration DB recette.

## 4. Architecture UI

### Nommage

- Fichiers React : `PascalCase.tsx`.
- Composants d'onglet : suffixe `Tab`.
- Wrappers source/media/actions : noms explicites (`RecipeMediaFrame`,
  `RecipeSourcePreview`, `RecipePrimaryActions`).
- Pas de nouveau dossier si un fichier local suffit.

### Plan de split cible

| Module | Cible lignes | Role |
| --- | ---: | --- |
| `Recipes.tsx` | <= 200 | orchestrateur URL state + layout tabs |
| `RecipeFeedTab.tsx` | <= 250 | feed vertical/social |
| `RecipeLibraryTab.tsx` | <= 300 | recherche, filtres, cartes |
| `RecipeInboxTab.tsx` | <= 250 | wrapper `RecipeInbox` + empty/loading |
| `RecipeImportTab.tsx` | <= 200 | wrapper `AddRecipeDialog` + import actions |
| `RecipeMediaFrame.tsx` | <= 100 | image/video/source fallback |
| `RecipeSourcePreview.tsx` | <= 100 | wrapper `RecipeSourceCard` |
| `RecipePrimaryActions.tsx` | <= 80 | actions principales detail |

Ordre d'extraction recommande :

1. `RecipeInboxTab` parce que `RecipeInbox` existe deja.
2. `RecipeImportTab` parce que `AddRecipeDialog` existe deja.
3. `RecipeLibraryTab` parce que `RecipeCard` existe deja.
4. `RecipeFeedTab`.
5. Detail/Edit apres stabilisation des tabs.

State strategy :

- server state reste dans TanStack Query/hooks existants :
  - `useRecipes`,
  - `useRecipeCatalog`,
  - `useUserRecipes`,
  - `useRecipeInventoryAnalysis`,
  - `useRecipeCollections`,
  - `useImportsCount` si inbox/import en a besoin ;
- `Recipes.tsx` garde l'etat URL et passe des props aux tabs ;
- pas de nouveau context global pour les recettes dans PRP-232.

## 5. URL state contract

Tout ce qui doit survivre a un refresh ou etre partageable passe par l'URL.

| Param | Valeurs | Scope | Defaut |
| --- | --- | --- | --- |
| `tab` | `feed`, `library`, `inbox`, `import` | page | `feed` |
| `filter` | `favorites` | library | absent |
| `source` | `youtube`, `instagram`, `tiktok`, `web`, `newsletter`, `manual` | library | absent |
| `sort` | `recent`, `added`, `cooked`, `untested` | library | `recent` |
| `q` | string debouncee | library | absent |

Compatibilite :

- `tab=explore` doit etre coerce vers `tab=feed` pendant la transition.
- Valeur inconnue de `tab` => remplacer par `feed`.
- `filter=favorites` hors `library` => conserver dans l'URL mais ne l'appliquer
  que si `tab=library`.

Filtres mineurs :

- duree, tags/cuisine et autres filtres secondaires peuvent rester en local
  dans V2 ;
- s'ils deviennent des liens partageables plus tard, ouvrir une PR dediee.

## 6. Feed

### Mobile

- Scroll vertical.
- Media 9:16 autorise.
- Media max-height : `72vh`.
- Actions rapides :
  - sauvegarder ;
  - marquer comme cuisinee ;
  - verifier ;
  - ouvrir source.

### Desktop

- Le media ne doit jamais dominer toute la hauteur utile.
- Cible :
  - media column `max-w-[420px]` ;
  - media `max-h-[560px]` et `md:max-h-[520px]` ;
  - infos/actions visibles sans scroll initial sur 1440x900.
- Si layout card : preferer 4:5 ou 16:10, pas 9:16 plein ecran.
- Texte, source et actions ne doivent pas etre pousses hors ecran.

## 7. Bibliotheque

Doit servir a retrouver vite :

- recherche ;
- filtres source : newsletter, TikTok, Instagram, YouTube, web, manuel ;
- filtres duree ;
- filtres tags/cuisine ;
- filtre favoris ;
- tri : recent, ajoute recemment, cuisine recemment, a tester.

Favoris V2 :

- `/kitchen/recipes?tab=library&filter=favorites` est l'URL canonique.
- Les cartes doivent pouvoir afficher un etat favori clair.
- Si les donnees favoris ne sont pas disponibles, afficher empty state honnete
  plutot qu'un faux filtre.

## 8. A verifier

Regroupe imports non finalises :

- newsletter ;
- URL ;
- partage mobile ;
- social ;
- video locale ;
- texte colle.

Chaque item a :

- source ;
- status ;
- confiance extraction ;
- CTA verifier ;
- CTA supprimer.

Le score de confiance peut etre visible via `ConfidenceBadge`, mais le wording
utilisateur doit rester clair :

- "Confiance elevee"
- "A verifier"
- "Extraction incertaine"

Ne pas afficher un pourcentage brut seul sans label.

## 9. Ajouter

Entrees attendues :

- URL web ;
- lien YouTube/TikTok/Instagram ;
- texte libre ;
- photo ;
- video upload utilisateur ;
- email/newsletter.

Strategie lien video/source :

- ne pas ajouter de nouveau parser video dans PRP-232 ;
- utiliser les helpers/composants existants quand ils sont deja wires ;
- si le lien ne peut pas etre embed legalement ou techniquement :
  - afficher carte source ;
  - bouton "Ouvrir la source" ;
  - ne pas promettre lecture in-app.

La consolidation des anciens scrapers/parsers video/social reste hors scope
PRP-232 et doit passer par PRP-220.x ou PRP-236 selon le cas.

## 10. Detail recette

Hierarchy :

1. media/photo/video/source ;
2. titre + source + temps ;
3. actions primaires : Cuisiner, Ajouter les manquants, Modifier ;
4. ingredients ;
5. etapes ;
6. notes/journal ;
7. credits/source.

Wording interdit :

- "Decrementer l'inventaire" visible utilisateur.

Wording recommande :

- "Marquer comme cuisinee"
- "Ajouter les manquants aux courses"
- "Notes et source"
- "Ouvrir la source"

`RecipeSourceCard` existe deja dans `RecipeDetail.tsx`; PRP-232 doit l'encadrer
via `RecipeSourcePreview` seulement si cela clarifie la hierarchie.

## 11. Edition recette

Sections :

- Base ;
- Photo de couverture ;
- Video/source ;
- Ingredients ;
- Etapes ;
- Notes ;
- Visibilite/source.

Boutons sticky :

- Annuler ;
- Enregistrer.

Ne pas ajouter de nouveau champ DB sans PRP schema dediee. Si une donnee n'existe
pas encore en schema, la masquer ou la garder comme champ UI non persiste
explicitement marque hors scope.

## 12. Cleanup residues PRP-230

Routes et liens a corriger dans PRP-232 :

- `src/components/navigation/NavigationHub.tsx`
  - changer `kitchen-favorites` vers
    `/kitchen/recipes?tab=library&filter=favorites`.
- `src/pages/kitchen/KitchenDashboard.tsx`
  - remplacer `navigate('/kitchen/favorites')` par
    `navigate('/kitchen/recipes?tab=library&filter=favorites')`.
- `src/App.tsx`
  - garder le redirect legacy `/kitchen/favorites`, mais le faire pointer vers
    `/kitchen/recipes?tab=library&filter=favorites`.
  - PR3 doit modifier ce redirect en meme temps que `NavigationHub.tsx` et
    `KitchenDashboard.tsx`, pour eviter une chaine legacy vers
    `/kitchen/recipes` sans filtre.
  - Ne retirer le redirect que si aucun lien entrant connu ne depend de cette
    ancienne URL.

## 13. Strategie PR splitting

PRP-232 ne doit pas etre une PR geante.

| PR | Scope | Verification principale |
| --- | --- | --- |
| PR1 | URL state `useSearchParams` + fix ShareTarget | refresh garde `tab=inbox` |
| PR2 | Split `Recipes.tsx` en 4 tabs | `Recipes.tsx` <= 200 lignes |
| PR3 | `filter=favorites` + cleanup `/kitchen/favorites` | URL favoris canonique OK |
| PR4 | Detail refonte : `RecipeMediaFrame`, actions, source | screenshots detail mobile/desktop |
| PR5 | Edit refonte : sections + sticky CTA | edition recette smoke |

Chaque PR doit etre revertable independamment.

## 14. Tests et verification

Commandes :

- `npm run build`
- `npx tsc --noEmit -p tsconfig.json`
- `npm run lint`

Route smoke :

- `/kitchen/recipes`
- `/kitchen/recipes?tab=feed`
- `/kitchen/recipes?tab=library`
- `/kitchen/recipes?tab=library&filter=favorites`
- `/kitchen/recipes?tab=inbox`
- `/kitchen/recipes?tab=import`
- `/kitchen/recipes/:id`
- `/kitchen/recipes/:id/edit`

Tests URL state :

- refresh conserve `tab`, `filter`, `source`, `sort`, `q` ;
- `tab=explore` ouvre Feed et normalise si besoin ;
- ShareTarget vers `?tab=inbox` ouvre bien A verifier ;
- valeur inconnue de `tab` fallback Feed.

E2E minimum :

- import URL web/social -> inbox -> verifier -> bibliotheque ;
- creation manuelle -> detail -> edition -> retour bibliotheque ;
- favoris -> `/kitchen/recipes?tab=library&filter=favorites`.

Tests hors scope :

- tests profonds des parsers video/social ;
- download/stockage automatique de videos plateformes ;
- recommendation engine.

Visual QA :

- screenshots desktop/mobile du feed ;
- screenshot detail recette mobile/desktop ;
- verifier qu'aucune image 9:16 desktop ne rend la page illisible.

Bundle note :

- capturer la taille des chunks recettes avant PR2 et apres PR2 ;
- PRP-232 ne fixe pas de budget perf strict, mais tout split qui augmente le
  bundle principal doit etre justifie dans la PR ;
- si une regression nette apparait, ouvrir un follow-up PRP-231/perf plutot que
  bloquer la refonte recettes sur une optimisation profonde.

## 15. Definition of Done

- `/kitchen/recipes` est l'unique surface recette.
- ShareTarget arrive bien sur `?tab=inbox`.
- `tab`, `filter`, `source`, `sort`, `q` sont refresh-safe selon contrat.
- Feed/Library/A verifier/Ajouter sont comprehensibles sans onboarding.
- `Recipes.tsx` <= 200 lignes apres split.
- Chaque tab respecte les cibles de lignes §4.
- Detail recette met media/source/actions en haut.
- Edition recette supporte photo et lien video/source sans nouveau schema.
- `/kitchen/favorites` ne cree plus de redirect chain inutile depuis la nav.
- Le redirect legacy `/kitchen/favorites` pointe vers
  `/kitchen/recipes?tab=library&filter=favorites`.
- `RecipeCatalog.tsx` page legacy non reintroduite.
- Les composants existants riches sont reutilises avant creation de nouveaux.
- Aucun wording demo/enfantin dans les titres principaux.
- Aucun wording "Decrementer l'inventaire" visible utilisateur.
