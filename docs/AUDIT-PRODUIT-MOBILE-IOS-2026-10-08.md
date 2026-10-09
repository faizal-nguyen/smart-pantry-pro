# Audit Smart Grocery et plan vers une application iOS

Audit réalisé les 7 et 8 octobre 2026 sur l’état local de Smart Pantry Pro, dans le dépôt `smart-pantry-pro`, base Git `818ce526` et fichiers présents dans le checkout.

L’objectif est de faire de l’application un outil quotidien pour tenir ton inventaire, choisir et cuisiner des recettes, puis recevoir des suggestions adaptées à tes envies, objectifs et contraintes de santé. Ton appareil principal est l’iPhone 17 Pro Max et la cible à terme est une application iOS complète.

**La priorité est de rendre fiable la boucle courses → stock → choix d’une recette → cuisine → stock actualisé.** Plusieurs fonctions existent déjà, mais certaines actions annoncent une réussite sans enregistrer les données, les quantités peuvent être mal déduites et la personnalisation nutritionnelle du moteur reste incomplète. Une nouvelle interface iOS doit s’appuyer sur cette boucle corrigée.

## Ce qui a été vérifié

L’audit couvre les routes actives, leurs composants et hooks, les services de recommandation, les mutations de stock et de recettes, la personnalisation, les caches, le service worker et les migrations récentes de mémoire et de recommandations.

Les écrans ont été parcourus dans Chrome avec les composants du dépôt et une session locale isolée contenant uniquement des données fictives. Les services Supabase et les réponses API étaient remplacés dans cet environnement, sans modification du code produit. Les largeurs de fenêtre mesurées comprennent 375 px, 440 px et environ 1138 px. Ces observations valident des comportements de mise en page, pas le fonctionnement de Safari ou du matériel de ton iPhone.

| Surface | Vérification effectuée |
| --- | --- |
| Connexion | Rendu de la page réelle locale, sans authentification avec tes identifiants |
| Onboarding | Premier écran et passage vers l’application dans la session fictive |
| Cuisine du jour | Navigation, recommandations fictives, états vides, bloc anti-gaspi |
| Inventaire | Écran intermédiaire, grille, liste, unités affichées, boutons et filtres |
| Courses | Affichage, cochage, rubriques et positions des boutons |
| Recettes | Bibliothèque, fiche, instructions, nutrition affichée, variantes responsive |
| Assistant | Conversation vide, saisie, navigation et présentation mobile |
| Paramètres | Tentative d’accès et reproduction de la restriction erronée ; lecture des sections dans le code |
| Menus, imports et statistiques | Analyse des chemins actifs dans le code ; pas de création réelle de menu, d’extraction distante ou de validation des statistiques en production |

Cinq scénarios ont été exécutés avec les fonctions réelles du dépôt, transpilation TypeScript et dépendances simulées : cochage des courses, transfert après échec d’insertion, consommation avec unités différentes et erreur d’écriture, ajout manuel de recette, ajout depuis le catalogue. Les cinq défauts décrits ci-dessous sont reproduits dans cet environnement isolé. Le défaut d’accès aux paramètres est également reproduit dans le navigateur.

La production, ses données, les politiques RLS effectivement déployées et les services externes n’ont pas été vérifiés. Le connecteur disponible n’exposait pas le projet Supabase de cette application. Les performances réseau réelles, VoiceOver, le clavier Safari, la caméra et le microphone restent à valider sur iPhone.

## Pourquoi la routine reste difficile

Le coût de maintien du stock doit être inférieur au service rendu au moment de choisir un repas. Aujourd’hui, tu dois encore naviguer, interpréter des quantités, corriger les données et vérifier qu’une action a réellement fonctionné. Un inventaire incertain affaiblit ensuite les suggestions de recettes.

La page d’entrée est un tableau de statistiques, alors que ton besoin quotidien est une décision concrète : « Que puis-je cuisiner maintenant ? » L’entrée Inventaire ouvre d’abord un dashboard, puis la liste réelle. Les recettes présentent de grands cadres d’image même sans photo, et la fiche place plusieurs blocs avant les instructions. Ces choix consomment de l’espace et des gestes sur téléphone.

La personnalisation est répartie entre préférences locales, mémoire assistant, tags de recettes et paramètres encore incomplets. Il manque une source commune qui distingue ce qui est impératif, ce que tu aimes et ce que tu souhaites aujourd’hui. Cette fragmentation rend difficile une recommandation que tu peux comprendre et suivre avec confiance.

## État des fonctionnalités

