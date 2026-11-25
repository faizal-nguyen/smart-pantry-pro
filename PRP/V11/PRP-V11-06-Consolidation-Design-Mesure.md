# PRP V11-06 — Consolidation, design cohérent et mesure

> Statut : décisions validées (D8 et D9 le 22 novembre 2026, les autres le 25 novembre 2026) ; E0 réalisée le 25 novembre 2026 ([compte rendu E0](../../docs/implementations/V11-06-E0.md)) ; E1a réalisée le 25 novembre 2026 ([compte rendu E1a](../../docs/implementations/V11-06-E1a.md)).
> Date : 2026-11-22.
> Relecture : Codex, 22 novembre 2026 ; constats vérifiés dans le code et intégrés.
> Priorité : P1 pour les chiffres affichés à tort, pour l'exposition des fonctions Edge et pour le filet de tests visuels ; P2 pour l'unification de l'interface et le retrait du code sans appelant ; P3 pour la mesure produit, qui attend une décision de l'utilisateur.
> Dépendances : préalable transverse du nettoyage nocturne des courses, contrôlé et neutralisé par [V11-05](PRP-V11-05-Stock-Et-Courses.md) E0 avant toute autre étape ; contrats communs de [V10](../V10/README.md) (section 3) ; direction « Carnet culinaire » livrée, décrite dans [KITCHEN-OS-REFONTE](../../docs/KITCHEN-OS-REFONTE-2026-11-06.md) ; réglages de confidentialité existants.
> Coordination : [V11-01](PRP-V11-01-Boucle-Menus-Courses.md) (menus → courses, place des menus dans la navigation, scan de ticket, restes), [V11-02](PRP-V11-02-Retention-Foyer-Hors-Ligne.md) (notifications, foyer, hors-ligne, onboarding, manifeste PWA), [V11-03](PRP-V11-03-Recettes-Recherche-Cuisson.md) (recettes et mode cuisson), [V11-04](PRP-V11-04-Assistant-Chef.md) (assistant), [V11-05](PRP-V11-05-Stock-Et-Courses.md) (stock et liste de courses). Ce lot ne traite aucun de ces sujets ; il les cite quand une frontière passe par un fichier commun.
> Source : audit fonctionnel du 22 novembre 2026, revérifié sur l'arbre de travail du même jour (référence locale `3ade8b54`, modifications non commitées laissées intactes).
> Estimation indicative : 11 à 15 jours pour E0 à E6, hors E7 ; E8 (suppression des tables orphelines) 2 à 3 jours en plus (8 à 12 jours avant relecture, sans E8). La hausse vient du banc à compléter, de la correction des agrégats de pertes, de l'inventaire des fonctions Edge et du journal d'erreurs. Hypothèses : une personne à temps plein, décisions du tableau de la section 4 rendues avant l'étape qui en dépend. À recalibrer après E0, une fois la matrice de captures fixée.
> Réalisation : E0 (référence) et E1a (chiffres faux retirés, page minimale vraie ; lot R7 avancé), 25 novembre 2026. Cette PRP ne crée ni migration, ni dépendance, ni déploiement avant E8. Seule exception, soumise à D9 : la dépublication des fonctions Edge exposées, faite au rang 1 ; E0 constate qu'aucune fonction n'est déployée.

## 1. Problème et résultat attendu

La refonte « Carnet culinaire » a donné une identité aux écrans principaux. Trois défauts subsistent autour d'elle.

1. **Des chiffres que l'application ne peut pas justifier.** La page d'analyses affiche « Économies ce mois : 0.00€ » pour tout le monde, un pied de graphique écrit en dur (« -12% vs mois dernier », « Économies: 47,30€ ») et une « Valeur inventaire » qui est un nombre de lignes de stock. Cela contredit la règle de [V10-03B](../V10/PRP-V10-03B-Design-Culinaire.md) pour les données incomplètes (« À vérifier » ou « Information indisponible », jamais un zéro) et prolonge aux indicateurs le contrat commun n° 8 : une affirmation suppose ses données.
2. **Plusieurs systèmes d'interface en parallèle.** Deux piles de notifications éphémères sont montées, une couche Material You reste active pour un seul écran, et les états de chargement alternent entre texte et squelette.
3. **Aucune mesure de la boucle d'usage.** Le suivi d'erreurs fonctionne par journal serveur, et des traces métier existent (recettes affichées et ouvertes, événements de recommandation, journal de cuisson), mais rien ne dit si la boucle stock → menu → courses → cuisine est parcourue. Le réglage de consentement « analyses » n'a aucun effet.

Résultat attendu : chaque chiffre visible a une source, une période et une couverture ; un seul composant par besoin d'interface ; un dépôt allégé par lots réversibles ; aucune fonction serveur exposée sans décision ; une décision explicite sur la mesure, y compris « ne rien collecter ».

## 2. Périmètre et limites

**Inclus** : page d'analyses et page anti-gaspi ; unification des notifications, boutons, chargements et dialogues ; sort de la couche Material You ; inventaire et retrait par lots du code sans appelant ; inventaire de l'exposition des fonctions Edge ; hiérarchie de l'accueil ; rubrique « Nutrition et bien-être » des paramètres ; instruction du besoin de traduction ; minimisation du journal d'erreurs ; cadrage de la mesure produit ; tests visuels et d'accessibilité.

**Exclu, traité ailleurs** : nettoyage nocturne des courses, tâche et fonction comprises (V11-05 E0) ; génération de la liste depuis les menus, place des menus dans la navigation, restes et prix issus des tickets (V11-01) ; notifications, foyer, hors-ligne, onboarding et manifeste PWA (V11-02) ; fiche recette, mode cuisson et choix visuel des entrées Découvrir et Importer de la page Recettes (V11-03) ; assistant, y compris le masquage de la rubrique des modèles (V11-04) ; écrans de stock et de courses (V11-05).

**Non-objectifs** : remettre en cause la direction « Carnet culinaire » ; réécrire la couche `.kitchen-*` / `.culinary-*` en utilitaires Tailwind ; ajouter des indicateurs ; supprimer une table de base de données en dehors de l'étape E8 ; installer un outil d'analytique ; traduire l'application.

## 3. État de départ et surfaces actives

Relevé du 22 novembre 2026 par recherche d'importeurs dans `src/`, `scripts/`, `e2e/`, `apps/api/src` et `packages/`. Les comptages sont à refaire en E0 sur le SHA de travail, avec leur méthode et leur périmètre.

