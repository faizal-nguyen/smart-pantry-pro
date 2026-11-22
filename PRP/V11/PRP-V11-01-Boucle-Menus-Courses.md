# PRP V11-01 — Fermer la boucle menus → courses → rangement

> Statut : Brouillon — décisions proposées, non validées par l'utilisateur.
> Date : 2026-11-22.
> Relecture : Codex, 22 novembre 2026 ; constats vérifiés dans le code et intégrés.
> Priorité : P0 pour les courses de la semaine (E1–E2) ; P1 pour l'édition du menu, la semaine proposée et le ticket de caisse.
> Dépendances : commandes et unités de [V10-01](../V10/PRP-V10-01-Fiabilite.md), rangement de V10-02, moteur de recommandation de V10-03, rôles de modèles de [V10-03D](../V10/PRP-V10-03D-Agent-Modeles.md) ; [contrats communs V10](../V10/README.md#3-contrats-communs-aux-dix-prps). Dans V11 : neutralisation du nettoyage nocturne ([V11-05](PRP-V11-05-Stock-Et-Courses.md), E0) avant E5 ; contrat des écritures de la liste de courses (V11-05, étape dédiée) avant E1 et E5.
> Coordination : [V11-02](PRP-V11-02-Retention-Foyer-Hors-Ligne.md) (notifications, foyer partagé, hors-ligne, onboarding), [V11-03](PRP-V11-03-Recettes-Recherche-Cuisson.md) (bibliothèque, recherche, mode cuisson), [V11-04](PRP-V11-04-Assistant-Chef.md) (assistant, dont l'outil de planification qui appellera le service de semaine défini ici), [V11-05](PRP-V11-05-Stock-Et-Courses.md) (stock, contrat d'écriture et ergonomie de la liste), [V11-06](PRP-V11-06-Consolidation-Design-Mesure.md) (design, analyses, nettoyage, analytique). Ces lots sont cités, pas traités.
> Source : audit fonctionnel du 22 novembre 2026, constats revérifiés dans le code le même jour (arbre de travail local, modifications non commitées préservées).
> Estimation indicative : 6 à 8 semaines pour une personne à temps plein — E0 2 à 3 jours, E1 7 à 9 jours, E2 3 à 4 jours, E3 5 à 7 jours, E4 4 à 6 jours, E5 9 à 12 jours. La première version annonçait 4 à 5 semaines ; la relecture a ajouté l'identité des repas cuisinés, les contributions par ligne, l'alignement de `plan_recipe`, l'achat partiel et la provenance des scans. À recalibrer après E0. Hypothèses : schéma distant conforme aux migrations locales, base PostgreSQL de test disponible, accès au modèle de vision, aucun essai iPhone compté.

## 0. Décisions proposées

Rien n'est validé. Chaque ligne doit être tranchée avant l'étape qui en dépend.

| # | Sujet | Proposition | Alternative écartée | Étape |
| --- | --- | --- | --- | --- |
| D1 | Courses de la semaine | Calcul serveur sur toute la semaine, récapitulatif révisable, puis une commande `menu_add_missing` confirmée contre la version du menu, la révision du contexte de stock et le jour de référence | Boucler `recipe_add_missing` par repas : sous-achète (§3) | E1 |
| D2 | Menu modifié après préparation | Registre des contributions du menu **par ligne de liste** ; une baisse ne porte que sur la part du menu d'une ligne restée inchangée ; les achats cochés à ranger couvrent le besoin | Registre par produit : une baisse peut toucher une quantité saisie à la main ; lignes dédiées au menu : doublons contraires à l'agrégation de V11-05 | E1 |
| D3 | Repas pris en compte | Du jour courant à la fin de la semaine visée ; les repas non cuisinés qui la précèdent réservent le stock d'abord ; hors repas cuisinés et hors restes | Toute la semaine, passé compris ; semaine visée isolée, qui promet deux fois le même lot | E1 |
| D4 | Édition du menu | Une commande `update_menu` (placer, retirer, déplacer, portions, copier, restes), annulable par `undo_stock` ; `plan_recipe` aligné sur les mêmes invariants | Écritures directes Supabase, comme le retrait actuel | E1, E3 |
| D5 | Déplacement | Glisser-déposer au pointeur et action « Déplacer » au clavier et au lecteur d'écran ; créneau occupé = échange atomique | Glisser-déposer seul | E3 |
| D6 | Restes | Entrée liée au repas d'origine par `leftover_of`, sans référence de recette propre, sans ingrédient à acheter ni à déduire | Seconde planification de la recette entière | E3 |
| D7 | Semaine proposée | Service serveur qui lit le moteur sans écrire d'événement ni de cache ; proposition sans état, identifiée et expirante, contrat commun à l'écran et à V11-04 ; suppression de `smartMealPlannerService.ts` | Ressusciter le service client de 847 lignes ; stocker les propositions | E4 |
| D8 | Place des menus | Cinq destinations conservées ; Menus reste sous Recettes, avec semaine dans l'URL et entrées depuis Aujourd'hui et Courses | Sixième destination principale (arbitrage à rendre par l'utilisateur ; l'audit du 22 novembre la recommandait) | E2 |
| D9 | Calendrier | Fichier `.ics` produit dans le navigateur : un événement d'une journée par repas, sans heure, identifiant stable | Horaires par défaut, précision que les créneaux ne portent pas ; flux d'abonnement, qui exige un jeton secret dans une URL | E3 |
| D10 | Ticket de caisse | Photo → scan enregistré par le serveur (texte, sans image) → lignes révisables → rapprochement → `reconcile_receipt`, une seule fois par scan → revue de rangement existante | Garder la route `add-to-inventory`, qui contourne les commandes | E5 |
| D11 | Prix | Table personnelle `purchase_prices`, écrite par `reconcile_receipt` dans la même transaction ; `product_prices` inchangée | Écrire les prix lus dans `product_prices` (référentiel partagé, §3) | E5 |
| D12 | Tests | Suffixe `.v10.test` conservé pour rester dans les suites existantes | Nouveau suffixe et nouveaux scripts | E0 |
| D13 | Enrichissement des lignes | Rapprochement local d'abord (liste, produits du compte, dictionnaire d'abréviations) ; OpenFoodFacts seulement pour un nom révisé non rapproché, sans identité | Interroger OpenFoodFacts pour chaque ligne lue, ce qui envoie les libellés bruts et remplit un cache partagé | E5 |
| D14 | Achat partiel | La ligne rapprochée prend la quantité du ticket ; le reliquat reste à acheter sur une ligne non cochée | Cocher toute la ligne : le reliquat disparaît au rangement (§3) | E5 |