| Domaine | Base présente | Limite principale pour ton usage | Décision proposée |
| --- | --- | --- | --- |
| Inventaire | Produits, quantités, lieux, dates, édition, grille et liste | Unités mal propagées, maintenance dispersée, consommation fragile | En faire la source de vérité et l’accès direct au stock |
| Ajout d’ingrédients | Ajout rapide, saisie, surfaces caméra et voix | Capture matérielle non validée sur iPhone ; scan de ticket non proposé dans le parcours actif | Un ajout rapide avec correction immédiate ; ticket ensuite |
| Bibliothèque de recettes | Recettes personnelles et catalogue fusionnés à la lecture, filtres et recherche | Ajouts manuels et depuis catalogue sans persistance dans les chemins identifiés | Réparer les écritures avant d’enrichir la découverte |
| Imports de recettes | URL, réseaux sociaux, inbox et nouvelle file vidéo | Build API bloqué sur le travail vidéo récent ; reprise après partage fragile | Conserver la saisie et permettre de reprendre un import |
| Cuisine | Instructions numérotées, ingrédients disponibles et manquants, journal | Mauvaise soustraction des unités, erreurs ignorées, absence de mode pas à pas dans la fiche active | Une session de cuisine avec portions et confirmation du stock |
| Recommandations | Classement selon stock, temps, anti-gaspi, mémoire et interactions | Couverture limitée aux recettes legacy ; nutrition fixe ; disponibilité calculée de plusieurs façons | Un moteur commun, explicable et relié aux changements de stock |
| Santé et nutrition | Estimations nutritionnelles par recette, mémoire sensible | Section santé en attente ; contraintes traitées comme signaux souples ; score nutrition des statistiques non nutritionnel | Profil explicite, exclusions strictes, valeurs estimées identifiées |
| Courses | Liste, regroupement, budget estimé, marquage, transfert | Cochage cassé, transfert non atomique, bouton recouvert | Fermer proprement le parcours achat → rangement |
| Menus | Planning hebdomadaire et sélection de recettes | Sources différentes de la bibliothèque ; sélection catalogue non couverte | Réutiliser le même contrat de recette ; priorité après le repas quotidien |
| Assistant | Texte, voix, modes, historique et mémoire | Point d’entrée abstrait ; certains boutons métier passent par une demande en langage naturel | Une aide contextuelle reliée à des commandes déterministes |
| Anti-gaspi | Dates, listes de produits, événements de gaspillage | Calculs de jours divergents et types de dates non distingués | Une seule règle de calendrier et des actions utiles |
| Notifications | Préférences persistées et demande d’autorisation | Préférence activée sans chaîne complète de rappels | N’afficher un rappel actif qu’après validation de sa livraison |
| PWA et hors ligne | Manifest, service worker, cache et ébauche de file locale | Reprise des écritures et isolation des données insuffisantes | Une synchronisation durable avant le pilote iOS |

Des fondations récentes sont à préserver : layout authentifié partagé, contexte de session, fournisseur responsive commun, chargement différé de pages et de dialogues, fusion des recettes à la lecture, journal de cuisine et mémoire assistant. Le plan porte sur leurs raccordements et leurs garanties.

## Défauts à corriger en priorité

P0 désigne un risque de perte ou de corruption du stock. P1 désigne un parcours principal cassé ou un résultat trompeur. P2 désigne une friction ou une fonction secondaire incomplète. « Reproduit » signifie reproduit localement, pas observé dans tes données réelles. « Code » désigne un constat sur le chemin actif ; « risque » une conséquence à valider dans un scénario complet.

### B01 Le transfert des courses peut perdre les articles

**P0 — reproduit.** `useShoppingList.addAllToInventory` ignore le champ `error` retourné par l’insertion Supabase, puis supprime les courses et annonce le transfert. L’échec simulé d’une insertion n’empêche ni la suppression ni le message de succès. Les écritures sont séparées et ne constituent pas une transaction.

**Correction :** une commande serveur atomique de transfert, identification des articles sélectionnés, contrôle de chaque écriture et protection contre un second envoi. En cas d’échec, conserver la liste et la possibilité de réessayer.

**Validation :** une insertion refusée laisse tous les articles récupérables ; un transfert relancé ne crée pas de doublon ; un transfert réussi met à jour stock, liste, badges et recommandations.

Source : `src/hooks/useShoppingList.ts:308`, insertions à partir de 323, suppression à partir de 334.

### B02 Cuisiner peut déduire une quantité fausse et annoncer un faux succès

**P0 — reproduit.** La fiche soustrait directement les nombres. Un stock de 1 kg et un ingrédient de 200 g donnent une quantité restante de 0. Les réponses d’erreur aux mises à jour ne sont pas contrôlées par `Promise.all`, qui reçoit des promesses résolues contenant un champ `error`. Le journal et le message « Cuisiné » peuvent donc suivre une mise à jour refusée.

**Correction :** conversion d’unités selon leur dimension, choix des lots, multiplicateur de portions et commande de consommation atomique. L’annulation doit être un mouvement inverse, pour conserver les modifications intervenues entre-temps.

**Validation :** 1 kg moins 200 g laisse 0,8 kg ; unités incompatibles demandent une correction ; un échec n’annonce pas un stock actualisé ; deux validations du même repas ne consomment qu’une fois.

Source : `src/pages/RecipeDetail.tsx:398`, calcul 411–417, écritures 426, annulation 447.

### B03 La création manuelle de recette ne sauvegarde pas

**P1 — reproduit.** `AddRecipeDialog.handleSubmit` construit une recette, appelle le callback, ferme le dialogue, réinitialise le formulaire et annonce « Recette ajoutée ». Il ne persiste rien. Le callback actif dans `Recipes` ferme uniquement le dialogue et sélectionne la bibliothèque.

**Correction :** raccorder une mutation de création réelle, attendre la réponse, conserver le brouillon en cas d’erreur et invalider la bibliothèque après réussite.

**Validation :** la recette et ses ingrédients sont présents après fermeture, actualisation et reconnexion ; un refus de sauvegarde préserve la saisie.

