# PRP V11-05 — Stock facile à tenir et courses efficaces en magasin

> Statut : Brouillon — décisions proposées, non validées par l'utilisateur.
> Date : 2026-11-22.
> Relecture : Codex, 22 novembre 2026 ; constats vérifiés dans le code et intégrés.
> Priorité : P0 pour E0 (nettoyage nocturne) ; P1 pour le contrat des écritures de la liste, les dates, les seuils et l'ergonomie du stock ; P1 pour le regroupement par rayon et l'agrégation ; P2 pour les équivalences d'unités, précédées d'une instruction.
> Dépendances : commandes et contrats de [V10-01](../V10/PRP-V10-01-Fiabilite.md), parcours de [V10-02](../V10/PRP-V10-02-Routine-Mobile.md), champs de lot de V10-03, [contrats communs V10](../V10/README.md) (section 3).
> Coordination : [V11-01](PRP-V11-01-Boucle-Menus-Courses.md) (menus → courses, ticket de caisse, prix issus des tickets), [V11-02](PRP-V11-02-Retention-Foyer-Hors-Ligne.md) (notifications, foyer partagé, hors ligne), [V11-03](PRP-V11-03-Recettes-Recherche-Cuisson.md) (mode cuisson), [V11-04](PRP-V11-04-Assistant-Chef.md) (assistant), [V11-06](PRP-V11-06-Consolidation-Design-Mesure.md) (design, page d'analyses, nettoyage du code).
> Transverse : E0 (section 4) est un préalable à tout le dossier V11. E2 (section 7) est un préalable à `menu_add_missing` (V11-01) et au rejeu hors ligne (V11-02).
> Source : audit fonctionnel du 22 novembre 2026, constats revérifiés dans le code le même jour sur l'arbre de travail local (aucune vérification du schéma déployé).
> Estimation indicative : 5 à 6 semaines pour E0 à E8, hors constitution éditoriale du référentiel de conservation et hors E9 (avant relecture : 3 à 4 semaines). E0 seul : 1 à 2 jours, à faire immédiatement. Hypothèses : une personne à temps plein, base de test locale disponible, décisions du tableau 5 tranchées avant l'étape indiquée.

## 1. Problème et résultat attendu

Tenir le stock demande aujourd'hui trop de saisie pour un bénéfice incertain. La date d'un lot se tape à la main, rien n'aide à situer un produit ouvert, aucun produit n'a de quantité minimale, et la liste de stock ne se trie ni ne se regroupe. Côté courses, la liste ne suit pas le parcours en magasin : deux blocs seulement, un rayon affiché sur la ligne mais qui n'ordonne rien, des doublons à chaque ajout manuel, et des écritures directes qui contournent les commandes V10.

Le lot vise trois résultats vérifiables :

1. **Aucun achat « à ranger » ne disparaît** : la suppression nocturne est retirée avant toute autre étape V11.
2. **Un stock qui se tient en quelques gestes** : repère de conservation proposé sans jamais inventer de date, date d'ouverture, produits de base avec seuil, tri, regroupement par emplacement, correction rapide, édition groupée et inventaire complet reprenable.
3. **Une liste de courses qui suit le magasin et ne perd rien** : toutes ses écritures passent par des commandes versionnées et annulables ; regroupement par rayon dans un ordre choisi ; ajout qui complète la ligne existante ; total estimé honnête ; rachats fréquents et réassort acceptés un à un.

La ligne éditoriale du dépôt s'applique sans exception : l'application n'invente ni date ni disponibilité ([conseils alimentaires](../../docs/FOOD-GUIDANCE-2026-11-10.md), [revue des produits frais](../../packages/shared/src/produce-review.ts)). Une durée de conservation est une **estimation sourcée et modifiable**, jamais une date limite.

## 2. Périmètre et limites

Inclus : neutralisation du nettoyage nocturne ; contrat des écritures de la liste de courses ; repère de conservation, champs « ouvert le » et « rangé depuis » ; réglages par produit et par compte ; emplacements normalisés et personnalisés, avec migration des valeurs existantes ; tri, regroupement, pas rapides, balayage, édition groupée et inventaire complet ; courses par rayon, agrégation, prix de ligne, rachats fréquents, réassort, partage par la feuille de partage du système ; liste des tables et fonctions orphelines (section 12).

Exclus, traités ailleurs et seulement cités ici :

| Sujet | Lot propriétaire |
| --- | --- |
| Menus → courses (`menu_add_missing`, qui consomme le contrat de la section 7), génération de semaine, ticket de caisse, historique de prix | V11-01 |
| Notifications, foyer partagé (extension du contrat de la section 7 au foyer), temps réel de la liste, hors ligne | V11-02 |
| Recettes et mode cuisson | V11-03 |
| Assistant (raccordé ici à `shopping_add`, voir section 7) | V11-04 |
| Design, page d'analyses, suppression effective du code mort, analytique | V11-06 |

Non-objectifs : conversion masse ↔ volume par densité ; poids moyen par pièce, même saisi par l'utilisateur (différé, section 13) ; renommer un emplacement (contournement : créer, déplacer, supprimer) ; plusieurs magasins avec plans distincts ; ajout automatique aux courses ; comparaison de prix entre enseignes ; garantie de consommabilité d'un lot.

## 3. État de départ et surfaces actives

| Élément | État établi | Travail prévu |
| --- | --- | --- |
| [Inventory](../../src/pages/Inventory.tsx) | Recherche, filtres état/catégorie/zone, vues liste et cartes ; ordre de lecture `created_at` décroissant ; aucun tri, regroupement ni sélection multiple | Tri, regroupement par emplacement, mode sélection, « Faire l'inventaire » |
| [useInventory](../../src/hooks/useInventory.ts) | Corrections et consommations par commandes V10 ; `getLowStockItems(threshold = 2)` compare la quantité brute, sans unité ; ce helper, `getStats` et `getExpiringItems` n'ont aucun appelant hors du hook ; l'ajout au stock reste une insertion directe après `findTopUpLot` | Retirer le seuil par défaut ; lecture des réglages par produit |
| [QuickStockCorrection](../../src/components/inventory/QuickStockCorrection.tsx) | « − 1 », « + 1 » et « Il n'en reste plus » présents, mais dans la boîte de dialogue ; zone en texte libre avec trois suggestions | Pas rapides sur la ligne ; sélecteur d'emplacement ; « ouvert le » |
| [LotQualificationFields](../../src/components/inventory/LotQualificationFields.tsx) | `date_kind` (DLC, DDM, inconnu) et `quantity_quality` saisis à la main | Inchangés ; le repère s'affiche à côté |
| [ProduceReviewPanel](../../src/components/inventory/ProduceReviewPanel.tsx) | Quatre actions ; rappel calculé depuis `updated_at` (ou `created_at`), limité aux fruits, légumes et herbes ; pas une durée | Conservé ; l'inventaire complet reprend ses quatre actions |
| Notes de lot (`inventory.notes`, migration `20261109171003`) | Texte libre ; `conservationReviewRequired` déclenche déjà un contrôle sur certaines formules (« conservation à vérifier ») ; aucun champ daté d'ouverture | `opened_at` distinct ; les notes et leur contrôle restent |
| [SmartShoppingList](../../src/pages/SmartShoppingList.tsx) | Deux groupes (à acheter ; achetés, à ranger) ; rayon affiché en texte, sans regroupement ni ordre ; partage par copie | Groupes par rayon, rachats fréquents, réassort, total |
| [useShoppingList](../../src/hooks/useShoppingList.ts) | Ajout, cochage et suppression par écriture directe, sans version ; seule la modification vérifie `stock_version` ; `getTotalEstimatedCost` multiplie prix et quantité, lu par [useInsightsData](../../src/hooks/useInsightsData.ts) | Toutes les écritures par commandes (section 7) ; total redéfini (D9) |
| [EditShoppingItemDialog](../../src/components/shopping/EditShoppingItemDialog.tsx) | Douze rayons codés en dur, dont « Entrée » et « Caisses » ; « Prix estimé (€) » sans précision ; un champ vide est enregistré `0` ; le commentaire SQL de la colonne la définit comme prix unitaire | Liste de rayons partagée ; prix de ligne distinct (D9) |
| [ShoppingStorageReview](../../src/components/shopping/ShoppingStorageReview.tsx) | Zone libre, suggestions Frigo, Congélateur, Placard | Sélecteur d'emplacement, repère proposé |
| [stockCommands](../../src/services/stockCommands.ts), [schéma](../../packages/shared/src/stock-commands.ts) | Neuf types, `payload_version` 1, schémas Zod `.strict()` ; `undo_stock` n'accepte ni `recipe_add_missing` ni aucune écriture limitée aux courses ; `stock_movements.inventory_id` est obligatoire | Quatre commandes de courses, `review_inventory`, champs facultatifs (sections 7 et 8) |
| RPC `execute_stock_command` | `SECURITY DEFINER`, contrôles par `auth.uid()` ; l'enveloppe `public.execute_stock_command` est exécutable par `authenticated`, donc appelable sans l'API ni Zod | Règle C : tout contrôle indispensable est en SQL |
| Déclencheurs `inventory` et `shopping_list` | Chaque `UPDATE` incrémente `stock_version` et rafraîchit `updated_at` | Remplissage d'emplacement sans les modifier (section 6) |
| [stockDiscard](../../src/services/stockDiscard.ts) | La perte débite par `consume_inventory`, puis écrit `food_waste_events` séparément ; `undo_stock` ne rétablit pas la perte | Perte atomique dans l'inventaire complet (`review_inventory`) |
| [quantities](../../packages/shared/src/quantities.ts), migration `20261105100000_stock_units.sql` | Conversions dans une même dimension, logique dupliquée en SQL ; `findTopUpLot` rapproche un ajout d'un lot par quantité, unité, emplacement et date, sans état d'ouverture | État d'ouverture dans le rapprochement (section 8) ; équivalence instruite en E9 |
| [products.intelligence](../../apps/api/src/routes/products.intelligence.ts) | Open Food Facts renseigne `products.quantity_label` (texte brut), jamais interprété | Proposition de conditionnement à confirmer |
| Routes `/v1/inventory/low-stock` et `/v1/shopping/from-low-stock` | Sans appelant dans `src` ; les gestionnaires utilisent le client de session (`req.supabaseClient`, sous RLS), pas le client de service passé aux fabriques ; dépôts sur `expiration_date`, `is_checked` et `list_id`, absents du parcours actif ; seuil par défaut `2` exposé | Non réutilisées ; retrait proposé à V11-06 |
| [Outil d'ajout de l'assistant](../../apps/api/src/services/assistant/handlers/write.ts) | Insertion directe sans agrégation ; inverse `remove_shopping_items` qui supprime les lignes insérées ; résolution par plongements quand le nom exact manque | Raccordement à `shopping_add` (section 7), coordonné avec V11-04 |

Constats supplémentaires, absents de l'audit initial :

- Le catalogue `products` est lisible par tous et tout compte connecté peut y **ajouter** un produit, mais ni le modifier ni le supprimer (migration `20261108160000_security_ownership.sql`). Seuil, durée après ouverture et équivalence ne peuvent donc pas être des colonnes de `products`.
- Le nettoyage nocturne peut supprimer les achats « à ranger » de tous les comptes, même sans la tâche planifiée (section 4).
- « Ajouter aux courses » depuis une ligne de stock envoie la quantité 1 dans l'unité du lot, ce qui produit « 1 g » pour un lot en grammes.
- Une connexion sous un autre compte efface les intentions `v10-command:` des autres comptes ([AuthSessionContext](../../src/contexts/AuthSessionContext.tsx)) ; seule l'expiration de session les conserve pour le même compte.

## 4. Préalable au dossier V11 : neutraliser le nettoyage nocturne (E0)

Faits établis dans le dépôt :

- `supabase/config.toml` déclare `verify_jwt = false` pour `cleanup-shopping-list` : la passerelle n'exige aucun jeton.
- La [fonction](../../supabase/functions/cleanup-shopping-list/index.ts) ne contrôle pas l'appelant, répond avec `Access-Control-Allow-Origin: *` et utilise la clé de service. Elle supprime, tous comptes confondus, les lignes `is_purchased = true` dont `updated_at` a plus de vingt-quatre heures. `updated_at` change à chaque modification : le délai ne mesure pas le temps écoulé depuis le cochage. La colonne `purchased_at`, ajoutée en août 2025, n'est jamais écrite.
- Elle purge ensuite `recipe_conversations` au-delà de cent lignes par compte. Cette purge appelle `.group()`, méthode que le client supabase-js v2 ne fournit pas à notre connaissance : elle échouerait à chaque passage, erreur journalisée puis ignorée (à confirmer dans les journaux).
- La migration `20250803065407` programme l'appel chaque nuit à 2 h vers l'URL de projet codée en dur, sans en-tête d'autorisation. Aucune migration ultérieure ne le retire. [DEPLOYMENT](../../docs/DEPLOYMENT.md) demande encore de déployer la fonction.

Conséquence : si la fonction est déployée, toute personne qui connaît son URL peut vider les achats « à ranger » de tous les comptes, avec ou sans la tâche. Désactiver la tâche seule ne suffit pas.

Déroulé, avant toute autre étape V11 :

1. **Constat sur le projet cible**, identifié par sa référence et comparé à l'URL de la migration : ligne `cleanup-shopping-list-daily` de `cron.job` (planification, `active`, rôle propriétaire) ; historique dans `cron.job_run_details` ; réponses de `pg_net` encore conservées (`net._http_response`, rétention courte, à confirmer) ; présence de la fonction parmi les fonctions déployées et ses journaux (« Cleaned up N purchased items »). Le compte rendu note le nombre de suppressions observables et la période couverte. Aucune sauvegarde de ces lignes n'est connue : ce lot ne restaure rien.
2. **Retrait de la route d'abord** : suppression de la fonction déployée, puis du répertoire, de son entrée dans `config.toml` et de la consigne de déploiement. La fonction retirée, la tâche n'a plus d'effet.
3. **Retrait de la tâche** par une migration idempotente qui n'appelle `cron.unschedule('cleanup-shopping-list-daily')` que si la tâche existe. Sous Supabase, seul le rôle propriétaire d'une tâche peut la retirer, et l'historique reste dans `cron.job_run_details` ([Supabase Cron](https://supabase.com/docs/guides/cron/quickstart), [guide de débogage pg_cron](https://supabase.com/docs/guides/troubleshooting/pgcron-debugging-guide-n1KTaz)).
4. **Vérification** : la tâche a disparu de `cron.job` ; l'URL de la fonction ne répond plus ; un achat coché sur un compte de test est toujours présent après plus de vingt-quatre heures et un passage de 2 h.

Exception assumée à la convention d'un E0 sans code : le retrait est une correction de perte de données, livrable seule. La purge des conversations n'est pas remplacée (D14) : `recipe_conversations` n'est écrite que par la fonction `recipe-assistant`, sans référence dans le dépôt, dont le sort relève de V11-06.

## 5. Décisions proposées

Aucune de ces décisions n'est validée. Chacune est à trancher avant l'étape indiquée.

| N° | Sujet | Décision proposée | Alternative écartée | Avant |
| --- | --- | --- | --- | --- |
| D1 | Nature du repère | Valeur calculée à la lecture, affichée comme estimation avec sa source et son point de départ ; n'écrit jamais `expiry_date` ni `date_kind` | Préremplir la date du lot, ou stocker un type de date « estimée » | E4 |
| D2 | Effet du repère | Alimente « À utiliser bientôt » et le tri, mention « estimation » ; n'exclut aucun lot des idées de repas | Traiter un repère dépassé comme une DLC dépassée | E4 |
| D3 | Provenance des durées | Référentiel éditorial versionné et sourcé ; durée déclarée par l'utilisateur prioritaire et affichée comme telle | Durées d'un modèle ou de l'estimateur du ticket | E4 |
| D4 | Produits de base | Réglage par compte et par produit, seuil avec son unité | Seuil global sans unité (actuel) | E3 |
| D5 | Réassort | Suggestion du déficit jusqu'au seuil, acceptée, modifiée ou écartée ; aucune écriture sans geste | Ajout automatique sous le seuil | E7 |
| D6 | Emplacements | Trois de base plus des personnalisés par compte ; pendant la transition, le texte `location` fait foi et la base en dérive l'identifiant ; pas de renommage | Liste fermée ; ou bascule immédiate sur l'identifiant | E3 |
| D7 | Pas rapides | « − » et « + » sur la ligne pour les unités de comptage ; pour masse et volume, « la moitié » et « il n'en reste plus » | Pas fixe de 1 quelle que soit l'unité | E5 |
| D8 | Ordre des rayons | Un ordre par compte ; rayon déduit de la catégorie à défaut | Plans par magasin (`store_layouts`) | E6 |
| D9 | Prix | Nouvelle colonne nullable `estimated_line_price` (prix de la ligne entière, vide = inconnu) ; `estimated_price` historique conservé, non réinterprété ; prix de ligne effacé et marqué « à revoir » si une fusion change la quantité | Réinterpréter `estimated_price`, documenté comme prix unitaire | E6 |
| D10 | Rachats fréquents | Dérivés des rangements effectifs : commandes `transfer_shopping` non annulées, une ligne d'achat comptée une fois même rangée de nouveau après annulation | Réutiliser `shopping_patterns` ; compter chaque `source_shopping` | E7 |
| D11 | Équivalences d'unités | Conditionnement confirmé pour le produit exact seulement ; poids par pièce différé | Poids moyen, même saisi par l'utilisateur | Fin E9 |
| D12 | Tables et fonctions orphelines | **Validée le 22 novembre 2026.** Suppression exécutée par V11-06 E8, après l'inventaire de V11-06 E0, une sauvegarde vérifiée et une liste arrêtée table par table par l'utilisateur ; dépendances SQL traitées avant (section 12) | Réutilisation partielle | E1 |
| D13 | Nettoyage nocturne | **Validée le 22 novembre 2026.** Retrait de la fonction et de la tâche | Authentifier l'appelant et garder la purge | E0 |
| D14 | Purge des conversations | **Validée le 22 novembre 2026.** Non remplacée | La réécrire ailleurs | E0 |
| D15 | Écritures directes sur `shopping_list` | **Validée le 22 novembre 2026.** Droits `INSERT`, `UPDATE`, `DELETE` de `authenticated` révoqués après migration de tous les écrivains et un cycle de publication | Les laisser ouvertes durablement | Fin E2 |
| D16 | Cible d'une fusion | Cible explicite à sa version, sinon ligne non cochée convertible de plus petit `id` ; jamais une ligne cochée | Ligne la plus récente ; fusion avec un achat à ranger | E2 |
| D17 | Réglages et emplacements | Écriture directe sous RLS, tous les invariants en base | Routes API dédiées | E3 |

## 6. Contrats de données

Les noms ci-dessous sont proposés ; aucune migration n'est créée par cette PRP.

**Réglages par produit et par compte** — `pantry_product_settings`, clé `(user_id, product_id)` : `is_staple`, `min_quantity` et `min_unit` (présents ensemble ou absents ensemble), `opened_shelf_life_days` (provenance `user`), conditionnement facultatif (`equivalence_count_unit`, `equivalence_quantity`, `equivalence_unit`, `equivalence_source` = `label_confirmed`), `settings_version` incrémentée à chaque modification.

**Emplacements** — `storage_locations` : `id`, `user_id`, `name`, `name_key` générée par `stock_normalize_name(name)`, `kind` (`fridge`, `freezer`, `pantry`, `other`), `sort_order` ; unicité `(user_id, name_key)`. `inventory.location_id` nullable, clé étrangère composée `(user_id, location_id)` → `storage_locations(user_id, id)`, `ON DELETE RESTRICT`. Règle unique de cohérence (D6) : toutes les écritures continuent de porter le texte `location` (anciens clients en insertion directe, commandes, inverse de `undo_stock` qui restaure le texte de l'instantané) ; un déclencheur `BEFORE INSERT OR UPDATE OF location` en dérive `location_id`, en créant si besoin un emplacement `other`. Le remplissage initial ne modifie ni `stock_version` ni `updated_at` (déclencheurs qui ignorent une modification limitée à `location_id`, ou suspendus dans la transaction de migration : choix en E3, testé), sinon il invaliderait les versions attendues des corrections en cours et rajeunirait les rappels de la revue des produits frais. Le périmètre d'un emplacement suit celui du lot ; son passage au foyer est un prérequis du stock partagé de V11-02.

**Dates de lot** — `inventory.opened_at`, date seule, nullable, jamais future. `inventory.stored_since`, date à laquelle le lot est entré dans son type d'emplacement actuel : écrite par les commandes à la création et à chaque changement de type, nulle pour les lots antérieurs. Ce sont des dates d'événement, jamais des dates de péremption.

**Prix de ligne** — `shopping_list.estimated_line_price`, numérique nullable, positif ou nul, borné (D9).

**Rayons** — liste partagée dans `packages/shared`, sans « Entrée » ni « Caisses », avec correspondance catégorie → rayon ; même liste en SQL, comparée par un test. L'ordre personnel est une colonne de `mobile_routine_preferences`, déjà lue par `useRoutinePreferences`.

**Référentiel de conservation** — module partagé versionné, sur le modèle de [food-guidance](../../packages/shared/src/food-guidance.ts) : pour chaque entrée la forme du produit, le type d'emplacement, l'état (non ouvert, ouvert), une plage de durée, le titre et l'adresse de la source, la date de relecture. **Ce référentiel reste à constituer** : cette PRP n'écrit aucune durée. Un produit non couvert n'affiche aucun repère.

**Règles communes**

- La base est la garantie, Zod la première barrière : RLS par propriétaire avec `(SELECT auth.uid()) = user_id`, révocation pour `anon`, contraintes `CHECK` (quantités finies et strictement positives, longueurs bornées, listes fermées), normalisation par colonne générée. Aucun identifiant de compte n'est accepté depuis un payload.
- **Règle C.** Toute nouvelle commande vérifie dans la transaction SQL le compte (`auth.uid()`), la propriété de chaque ligne et de chaque référence (lot, ligne de courses, emplacement, produit existant) et les bornes de chaque valeur, puisque la RPC est appelable directement.
- Contrat commun n° 2 de V10 : aucune conversion entre dimensions sans information explicite ; le conditionnement confirmé est cette information.

## 7. Contrat des écritures de la liste de courses (E2)

Aujourd'hui, seuls `transfer_shopping` et `recipe_add_missing` écrivent la liste par commande. Ce contrat est posé une fois, ici, et consommé par V11-01 (`menu_add_missing`) et V11-02 (rejeu hors ligne ; extension au foyer). Il est livré avant ces deux étapes.

| Commande | Payload (100 articles au plus) | Effet | Inverse |
| --- | --- | --- | --- |
| `shopping_add` | Produit (`product_id`, ou nom résolu par la base), quantité, unité, rayon facultatif, origine (`manual`, `stock_row`, `restock`, `frequent`, `assistant`), cible facultative `{id, expected_version}` | Incrément d'un geste, par la primitive d'agrégation | Ligne créée retirée ; ligne complétée ramenée à ses valeurs antérieures |
| `shopping_check` | `{id, expected_version, purchased}` par ligne | Coche ou décoche la ligne dans la version affichée | État antérieur rétabli |
| `shopping_update` | `{id, expected_version}` et champs modifiés | Modification d'une ligne | Valeurs antérieures rétablies |
| `shopping_remove` | `{id, expected_version}` par ligne | Suppression, y compris « vider les achetés » | Ligne réinsérée à l'identique |

**Primitive d'agrégation.** Une seule fonction SQL privée, utilisée par `shopping_add`, `recipe_add_missing` et `menu_add_missing`, en deux modes : `increment` (ajouter une quantité) et `complete_to` (compléter un besoin après déduction de ce que la liste contient déjà, comportement actuel de `recipe_add_missing`). Chaque commande appelante définit sa quantité et sa provenance.

- Candidates : lignes du compte, même produit, non cochées, unité convertible. Une ligne cochée « à ranger » n'est jamais complétée ; l'interface signale « déjà acheté, à ranger ».
- Cible (D16) : la cible explicite si elle est toujours à sa version, sinon la candidate de plus petit `id`. Cible explicite périmée : `CONFLICT`, rien n'est écrit.
- La fusion garde le produit et l'unité de la cible ; un rayon explicite de la cible n'est jamais remplacé ; un rayon fourni ne s'applique qu'à une ligne créée ou sans rayon. Unité incompatible : nouvelle ligne, et le message le dit.
- Lignes verrouillées par ordre d'`id` sous le verrou de compte existant.

**Journal et annulation.** `stock_movements` impose un `inventory_id`. Une table `shopping_movements` (proposée) enregistre dans la transaction le compte, la commande, la ligne, la nature (`created`, `updated`, `deleted`), l'état antérieur complet de la ligne et sa `stock_version` résultante ; sa clé étrangère vers `stock_commands` l'efface avec le compte. `undo_stock` accepte les quatre commandes, et `recipe_add_missing` dès qu'elle passe par la primitive. L'inverse est tout ou rien : chaque ligne doit être encore à sa version résultante (créée, mise à jour) ou encore absente (supprimée), sinon `UNDO_CONFLICT` sans effet partiel. L'inverse actuel de l'assistant, qui supprime les lignes insérées, est remplacé par `undo_stock`, car il effacerait la quantité antérieure d'une ligne complétée.

**Clients raccordés.** `useShoppingList` (ajout, cochage simple et multiple, modification, suppression) et l'outil de l'assistant passent par ces commandes. Un refus pour version périmée relit la ligne et montre la nouvelle quantité, sans recocher. L'assistant réutilise l'identifiant de son action comme identité de commande et place le produit résolu dans le payload : un rejeu renvoie le reçu sans nouvelle résolution. Sa résolution par plongements lui reste propre ; les autres origines gardent la recherche déterministe par nom normalisé.

**Écritures directes et compatibilité.** Tant qu'un ancien client écrit directement, les garanties ne valent que pour les chemins par commande ; E1 recense tous les écrivains de `shopping_list`, puis D15 révoque l'écriture directe. `stock_routine_capabilities` passe à 4 et l'API répond `MIGRATION_REQUIRED` aux nouvelles commandes tant que la base ne l'expose pas. Ordre de déploiement : base, API, interface.

## 8. Autres commandes, réglages et calculs

| Changement | Contrat | Remarque |
| --- | --- | --- |
| `adjust_inventory`, `transfer_shopping` | `opened_at` facultatif par article ; `stored_since` écrite par la base | Capacité 4 exigée dès qu'un article le porte : une base ancienne l'ignorerait en confirmant. Les schémas étant stricts, l'interface ne l'envoie qu'après déploiement de l'API. `undo_stock` restaure `opened_at` et `stored_since` |
| `adjust_inventory`, `transfer_shopping` | `location` reste une chaîne | La base en dérive l'emplacement (section 6) ; aucun client à migrer |
| Rapprochement d'un ajout au stock (`findTopUpLot`) | Un lot ouvert n'absorbe jamais un ajout ; dates d'ouverture différentes ou incertaines : lot distinct | Règle partagée par le web et l'assistant, testée des deux côtés |
| Édition groupée | `adjust_inventory` existante, cent lots au plus | Atomique et annulable en une fois |
| Nouvelle `review_inventory` | Segment de cent lots au plus ; par lot : `keep`, `set_quantity`, `consumed` ou `waste` (quantité, unité, motif), avec version attendue | Les pertes sont écrites dans `food_waste_events` dans la même transaction (colonne `stock_command_id`) ; `undo_stock` rétablit ensemble stock et pertes ; `keep` vaut l'action « J'en ai encore » actuelle |
| Réglages et emplacements | Écriture directe sous RLS (D17) | Invariants en base, testés par accès direct en `anon` et sous deux comptes |
| Réassort | Fonction pure : lots, courses, réglages → suggestions avec raison | Calcul sans écriture, testable sans base |

**Réassort.** La suggestion porte le déficit jusqu'au seuil, pas le seuil entier. Sont déduits les lots dont l'unité se convertit vers celle du seuil et dont la date n'est pas dépassée, ainsi que les lignes de courses non achetées et les achats « à ranger ». Un lot à date dépassée, non convertible, ou de quantité `estimated` ou `unknown` n'est ni compté ni assimilé à zéro : la suggestion porte la raison « quantité à vérifier » et ne propose aucun montant avant vérification. Le bouton « Ajouter aux courses » du stock propose ce même déficit ; sans seuil, la quantité est demandée.

**Repère de conservation.** Fonction pure : type d'emplacement, forme du produit, point de départ (section 9), réglage personnel → plage de dates, source, version et point de départ affiché, ou rien. V11-02 peut l'appeler ; ce lot n'envoie aucune notification.

## 9. Dates : parcours et états

Point de départ du repère, sinon aucun repère : `opened_at` pour un lot ouvert ; sinon `stored_since` ; pour un lot antérieur à E4, `created_at`, affiché « depuis l'ajout au stock le … », jamais pour un congélateur, faute de date de congélation connue.

| Situation | Affichage et action |
| --- | --- |
| Lot avec date saisie | La date saisie prime ; aucun repère à sa place |
| Lot sans date, produit couvert, point de départ connu | « Repère : à vérifier entre le … et le … — estimation, depuis le … » ; source ouvrable ; « Saisir la date de l'emballage » |
| Lot sans date, produit non couvert ou point de départ inconnu | « Date non renseignée », sans repère |
| Lot antérieur sans `opened_at` | Ouverture inconnue : repère intitulé « si non ouvert » |
| Lot marqué ouvert | Le repère repart de `opened_at` ; la durée déclarée par l'utilisateur prime et est affichée comme sienne |
| Changement de type d'emplacement | `stored_since` prend la date du changement ; le repère repart de là, pas de l'entrée ; la date saisie n'est pas touchée |
| Notes signalant une conservation à vérifier | Pas de repère ; le contrôle existant prime |
| Utilisateur en désaccord | Durée personnelle modifiable, ou repère masqué pour ce produit |

Le texte d'accompagnement précise que le repère ne certifie pas l'état du lot. Les intervalles de [produce-review](../../packages/shared/src/produce-review.ts) restent des rappels de vérification. L'estimateur `estimateExpiryDate` de [productMatcherService](../../apps/api/src/services/receipt/productMatcherService.ts), à durées codées en dur et sans source, n'est pas repris ; son sort relève de V11-01.

## 10. Stock : parcours et états d'interface

**Tri et regroupement.** Tris : à utiliser en premier (date saisie, puis repère dès E4), nom, dernière modification, emplacement. Le choix est conservé avec les filtres existants (`stock-filters`, par compte). Le regroupement par emplacement affiche un en-tête par emplacement avec son nombre de lots ; les lots sans emplacement forment le groupe « À ranger ».

**Correction sur la ligne.** Les pas rapides s'accumulent pendant une courte pause, puis partent en une seule `adjust_inventory` avec la version attendue. La ligne montre « en attente », puis le résultat confirmé et son annulation. Un refus pour version périmée relit le lot et montre la valeur actuelle, sans rejouer le pas.

**Balayage.** Il révèle « Il n'en reste plus » et « Déplacer », ne valide rien seul, et les mêmes actions restent dans le menu de la ligne (V10-02). Avec `prefers-reduced-motion` ou un lecteur d'écran, seul le menu est proposé.

**Édition groupée.** Déplacer, marquer épuisé ou, dès E4, marquer ouvert plusieurs lots. La confirmation liste les lots ; une commande unique, atomique et annulable. Au-delà de cent lots, l'interface demande de réduire la sélection.

**Inventaire complet.** Parcours par emplacement, découpé en segments de cent lots au plus. Chaque lot reçoit l'une des quatre actions de la revue des produits frais ; chaque segment est confirmé par une `review_inventory`, annulable en une fois avec ses pertes. Un emplacement est terminé quand tous ses segments sont confirmés. La progression est conservée par compte et reprenable ; abandonner ne modifie aucun lot non traité ; un lot modifié ailleurs est signalé à la reprise par sa version.

| État | Comportement attendu |
| --- | --- |
| Chargement, vide, erreur de lecture | États existants conservés |
| Écriture en cours | Ligne ou sélection verrouillée ; saisie conservée |
| Écriture refusée | Aucun faux succès ; valeur précédente rétablie ; reprise proposée |
| Conflit de version | Lot relu, différence montrée, nouvelle confirmation demandée |
| Session expirée | Intention conservée pour le même compte et reprise à la reconnexion |
| Autre compte connecté | Intentions des autres comptes effacées (comportement actuel), jamais rejouées ; le reçu d'une commande déjà partie reste lisible par son propriétaire |

## 11. Courses : parcours et états d'interface

**Regroupement.** Achats restants groupés par rayon, dans l'ordre du compte : rayon saisi, sinon déduit de la catégorie, sinon « Autres ». Les achats cochés rejoignent « Achetés, à ranger », replié en magasin. Réordonner les rayons se fait par boutons monter et descendre en plus du glisser-déposer.

**Ajout.** Ajout manuel, « Ajouter aux courses » depuis le stock, rachat fréquent, réassort et assistant passent par `shopping_add`. Une ligne complétée est annoncée (« Lait : 1 L ajouté, 2 L au total ») avec l'annulation ; une ligne distincte est expliquée (unité incompatible, achat déjà à ranger).

**Total estimé.** Somme des `estimated_line_price` renseignés des lignes non achetées, suivie de « n articles sans prix » ; aucun total sans prix renseigné. Les valeurs historiques d'`estimated_price` ne sont ni converties ni additionnées. Le changement de calcul lu par la page d'analyses est transmis à V11-06.

**Rachats fréquents et réassort.** Deux blocs repliables au-dessus de la liste. Fréquence calculée selon D10 ; règle et fenêtre fixées en E1 sur les données réelles. Chaque proposition s'ajoute d'un appui, se modifie ou s'écarte ; une proposition écartée, mémorisée par compte sur l'appareil, ne revient pas avant le prochain rangement du produit.

**Partage.** Texte ordonné par rayon, par la feuille de partage du système quand elle existe, sinon copie. La liste à plusieurs relève de V11-02.

## 12. Tables et fonctions orphelines

Vérification faite dans `src`, `apps`, `packages` et `scripts` ; le schéma déployé n'a pas été consulté.

| Objet | Constat | Proposition |
| --- | --- | --- |
| `store_layouts`, `store_sections` (migration `20250818000001`) | RLS, rayons par défaut insérés, aucun lecteur | Supprimer (D8) |
| `shopping_patterns` | Aucun lecteur ni écrivain | Supprimer (D10) |
| `shared_shopping_lists`, `shopping_list_collaborators`, `live_shopping_sessions` | Aucun lecteur ; `shopping_list.shared_list_id` y renvoie avec `ON DELETE CASCADE` | Décision à V11-02 |
| Déclencheur `create_default_shopping_list_trigger` sur `auth.users` | Insère dans `shared_shopping_lists` depuis `store_layouts` à chaque inscription | Retiré **avant** les tables, sinon chaque inscription échouerait |
| `product_prices` | Lecture ouverte à tout compte connecté ; un script de démonstration tente de l'alimenter avec la clé anonyme, réussite non établie | Décision à V11-01 |
| Fonction `cleanup-shopping-list` et sa tâche | Section 4 | Retirées par ce lot en E0 |
| Fonction `indian-price-estimator` | Aucun appelant client ; écriture facultative dans `recipe_price_estimates` | Supprimer |
| Routes `/v1/inventory/*` et `/v1/shopping/*` historiques | Sans appelant ; client de session ; colonnes divergentes | Retrait proposé à V11-06 |

Hors E0, ce lot ne supprime rien. Il fournit au lot exécutant (D12) la liste, les preuves d'absence d'appelant, l'ordre de retrait (déclencheur, puis contrainte `shared_list_id`, puis tables, sans supprimer de lignes de `shared_shopping_lists` tant que la cascade existe) et la vérification préalable des appels distants et d'une sauvegarde restaurable.

## 13. Unités : instruction avant réalisation (E9)

Seul le **conditionnement** est instruit : une boîte contient une masse imprimée sur l'emballage. `quantity_label` est un texte brut d'Open Food Facts ; il peut suggérer une valeur, appliquée seulement après confirmation pour le produit exact. Le **poids par pièce** (un oignon, un œuf) est une moyenne : il est différé, même saisi par l'utilisateur, car il rendrait la quantité restante approximative.

Risques pour le rapprochement recette ↔ stock :

- La conversion existe en TypeScript et en SQL ; une équivalence appliquée d'un seul côté fait diverger l'aperçu et la commande. Les deux évoluent ensemble, avec les mêmes cas de test.
- Une équivalence fausse débite silencieusement trop ou trop peu : elle est visible sur la fiche produit, modifiable, et le récapitulatif de cuisine montre la conversion utilisée.
- L'aperçu actuel ne transporte que la version des lots : il doit aussi porter `settings_version`, revérifiée dans la transaction, pour qu'une équivalence modifiée entre aperçu et confirmation l'invalide.

La sortie est une décision écrite : réaliser le conditionnement, ou rien. « Rien » est recevable si les cas réels du stock ne le justifient pas.

## 14. Cas limites

- Deux lots du même produit dans deux emplacements : le seuil porte sur leur somme, le repère sur chacun.
- Produit de base dont tous les lots sont épuisés : suggestion maintenue ; lot épuisé conservé comme aujourd'hui.
- Emplacement qui porte encore des lots : suppression refusée par la base ; l'interface propose de les déplacer d'abord.
- « Cave » et « cave » : une seule clé normalisée, un seul emplacement.
- Zones existantes : rapprochées des emplacements de base par clé normalisée ; toute autre valeur devient un emplacement `other`, sans perte ni fusion devinée, et sans changement de version ni de date des lots.
- `opened_at` antérieure à l'entrée du lot : acceptée ; date future : refusée par la base.
- Seuil dans une unité que plus aucun lot ne porte : réglage « à vérifier », sans suggestion fausse.
- Double appui sur une suggestion : une seule commande, grâce à l'intention conservée.
- Ligne complétée sur un appareil pendant qu'un autre la coche : `shopping_check` échoue sur la version, la ligne est relue avec sa nouvelle quantité.
- Achat déjà à ranger puis nouvel ajout du même produit : nouvelle ligne, signalée.
- Annulation d'un ajout après modification de la ligne : `UNDO_CONFLICT`, rien n'est défait.
- Rangement annulé puis refait : compté une seule fois dans les rachats fréquents.
- Référentiel mis à jour : le repère change sans écriture ; la version affichée l'explique.

## 15. Découpage de réalisation

| Étape | Livrable | Condition de sortie | Dépend de |
| --- | --- | --- | --- |
| E0 — Nettoyage nocturne neutralisé | Constat distant, retrait de la fonction, migration de retrait de la tâche (section 4) | Route muette, tâche absente, achat de test conservé ; compte rendu des suppressions observées | Rien ; avant tout V11 |
| E1 — Référence | Schéma déployé, écrivains de `shopping_list`, zones existantes, prix existants (dont les `0`), règle des rachats, sources du référentiel | Décisions du tableau 5 tranchées pour E2 et E3 ; aucun code | E0 |
| E2 — Écritures de la liste | Quatre commandes, primitive, `shopping_movements`, `undo_stock` étendu, raccordement du hook et de l'assistant, capacité 4 | Tests SQL directs et de concurrence verts ; aucun chemin actif n'écrit directement | E1 |
| E3 — Réglages et emplacements | Tables, RLS, déclencheur de dérivation, remplissage, sélecteur | Isolation verte ; versions et dates des lots inchangées par la migration ; anciennes sessions lisibles | E1 |
| E4 — Ouverture et repère | `opened_at`, `stored_since`, référentiel initial, fonction pure, affichage | Aucun repère sans source ni point de départ ; aucune date de péremption écrite | E3, travail éditorial |
| E5 — Ergonomie du stock | Tri, regroupement, pas rapides, balayage, édition groupée ; tri par repère et « marquer ouvert » ajoutés après E4 | Parcours au clavier et au lecteur d'écran | E3 |
| E6 — Courses par rayon et prix | Regroupement, ordre, `estimated_line_price`, total, partage | Utilisable à 320 px ; total jamais présenté complet à tort | E1, E2 |
| E7 — Suggestions | Réassort, rachats fréquents, raccordement des cinq origines | Aucune écriture sans geste ; quantités douteuses à vérifier | E2, E3, E6 |
| E8 — Inventaire complet | `review_inventory`, segments, reprise | Segment et pertes annulés ensemble ; abandon sans effet | E3 |
| E9 — Unités | Instruction, puis réalisation éventuelle | Décision D11 écrite ; aperçu et commande identiques | E3 |

Chaque étape est livrable seule. E0 est à mener immédiatement ; E2 doit précéder `menu_add_missing` de V11-01 et le rejeu hors ligne de V11-02.

## 16. Vérification et critères de sortie

Les tests sont écrits avant le code de chaque étape. Tests de base : nouveau script sur la chaîne de migrations effective, celle de `test-menu-shopping-db.py` (qui ajoute `20261108120000` à celle de `test-stock-units-db.py`), complétée des migrations ultérieures. Tests d'API : tout nouveau fichier est ajouté au motif fermé de `test:v10:api`, sinon il ne s'exécute pas.

Tests de base : isolation de deux comptes sur toutes les nouvelles tables en accès direct ; appel direct de la RPC en `anon` refusé, et sous un second compte sur les lignes du premier refusé ; emplacement d'un autre compte refusé ; contraintes de seuil, de prix et de dates ; migration des zones sur un jeu anonymisé, avec `stock_version` et `updated_at` inchangés ; dérivation de l'identifiant depuis le texte par insertion directe, commande et inverse ; chaque commande de courses rejouée sans second effet et refusée sous la même identité avec un autre payload ; cochage refusé sur version périmée ; deux ajouts concurrents sérialisés ; inverse tout ou rien ; `review_inventory` et ses pertes annulées ensemble ; `opened_at` et `stored_since` restituées par `undo_stock`.

Tests unitaires : réassort (déficit, unités non convertibles, dates dépassées, quantités estimées, courses et achats à ranger déduits) ; repère (priorité de la date saisie, point de départ, changement d'emplacement, ouverture inconnue, notes, produit non couvert) ; `findTopUpLot` avec lots ouverts ; rachats fréquents avec annulation puis nouveau rangement ; catégorie → rayon ; total avec lignes sans prix.

Tests de composants : tri et regroupement conservés ; pas rapides regroupés en une commande ; conflit de version ; édition groupée sans effet partiel ; inventaire repris après fermeture ; ajout de l'assistant rejoué sans nouvelle résolution.

Vérification visuelle et d'accessibilité : 320, 375, 768 et 1024 px, deux thèmes ; cibles de 44 px ; VoiceOver sur une correction et un cochage. Les essais sur iPhone réel sont consignés à part.

- [ ] La fonction `cleanup-shopping-list` et sa tâche sont absentes du projet déployé ; un achat à ranger survit à un passage de 2 h.
- [ ] Aucun chemin actif n'écrit `shopping_list` hors commande ; après D15, l'écriture directe est refusée par la base.
- [ ] Rejouer un geste ne produit qu'un effet ; deux ajouts voulus du même produit dans une unité convertible donnent une ligne à la quantité cumulée ; une unité incompatible ou un achat à ranger donnent une ligne distincte annoncée ; la cible parmi plusieurs lignes est déterministe.
- [ ] Tout ajout, cochage, modification et suppression de la liste est annulable, ou refusé sans effet partiel.
- [ ] Aucun repère n'est affiché sans source, sans point de départ et sans la mention « estimation ».
- [ ] Aucun chemin de ce lot n'écrit `expiry_date` ou `date_kind` sans saisie de l'utilisateur.
- [ ] Le seuil sans unité a disparu du parcours actif (les routes historiques le gardent jusqu'à leur retrait) ; un réassort n'est jamais ajouté sans geste.
- [ ] Toutes les zones existantes sont retrouvées après migration ; le compte rendu liste celles devenues personnalisées.
- [ ] Le total n'est jamais présenté comme complet quand des lignes sont sans prix.
- [ ] L'édition groupée et chaque segment d'inventaire, pertes comprises, sont annulables en une fois.
- [ ] La décision D11 est écrite, quelle qu'elle soit.

Une validation locale ne vaut pas une validation sur le projet Supabase déployé ni un essai sur iPhone ; un contrôle bloqué est noté non validé.

## 17. Retour arrière et transmission

E0 n'a pas de retour arrière : la fonction n'est pas redéployée. Les migrations suivantes sont additives (colonnes nullables, tables nouvelles, déclencheurs). La colonne texte `inventory.location` reste écrite et fait foi : un retour à la version précédente du client retrouve ses zones, et retirer le déclencheur de dérivation ne perd rien.

Ordre de déploiement : base, API, interface. Un retour arrière de l'API devant une interface récente produit un refus visible, jamais une écriture partielle ; l'interface est donc ramenée avec elle. Les reçus des nouvelles commandes restent lisibles ; leur annulation est indisponible tant que la base est ancienne, et le message le dit.

Chaque surface se désactive séparément : repère, suggestions, regroupement par rayon. Désactiver l'agrégation passe la primitive en création systématique de ligne, **toujours par commande** : l'identité continue de dédoublonner un geste rejoué, et l'insertion directe n'est pas rétablie. La révocation D15 se défait par un `GRANT`. Aucune table orpheline n'est supprimée avant la désignation du lot exécutant, la confirmation du schéma déployé et une sauvegarde.

Sont transmis : à V11-01, la primitive d'agrégation (mode `complete_to`), l'ordre E2 avant `menu_add_missing`, `shopping_check` et `shopping_update` pour le rapprochement du ticket, et le prix de ligne distinct ; à V11-02, le contrat de la section 7 à étendre au foyer, le périmètre des emplacements pour le stock partagé, l'alignement sur la purge des intentions au changement de compte et la fonction de repère, à présenter comme estimation ; à V11-04, le raccordement de l'outil d'ajout et le remplacement de son inverse ; à V11-06, la liste de la section 12 et le changement de calcul lu par la page d'analyses. Le compte rendu de réalisation suit le modèle de `docs/implementations/V10-01.md`.