## 1. Problème et résultat attendu

Planifier un repas n'a aucun effet sur les courses. L'utilisateur ouvre chaque recette pour ajouter ses manquants, sans vue d'ensemble, et deux recettes qui partagent un ingrédient produisent une quantité fausse. Après l'achat, il coche chaque ligne à la main ; la lecture de ticket existe côté API mais aucun écran ne l'appelle. La semaine se remplit créneau par créneau, et un repas retiré ne se récupère pas.

Résultat attendu : depuis le menu d'une semaine, obtenir en une revue la liste de ce qu'il faut réellement acheter ; au retour du magasin, rapprocher le ticket de la liste puis ranger dans le stock par le parcours existant. Chaque écriture respecte les contrats V10 : commande identifiée (3), écriture atomique (4), quantité avec unité et dimension (2), référence de recette commune (1), isolation par compte (7), raison justifiée (8), coût vérifiable (10).

## 2. Périmètre et limites

Inclus : préparation des courses d'une semaine ; édition du menu (portions, déplacement, copie de semaine, retrait annulable, restes, export `.ics`) ; lien entre un repas du menu et sa cuisine ; proposition d'une semaine ; accès aux menus ; scan de ticket, rapprochement et historique de prix personnel.

Exclus, traités ailleurs : neutralisation du nettoyage nocturne de la liste et contrat commun des écritures de la liste — identité de ligne, version attendue, cochage versionné, ajout agrégé, inverse (V11-05) ; rappels et notifications, liste partagée entre membres d'un foyer, file hors-ligne (V11-02) ; recherche de recettes et mode cuisson (V11-03) ; outil de planification de l'assistant, qui appellera le service de §6 sans le réécrire, et plafond de dépense (V11-04) ; rayons, budget, fusion de doublons de la liste et gestion des lots (V11-05) ; refonte visuelle de la grille et de la navigation, tableaux de prix, nettoyage général du code mort (V11-06).

Non-objectifs : optimisation nutritionnelle ou budgétaire d'une semaine ; comparaison de prix entre magasins ; commande en ligne ; conservation des photos de tickets ; déduction automatique du stock à l'heure du repas.

## 3. État de départ et surfaces actives

| Élément | État établi | Travail prévu |
| --- | --- | --- |
| [useWeeklyMenu](../../src/hooks/useWeeklyMenu.ts) | `addEntry` passe par `plan_recipe` (intention `menu:date:repas:recette`), portions = celles de la recette ; `removeEntry` supprime directement dans `meal_plan_entries` ; lecture du plan par `.maybeSingle()` | Retrait, portions, déplacement par commande ; semaine en paramètre d'URL |
| [MenusPage](../../src/pages/kitchen/MenusPage.tsx), [MenuWeekGrid](../../src/components/meal-planning/MenuWeekGrid.tsx), [MenuEntryCard](../../src/components/meal-planning/MenuEntryCard.tsx) | Grille 7 × 4, un repas par créneau, actions Ouvrir, Cuisinée, Retirer ; la carte cuisine toute entrée qui porte une référence de recette ; aucun lien vers les courses | Action « Préparer les courses », actions de carte, export |
| [menu_shopping_commands.sql](../../supabase/migrations/20261108120000_menu_shopping_commands.sql) | `recipe_add_missing` complète la liste jusqu'au besoin d'une recette, en ne comptant que les lignes non achetées ; `plan_recipe` remplace le créneau par `ON CONFLICT DO UPDATE`, donc **garde l'identifiant de la ligne** ; son inverse retrouve la ligne par identifiant et ne vérifie que la recette et les portions ; `transfer_shopping` supprime la ligne entière, même si la quantité rangée est corrigée | Deux types de commande ajoutés ; `plan_recipe` et son inverse alignés (§5) |
| [v10_reliability_commands.sql](../../supabase/migrations/20261008151704_v10_reliability_commands.sql) | `public.execute_stock_command` est accordée à `authenticated` : la RPC est appelable sans passer par l'API ; `stock_context_versions.revision` est incrémentée par déclencheur à chaque écriture du stock, de la liste et des recettes, y compris directe | Contrôles de propriété en SQL ; révision réutilisée pour confirmer l'aperçu |
| [useShoppingList](../../src/hooks/useShoppingList.ts) | Ajout par insertion directe, cochage direct sans version attendue | Remplacés par le contrat de V11-05 ; en attendant, détectés par la révision de contexte |
| [stock-commands.ts](../../packages/shared/src/stock-commands.ts), [stockCommands.ts](../../src/services/stockCommands.ts) | Union zod stricte de neuf commandes, `payload_version` 1 ; intention gardée en `localStorage` par compte ; toute erreur 4xx sauf 401 et `IDEMPOTENCY_CONFLICT` efface l'intention, `429` compris | Schémas des nouvelles commandes ; intention conservée sur `429` |
| [quantities.ts](../../packages/shared/src/quantities.ts) | `allocateRecipeStock` réserve les lots pour une recette, par date de péremption, sans écarter les lots dont la date est dépassée ; un ingrédient partiellement couvert n'enregistre pas sa réservation | Fonction pure d'allocation sur plusieurs repas (§4) |
| [RecommendationEngine](../../apps/api/src/services/recommendations/RecommendationEngine.ts), [route](../../apps/api/src/routes/recommendations.routes.ts) | `suggestForUser` classe les recettes pour un repas ; trois recettes retenues par défaut entre « cuisinables » et « presque cuisinables », vingt au plus ; la route écrit un événement et un cache ; lots qualifiés à la date du calcul | Service de semaine qui le lit sans écrire |
| [smartMealPlannerService](../../src/services/planning/smartMealPlannerService.ts) | Aucun import à l'exécution ; [types.ts](../../src/services/planning/types.ts) voisin importé par `useMealPlanningRecipes`, qui demande `RecipeWithDetails`, non exporté (`TS2305` inscrit dans `scripts/tsc-baseline.json`) | Suppression du service ; hook typé avec ce qu'il lit |
| [NavigationHub](../../src/components/navigation/NavigationHub.tsx), [RecipesMenusSwitch](../../src/components/recipes/RecipesMenusSwitch.tsx) | Cinq destinations ; Menus est un sous-élément de Recettes | Voir D8 |
| [receipts.ts](../../apps/api/src/routes/receipts.ts), [services](../../apps/api/src/services/receipt/receiptProcessingService.ts) | Quatre routes authentifiées, sans validation zod ni limite de débit ; aucun appelant dans `src/` ; multipart de 5 Mo filtré sur le type MIME déclaré | Route de scan durcie, écritures par commande, trois routes retirées ou réécrites |
| [ShoppingStorageReview](../../src/components/shopping/ShoppingStorageReview.tsx) | Revue des lignes cochées puis `transfer_shopping` ; brouillon initialisé seulement s'il est vide, effacé en entier après succès | Fusion du brouillon par ligne (§7) |
| Confidentialité | Le traitement horaire (`private.delete_user_rows`) efface toute table publique portant `user_id` ; `export_user_data` suit une liste explicite de tables ; `delete_user_data` est réservée au rôle de service depuis la base de sécurité | Nouvelles tables ajoutées à l'export |