Sources : `src/components/recipes/AddRecipeDialog.tsx:503`, TODO à 541 ; `src/pages/Recipes.tsx:291`.

### B04 Ajouter une recette du catalogue renvoie un résultat fictif

**P1 — reproduit.** La mutation `addFromCatalog` retourne un identifiant `temp-…` sans écriture. Le callback de la page affiche pourtant une réussite. Le test de présence dans la bibliothèque retourne toujours `false`.

**Correction :** persister le lien utilisateur → recette catalogue, assurer son unicité et lire son état réel. Conserver les personnalisations lorsque la recette existe déjà.

**Validation :** l’ajout survit à une actualisation et le bouton reflète « Dans ma bibliothèque » ; un second ajout ne duplique pas la recette.

Sources : `src/hooks/useUserRecipes.ts:114`, contrôle de présence à 277 ; `src/pages/Recipes.tsx:106` ; `src/components/recipes/CatalogRecipeCard.tsx:83`.

### B05 Cocher une course ne transmet pas son état

**P1 — reproduit dans la fonction et le navigateur.** La page appelle `togglePurchased(item.id)` alors que le hook attend aussi un booléen. L’état optimiste et la mise à jour reçoivent `undefined`. La case testée ne reste pas cochée.

**Correction :** transmettre le nouvel état de la case et restaurer l’état précédent sur erreur.

**Validation :** cocher et décocher changent l’affichage, la base et le compteur ; une erreur permet de réessayer sans état ambigu.

Sources : `src/pages/SmartShoppingList.tsx:418` ; `src/hooks/useShoppingList.ts:155`.

### B06 Les paramètres sont interdits au profil adulte par défaut

**P1 — reproduit dans le navigateur.** L’accès à `/settings` ouvre « Accès Restreint » avec une raison liée à l’âge, puis redirige vers `/pantry`. Le profil adulte simulé par le hook famille autorise cinq sections, sans `settings`, et le garde d’accès s’applique même lorsque le mode famille est inactif.

**Correction :** limiter le garde aux restrictions effectivement actives et définir les permissions des routes utilitaires. Le compte et ses préférences doivent rester accessibles au propriétaire.

**Validation :** accès depuis Plus et par URL directe, profil adulte et mode famille désactivé ; couverture séparée des profils restreints lorsqu’ils seront fonctionnels.

Sources : `src/components/navigation/AppNavigation.tsx:320` ; `src/hooks/useFamilyMode.ts:32`. [Capture de la restriction](audits/2026-10-08/settings-restriction.png).

### B07 Les notifications de résultat ne sont pas montées

**P1 — code.** Les composants `Toaster` et `Sonner` sont définis, mais aucun hôte n’est monté dans l’arbre actif. De nombreuses réussites, erreurs et actions Annuler reposent sur ces notifications et ne sont donc pas affichées par ces systèmes.

**Correction :** choisir un système commun, monter son hôte au niveau partagé et réserver un message inline aux erreurs qui nécessitent une action dans le formulaire.

**Validation :** erreur réseau, confirmation et Annuler visibles depuis inventaire, courses et recettes, accessibles au lecteur d’écran et non masqués par la navigation.

Sources : `src/App.tsx:184` ; `src/components/ui/toaster.tsx` ; `src/components/ui/sonner.tsx` ; appels `toast` dans les mutations.

### B08 Le build standard est actuellement bloqué

**P1 — commande exécutée, échec confirmé.** `npm run build` échoue dans la compilation API, avant le build frontend, avec cinq erreurs TypeScript dans `SocialVideoImportQueue`. Les unions succès/échec sont mal réduites avant utilisation de leurs propriétés.

**Correction :** corriger les branches typées et faire passer le build complet sur le commit livré. Séparer la disponibilité de l’import vidéo de celle des fonctions quotidiennes.

**Validation :** build partagé, API et frontend réussis ; les échecs d’acquisition vidéo produisent un état récupérable.

Source : `apps/api/src/services/imports/SocialVideoImportQueue.ts:351`, puis 372 et 376–378. Ce constat ne décrit pas le statut du déploiement en production.

Le fichier de file vidéo et son test sont présents mais non versionnés dans ce checkout. Le résultat du build concerne cet état local et ne permet pas d’attribuer ces erreurs au seul commit Git cité.

## Ergonomie et UI sur téléphone