| Élément | État établi | Travail prévu |
| --- | --- | --- |
| [useInsightsData](../../src/hooks/useInsightsData.ts) | `lastMonthSpending` fixé à 0, donc économies toujours nulles ; série « zéro gaspillage » à `null` ; tendances et nutrition en tableaux vides ; « valeur » = `inventory.length`, qui compte des lignes, lots épuisés compris ; « bientôt » calculé en tranches de 24 h, alors que `getExpiringItems` ([useInventory](../../src/hooks/useInventory.ts)) utilise déjà le calendrier partagé et écarte les quantités nulles | Ne garder que les indicateurs calculables (section 5) |
| [InteractiveCharts](../../src/components/insights/InteractiveCharts.tsx) | Pied de graphique en dur, rendu même sans donnée ; onglets 6M/1A/2A qui changent la sélection sans filtrer la série ; boutons télécharger, filtrer, partager, calendrier sans gestionnaire | Retirer ; aucun graphique sans série réelle |
| [InsightsDashboard](../../src/components/insights/InsightsDashboard.tsx) | « Exporter » affiche un message sans rien exporter ; « Partager » diffuse le montant d'économies toujours nul ; badge « Mis à jour » = date du rendu ; seul importeur applicatif de `ui/material` | Refaire en page sobre aux composants communs |
| [AnimatedMetricCard](../../src/components/insights/AnimatedMetricCard.tsx) | Aucune donnée en dur : affiche l'indicateur reçu, avec émoji et retournement animé | Remplacer par la carte commune |
| [useChartData](../../src/hooks/useChartData.ts) | Alimente la répartition par catégorie à partir des prix estimés de la liste de courses ; budget par défaut de 500, sans effet faute de tendances | Retirer avec les graphiques |
| [WasteInsightsPage](../../src/pages/WasteInsightsPage.tsx) / [useFoodWaste](../../src/hooks/useFoodWaste.ts) | Lit `food_waste_events` sous RLS par compte, par un `select('*')` sans pagination ni borne haute ; un coût absent est additionné comme 0 ; quantités additionnées toutes unités confondues ; après un premier échec de lecture, l'état « Aucun gaspillage enregistré » s'affiche sous le message d'erreur ; liste les dernières déclarations et permet d'en supprimer une, sans effet sur le stock | Devient la base des analyses, avec agrégats corrigés (section 5) |
| [App.tsx](../../src/App.tsx) | Monte `Toaster` (Radix) et `Sonner`, ce dernier avec `offset` seul ; monte `MaterialYouThemeProvider` ; une vingtaine de redirections `Navigate` explicites, une douzaine d'alias générés depuis `getLegacyRedirections` ([NavigationHub](../../src/components/navigation/NavigationHub.tsx)), et un second résolveur au retour d'authentification ([routineRoutes](../../src/lib/routineRoutes.ts)) | Une seule pile ; sort du provider ; alias alignés (R8) |
| [MaterialYouThemeContext](../../src/contexts/MaterialYouThemeContext.tsx) | Encore monté (application et banc de test) ; seul consommateur de [use-mobile](../../src/hooks/use-mobile.tsx), de `services/color/` et, avec ce dernier, de [material-you-tokens](../../src/design-system/tokens/material-you-tokens.ts) | Lot de retrait après migration des analyses |
| [HybridGoldenGrid](../../src/design-system/HybridGoldenGrid.ts) | Atteint seulement par [useResponsiveZones](../../src/hooks/useResponsiveZones.ts), lui-même importé seulement par [AdaptiveHeroViewport](../../src/components/layout/AdaptiveHeroViewport.tsx), l'en-tête de la page d'analyses. [ResponsiveContext](../../src/contexts/ResponsiveContext.tsx) ne le cite qu'en commentaire et a ses propres seuils (640 et 768 px) | Part avec la page d'analyses (R7) |
| [index.css](../../src/index.css) | 929 lignes ; environ 127 classes `.kitchen-*` / `.culinary-*` distinctes, utilisées par 35 composants : c'est la couche « Carnet culinaire » livrée | Conserver et documenter ; pas de réécriture |
| [KitchenDashboard](../../src/pages/kitchen/KitchenDashboard.tsx) | 80 lignes très denses ; une douzaine de blocs, dont la moitié conditionnels ; la reprise de cuisine passe déjà avant les achats à ranger ; le repas planifié du jour n'apparaît que dans « Cette semaine » ([KitchenWeekPreview](../../src/components/meal-planning/KitchenWeekPreview.tsx)), avec un lien vers la page des menus. Ce bloc, et son message d'erreur, sont masqués sous 900 px (`.kitchen-week { display:none }`) | Hiérarchie « ce soir » (section 8) |
| [NutritionWellbeingStub](../../src/components/settings/NutritionWellbeingStub.tsx) | Deux lignes : rend `NutritionProfileEditor` avec `focus="nutrition"` | Renommer ou fusionner (section 9) |
| [reportClientError](../../src/lib/reportClientError.ts) | Actif : erreurs globales, de rendu et de route envoyées à `/api/v1/client-errors` ([route](../../apps/api/src/routes/client-errors.ts)), qui journalise avec l'identifiant de compte un message, une pile et un chemin libres, seulement bornés en longueur. La suppression de compte ne couvre pas ces journaux | Minimiser le contenu (section 11, E6) |
| [usePrivacySettings](../../src/hooks/usePrivacySettings.ts) | `allowAnalytics` existe, désactivé par défaut, persisté ; la mise à jour est appliquée au navigateur avant confirmation du serveur ; `isFeatureAllowed` exige aussi `hasConsent` ; son seul effet est `window.analyticsEnabled`, que rien ne lit | Lui donner un effet réel ou le retirer |
| Traces métier existantes | Cartes de recette visibles une seconde et recettes ouvertes enregistrées dans `recipe_interactions` ([useRecipeLifecycle](../../src/hooks/useRecipeLifecycle.ts)) ; `recommendation_events` écrit par le moteur ; `cooking_journal_entries`, annulées par `voided_at` | À décrire dans la politique ; base possible de l'option A |
| Banc fictif [scripts/fixtures/v10/main.tsx](../../scripts/fixtures/v10/main.tsx) | Ne monte ni `/insights` ni `/insights/waste` ; tout chemin inconnu rend `RecipeDetail` ; aucune déclaration de pertes ; monte les deux piles, Material You et `LayoutPerformanceProvider` | Routes, données et assertion de page en E0 |
| Fonctions Edge sans appelant | `recipe-assistant` lit le stock du `userId` pris dans le corps de la requête, avec la clé de service ; `panic-mode` vérifie seulement la présence d'un en-tête `Authorization`, puis utilise `context.userId` du corps ; `indian-price-estimator` écrit dans `recipe_price_estimates` à partir d'un `recipeId` fourni ; `ai-assistant-enhanced` utilise aussi la clé de service | Exposition à établir en E0 ; D9 |
| [playwright.config.ts](../../playwright.config.ts) | Tolérance de capture réglée, animations désactivées ; projets Chromium et, par les gabarits iPad Pro 11, iPhone SE et iPhone 13 Pro Max, WebKit (à confirmer à l'exécution) ; aucune assertion `toHaveScreenshot` ; [mobile-guardrails.spec.ts](../../e2e/mobile-guardrails.spec.ts) contrôle déjà les cibles de 44 px ; `scripts/qa-kitchen-os.mjs` (Chromium) contrôle largeurs, focus et cas dégradés | Section 12 |

## 4. Décisions proposées

Toutes ces décisions sont validées telles que proposées : D8 et D9 le 22 novembre 2026, les autres par l'utilisateur le 25 novembre 2026 ([compte rendu E0](../../docs/implementations/V11-06-E0.md), section 1). L'outil d'accessibilité est choisi (`@axe-core/playwright`, règles `critical` et `serious`) ; son installation est reportée au passage du harnais en CI.

| N° | Décision proposée | Alternative écartée, et pourquoi | Bloque |
| --- | --- | --- | --- |
| D1 | Fusionner `/insights` et `/insights/waste` en une page « Mes analyses » qui n'affiche que du mesuré | Garder le tableau de bord et le remplir : aucune donnée de dépense n'existe avant V11-01 | E1b |
| D2 | Retirer « Économies », tendances de dépenses, radar nutritionnel, export et partage | Les afficher grisés « bientôt » : promesse sans date, bruit visuel | E1a |
| D3 | Garder Sonner comme unique pile, avec `offset` et `mobileOffset` reliés à la hauteur mesurée de la barre basse | Garder la pile Radix, majoritaire (23 fichiers contre 5) : la marge mobile est à corriger dans les deux cas ; Sonner s'appelle sans hook et sert déjà à la confidentialité et à la session | E2 |
| D4 | Retirer la couche Material You une fois les analyses migrées | La conserver « au cas où » : PRP-231 l'admettait pour les composants hérités, il n'en reste qu'un | E3 |
| D5 | Accueil : après la reprise et l'alerte pertinente (ordre de V10-03B), le repas planifié du jour devient la carte repas principale, avec un lien vers sa recette quand elle est accessible | Suggestion toujours en tête : ignore une décision déjà prise par l'utilisateur | E5 |
| D6 | Traduction : différer ; centraliser seulement locale et fuseau | Installer une couche de traduction maintenant : un seul utilisateur, francophone | E6 |
| D7 | Mesure : commencer par l'option A de la section 11 (dériver des données métier, sans collecte nouvelle) | Outil tiers dès maintenant : coût de conformité sans question produit ouverte qui l'exige | E7 |
| D8 | **Validée le 22 novembre 2026 (V11-05 D12).** Tables sans référence dans le code : inventaire en E0, suppression dans l'étape distincte E8, après sauvegarde vérifiée et liste arrêtée table par table par l'utilisateur. Fonctions Edge : voir D9 | Les supprimer avec le code en E4 : irréversible, et l'état distant n'est pas connu | E8 |
| D9 | **Validée le 22 novembre 2026.** Si E0 trouve déployées `recipe-assistant`, `panic-mode`, `indian-price-estimator` ou `ai-assistant-enhanced`, les dépublier sans attendre, puis retirer leur code en E4. Dépublier est réversible par redéploiement depuis le dépôt | Attendre E4 : laisse pendant tout le lot une lecture possible du stock d'un autre compte et des dépenses de modèle non bornées | E0 |
| D10 | Journal d'erreurs sans texte libre : type, nom d'erreur, code connu, motif de route, build ; pile tronquée sans sa ligne de message | Garder le message libre borné à 500 caractères : il peut reprendre une saisie de l'utilisateur, journalisée avec son identifiant | E6 |

## 5. Analyses : des chiffres justifiables

**Règle d'affichage.** Un indicateur n'apparaît que s'il porte trois éléments : sa valeur calculée à partir de lignes réelles, sa période (« 30 derniers jours », « depuis le 3 novembre ») et sa couverture (« coût connu pour 4 pertes sur 9 »). Erreur de lecture, absence de déclaration et coût inconnu sont trois états distincts ; une lecture partielle n'est jamais présentée comme complète. Sans ligne, l'écran dit ce qui manque et propose l'action qui crée la donnée. Un zéro n'est affiché que lorsqu'il est mesuré.

**Calcul.** La période est une fenêtre bornée au début et à la fin, en jours calendaires du fuseau partagé (`calendarDate`, `PANTRY_TIME_ZONE`). L'agrégat porte sur toutes les lignes autorisées de la fenêtre : calcul côté serveur sous la session de l'utilisateur, ou lecture paginée jusqu'au bout, choix fixé en E1b. Les quantités ne s'additionnent pas entre unités (contrat V10 n° 2).

| Indicateur | Source réelle aujourd'hui | Sort proposé |
| --- | --- | --- |
| Pertes déclarées, par motif et par catégorie | `food_waste_events` via `useFoodWaste` | Conservé, en nombre de déclarations, avec période |
| Coût des pertes | `estimated_cost_eur`, nullable | Conservé avec couverture ; un coût absent n'entre pas dans la somme |
| Quantité jetée totale | `quantity` et `unit` | Retirée, ou ventilée par unité ; jamais un total toutes unités |
| Jours sans perte déclarée | Calculable depuis `occurred_at` | Possible, libellé « sans perte déclarée » : l'absence de déclaration n'est pas l'absence de gaspillage |
| Lots à utiliser sous 7 jours | Stock, dates renseignées | Lots à quantité positive dont la date tombe dans les 7 prochains jours calendaires (même règle que `getExpiringItems`), avec le nombre de lots sans date |
| Lots en stock | Stock | Lots à quantité positive, sous ce nom, pas « valeur » ; un comptage par produit distinct se décide en E1b |
| Répartition par catégorie | Prix estimés de la liste de courses en cours | Retiré : ce ne sont pas des dépenses |
| Économies, tendances de dépenses | Aucune | Retiré |
| Équilibre nutritionnel | Aucune agrégation vérifiée | Retiré ; la couverture nutritionnelle reste sur la fiche recette |

Après E1a, la page d'analyses ne lit plus le prix estimé de la liste de courses : le changement de sens de ce prix proposé par V11-05 ne la touche pas.

**Historique des déclarations.** La page fusionnée conserve la liste des déclarations et leur suppression, sous RLS par compte. Supprimer une déclaration retire une ligne du journal des pertes et ne recrédite pas le stock ; l'écran le dit avant confirmation. La déclaration elle-même reste celle de [stockDiscard](../../src/services/stockDiscard.ts) (commande de stock V10, puis écriture séparée et récupérable du journal) ; ce lot ne la modifie pas, mais teste qu'une reprise après réponse perdue ne déduit pas deux fois.

**Après V11-01.** Si le scan de ticket enregistre des prix payés et datés, deviennent possibles : dépense par période, répartition réelle par catégorie, coût des pertes fondé sur un prix d'achat, et comparaison d'un mois sur l'autre à partir de deux mois complets. Ces indicateurs ne sont pas spécifiés ici ; ils suivent la même règle d'affichage et n'entrent qu'avec leurs données.

L'entrée « Analyses » de la navigation secondaire, le lien « Mes analyses » du stock et le lien « Voir mes pertes » du dialogue de perte pointent vers la page fusionnée. `/insights/waste` devient une redirection.

## 6. Un seul système d'interface

La direction « Carnet culinaire » fixe la référence. Ce lot ne crée pas de nouveau style ; il supprime les doublons. Il reprend de [PRP-231](../PRP-231-Design-System-Accessibility-Performance.md) la standardisation des états vide et chargement et la règle « les pages outil utilisent les tokens produit », et de [PRP-237](../PRP-237-World-Class-Visual-Redesign-2026.md) les primitives de `src/components/ui/`, sans son orientation « assistant-first » déjà écartée par [V10-03B](../V10/PRP-V10-03B-Design-Culinaire.md). De V10-03B il reprend le tableau des états (chargement, vide, erreur, succès) et les cibles tactiles de 44 px.

| Besoin | Constat vérifié | Cible proposée |
| --- | --- | --- |
| Notification éphémère | Deux piles montées ; 23 fichiers appellent `use-toast`, 5 appellent `sonner`. Sonner reçoit `offset` seul : jusqu'à 600 px il applique son `mobileOffset` par défaut, et entre 768 et 899 px `--content-bottom-pad` tombe à 1,5 rem alors que la barre basse reste affichée | Une pile ; `offset` et `mobileOffset` reliés à `--mobile-nav-total-height` mesuré par la navigation mobile ; migration par fichier, des deux points de montage (application et banc), puis retrait de [toaster](../../src/components/ui/toaster.tsx), [toast](../../src/components/ui/toast.tsx) et [use-toast](../../src/hooks/use-toast.ts) ; effacement au changement de compte conservé (`AuthSessionContext`) |
| Bouton | 93 fichiers utilisent `Button`, 15 contiennent un `<button>` natif, 1 utilise `MaterialButton` | `Button` partout ; un `<button>` natif reste admis dans une primitive ou un élément de liste cliquable, avec nom accessible et cible suffisante |
| Chargement | Une vingtaine de textes « Chargement… », 12 fichiers en `animate-pulse`, le composant [Skeleton](../../src/components/ui/skeleton.tsx) utilisé par un seul écran | Squelette quand la forme du contenu est connue (listes, cartes) ; texte avec `role="status"` pour une attente courte dans un panneau |
| Dialogue | 26 fichiers importent `dialog`, 5 `alert-dialog` ; [sheet](../../src/components/ui/sheet.tsx) n'a qu'un importeur, et sa variante basse est fixée à `bottom: 0`, sans le suivi du clavier que `.routine-dialog` obtient de `visualViewport` | Sous 900 px, la primitive de dialogue existante prend une présentation basse, avec le même formulaire et le suivi du clavier de `.routine-dialog` ; pas de substitution directe par `Sheet`. Dialogue centré réservé aux confirmations |
| Responsive | Un contexte unique ([useResponsive](../../src/hooks/useResponsive.ts)) aux seuils 640 et 768 px ; la navigation bascule à 900 px ; `useResponsiveZones` ne sert plus qu'à l'en-tête des analyses ; `use-mobile` n'a qu'un consommateur | Le contexte unique ; le seuil de 900 px réservé aux surfaces qui suivent la navigation ; `use-mobile` part avec Material You |
| Styles | `index.css` importe [enhanced-layout.css](../../src/styles/enhanced-layout.css) ; `main.tsx` importe `material-you.css` ; `layout-optimization.css` et `assistant.css` n'ont aucun importeur trouvé | Règle écrite : tokens dans `index.css`, composition d'écran en classes `.kitchen-*` / `.culinary-*`, ajustements locaux en utilitaires |

La présentation basse des dialogues se limite aux écrans de ce lot (analyses, accueil, paramètres) et se vérifie clavier ouvert, avec annulation et retour du focus, avant d'être transmise. Les dialogues du stock, des courses, des recettes et de l'assistant reçoivent la règle et la primitive ; leur conversion appartient à V11-03, V11-04 et V11-05. Le choix visuel des entrées Découvrir et Importer de la page Recettes revient à V11-03, qui l'applique avec ces primitives ; ce lot ne modifie pas la bibliothèque.

## 7. Code sans appelant : retrait par lots réversibles

Trois catégories sont distinguées : **sans importeur** (aucun fichier ne l'importe hors tests), **chaîne morte** (importé seulement par des fichiers eux-mêmes sans importeur) et **monté** (atteint depuis `main.tsx` ou `App.tsx`, donc vivant même s'il ne sert presque plus).

| Lot | Cible | Preuve relevée le 22 novembre | Catégorie | Vérification avant fusion |
| --- | --- | --- | --- | --- |
| R1 | [PerformanceOptimizer](../../src/services/context/PerformanceOptimizer.ts) (388 lignes) et `scripts/verify-contextual-system.js`, seul à l'importer (import dynamique), déclaré dans aucune commande de `package.json` | Aucun import statique dans les cinq racines | Sans importeur | Build, tests client ; entrée de `scripts/tsc-baseline.json` mise à jour |
| R1 | `src/styles/layout-optimization.css`, `src/styles/assistant.css` | Aucun `@import` ni import trouvé | Sans importeur | Build, captures avant/après identiques |
| R2 | [useTutorial](../../src/hooks/useTutorial.ts), `TutorialTrigger`, `InteractiveTutorial` | Les deux composants ne sont que réexportés par `onboarding/index.ts` ; personne ne les importe | Chaîne morte | Build, parcours de première utilisation |
| R3 | [PerformanceMonitor](../../src/components/performance/PerformanceMonitor.tsx) | Importé seulement par le banc pour `LayoutPerformanceProvider` ; absent de la production | Hors production | Retirer du banc d'abord, puis build et banc |
| R4 | Enveloppes [InventoryPage](../../src/pages/InventoryPage.tsx) (8 lignes) et [RecipesPage](../../src/pages/RecipesPage.tsx) (15 lignes) | Elles rendent `Inventory` et `Recipes`, qui sont les vraies pages | Monté | Pointer les imports paresseux vers les vraies pages ; routes `/pantry/inventory` et `/kitchen/recipes` |
| R5 | [useFamilyMode](../../src/hooks/useFamilyMode.ts) | Bouchon qui renvoie un profil adulte fixe ; appelé par `AppNavigation`, `RoutineHeader` et `AssistantDashboard` | Monté | Remplacer chaque appel par sa valeur constante, puis retirer ; tests de navigation ; coordination V11-02 (foyer) |
| R6 | Couche Material You : contexte, `ui/material/`, `services/color/`, tokens, `material-you.css`, `use-mobile` | Dépend de E1b (dernier écran consommateur) | Monté | Recherche `--md-sys` vide dans `src/`, captures clair/sombre des sept écrans |
| R7 | Chaîne de l'ancienne page d'analyses : `AdaptiveHeroViewport` → `useResponsiveZones` → `HybridGoldenGrid`, et `useChartData` | Un seul importeur à chaque maillon : la page et le tableau de bord d'analyses | Monté | Même PR que la page fusionnée (E1b) |
| R8 | Alias de routes hérités | Deux résolveurs : le routeur (`App.tsx` et `getLegacyRedirections`) et le retour d'authentification (`routineRoutes.ts`) ; `/ai-assistant` fait deux sauts dans le routeur (`/assistant/chat` puis `/assistant`) et un seul au retour d'authentification | Monté | Voir ci-dessous |
| R9 | Routes API historiques `/v1/inventory/*` et `/v1/shopping/*` signalées par V11-05 ; `GET /favorites` et `POST /:id/favorite` de [recipes.routes.ts](../../apps/api/src/routes/recipes.routes.ts), qui lisent et basculent `recipes.is_favorite`, signalées par V11-03 | Montées derrière l'authentification, sur le client de l'utilisateur sous RLS (`req.supabaseClient`) ; sans appelant dans `src` selon V11-05 | Sans appelant web | Recherche refaite dans `src`, `scripts`, `e2e` et le contrat iOS de V10-04 ; tests API ; retrait de code seulement |
| R10 | [AssistantProvider](../../src/components/assistant/AssistantProvider.tsx), signalé par V11-04 | Monté seulement dans `fab-dictation.v10.test.tsx` ; cité en commentaire par `agentEvents.ts` et `useAuthenticatedUser.ts` | Hors production | Retrait avec son test, ou montage décidé par V11-04 ; build et tests client |

**Alias de routes (R8).** Un favori ou un raccourci externe n'est pas vérifiable : les alias de compatibilité sont conservés. Ils convergent directement vers la cible canonique, sans double saut, et les deux tables sont alignées. Les routes de fonctionnalités retirées (`/games`, `/settings/family`, `/settings/parental`, `/shopping/store-mode`) redirigent vers l'écran le plus proche. Tests : paramètres de requête, ancre et retour après connexion.

**Corrections apportées à l'audit rapide.** [Inventory.tsx](../../src/pages/Inventory.tsx) et [Recipes.tsx](../../src/pages/Recipes.tsx) ne sont pas mortes : ce sont les pages réelles, et ce sont leurs enveloppes `*Page` qui sont superflues. [usePersonalization](../../src/hooks/usePersonalization.ts) est vivant (compte, profil nutritionnel, idées de repas, conseils, évaluation de recette). `HybridGoldenGrid` ne vit plus que par l'en-tête des analyses.

**Cités seulement.** `smartMealPlannerService.ts` : sa suppression est décidée dans V11-01 ; noter que [planning/types.ts](../../src/services/planning/types.ts) en importe encore des types, utilisés par `useMealPlanningRecipes`. Rubrique des modèles de l'assistant : son masquage est spécifié dans V11-04. Flux `/onboarding` : V11-02 le redirige d'abord ; ses composants ne sont retirés qu'après cette redirection livrée, preuve d'absence d'appelant refaite.

**Fonctions Edge.** Aucun appel `functions.invoke` ni `functions/v1/` dans le client, l'API ou les schémas partagés.

- `cleanup-shopping-list` n'est pas morte, elle est dangereuse : appelée chaque nuit par une tâche créée en migration, sans vérification JWT (`supabase/config.toml`), elle supprime avec la clé de service les achats cochés dont `updated_at` a plus de vingt-quatre heures, tous comptes confondus. Elle est exclue de ce lot : son contrôle et sa neutralisation sont le préalable transverse de V11-05 E0.
- `recipe-assistant`, `panic-mode`, `indian-price-estimator` et `ai-assistant-enhanced` n'ont aucune référence dans le dépôt. Les trois premières font confiance à un identifiant fourni par l'appelant (section 3). Aucune exception de vérification JWT n'est déclarée pour elles ; la passerelle accepte néanmoins tout jeton valide du projet, y compris la clé anonyme publique si elle est au format JWT (à confirmer sur la configuration déployée). E0 relève pour chacune : déploiement et version, journaux d'appels, droits utilisés, dépenses de modèle. D9 en découle. La suppression du code suit en E4 ; rien d'autre n'est supprimé côté Supabase.

**Tables.** Le décompte dépend de la méthode : une recherche textuelle trouve 98 noms distincts dans les `CREATE TABLE` des migrations, dont 36 sans mention dans les cinq racines tous fichiers confondus, et 45 si l'on se limite aux fichiers TypeScript. E0 fixe la méthode. Ce relevé ne prouve rien : plusieurs tables servent à des fonctions SQL ou des déclencheurs. Cette PRP produit l'inventaire (nom, dernière migration, usage SQL, nombre de lignes à relever sur la base distante) en E0, y compris pour les anciennes tables de foyer (`families`, `family_members`, `family_conflict_resolutions`) transmises par V11-02 et les tables signalées par V11-05. La suppression a lieu dans l'étape distincte E8 (V11-05 D12, validée) : sauvegarde vérifiée par une restauration d'essai, liste arrêtée table par table par l'utilisateur, une migration par groupe de tables. L'inventaire relève les dépendances qui rendraient une suppression dangereuse : le déclencheur `create_default_shopping_list_trigger` sur `auth.users` (le retirer après la table casserait l'inscription) et la contrainte `shared_list_id ON DELETE CASCADE`. Il note aussi que le sort de `recipe-assistant` (D9) décide de celui de `recipe_conversations`, qu'elle seule écrit et que la suppression de compte ne semble pas couvrir (à vérifier, signalé par V11-05).

**Documents.** [docs/ROADMAP.md](../../docs/ROADMAP.md) décrit un calendrier 2024 et une offre sans rapport avec l'application actuelle. [docs/METRICS.md](../../docs/METRICS.md) présente des valeurs « actuelles » qu'aucune mesure du dépôt ne produit. Le `CLAUDE.md` du projet décrit Next.js et Drizzle, et des dossiers qui n'existent pas. Proposition : un bandeau « document historique, non factuel » en tête, ou un déplacement dans `docs/archive/`, au choix de l'utilisateur ; aucune suppression.

Règles communes, reprises de [PRP-236](../PRP-236-Repo-UI-Cleanup-And-Dev-Archive.md) : un lot par commit, preuve de recherche collée dans la description, `git revert` suffisant pour revenir, aucun changement de base. La recherche d'importeurs est refaite juste avant chaque lot.

## 8. Accueil centré sur « ce soir »

La composition approuvée reste : recette principale à côté de « Cette semaine » sur ordinateur, photo avant la recette sur mobile, bandeau « À utiliser bientôt », cinq destinations en bas (assistant ajouté à la navigation principale le 9 novembre, à la suite de l'audit du 7). L'ordre suit celui de V10-03B : reprise en cours, alerte pertinente, choix d'un repas.

| Rang | Bloc | Condition d'affichage |
| --- | --- | --- |
| 1 | Reprise : cuisson en cours, sinon achats à ranger | Existe déjà ; un seul à la fois |
| 2 | Alerte pertinente : erreur de lecture des menus ou du stock | Une seule à la fois, visible et annoncée à toutes les largeurs |
| 3 | **Ce soir** : le repas planifié du jour s'il existe, sinon la suggestion | Toujours |
| 4 | Cette semaine | Toujours sur ordinateur ; masqué sous 900 px comme aujourd'hui |
| 5 | À utiliser bientôt | Toujours, y compris vide |
| 6 | « À vérifier » : partage à reprendre, fruits et légumes à contrôler | Regroupés en un bloc replié qui annonce leur nombre |
| 7 | Conseil du jour, réglage du repas, repères de première utilisation | En repli, après le contenu |

**Repas du jour.** Le créneau retenu est celui du repas réglé pour aujourd'hui ; s'il porte plusieurs entrées, un ordre déterministe fixé en E5 choisit la principale et les autres restent listées sous la carte. La photo et le lien « Voir la recette de ce soir » vers `/kitchen/recipes/:id` n'apparaissent qu'après résolution de la recette par le même lecteur autorisé que la fiche ; le lien conserve source et portions (contrat n° 1), comme la grille de menus livrée. Une entrée sans référence, ou dont la recette n'est plus accessible, garde son titre sans lien et propose de changer le repas. Les restes de V11-01 et les menus partagés de V11-02 passent par ce même lecteur. La suggestion passe alors dans « Autres idées ».

**Erreur.** Aujourd'hui, le message d'erreur des menus vit dans `.kitchen-week`, masqué sous 900 px : sur téléphone, un échec de lecture est invisible et la suggestion semble dire « rien de prévu ». Le message passe au rang 2. Si la lecture des menus échoue, la suggestion reste affichée et l'erreur est dite.

Le composant est découpé en sous-composants sans changer hooks ni contrats. Les blocs de première utilisation sont coordonnés avec V11-02 ; la place des menus dans la navigation appartient à V11-01.

## 9. Paramètres

- **Nutrition et bien-être.** La rubrique est annoncée « Informations et disponibilité » et rend le même éditeur de profil que la rubrique cuisine, avec un autre focus. Proposition : la renommer d'après ce qu'elle contient réellement, ou la fusionner avec les préférences de cuisine ; garder `?section=nutrition` en redirection. Le fichier `NutritionWellbeingStub` est renommé en conséquence.
- **Modèles de l'assistant.** Visible par tous, avec configuration et coûts : traité par V11-04, non modifié ici.
- **Confidentialité.** Le libellé du réglage d'analyses décrit exactement ce qui est collecté une fois la section 11 tranchée. Tant qu'aucune mesure dédiée n'existe, l'interrupteur est masqué ou accompagné d'une mention exacte, par exemple « aucune mesure d'usage dédiée ; l'application enregistre les recettes affichées et ouvertes pour ses suggestions » (formulation à valider). Dire « aucune statistique n'est collectée » serait faux.

## 10. Traduction et fuseau horaire

Constat : aucune bibliothèque de traduction dans `package.json` ; `lang="fr"` ; `'fr-FR'` écrit dans 26 fichiers ; `Europe/Paris` dans 5 fichiers source du client, de l'API et des schémas partagés, dont la constante `PANTRY_TIME_ZONE` de [calendar.ts](../../packages/shared/src/calendar.ts). L'utilisateur principal est francophone et le pilote V10 vise un seul iPhone.

Conclusion proposée : **différer la traduction.** Une couche de traduction ajouterait un coût à chaque écran sans utilisateur pour en bénéficier. Deux précautions peu coûteuses sont proposées, sans urgence : un module unique pour le formatage des dates, nombres et montants, et la convergence des autres mentions du fuseau sur `PANTRY_TIME_ZONE`. Le fuseau est le seul sujet à risque réel : un séjour hors de France décalerait « aujourd'hui » et la semaine des menus. Il est consigné comme limite connue ; un fuseau par compte serait un lot à part. Critère de réouverture : un second utilisateur non francophone, ou un usage régulier hors du fuseau de Paris.

## 11. Mesure et vie privée

**Ce qui existe.** Le suivi d'erreurs est actif : `main.tsx` installe l'écoute globale, `ErrorBoundary` et `RouteError` signalent, la route `/api/v1/client-errors` (authentifiée, limitée en débit) écrit une ligne JSON dans les journaux serveur avec identifiant de compte, message, pile tronquée, chemin et build. Il n'y a ni agrégation ni alerte, et rien n'est signalé avant connexion. La route `/api/metrics` expose des compteurs techniques (imports, coûts de modèles) protégés par jeton ; ce n'est pas de l'analytique produit. `PerformanceMonitor` n'est pas monté en production. Des traces métier existent déjà, avec une finalité produit et un chemin distinct de `allowAnalytics` : `recipe_interactions`, `recommendation_events`, `cooking_journal_entries`. Côté consentement : le réglage `allowAnalytics`, désactivé par défaut, et une table `analytics_events` purgée par la suppression de compte, mais que rien n'alimente.

**Écart à corriger avant toute collecte.** La [politique de confidentialité](../../docs/PRIVACY-POLICY.md), datée du 7 janvier 2025, prévoit des « analyses anonymisées » avec consentement et 90 jours de conservation, puis affirme « aucune analyse comportementale ». Elle doit décrire exactement ce qui sera fait, ou dire que rien n'est collecté, et décrire dans les deux cas les traces métier existantes.

**Journal d'erreurs (D10, E6).** Le schéma serveur n'accepte plus de texte libre : type, nom d'erreur, code d'une liste connue, motif de route pris dans la liste du routeur (`/kitchen/recipes/:id`), build. La pile reste tronquée et perd sa première ligne, qui répète le message. Un rapport hors schéma est refusé. La rétention et l'accès aux journaux de l'hébergeur ne sont pas vérifiables dans le dépôt : ils sont relevés séparément et consignés.

**Événements utiles à la boucle**, et rien d'autre :

| Événement | Déclencheur | Propriétés admises |
| --- | --- | --- |
| `stock_mis_a_jour` | Commande de stock confirmée par le serveur | Origine (manuel, scan, assistant, rangement), nombre de lignes par tranche |
| `repas_planifie` | Créneau de menu enregistré | Type de repas, écart en jours |
| `courses_preparees` | Liste créée ou complétée | Origine (manuel, menu, assistant), nombre de lignes par tranche |
| `repas_cuisine` | Cuisson confirmée au journal, annulations écartées | Planifié ou non, stock déduit ou non |
| `retour_j7` | Calculé, non émis par le client | Présence d'un événement entre le 7e et le 13e jour |

**Règles de minimisation.** Aucun nom de produit, titre de recette, texte de conversation, contenu de mémoire, donnée de santé ou de profil alimentaire, ni jeton. Aucun texte libre, y compris des requêtes de recherche : uniquement des énumérations et des tranches. Les chemins sont ramenés au motif de route. Date au jour près. Conservation de 90 jours au plus, conforme à la politique. Ces règles prolongent la section 7 du README V10 et la clause de V10-03B sur le respect des réglages de confidentialité. Une journalisation des recherches, envisagée par V11-03 E7, exigerait une décision explicite sur une autre finalité.

**Consentement, contrôlé côté serveur.** Rien n'est écrit ni calculé tant que le serveur n'a pas établi `hasConsent` et l'accord pour la finalité nommée, lus dans la transaction d'écriture (option B) ou au moment du calcul (option A). La valeur optimiste du navigateur ne compte pas. Un retrait s'applique dès l'écriture ou le calcul suivant, y compris depuis un second client resté ouvert. Un `allowAnalytics` à `true` enregistré avant que la finalité soit décrite n'est pas réutilisé : l'accord est redemandé, sous une clé versionnée. La suppression de compte efface l'historique.

**Base légale, à confirmer.** Selon la CNIL, une mesure d'audience n'est exemptée de consentement que si elle produit des statistiques anonymes, sans suivi individuel ni recoupement avec d'autres traitements ([CNIL, mesure d'audience](https://www.cnil.fr/fr/cookies-solutions-pour-les-outils-de-mesure-daudience)) ; un retour à sept jours par compte en sort. L'option A, calculée côté serveur sur des données déjà détenues et sans traceur, relève plutôt de la compatibilité des finalités et de l'information des personnes. Ces deux points restent à confirmer avant E7.

**Options comparées, sans en imposer une et sans rien installer.**

| Option | Principe | Avantages | Limites |
| --- | --- | --- | --- |
| A — Dériver des données métier | Compter, côté serveur, les commandes de stock, créneaux de menu, listes et cuissons déjà enregistrés | Aucune collecte nouvelle, aucun outil, aucune donnée en plus | Comptages partiels : l'ajout manuel aux courses est une insertion directe dans une liste modifiable, le menu remplace un créneau existant, la progression de cuisson est locale. Seules les commandes de stock et les cuissons confirmées sont datées côté serveur. Pas d'abandon ni de temps passé |
| B — Journal interne | Route API et table `analytics_events`, alimentée sous consentement | Données dans la base du produit, schéma maîtrisé | La table accepte un propriétaire nul et du JSON libre ; sa purge à 90 jours n'est pas planifiée (ligne `cron.schedule` commentée) ; l'export des données l'omet. B exigerait une migration additive : identité d'événement unique par action confirmée, schéma fermé, lecture et écriture contrôlées, export et effacement couverts, purge planifiée et maintenue après l'arrêt du producteur |
| C — Outil dédié respectueux de la vie privée, de préférence auto-hébergé (par exemple Plausible, Umami ou PostHog) | Script et tableau de bord prêts | Entonnoirs et tableaux sans développement | Sous-traitant ou service à héberger et maintenir ; les outils sans identifiant mesurent mal le retour à sept jours ; politique et consentement à réécrire |

Proposition : commencer par A pour les actions datées effectivement observables. Avant de publier un taux de boucle, fixer l'ordre attendu des étapes, la fenêtre, le point de départ de J7, et ne compter que les cohortes arrivées à J13. N'ouvrir B ou C que si une question précise reste sans réponse.

## 12. Tests visuels et accessibilité

Le dépôt fournit [playwright.config.ts](../../playwright.config.ts) (tolérance de capture réglée, animations désactivées, projets Chromium et WebKit), cinq fichiers de scénarios dans `e2e/`, dont `mobile-guardrails.spec.ts` qui contrôle déjà les cibles de 44 px, le banc fictif `npm run test:v10:ui` et le script `scripts/qa-kitchen-os.mjs` (largeurs, ouverture de recette, focus, cas dégradés). Aucun scénario ne compare de capture à une référence et aucun contrôle de règles d'accessibilité n'est installé.

- **Banc** : E0 ajoute les routes `/insights` et `/insights/waste`, des déclarations de pertes déterministes (dont une sans coût et deux unités différentes), un état d'erreur de lecture, et une assertion d'identité de page (titre ou repère) avant chaque capture, puisqu'un chemin inconnu rend aujourd'hui `RecipeDetail`.
- **Largeurs** : 320, 390, 768, 899 et 900 (bascule de navigation), 1024 et 1440 px.
- **Thèmes** : clair (premier lancement) et sombre.
- **Écrans** : accueil, bibliothèque, fiche recette, stock, courses, menus, assistant, paramètres, analyses.
- **Matrice par risque** : neuf écrans, sept largeurs et deux thèmes font 126 captures pour le seul état normal. E0 fixe une matrice réduite, avec une commande reproductible : par exemple toutes les largeurs pour l'accueil, les analyses et les courses, 390 et 1440 px pour les autres écrans, états vide, chargement et erreur à 390 px.
- **États** : normal, vide, chargement, erreur de lecture ; accueil avec et sans repas planifié.
- **Source** : le banc fictif, pour des captures déterministes sans secret ni compte réel. Les scénarios authentifiés existants restent une vérification séparée.
- **Accessibilité** : contrôle automatisé par écran (outil choisi en E0, avec la liste des règles qui font échouer la CI), parcours clavier des dialogues avec retour du focus, `prefers-reduced-motion`, contraste dans les deux thèmes, cibles de 44 px (contrôle existant réutilisé).

Firefox n'est pas couvert ; l'ajouter est proposé en fin de lot et non requis pour la sortie. Safari sur iPhone et VoiceOver restent une validation matérielle distincte, comme dans V10-03B.

## 13. Découpage de réalisation

| Étape / PR | Livrable | Condition |
| --- | --- | --- |
| E0 — Référence | Inventaire d'importeurs refait, avec méthode ; banc complété (section 12) ; matrice de captures et captures de référence ; inventaire de l'exposition des fonctions Edge ; décisions D1 à D10 rendues ou reportées ; réestimation | V11-05 E0 fait (nettoyage nocturne contrôlé) ; banc fictif fonctionnel |
| E1a — Retrait des chiffres faux | Pied de graphique, « Économies », « Valeur inventaire », onglets et boutons sans effet retirés de la page actuelle | D2 ; indépendant de D1 |
| E1b — Analyses fusionnées | Page « Mes analyses », agrégats de la section 5, historique des déclarations, lot R7 | E1a ; D1 |
| E2 — Notifications et états | Une seule pile avec marges reliées à la barre basse ; règle de chargement, de bouton et de dialogue appliquée aux écrans de ce lot | D3 |
| E3 — Material You | Lot R6 | E1b fusionnée ; D4 |
| E4 — Retraits | Lots R1 à R5 et R8 à R10, un commit par lot ; code des fonctions Edge retenues par D9 ; bandeaux des documents historiques ; inventaire des tables | Preuve refaite pour chaque lot |
| E5 — Accueil | Hiérarchie de la section 8, lien vers le repas du jour, composant découpé | D5 ; coordination V11-01 et V11-02 |
| E6 — Paramètres, locale, journal d'erreurs | Rubrique nutrition clarifiée ; module de formatage et fuseau unique ; schéma minimal du journal d'erreurs | D6 ; D10 |
| E7 — Mesure | Option retenue mise en œuvre, politique mise à jour, consentement contrôlé côté serveur | D7 ; base légale confirmée ; aucune collecte avant validation écrite |
| E8 — Suppression des tables orphelines | Une migration par groupe de tables, selon l'inventaire E0 (section 5 du compte rendu). E0 constate que `create_default_shopping_list_trigger` et `shared_list_id ON DELETE CASCADE` n'existent pas en production (migration `20250818000001` jamais appliquée) et que la suppression de compte couvre `recipe_conversations` ; l'état réel se lit sur les objets, l'historique distant des migrations n'étant pas fiable | D8 ; inventaire E0 avec nombre de lignes relevé sur la base distante ; restauration d'essai de la sauvegarde réussie ; liste validée par l'utilisateur ; E4 fait |

E1a, E2, E4 et E5 sont livrables indépendamment après E0. E1b suit E1a ; E3 dépend de E1b. La dépublication décidée par D9 n'attend aucune étape. E7 peut ne jamais être réalisée si l'utilisateur retient « ne rien collecter ».

## 14. Vérification et critères de sortie

Tests à écrire d'abord, en échec avant la réalisation :

- Agrégats de pertes : trois déclarations dont une sans coût → somme des deux coûts connus et couverture « 2 sur 3 » ; deux unités différentes → aucune quantité totale additionnée ; plus de lignes qu'une page de lecture → total complet ; déclaration hors de la fenêtre, avant ou après → exclue ; première lecture en échec → message d'erreur, et ni état vide ni zéro.
- Page d'analyses sans donnée : état vide avec action, aucun montant, pourcentage ni série. Assertions par libellé d'indicateur et par jeu de données, complétées par l'absence des littéraux rendus aujourd'hui (`0.00€`, `-12% vs mois dernier`, `47,30€`).
- Historique : suppression d'une déclaration → stock inchangé et avertissement préalable ; reprise d'une déclaration après réponse perdue → une seule déduction.
- Stock dans les analyses : lot à quantité nulle exclu ; date à J+7 calendaire incluse, à J+8 exclue, dans le fuseau partagé.
- Accueil : repas planifié aujourd'hui → carte principale avec lien vers la bonne recette, source et portions conservées ; entrée sans référence → titre sans lien ; recette inaccessible → ni photo ni lien ; sans repas → suggestion ; à 390 px, chargement, absence confirmée et erreur de menus annoncée hors du bloc masqué.
- Notifications : un seul conteneur dans le document après montage ; à 390 et 899 px, une notification ne recouvre pas la barre basse.
- Dialogues de ce lot : clavier virtuel ouvert → validation visible ; fermeture → focus rendu à l'élément d'origine.
- Journal d'erreurs : rapport avec chemin hors motifs ou champ libre → refusé.
- Mesure (si E7) : consentement absent, valeur seulement optimiste côté navigateur, ou accord retiré depuis un second client → aucune écriture ni calcul ; charge utile avec champ de texte libre refusée par le schéma.

Après chaque étape : `npm run test:v10:client`, les tests API concernés, `npm run lint:ci`, `npm run typecheck:app`, `npm run build`, puis les captures du banc comparées à la référence E0.

- [ ] Aucun chiffre affiché sans source, période et couverture ; aucune valeur en dur dans `src/components/insights/`.
- [ ] Une seule pile de notifications montée ; `use-toast` sans importeur.
- [ ] `rg "MaterialYou|--md-sys|ui/material" src` ne renvoie rien ; les sept écrans de la refonte sont visuellement inchangés en clair et en sombre.
- [ ] Chaque lot de retrait a sa preuve, son commit et son build vert ; aucun fichier de migration modifié ; aucun objet distant modifié hors dépublications décidées par D9.
- [ ] Chaque fonction Edge a un état relevé (déployée ou non, appels, droits) et une décision D9.
- [ ] L'accueil montre, après la reprise et l'alerte éventuelle, le repas planifié du jour et son lien quand il existe, à 390 et 1440 px ; une erreur de menus est visible à 390 px.
- [ ] Aucun débordement horizontal aux largeurs de la matrice ; contrôle d'accessibilité automatisé sans erreur bloquante sur les neuf écrans.
- [ ] La décision de traduction et la limite de fuseau sont consignées.
- [ ] Le journal d'erreurs ne contient plus de texte libre ; sa rétention chez l'hébergeur est relevée.
- [ ] La mesure est soit mise en œuvre sous consentement contrôlé côté serveur avec politique à jour, soit explicitement reportée ; dans les deux cas, le réglage d'analyses et la politique ne promettent rien de faux.
- [ ] Les preuves distinguent banc fictif, environnement déployé et appareil réel.

## 15. Retour arrière et transmission

Chaque étape et chaque lot de retrait correspond à un commit isolé : un `git revert` restaure le code, puisque rien n'est supprimé en base avant E8. Une table supprimée en E8 ne se rétablit que depuis la sauvegarde prise juste avant l'étape : c'est pourquoi E8 exige une restauration d'essai réussie et une liste validée table par table. Une fonction dépubliée par D9 se redéploie depuis le dépôt, à la version relevée en E0. La page d'analyses précédente et la pile Radix restent récupérables depuis l'historique ; il n'est pas prévu de drapeau pour les réactiver. La mesure se désactive par le réglage de consentement et par une sélection serveur ; son arrêt ne touche aucun parcours. Si l'option B a écrit des événements, un retour de code ne les efface pas : ils restent soumis à la purge, qui doit continuer à tourner après l'arrêt du producteur.

Transmettre : l'inventaire E0, les captures de référence, le tableau des décisions avec la réponse de l'utilisateur, l'inventaire des tables et des fonctions Edge avec leur état distant, et la règle d'affichage des indicateurs pour V11-01. V11-03, V11-04 et V11-05 reçoivent la règle des dialogues en présentation basse et la pile de notifications unique ; V11-03 reçoit aussi la règle « aucun texte libre » pour toute observation de la recherche.