Corrections apportées aux constats d'audit après relecture du code :

1. **Les menus ne sont pas accessibles par le seul commutateur.** Ils le sont aussi par le menu déroulant de Recettes dans l'en-tête, par le menu du profil ([RoutineHeader](../../src/components/navigation/RoutineHeader.tsx)) et par l'aperçu de semaine d'Aujourd'hui ([KitchenWeekPreview](../../src/components/meal-planning/KitchenWeekPreview.tsx)). Aucune de ces entrées n'est une destination principale.
2. **Boucler `recipe_add_missing` donnerait un résultat faux**, pas seulement incomplet. La commande compte tout ce que la liste contient déjà d'un produit comme couvrant la recette en cours : deux repas qui demandent chacun 200 g de farine laissent 200 g sur la liste.
3. **Réutiliser `allocateRecipeStock` repas après repas sous-estimerait aussi.** Un ingrédient partiellement couvert renvoie le manque sans réserver la part trouvée : deux repas de 200 g avec 100 g en stock donnent 200 g à acheter au lieu de 300 g ([quantities.ts](../../packages/shared/src/quantities.ts), fin de `allocateRecipeStock`).
4. **Le retrait d'un repas n'est pas une commande.** Il n'a ni identité ni reçu ni inverse ; un `undo_stock` ultérieur sur la planification d'origine est refusé (`MENU_CHANGED`).
5. **Un repas du menu ne sait pas qu'il a été cuisiné.** L'état « Cuisinée ✓ » vit dans l'état local de [useCookRecipe](../../src/hooks/useCookRecipe.ts). La carte et le parcours fiche → session de cuisine ([RecipeDetail](../../src/pages/RecipeDetail.tsx)) transmettent la recette et les portions, jamais le repas ; l'intention `recipe:<id>:cooked` est commune à deux repas de la même recette.
6. **Le scan de ticket ne persiste aucune fiche.** Magasin, date, total et prix par ligne sont renvoyés puis perdus ; chaque lecture reçoit un identifiant neuf ; `history` liste des fichiers de stockage. Aucune table `receipt_scans` n'existe dans les migrations.
7. **La photo, elle, peut être conservée.** Aucune migration ne crée le bucket `receipt-scans` ; s'il existe, la route y dépose le fichier avec le client d'administration sous `<user_id>/…`, demande une URL publique et ne supprime rien. Ce chemin, sans propriétaire et hors du préfixe `users/<id>/`, échappe à `list_user_storage_objects`, donc à l'effacement des fichiers. `scan-base64` passe par le corps JSON limité à 1 Mo ([app.ts](../../apps/api/src/app.ts)).
8. **Le contrat de lecture invente des valeurs.** Le schéma n'a pas d'unité ; une quantité absente devient `1`, un prix total absent `0`, une confiance absente `0,5` ([gptVisionService](../../apps/api/src/services/receipt/gptVisionService.ts)) ; l'identifiant du produit rapproché est un code OpenFoodFacts, pas un `products.id` ; une date de péremption est estimée par des durées codées en dur.
9. **L'enrichissement sort des données du compte.** Chaque libellé lu est envoyé à OpenFoodFacts et la réponse est écrite dans un cache partagé, en rôle de service ([productMatcherService](../../apps/api/src/services/receipt/productMatcherService.ts)).
10. **`add-to-inventory` contourne les commandes V10** : insertions directes ligne à ligne, échecs ignorés, colonnes `name` et `expiration_date` absentes du schéma d'`inventory` et `location` envoyée en objet alors que la colonne est du texte ([migration d'origine](../../supabase/migrations/20250803063742_9394d93b-fbc2-4033-8f0d-be022ee99c68.sql)). À ne pas brancher.
11. **`product_prices` n'est pas un historique d'achats** : référentiel de prix de fruits et légumes d'une source externe, sans `user_id`, `product_id` en texte, lisible par tout compte authentifié, sans lecteur applicatif.
12. **La reconnaissance photo de l'assistant écarte les tickets par consigne** ([GroceryPhotoRecognizer](../../apps/api/src/services/assistant/GroceryPhotoRecognizer.ts)) ; le service de ticket fixe son modèle en dur (`gpt-4o-mini`), hors du rôle `vision` de [ModelConfig](../../apps/api/src/services/ai/ModelConfig.ts) et des reçus de coût de V10-03D.
13. **Un plan par compte et par semaine n'est pas garanti.** Les migrations locales ne posent aucune unicité sur `weekly_meal_plans(user_id, week_start_date)` ; en cas de doublon, le hook échoue sur `.maybeSingle()` tandis que `plan_recipe` écrit dans le premier plan trouvé (`LIMIT 1`).
14. **Le nettoyage nocturne menace les achats à ranger.** Préalable transverse détaillé dans V11-05 (E0) ; ce lot n'ouvre pas E5 avant sa neutralisation.