| ID et priorité | Constat | Amélioration et preuve attendue |
| --- | --- | --- |
| U01 — P1 | La barre d’actions de la recette est visible à 375 px et masquée à 440 px. `sm` commence à 430 px, alors que la navigation reste mobile jusqu’à 768 px. Les boutons inline tronquent leur texte sur le grand format téléphone testé. | Aligner le comportement sur la place réellement disponible. Tester au moins 375, 390, 430, 440 px, paysage et texte agrandi. Les actions principales restent accessibles en bas. |
| U02 — P1 | Le bouton flottant des courses est entièrement derrière la navigation. À 375 px, son rectangle vertical est environ 809–865 px ; celui de la navigation 804–889 px, avec un niveau d’affichage supérieur. | Positionner les actions au-dessus de la hauteur réelle de navigation et des marges système ; nom accessible sur le bouton. |
| U03 — P1 | Les ingrédients disponibles de la recette ont un texte presque blanc sur un fond vert très clair en thème sombre. La capture et les styles calculés confirment une lecture difficile. | Utiliser des couples fond/texte sémantiques pour chaque thème. Contrôler le contraste, conserver icône et texte en plus de la couleur. |
| U04 — P1 | L’entrée Inventaire ouvre Garde-Manger, puis demande d’ouvrir Inventaire. La grille utilise de grands carrés d’image même sans photo. Les quantités apparaissent « 500 », « 1000 », sans unité. | Accès direct au stock, liste compacte par défaut sur téléphone, nom + quantité et unité + date + lieu ; photo optionnelle. |
| U05 — P2 | Certaines actions mesurées font 25–28 px de haut ; case des courses 20 × 20 px ; menu de ligne 32 × 32 px. Des boutons d’icône et filtres n’ont pas de nom ou de rôle interactif adapté. | Zone de toucher d’au moins 44 × 44 points en iOS, équivalent web adapté ; boutons et cases nommés, filtres avec état sélectionné, focus visible. |
| U06 — P2 | Les actions de stock sont proposées par swipe sur mobile, avec peu d’indication visible. En liste compacte, les actions immédiates sont surtout Modifier et Jeter. | Actions visibles « Utilisé », « Ajuster », « Aux courses » ; swipe comme raccourci supplémentaire avec Annuler. |
| U07 — P2 | Le cadre d’image vide et le bloc d’analyse repoussent les instructions dans la fiche. Le bloc Continuer vide occupe une place importante avant les suggestions utiles. | Réduire les placeholders ; mettre en premier la prochaine décision, puis le mode cuisine et ses étapes. |
| U08 — P2 | Libellés français et anglais coexistent : Favorites, dinner, vegetarian, quick et le titre Insights Dashboard dans le code. L’assistant présente une consigne Maj+Entrée dans une saisie mobile étroite. | Vocabulaire français commun, libellés courts et aide adaptée au téléphone. Vérifier tout le parcours avec une taille de texte augmentée. |

Sources : `tailwind.config.ts:20`, `RecipeMobileActionBar.tsx:42`, `RecipePrimaryActions.tsx:33`, `RecipeDetail.tsx:639` et 691 ; `SmartShoppingList.tsx:474` ; `NavigationHub.tsx` ; `PantryDashboard.tsx` ; `SmartProductCard.tsx:128` ; `Inventory.tsx:971`.

Les variantes [375 px](audits/2026-10-08/recipe-small-phone.png) et [440 px](audits/2026-10-08/recipe-wide-phone.png), ainsi que [les courses](audits/2026-10-08/shopping-mobile.png), documentent ces comportements sur données fictives.