Constats confirmés : `plan_recipe` ne crée aucune ligne de courses ; `smartMealPlannerService.ts` n'a aucun appelant ; aucune interface ne propose une semaine ; portions, déplacement, copie, restes et export sont absents ; la colonne JSON `weekly_meal_plans.shopping_list` n'a aucun lecteur actif et n'est pas réutilisée.

## 4. Courses de la semaine : calcul et contrat

**Lecture, sans effet.** `POST /api/v1/menus/shopping-preview`, entrée `{ week_start, proposal? }` validée par zod (date `AAAA-MM-JJ`, lundi ; `proposal` : créneaux d'une semaine proposée non enregistrée, §6). Le service :

1. charge les repas retenus (D3) : du jour courant, dans le fuseau `PANTRY_TIME_ZONE`, à la fin de la semaine visée. Les repas non cuisinés antérieurs à cette semaine réservent le stock mais ne sont pas renvoyés. Sont exclus les repas cuisinés (`cooked_command_id` renseigné, §5), les restes et les jours passés ;
2. résout chaque recette par `resolve_stock_recipe`, comme `StockCommandService.preview` ;
3. alloue le stock repas après repas, dans l'ordre chronologique, avec une nouvelle fonction pure `allocateMenuStock` dans `packages/shared`. Elle reprend les règles de correspondance et de conversion d'`allocateRecipeStock`, avec deux différences : une réservation partielle est conservée (les 100 g pris pour mardi ne sont plus disponibles jeudi) ; chaque lot est qualifié à la date du repas avec la règle de `qualifyLots` (DLC dépassée : exclu ; DDM dépassée ou type de date inconnu : « à vérifier »). `allocateRecipeStock` reste inchangée pour la cuisine ;
4. regroupe les manquants par produit et par dimension, convertit dans une unité commune avec `convertQuantity`. Masse, volume et pièces ne se mélangent pas : un même produit peut donner deux lignes ;
5. soustrait ce que la liste contient déjà : les lignes non achetées, et les lignes cochées en attente de rangement, qui couvrent le besoin puisqu'elles entreront au stock ;
6. renvoie les lignes, les repas qui les demandent et trois jetons de confirmation : `menu_version` (identifiant, version, recette et portions de chaque repas retenu), `context_revision` (valeur de `stock_context_versions.revision`, incrémentée par toute écriture du stock, de la liste ou des recettes) et `as_of` (jour de référence).

| État de ligne | Signification | Action dans la revue |
| --- | --- | --- |
| À ajouter | Quantité mesurable manquante | Cochée par défaut, quantité modifiable |
| Déjà sur la liste | Besoin couvert par une ligne non achetée | Affichée, non modifiable |
| Acheté, à ranger | Besoin couvert par une ligne cochée non rangée | Affichée, lien vers « Ranger mes achats » |
| À ajouter à la main | Quantité ou unité non mesurable (« 1 botte », « au goût »), règle `canAddToShoppingList` | Nom affiché, pas d'écriture |
| À vérifier | Produit en stock, quantité, unité ou date inconnue ou incompatible ; baisse impossible à attribuer au menu | Signalée, jamais comptée comme disponible, jamais écrite seule |
| En trop | Une ligne porte plus que le besoin actuel, dans la limite de ce que le menu y a ajouté (D2) | Baisse proposée, non cochée par défaut |

**Écriture.** Commande `menu_add_missing`, charge utile `{ week_start, as_of, menu_version, context_revision, lines: [{ product_id | ingredient_name, quantity, unit, shopping_id?, expected_version? }] }`, bornée à 100 lignes comme les autres commandes. Dans la transaction, sous le verrou de compte existant, la commande verrouille la ligne `stock_context_versions` du compte, compare la révision, recalcule l'empreinte du menu et vérifie le jour de référence ; un écart refuse avec `MENU_CHANGED` ou `STOCK_CHANGED`, et l'interface rouvre le récapitulatif recalculé. Une ligne ne peut pas dépasser le besoin calculé. Les écritures sur la liste passent par les primitives du contrat de V11-05 (identité de ligne, version attendue, inverse enregistrant les valeurs antérieures) ; même identité renvoyée deux fois = même résultat. Tant que des chemins directs subsistent (ajout et cochage de [useShoppingList](../../src/hooks/useShoppingList.ts)), leur déclencheur incrémente la révision : une écriture concurrente provoque un refus, jamais un écrasement silencieux.

**Changement de menu (D2).** Table proposée `menu_shopping_contributions` (`user_id`, `week_start_date`, `shopping_list_id`, `product_id`, `quantity`, `unit`, `command_id`, `line_version_after`) : ce que chaque commande a ajouté sur chaque ligne physique. Une nouvelle préparation compare le besoin aux contributions : hausse → complément ; baisse → « En trop », limitée à la contribution du menu sur cette ligne et seulement si la ligne a toujours la version `line_version_after` ; sinon « À vérifier ». Une ligne cochée n'est jamais réduite. `undo_stock` accepte `menu_add_missing` : il rétablit les valeurs antérieures enregistrées des lignes encore à leur version résultante, retire les lignes créées et inchangées, et refuse `UNDO_CONFLICT` sinon.

**Réponse ambiguë.** Le client conserve l'intention sur `429` comme sur une erreur réseau, relit le reçu par `GET /api/v1/stock/commands/:id` et ne clôt l'intention que pour son compte et son `command_id`. Ce correctif de [stockCommands.ts](../../src/services/stockCommands.ts) précède toute limite de débit sur un chemin de commande.

## 5. Menu modifiable

**Invariants communs à `plan_recipe` et `update_menu`**, posés dans la même migration puisque l'assistant et `addEntry` utilisent `plan_recipe` :

- `meal_plan_entries.version`, incrémentée par déclencheur à chaque mise à jour, lue par l'interface et attendue par chaque opération ;
- remplacer un repas supprime l'ancienne ligne et en crée une nouvelle : marqueur de cuisson et restes ne passent jamais au repas suivant. Remplacer un repas cuisiné est refusé (`MEAL_COOKED`, annuler d'abord la cuisine) ; les restes d'un repas remplacé sont retirés avec lui et nommés dans le résultat ;
- l'inverse rétablit l'instantané des créneaux touchés, lignes et identifiants compris, si chaque ligne courante porte la version enregistrée après la commande ; sinon `MENU_CHANGED`. Pour un ancien reçu de `plan_recipe`, sans version, l'inverse vérifie en plus le jour et le type de repas du créneau d'origine : un repas déplacé depuis n'est ni restauré ni supprimé à sa nouvelle place.

Commande `update_menu`, liste bornée d'opérations appliquées ensemble, chacune avec la version attendue des créneaux visés :

| Opération | Effet | Règle |
| --- | --- | --- |
| `set` | Place une recette avec ses portions | Mêmes invariants que `plan_recipe` ; l'ancien repas est gardé dans le résultat |
| `servings` | Change les portions d'un repas | Entier de 1 à 100 ; refusé sous le total des portions de ses restes (`LEFTOVER_CAPACITY`) |
| `move` | Change le jour ou le repas | Créneau occupé = échange (D5) : les deux créneaux et leurs versions sont vérifiés ensemble. L'unicité `(meal_plan_id, day_of_week, meal_type)` est immédiate : échange par suppression et réinsertion dans la transaction, ou contrainte rendue différable (choix en E0). Un repas d'origine ne passe pas après l'un de ses restes (`LEFTOVER_ORDER`) |
| `remove` | Retire un repas | Les restes liés sont retirés avec lui et nommés ; retirer un repas cuisiné ne touche ni au stock ni au journal |
| `leftover` | Crée un reste lié à un repas d'origine | Après le repas d'origine ; total des restes ≤ portions du repas d'origine |

La copie de semaine est une suite de `set` vers la semaine cible ; les créneaux déjà remplis sont listés avant confirmation (remplacer ou conserver), les restes ne sont pas copiés. La validation d'une semaine proposée (§6) utilise la même commande.

**Restes (D6).** Colonne proposée `meal_plan_entries.leftover_of`. Un reste n'a pas de `recipe_reference` propre et porte le nom « Reste : <recette> » : l'ancienne carte, qui ne cuisine qu'une entrée munie d'une référence, ne peut ni l'ouvrir ni le déduire du stock. La nouvelle carte retrouve la recette par le repas d'origine. Cuisiner pour 4 et replanifier 2 portions : le repas d'origine garde 4 portions, donc ses ingrédients sont comptés une fois ; « Cuisinée » sur un reste n'appelle pas `consume_recipe`.

**Repas cuisiné.** Colonne proposée `meal_plan_entries.cooked_command_id`. `consume_recipe` accepte en option `meal_plan_entry_id` et `entry_version` : la commande vérifie que le repas appartient au compte par son plan, qu'il porte la même référence de recette et qu'aucune consommation active n'y est liée, puis renseigne le lien dans la transaction du stock et du journal. Une seconde cuisine du même repas, depuis un autre onglet, est refusée (`ALREADY_COOKED`) ; `undo_stock` vide le lien. Les deux parcours transmettent le repas : la carte, et la fiche ouverte depuis le menu, qui garde `?meal=<id>` jusqu'à la session de cuisine. L'intention devient `menu-entry:<id>:cooked`. Les repas antérieurs à la migration n'ont pas de lien : leur état est inconnu, affiché sans marque ; seuls les jours passés sont exclus d'office par D3.

**Menus existants (E0).** Inventaire des plans en double par compte et par semaine, des entrées sans `recipe_reference` et des semaines historiques ; reprise qui fusionne les entrées sans perte, puis index unique `(user_id, week_start_date)`.

**Interface.** Sur la carte : pas à pas des portions, « Déplacer » (dialogue jour + repas, utilisable au clavier), « Prévoir des restes », « Retirer » suivi d'un message avec « Annuler ». Le glisser-déposer double ces actions sans les remplacer ; aucune bibliothèque n'est présente aujourd'hui, le choix se fait en E0. Cibles tactiles de 44 px comme le reste de la routine.

**Export `.ics` (D9).** Fichier produit côté client depuis la semaine chargée : un événement d'une journée par repas (`DTSTART;VALUE=DATE`, fuseau commun de [calendar.ts](../../packages/shared/src/calendar.ts)), titre « Dîner : <recette> » et portions, `UID` stable dérivé de l'identifiant du repas, texte échappé selon iCalendar et testé sur des noms de recette libres. Aucune route, aucun lien public.

**Accès (D8).** `?week=AAAA-MM-JJ` remplace l'état local (date invalide → semaine courante). Courses gagne « Depuis mes menus », qui ouvre le récapitulatif de la semaine courante ; Aujourd'hui garde son aperçu.

## 6. Semaine proposée

Ce que le moteur expose : pour un contexte de repas (type, temps, portions, objectif, exclusions), des listes classées — cuisinables, presque cuisinables, à vérifier, exclues, plus éloignées — avec score, raisons, ingrédients proches de leur date et profil appliqué. Il ne connaît ni la semaine ni les repas déjà planifiés ; il retient trois recettes par défaut entre cuisinables et presque cuisinables (vingt au plus) ; sa variété repose sur l'historique de cuisine et sur les recettes déjà montrées, que la route HTTP enregistre comme événements.

**Contrat commun à l'écran Menus et à V11-04.** `POST /api/v1/menus/week-proposal`, entrée `{ week_start, slots: [{ date, meal_type }], servings?, constraints?, keep?: [{ date, meal_type }], previous_proposal_id? }` : 28 créneaux au plus ; `constraints` reprend les champs d'exclusion et d'objectif de [MealContextSchema](../../packages/shared/src/personalization.ts) (« sans poisson », temps maximal) ; `keep` fige des créneaux d'une proposition précédente pour la réviser (« change jeudi soir »). Sortie, rien n'est stocké : `proposal_id` (empreinte des entrées et des versions lues), `expires_at` (durée à fixer en E0), `menu_version`, `context_revision`, `profile_version` et, par créneau, la recette, ses raisons et ses manquants. `WeekPlanService`, côté API :