Apple recommande des commandes tactiles d’au moins 44 × 44 points et un contraste suffisant. Les dimensions web mesurées ici constituent des indices de friction ; leur validation iOS doit porter sur la zone réellement touchable. [Conseils UI Apple](https://developer.apple.com/design/tips/).

## Cohérence des données et des recommandations

| ID et priorité | Constat et niveau de preuve | Correction proposée |
| --- | --- | --- |
| D01 — P1 | **Code.** La bibliothèque fusionne `recipes` et `user_recipes`/catalogue. Le moteur de recommandations et la recherche de menus lisent uniquement `recipes`. L’ajout au menu recherche aussi son identifiant uniquement dans cette table. | Un contrat de référence de recette commun à bibliothèque, détail, menu, journal et moteur. Tester les trois origines de recette. |
| D02 — P1 | **Code.** Le moteur compare des quantités sans unité. L’analyse frontend peut accepter un match serveur sans vérifier la quantité et son fallback lit `inventoryItem.unit`, alors que l’unité existe dans `product.unit_type`. | Un calcul de disponibilité partagé, par lot, unité et nombre de portions. Retourner « à vérifier » lorsque les données ne permettent pas de conclure. |
| D03 — P1 | **Code.** Le moteur agrège les lots sans exclure les lots périmés ni distinguer leurs types de dates. Un produit peut donc contribuer à la disponibilité alors qu’une vérification est nécessaire. | Règles de date et de disponibilité explicites, sans compter automatiquement tous les lots dans « prêt à cuisiner ». |
| D04 — P1 | **Code.** `nutritionFit` et `novelty` sont constants à 0,5 dans le classement. Les objectifs nutritionnels ne disposent pas encore d’un calcul de correspondance réel. | Calculer seulement les critères alimentés par des données ; indiquer les critères inconnus et retirer les explications non justifiées. |
| D05 — P1 | **Code.** Les contraintes `health_sensitive` peuvent seulement ajouter une raison textuelle après une correspondance de mots. Ce chemin ne constitue pas un système d’exclusion des allergènes ou contre-indications. | Séparer exclusions impératives et préférences souples avant le classement. Une recette aux ingrédients inconnus ne reçoit pas une garantie de compatibilité. |
| D06 — P1 | **Code.** La section santé est un stub. La sauvegarde des préférences cuisine est locale ; la migration vers la mémoire assistant est exécutée une fois et ne synchronise pas les modifications ultérieures. | Profil utilisateur durable côté serveur, synchronisé entre appareils, versionné et immédiatement utilisé par le moteur. |
| D07 — P1 | **Code.** Le « score nutrition » des statistiques dépend du nombre et des notes des recettes, avec 7,5 par défaut sans recette. Il ne mesure pas l’alimentation consommée. | Retirer cette interprétation nutritionnelle. Montrer des valeurs réellement calculées et leur couverture ; afficher un état vide en absence de données. |
| D08 — P1 | **Code et observation.** Les dates sont calculées par `floor`, `ceil` et comparaison à l’heure courante selon l’écran. Les mêmes tomates sont affichées « Dans 1 jour » dans Garde-Manger et « Aujourd’hui » dans Cuisine. | Une fonction commune sur des jours calendaires, avec fuseau utilisateur ; mêmes résultats le matin, le soir et après changement d’heure. |
| D09 — P1 | **Code, risque à valider.** Les invalidations assistant existent, mais les écritures manuelles ne rafraîchissent pas tous les caches de recommandations, d’analyses et de badges. Le cache serveur des recommandations dure 15 minutes. | Déclencher les mêmes événements métier après toute écriture ; invalider côté serveur et client. `staleTime` seul n’est pas une fréquence de rafraîchissement. |
| D10 — P1 | **Code, risque à valider.** Des clés de cache de recettes et recommandations omettent l’utilisateur ; le QueryClient partagé n’est pas purgé à la déconnexion. Le service worker met aussi en cache des réponses Supabase sans purge explicite au changement de compte. | Cloisonner les caches par compte et contexte ; purger les données privées en fin de session ; tester compte A → déconnexion → compte B et reprise hors ligne. Aucune fuite réelle n’a été démontrée ici. |
| D11 — P1 | **Code.** Les boutons Cuisinée de certains panneaux passent par un texte envoyé à l’assistant, alors que la fiche écrit directement dans le stock. Les garanties et retours de résultat diffèrent. | Une commande métier commune recevant la recette et ses portions ; l’assistant et les boutons appellent cette commande et affichent son résultat vérifié. |

Sources principales : `RecommendationEngine.ts:183`, 295 et 394 ; `CookabilityScorer.ts:76` ; `PreferenceScorer.ts:149` ; `useRecipeInventoryAnalysis.ts:452` et 713 ; `useWeeklyMenu.ts:147` ; `useMealPlanningRecipes.ts:48` ; `useUserRecipes.ts:107` et 410 ; `NutritionWellbeingStub.tsx:19` ; `CookingPreferencesSection.tsx:134` ; `usePersonalizationMigration.ts:139` ; `useInsightsData.ts:124` ; `useTodayAntiWaste.ts:35` ; `useInventory.ts:383` ; `useTodayRecommendations.ts:35` ; `useNavCounts.ts:39` ; `src/lib/recipeActions.ts`.

Le moteur devra distinguer DLC et DDM : ces dates n’ont pas la même signification, et les conditions après ouverture comptent également. [Explications du ministère de l’Économie](https://www.economie.gouv.fr/particuliers/mes-droits-conso/alimentation/date-limite-de-consommation-dlc-date-de-durabilite-minimale-ddm-quelles-differences).

Un risque supplémentaire mérite un test ciblé dans Menus : `AddRecipeToMenuDialog` dépend de `searchRecipes`, fonction recréée à chaque rendu et modifiant un état de chargement. Cette combinaison peut provoquer des recherches répétées. Sources : `AddRecipeToMenuDialog.tsx:99` et `useMealPlanningRecipes.ts:48`. Ce comportement n’a pas été reproduit dans le navigateur pendant cet audit.

## PWA et préparation iOS

| ID et priorité | Constat | Action |
| --- | --- | --- |
| M01 — P1 | L’accueil redirige vers `/insights`. Les raccourcis du manifest et la destination de notification utilisent encore `/?tab=inventory`, `shopping` ou `assistant`, paramètres ignorés par cet accueil. | Routes canoniques pour chaque accès et écran Aujourd’hui comme entrée quotidienne. |
| M02 — P1 | La file hors ligne est une ébauche : ses consommateurs ne sont pas raccordés aux mutations principales ; le worker envoie vers `/rest/v1/...` sur l’origine web sans les éléments d’authentification Supabase et sans vérifier le statut HTTP. | Stockage local par compte, file durable, commandes authentifiées, contrôle des réponses et reprise explicite au retour dans l’app. |
| M03 — P1 | Le partage entrant tente immédiatement la capture, puis quitte la page même en erreur. Une interruption d’authentification ne conserve pas un état de reprise dans ce chemin. | Sauvegarder un brouillon de partage, reprendre après connexion et afficher un statut durable dans les imports. |
| M04 — P2 | Les réglages de notifications enregistrent des préférences et une permission ; ils ne fournissent pas le planificateur nécessaire aux rappels promis. | Planifier, dédupliquer, respecter l’horaire choisi et tester une notification réelle ouvrant le bon produit. |
| M05 — P2 | Les versions de cache sont fixes et le précache ne décrit pas les chunks du build. | Cycle de mise à jour contrôlé et test d’une ancienne installation après nouveau déploiement ; éviter de servir un mélange de versions. |

Sources : `src/pages/Index.tsx:12` ; `public/manifest.json` ; `public/sw.js:1`, 107 et 294 ; `src/hooks/useConnectionStatus.ts:23` ; `src/pages/ShareTarget.tsx:34` ; `src/components/settings/NotificationsSection.tsx:9`.

Les migrations de mémoire et de recommandations contiennent des politiques RLS limitées à l’utilisateur. Cette base doit être conservée. Leur présence dans le dépôt ne confirme pas leur application en production. L’ajout d’un profil santé nécessite une vérification des accès API, de l’isolation entre utilisateurs et des données effectivement transmises aux services IA.

## Performance et récupération après erreur

Les optimisations déjà présentes — layout partagé, lazy loading, catalogue de produits chargé à la demande et requêtes de comptage légères — sont pertinentes. Leur efficacité réelle doit être mesurée sur l’iPhone, car les statistiques annoncées dans la documentation ne constituent pas une mesure actuelle de l’application.

Le prochain lot doit distinguer le temps d’ouverture d’un écran, celui d’une écriture de stock et celui d’une réponse IA. Un inventaire local et une recette déjà consultée doivent rester disponibles rapidement ; une recommandation distante peut charger ensuite, sans bloquer les autres actions. L’état « enregistré sur cet appareil, synchronisation en attente » doit être distinct d’une réussite serveur.

La validation comprend ouverture à froid sur réseau mobile, retour depuis l’arrière-plan, interruption d’une requête, expiration de session et mise à jour de l’application. Chaque erreur doit proposer une récupération adaptée : réessayer, corriger la saisie ou reprendre le brouillon. Les écrans ne doivent pas afficher une donnée vide comme si le chargement avait réussi.

La télémétrie proposée mesure le délai avant interaction, le délai de confirmation des écritures, les échecs de synchronisation et les erreurs par parcours. Les budgets de performance seront fixés après cette première mesure ; aucun score Lighthouse actuel n’est établi par cet audit.

## Parcours quotidien proposé

### Un accueil Aujourd’hui orienté vers le repas

La navigation principale proposée est **Aujourd’hui, Stock, Cuisiner, Courses**. Le profil et les paramètres restent accessibles dans l’en-tête. L’assistant intervient depuis la question du jour ou une action contextuelle.

Le premier écran répond à une question : « Que veux-tu manger maintenant ? » Il propose trois options au maximum : rapide avec ton stock, adaptée à ton objectif, utile pour terminer un ingrédient. Chaque carte affiche le temps, les portions, les vrais manquants, une raison vérifiable et l’action Cuisiner. Des choix courts permettent de préciser « 15 min », « réconfortant », « léger », « après le sport » ou « petit budget ».

Le bloc Continuer apparaît lorsqu’une session existe. Les statistiques et bilans restent disponibles depuis le profil ou l’anti-gaspi ; les états vides ne prennent pas la place de la prochaine action.

### Un stock facile à maintenir

La vue mobile par défaut est une liste compacte, triée par lieu ou priorité de consommation. Une ligne permet de lire le nom, la quantité avec son unité, la date et l’état de confiance. Ajuster une quantité, signaler un produit terminé et ajouter aux courses sont visibles.

La précision doit s’adapter au produit : compter des œufs et des yaourts, suivre des grammes lorsqu’ils sont connus, ou signaler « environ la moitié » pour une réserve difficile à mesurer. Une estimation reste identifiable comme telle. Le moteur ne transforme pas un stock approximatif en certitude.

L’ajout propose recherche, scan de code-barres et saisie rapide. L’achat de plusieurs articles débouche sur un seul écran « Ranger mes courses », avec quantités, lieux et dates préremplis puis modifiables. Le scan de ticket vient ensuite : il propose des lignes à confirmer, sans écrire aveuglément dans le stock.

### Une première utilisation utile

La première utilisation doit déjà produire un résultat utile : renseigner les contraintes indispensables, ajouter quelques ingrédients disponibles et obtenir une recette réalisable. La configuration complète peut se poursuivre ensuite. Les saisies interrompues doivent être conservées, et une session existante doit retrouver son contexte au prochain lancement.

### Une cuisine qui actualise le stock

Le bouton Cuisiner démarre une session. Tu choisis les portions, vérifies les éventuels manquants et substitutions, puis suis les instructions pas à pas. L’étape en cours, les ingrédients utiles et les minuteries restent lisibles ; le retour à la session doit fonctionner après verrouillage ou changement d’app.

À la fin, « Repas terminé » présente un résumé court des ingrédients utilisés, corrigeable si nécessaire. La validation enregistre une seule consommation et actualise les suggestions. Un retour facultatif — aimé, à refaire, quantité insuffisante — enrichit ensuite tes préférences.

Le comportement actuel « Marquer comme cuisinée » ne doit pas être confondu avec le démarrage d’un guide de cuisine. L’interface doit rendre distincts ces deux moments.

### Des recommandations qui respectent ton profil

Le profil distingue trois niveaux :

1. **Contraintes impératives** : allergies et exclusions explicites, qui filtrent les candidats avant classement.
2. **Préférences et objectifs durables** : goûts, types de cuisine, budget, portions habituelles, objectif nutritionnel choisi.
3. **Contexte du repas** : envie, temps, faim, équipement et occasion du moment.

Le classement utilise ensuite stock réellement utilisable, temps, objectif et historique. Chaque raison affichée correspond à un calcul ou une préférence explicite. Si les ingrédients ou valeurs nutritionnelles sont incomplets, la recette reste marquée « à vérifier » pour le critère concerné.

La carte explique par exemple « 20 min, tous les ingrédients confirmés, utilise tes tomates à finir, correspond à ton objectif protéines ». Ce texte est une cible produit, pas une capacité confirmée du moteur actuel.

## Architecture nécessaire à cette expérience

L’API et la base peuvent rester communes au web et à iOS. Les lectures existantes sont à conserver lorsqu’elles sont correctement protégées ; les opérations qui touchent plusieurs tables doivent devenir des commandes métier vérifiables.

| Contrat | Garanties attendues |
| --- | --- |
| Référence de recette | Origine et identifiant cohérents, ingrédients et portions utilisables depuis chaque surface |
| Lot de stock | Quantité, unité, lieu, date et type de date, précision connue ou estimée |
| Mouvement de stock | Achat, consommation, correction ou gaspillage ; origine, date et protection contre doublons |
| Transfert des achats | Toutes les écritures validées ensemble, ou liste conservée pour reprendre |
| Consommation d’un repas | Conversion dimensionnelle, lots choisis, portions, mise à jour et journal cohérents |
| Profil et préférences | Source serveur par utilisateur, version, synchronisation et contrôle explicite des données sensibles |
| Synchronisation mobile | File persistée, reprises sans doublons, résolution des conflits, état visible et purge au changement de compte |
| Événement métier | Même invalidation des badges, stock, recettes et recommandations depuis UI, assistant et iOS |

L’assistant transforme une intention en entrée de commande ; les boutons connus fournissent directement une entrée typée. Les effets ne dépendent pas d’une réponse narrative pour déterminer si l’opération a réussi.

## Choix pour une véritable application iOS

**Je recommande de tester React Native avec Expo en premier**, car le dépôt est déjà en React et TypeScript et le backend peut être réutilisé. React Native fournit des composants natifs et Expo dispose d’une caméra avec lecture de codes-barres sur iOS. Le frontend DOM, Radix et ses composants Tailwind devront néanmoins être adaptés ou réécrits : ce choix ne permet pas de copier l’interface web telle quelle. [Composants React Native](https://reactnative.dev/docs/intro-react-native-components), [caméra Expo](https://docs.expo.dev/versions/latest/sdk/camera/).

| Option | Intérêt pour ce projet | Limite à prendre en compte |
| --- | --- | --- |
| React Native et Expo | Réutilisation possible de contrats TypeScript et de logique indépendante du DOM ; composants natifs ; possibilité Android ultérieure | Interface à adapter ; extensions et intégrations Apple avancées à prototyper avec du code natif |
| SwiftUI | Très cohérent si la cible reste exclusivement Apple et qu’une compétence Swift est disponible | Nouvelle interface et logique client en Swift ; maintien d’un client web séparé |
| Capacitor | Étape courte pour distribuer et enrichir le client web existant | Le rendu principal reste celui du web ; les défauts de flux et de synchronisation restent à résoudre |

SwiftUI est le framework Apple pour construire des interfaces sur ses plateformes. Capacitor fournit un conteneur iOS et des intégrations natives. Le choix ci-dessus est une proposition adaptée au dépôt, pas le résultat d’un benchmark des trois options. [SwiftUI](https://developer.apple.com/swiftui/), [Capacitor iOS](https://capacitorjs.com/docs/ios).

Le prototype décisif comprend un scan de produit, sa correction, sa sauvegarde hors ligne, sa synchronisation, puis une consommation liée à une recette. Il doit être testé sur ton iPhone 17 Pro Max, avec refus de permission, perte de réseau, verrouillage et retour dans l’app. Les extensions de partage et la conservation de session font également partie des risques à vérifier avant de choisir définitivement.

Le premier pilote iOS couvre Stock, Aujourd’hui, Cuisine et Courses. Les widgets « à finir », raccourcis Scanner et minuteries visibles pendant une cuisson peuvent ensuite faciliter le réflexe quotidien. Les technologies Apple correspondantes comprennent WidgetKit, les Live Activities et App Intents. [Technologies Apple](https://developer.apple.com/health-fitness/).

HealthKit reste facultatif et vient après un profil manuel utile. Son intégration nécessite des permissions pour les données concernées et une finalité compréhensible. Le refus doit laisser les fonctions principales utilisables. [HealthKit et permissions](https://developer.apple.com/health-fitness/).

## Plan de réalisation

Les durées sont des ordres de grandeur, en supposant une personne à temps plein sur le développement, une intervention design ponctuelle et les accès de validation disponibles. Elles sont à recalibrer après le premier lot ; elles ne constituent pas une date de livraison.

| Lot | Durée indicative | Livrable | Condition de sortie |
| --- | --- | --- | --- |
| 0 Fiabilité | 1 à 2 semaines | B01 à B08 corrigés ; unités et références clarifiées ; messages visibles ; build rétabli | Une course et une recette sont réellement enregistrées ; stock correct après achat et repas ; échecs récupérables |
| 1 Routine mobile | 2 à 3 semaines | Accueil Aujourd’hui, accès direct au stock, liste compacte, dates cohérentes, actions tactiles et mode cuisine | Les parcours principaux passent sur l’iPhone réel ; pas d’action masquée ; stock compréhensible sans ouvrir une fiche |
| 2 Personnalisation | 2 à 3 semaines | Profil serveur, exclusions strictes, envies du jour, calculs de disponibilité et nutrition explicables | Une contrainte explicite est respectée ; changer son stock ou son objectif change les suggestions ; les données inconnues restent identifiables |
| 3 Prototype iOS | Environ 1 semaine | Expérience native courte sur le parcours scan → hors ligne → synchronisation → cuisine | Choix technique documenté et démonstration sur iPhone 17 Pro Max ; risques natifs connus |
| 4 Pilote iOS | 4 à 8 semaines | Quatre surfaces quotidiennes, synchronisation durable, capture et notifications utiles, distribution TestFlight | Utilisation réelle pendant 14 jours sans perte de stock ; reprise réseau et changement de compte validés |

La synchronisation durable commence dans les fondations et doit être terminée avant le pilote. Les menus hebdomadaires avancés, collections complexes, modes famille encore simulés et imports vidéo supplémentaires ont une priorité inférieure à la boucle quotidienne. Leur reprise s’appuie sur les mêmes commandes et références.

Les travaux existants PRP-230, 234, 235, 237, 238, 239 et 240 offrent déjà des points de rattachement pour navigation, Aujourd’hui, paramètres, UI, responsive, filtres et imports. Il faut mettre à jour leurs critères de validation autour des parcours corrigés, en évitant de recréer une seconde solution pour chaque surface.

## Premier lot prêt à découper en tâches

| Ordre | Travail | Contrôle indispensable |
| --- | --- | --- |
| 1 | Rétablir le build API puis frontend | Compile le commit destiné à être livré |
| 2 | Rendre visibles les messages et restaurer l’accès adulte aux paramètres | Erreur réseau et Annuler visibles ; paramètres accessibles |
| 3 | Réparer le cochage et les deux ajouts de recettes | Persistance après actualisation ; doublons évités ; brouillon préservé |
| 4 | Définir les unités et corriger la consommation | Cas kg/g, L/ml, pièces, portions et unités incompatibles |
| 5 | Déplacer transfert et consommation vers des opérations atomiques | Erreur d’une écriture, second envoi, modification concurrente |
| 6 | Raccorder invalidations et isolation des caches | Stock, badges et suggestions cohérents ; compte A puis compte B |
| 7 | Corriger barre recette, bouton courses, contraste et unités affichées | Vérification à 375 et 440 px, thèmes clair/sombre, iPhone réel |
| 8 | Exécuter la boucle achat → rangement → cuisine → stock | État final conforme, sans correction manuelle dans la base |

## Mesurer si l’application devient utile chaque jour

Les objectifs ci-dessous sont des cibles proposées, sans mesure de référence disponible. Un journal d’usage léger sur 14 jours permet de les ajuster à tes habitudes.

| Mesure | Cible de départ |
| --- | --- |
| Fiabilité d’une écriture | Aucun faux succès ni perte de données dans les scénarios de régression et le pilote |
| Concordance du stock | Au moins 90 % d’un échantillon de 20 ingrédients conforme à la vérification physique hebdomadaire |
| Ajustement courant | Environ 5 secondes depuis la liste pour corriger ou terminer un ingrédient |
| Mise en route | Premier stock utile d’environ 20 ingrédients en moins de 5 minutes, à vérifier par essai |
| Choix du repas | Moins d’une minute pour accepter une suggestion ou préciser son envie |
| Retour après cuisine | Quantités ajustées en une confirmation, correction facultative |
| Routine | Utilisation spontanée plusieurs jours par semaine pour choisir un repas et maintenir le stock ; noter aussi les jours d’abandon et leur cause |
| Qualité des recommandations | Raisons pertinentes, manquants exacts, exclusions respectées et diminution des refus répétés |

Les événements utiles sont ajout, correction, recette ouverte, suggestion refusée avec motif facultatif, cuisine terminée, transfert confirmé et échec de synchronisation. Les détails de santé ne doivent pas devenir des champs de télémétrie ordinaires.

## Résultats des vérifications techniques

| Vérification | Résultat et portée |
| --- | --- |
| Build standard | Échec confirmé : cinq erreurs TypeScript dans la file d’import vidéo API |
| Reproductions isolées | Cinq défauts reproduits avec les fonctions réelles et les dépendances simulées ; voir le fichier de résultats |
| Navigation et responsive | Défaut paramètres, cochage, unités absentes, contraste, seuil recette et bouton courses observés sur l’environnement fictif |
| ESLint ciblé | 773 fichiers analysés, 1629 erreurs et 118 avertissements ; 1452 erreurs concernent `no-explicit-any`. Cette dette de qualité ne représente pas 1629 bugs utilisateur |
| Suite Jest, typecheck frontend et build Vite seul | N’ont pas abouti : dépendances locales présentes comme fichiers non téléchargés, notamment dans jsdom/cssom et ZXing. Commandes arrêtées après blocage ; aucun résultat de réussite ni de régression n’est attribué à ces validations |
| RLS et confidentialité | Migrations locales examinées, séparation par utilisateur présente sur les tables récentes ; déploiement et tests croisés réels à valider |
| Production et iPhone réel | Non vérifiés pendant cet audit ; nécessaires avant de considérer un lot livré |

[Résultats des reproductions](audits/2026-10-08/reproductions.json). Les captures utilisent des noms de recettes, stocks et recommandations fictifs : leurs scores et valeurs nutritionnelles ne constituent pas une évaluation de ton compte ou des réponses réelles du moteur.

Les modifications livrées par cet audit sont ce rapport et ses pièces de preuve. Les corrections applicatives, migrations et déploiements font partie du plan de réalisation.