1. appelle `suggestForUser` une fois par type de repas demandé, sans `eventWriter` : ni événement, ni cache, ni recette comptée comme « montrée » ; avec `limitPerBucket` à 20 et une nouvelle option d'exclusion par référence canonique des recettes déjà au menu de la semaine, appliquée avant la troncature ;
2. écarte les listes « exclues » et « à vérifier », et interdit la répétition dans la proposition ;
3. place en début de semaine les recettes qui utilisent un lot proche de sa date ;
4. rejoue `allocateMenuStock` après chaque choix, lots qualifiés à la date de chaque repas, et recalcule les raisons : une raison « en stock » du premier appel ne survit pas si le lot est promis à un créneau antérieur ;
5. renvoie pour chaque créneau la recette ou un créneau vide avec sa cause : `NO_COMPATIBLE_RECIPE` (aucune recette ne respecte le profil et les contraintes) ou `POOL_EXHAUSTED` (toutes les recettes compatibles sont déjà placées).

L'utilisateur remplace une recette (candidats suivants), vide un créneau, puis valide : une seule commande `update_menu`, dont les versions attendues viennent de `menu_version`. Les créneaux déjà remplis sont conservés par défaut ; leur remplacement est listé avant confirmation. Avant d'envoyer la commande, l'API refuse une proposition expirée ou calculée sur un autre profil ou un autre menu, et propose de recalculer. Les courses d'une proposition se prévisualisent par `shopping-preview` avec `proposal`, sans écriture ; `menu_add_missing` ne s'applique qu'au menu enregistré, donc après validation de la semaine. V11-04 expose ce service comme outil ; l'assistant n'obtient aucune écriture supplémentaire.

`smartMealPlannerService.ts` est supprimé dans la même étape. `useMealPlanningRecipes` est typé avec la représentation des recettes qu'il lit déjà (son import de `RecipeWithDetails` échoue aujourd'hui) et `MealType` est déplacé près de lui. Les mentions du service dans `CLAUDE.md` et `scripts/tsc-baseline.json` sont mises à jour. La suppression se vérifie par `npm run typecheck:app`, que `npm run build` ne lance pas.

## 7. Ticket de caisse : du scan au rangement

Parcours : Courses → « Scanner le ticket » → photo ou fichier → lignes reconnues, révisables → rapprochement → « Ranger mes achats ». Préalable : le nettoyage nocturne est neutralisé (V11-05, E0) ; sinon les achats que ce parcours coche peuvent être supprimés avant leur rangement.

**Scan.** `POST /api/v1/receipts/scan` reste en multipart. L'image est réduite et convertie en JPEG sur l'appareil par [photoResize](../../src/lib/photoResize.ts), comme les photos de l'assistant ; la limite serveur passe sous la limite de corps de requête par défaut de Vercel, 4,5 Mo ([documentation Vercel](https://vercel.com/docs/functions/limitations)), et les octets et dimensions sont contrôlés avant le fournisseur, pas seulement le type MIME déclaré. Le modèle vient du rôle `vision` de [ModelConfig](../../apps/api/src/services/ai/ModelConfig.ts) ; chaque appel produit un reçu de modèle au sens de V10-03D (modèle demandé et servi, coût inconnu ≠ zéro), conservé même si le scan échoue, et réserve sa dépense dans le plafond par compte de V11-04 avant l'appel : `userRateLimit`, en mémoire par instance sans Redis et ouvert en cas d'erreur, ne borne pas le coût. L'image est traitée en mémoire et jamais déposée dans le stockage ; plus d'URL publique. L'API enregistre le résultat dans `receipt_scans`, état `read`, en rôle de service et avec le `user_id` de la session ; un scan non appliqué est purgé après un délai à fixer. Le scan seul ne modifie ni la liste ni le stock (contrat 11, même principe que la dictée). `scan-base64` et `add-to-inventory` sont retirées ; `history` lit la nouvelle table.

**Contrat de lecture.** Les inconnues restent nulles : quantité, unité, conditionnement, prix unitaire, prix total et devise sont des champs séparés, jamais remplacés par `1`, `0` ou `0,5`. Aucune date de péremption n'est estimée : `estimateExpiryDate` n'est pas repris et la date reste vide au rangement (repère de V11-05).

**Révision.** Chaque ligne montre le texte lu, le nom proposé, la quantité, l'unité, le prix et une confiance. Le service écarte aujourd'hui les lignes sous 0,5 de confiance : elles sont à montrer comme « à vérifier » plutôt qu'à supprimer. Nom, quantité, unité et prix sont modifiables ; une ligne non alimentaire se retire.

**Rapprochement (D13).** Local d'abord : lignes de la liste, produits du compte, dictionnaire d'abréviations. OpenFoodFacts n'est interrogé que pour un nom révisé resté sans correspondance, sous sa forme normalisée, sans identité du compte. Le produit retenu est un vrai `products.id`, résolu après révision. Quatre groupes : reconnu et présent sur la liste (sera coché) ; reconnu en quantité moindre que la liste (achat partiel, D14) ; reconnu mais absent de la liste (sera ajouté comme acheté) ; sur la liste mais absent du ticket (reste à acheter). Un rapprochement incertain ou d'unité incompatible (« 1 paquet » contre 500 g) est proposé, jamais appliqué seul : l'utilisateur confirme la quantité à ranger.

**Écriture.** Commande `reconcile_receipt`, charge utile `{ receipt_scan_id, lines, matches: [{ line_index, shopping_id, expected_version, purchased_quantity, unit }] }`. En une transaction, elle :

1. vérifie que le scan appartient au compte et n'a pas été appliqué, puis le passe à l'état `applied` : une seule application par scan, même sous deux identités de commande (`RECEIPT_ALREADY_APPLIED`). Un autre scan aux mêmes magasin, date et total déclenche un avertissement à confirmer, pas un refus, puisque deux tickets distincts peuvent coïncider ;
2. coche chaque ligne rapprochée avec la quantité achetée ; si elle est moindre dans la même dimension, le reliquat reste sur une ligne non cochée (D14) ;
3. crée les lignes achetées absentes de la liste ;
4. enregistre les prix dans `purchase_prices`.

Toutes les écritures de la liste passent par les primitives du contrat de V11-05 et l'inverse rétablit les valeurs antérieures. Les achats sont ensuite rangés par [ShoppingStorageReview](../../src/components/shopping/ShoppingStorageReview.tsx) et `transfer_shopping`, sans second chemin d'écriture vers le stock. La revue fusionne son brouillon par identifiant de ligne : les nouveaux achats s'ajoutent, une ligne dont la version a changé est signalée, et seules les lignes rangées avec succès quittent le brouillon, au lieu de l'effacer en entier.

**Données proposées (D11).** `receipt_scans` (`user_id`, état, magasin, date d'achat, total, lignes lues, reçu de modèle, `command_id` d'application) et `purchase_prices` (`user_id`, `product_id`, `receipt_scan_id`, quantité, unité, prix unitaire et total, devise, date). Droits : lecture des seules lignes du propriétaire ; aucun droit d'insertion, de modification ni de suppression pour `authenticated`. `receipt_scans` est écrite par l'API en rôle de service, le reste par la commande `SECURITY DEFINER`, qui vérifie la propriété de chaque référence (repas, ligne, scan), y compris lors d'un appel direct à la RPC. Les trois tables nouvelles (`receipt_scans`, `purchase_prices`, `menu_shopping_contributions`) portent `user_id`, donc entrent dans le traitement horaire de suppression ; elles sont ajoutées à `export_user_data`, qui suit une liste explicite. Les anciens objets du bucket `receipt-scans`, s'il existe, sont inventoriés en E0 puis supprimés ou rattachés au compte avant le remplacement de `history`.

**Lecture des prix.** Ce lot fournit les prix d'achat personnels et une lecture : dernier prix unitaire connu par produit, avec unité, date et magasin. L'historique des scans est le seul affichage livré ici ; le budget de la liste, l'évolution des prix et le coût par portion appartiennent aux lots qui les annoncent.

## 8. États d'interface et cas limites

| Situation | Comportement attendu |
| --- | --- |
| Semaine sans repas à venir | « Aucun repas à préparer » et lien vers l'ajout ; pas de liste vide écrite |
| Tout est en stock | « Rien à acheter pour cette semaine », avec les lignes à vérifier s'il y en a |
| Recette supprimée ou sans ingrédient | Repas nommé dans le récapitulatif comme non calculable ; les autres restent traités |
| Menu, stock ou liste changé pendant la revue, ou passage à minuit | Refus `MENU_CHANGED` ou `STOCK_CHANGED`, récapitulatif recalculé, choix de l'utilisateur conservés quand la ligne existe encore |
| Réponse perdue, double appui, limite de débit | Même identité de commande reprise, reçu relu ; aucun doublon sur la liste |
| Repas cuisiné depuis deux onglets | Une seule déduction ; le second reçoit `ALREADY_COOKED` |
| Changement de compte | Intention conservée pour son propriétaire, jamais rejouée sous un autre compte |
| Ticket illisible ou sans ligne alimentaire | Message explicite, photo à reprendre ; rien n'est écrit |
| Même scan confirmé deux fois | Un seul effet ; la seconde confirmation reçoit `RECEIPT_ALREADY_APPLIED` |
| Deux scans aux mêmes magasin, date et total | Avertissement, confirmation demandée |
| Achat partiel | Ligne cochée à la quantité du ticket, reliquat laissé à acheter |
| Brouillon de rangement déjà ouvert | Les nouveaux achats s'y ajoutent sans écraser une saisie en cours |
| Service de vision indisponible, limite ou plafond atteint | Cochage manuel toujours possible ; délai avant nouvel essai indiqué |

Sécurité : propriétaire dérivé de la session, tout `user_id` dans une charge utile refusé comme aujourd'hui ; entrées validées par zod à la route, et propriété, références et bornes revérifiées dans la transaction SQL, puisque la RPC est appelable directement par `authenticated` ; limites de débit `userRateLimit` sur les routes de lecture nouvelles et sur le scan (seuils à fixer en E0), aucune sur `/stock/commands` sans le correctif `429` de §4 ; texte lu sur un ticket traité comme une donnée, jamais comme une consigne ; journaux sans contenu de ticket ni prix ; aucune clé côté client.

## 9. Découpage de réalisation

| Étape | Livrable | Condition | Preuve de sortie |
| --- | --- | --- | --- |
| E0 — Référence | Décisions D1–D14 tranchées ; schéma distant comparé aux migrations ; doublons de `weekly_meal_plans`, entrées historiques, colonnes d'`inventory`, objets du bucket `receipt-scans` inventoriés ; mode d'échange des créneaux choisi ; seuils de débit et durée de proposition fixés | Aucune écriture produit | Inventaire écrit, décisions consignées |
| E1 — Calcul et commande | `allocateMenuStock`, route d'aperçu, `menu_add_missing`, contributions, annulation ; `version`, `cooked_command_id` et alignement de `plan_recipe` ; repas transmis à `consume_recipe` ; correctif `429` | V11-05 E2 livré (section 7 : primitive d'agrégation en mode `complete_to`, inverse par valeurs antérieures) | Tests partagés et base verts, dont concurrence et appel direct, avant toute interface |
| E2 — Récapitulatif | Écran de revue depuis Menus et Courses, semaine dans l'URL | E1 ; livrable seul | Six états de ligne, refus et reprise testés au client |
| E3 — Menu modifiable | `update_menu`, portions, déplacement, retrait annulable, copie, restes, `.ics`, reprise des plans en double | Version et invariants de E1 | Échange, restes et inverses testés en base ; navigation au clavier |
| E4 — Semaine proposée | `WeekPlanService`, option d'exclusion du moteur, écran de proposition, suppression du service mort | `update_menu` de E3 | Aucune écriture avant validation ; `typecheck:app` vert |
| E5 — Ticket et prix | Scan durci, `receipt_scans`, révision, rapprochement, `reconcile_receipt`, `purchase_prices`, fusion du brouillon, routes retirées, historique | Nettoyage nocturne neutralisé (V11-05 E0) ; `shopping_check` et `shopping_update` de V11-05 E2 pour le rapprochement | Achat partiel, double application et isolation testés ; export couvrant les trois tables |

Chaque migration est nouvelle, idempotente et rejouable ; aucune migration existante n'est modifiée.

## 10. Vérification et critères de sortie

Tests écrits avant le code :

- **Partagés** : `allocateMenuStock` — deux repas de 200 g avec 100 g en stock donnent 300 g, lot épuisé au premier, lot périmé à la date du second repas, unités de dimensions différentes, quantité inconnue, reste ignoré, ordre chronologique, repas de la semaine courante réservant avant la semaine suivante.
- **Client** (`*.v10.test.tsx`, suite `test:v10:client`) : récapitulatif (six états de ligne, `MENU_CHANGED`, double appui, `429` qui conserve l'intention), carte de menu (portions, déplacement au clavier, annulation du retrait, reste non cuisinable), fichier `.ics` (identifiant stable, échappement), rapprochement de ticket, fusion du brouillon de rangement.
- **API** : routes `menus` et `receipts` (authentification, corps invalide, image hors limite ou dont les octets ne sont pas une image, limite de débit, réponse validée), `WeekPlanService` avec moteur simulé (aucun événement écrit, `POOL_EXHAUSTED` distinct de `NO_COMPATIBLE_RECIPE`). Le motif de `test:v10:api` est une liste fermée : l'étendre, sinon ces fichiers ne s'exécutent pas.
- **Base** : étendre [test-menu-shopping-db.py](../../scripts/test-menu-shopping-db.py) — idempotence, conflit d'identité, contributions et baisse limitée, annulation, cochage direct concurrent pendant l'aperçu refusé, inverse de `plan_recipe` après déplacement refusé, remplacement d'un repas cuisiné refusé, `ALREADY_COOKED`, échange de créneaux. Nouveau script pour `receipt_scans` et `purchase_prices` : appel direct de la RPC par `authenticated` avec le repas, la ligne ou le scan d'un autre compte refusé, écriture directe refusée, double application, export et suppression de compte.
- **Parcours** : menu → courses → ticket → rangement en Playwright sur données fictives, à 375 px et 1440 px, avec contrôle d'accessibilité automatisé et navigation au clavier.

Critères de sortie :

- [ ] Deux repas partageant un ingrédient donnent la somme des besoins, moins le stock, compté une seule fois, réservations partielles comprises.
- [ ] Préparer deux fois de suite sans changement n'ajoute rien ; après un changement, seul l'écart est proposé ; une baisse ne touche jamais une quantité saisie à la main.
- [ ] Un achat coché à ranger n'est pas proposé une seconde fois.
- [ ] Aucune conversion entre masse, volume et pièces ; l'incertain et le périmé à la date du repas sont affichés « à vérifier ».
- [ ] Retrait, déplacement, portions et copie passent par une commande et s'annulent, ou sont refusés avec une raison ; un repas remplacé ne transmet ni marqueur de cuisson ni restes.
- [ ] Un repas du menu n'est déduit qu'une fois ; un reste n'ajoute ni course ni déduction de stock.
- [ ] La semaine proposée ne contient aucune recette exclue par le profil, n'écrit rien avant validation, ni événement ni cache.
- [ ] Un scan seul ne change ni liste ni stock ; un scan ne s'applique qu'une fois ; le reliquat d'un achat partiel reste à acheter ; le rangement passe par `transfer_shopping`.
- [ ] Un second compte ne lit ni scan, ni prix, ni contribution, et ne peut les référencer par appel direct.
- [ ] Les routes `scan-base64` et `add-to-inventory` ne répondent plus ; aucune image de ticket n'est conservée ; `smartMealPlannerService.ts` est supprimé.
- [ ] `npm run test:v10`, les scripts de base concernés, `npm run typecheck:app` et `npm run build` passent.

Ces preuves sont locales et fictives. La lecture de tickets réels, Safari sur iPhone, l'état du nettoyage nocturne et le schéma Supabase déployé restent à homologuer et ne sont pas réputés validés.

## 11. Continuité avec les PRP antérieures

| Référence | Repris | Abandonné |
| --- | --- | --- |
| [PRP-234 Aujourd'hui et menus](../PRP-234-Today-Kitchen-And-Menus.md) | Tables, hook, page Menus, écriture par l'assistant ; l'action « Ajouter les manquants aux courses » prévue pour Menus et jamais livrée | L'exclusion « génération automatique de menus sur 7 jours », levée sous forme de proposition à valider ; l'écriture directe Supabase |
| [PRP-050-055 Scan de ticket](../PRP-050-055-Receipt-Scan-INDEX.md) | Découpage lecture → enrichissement → validation par l'utilisateur ; exigence de confidentialité | Plan de lancement, budget, indicateurs et équipe ; conservation des images |
| [PRP-210 Phase A](../PRP-210-Phase-A-Scan-Ticket-Implementation.md) | Services API existants : lecture par modèle de vision, dictionnaire d'abréviations, rapprochement de produits | Ajout direct au stock, URL publique de l'image, modèle fixé en dur, valeurs par défaut inventées, dates estimées ; les composants et le hook prévus côté interface sont absents de `src/` et à écrire |

## 12. Retour arrière et transmission

Chaque étape s'active séparément : sans ses entrées d'interface, l'application retrouve le comportement actuel. Les types de commande ajoutés ne changent pas les neuf existants. Au retour arrière, l'API cesse d'accepter leur création, tandis que la fonction SQL garde leurs branches : la relecture des reçus, la reprise d'une identité déjà confirmée et les inverses restent possibles. Un appel direct à la RPC reste possible après un retour arrière ; il ne produit que des écritures valides et annulables. Les nouvelles intentions portent des noms que l'ancien client ne lit pas (`menu-entry:<id>:cooked`, `menu-shopping:<semaine>`) ; une intention en attente se vérifie par `GET /api/v1/stock/commands/:id`. L'ancienne carte reste sûre : elle ne voit pas de référence sur un reste, et cuisiner sans transmettre le repas laisse le lien vide sans double effet. Les tables et colonnes nouvelles sont additives : un retour arrière les laisse en place, inutilisées, sans perte pour le stock, la liste ou le menu ; l'index unique des plans, posé après reprise, reste compatible avec l'ancien code. Les routes de ticket retirées n'avaient aucun appelant.

À transmettre : à V11-04, le contrat de `week-proposal`, de `shopping-preview` avec proposition et de `update_menu`, ainsi que la réservation du scan dans le plafond de dépense ; à V11-05, les besoins de ce lot envers le contrat d'écriture de la liste (lignes contributives, achat partiel, inverse par valeurs antérieures) et la lecture des prix d'achat ; à V11-06, les écrans à habiller, la question de la place des menus dans la navigation et la suite du nettoyage ; à V11-02, les moments utiles à un rappel (semaine sans courses préparées, ticket non rangé) et la question du foyer partagé, que les contributions et scans par `user_id` ne résolvent pas.
