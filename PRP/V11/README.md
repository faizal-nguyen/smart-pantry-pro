# V11 Boucle complète : du menu au rangement, à plusieurs et dans la durée

> Statut : six PRP à l'état de brouillon, relues par Codex le 22 novembre 2026. Chaque constat de cette relecture a été revérifié dans le code avant d'être intégré. Les décisions validées par l'utilisateur les 22 et 23 novembre 2026 sont en section 4.1, dont toutes celles de V11-01 ; les autres restent proposées. Les rangs 1 à 3 de la section 1 sont réalisés et en production (section 0, [V11-05 E2](../../docs/implementations/V11-05-E2.md)) ; le rang 4 a commencé ([V11-01 E0](../../docs/implementations/V11-01-E0.md), [E1a](../../docs/implementations/V11-01-E1.md), [E1b](../../docs/implementations/V11-01-E1b.md), [E2](../../docs/implementations/V11-01-E2.md)).
> Création : 2026-11-22.
> Produit : Smart Grocery, application Smart Pantry Pro (Kitchen OS).
> Source : audit fonctionnel du 22 novembre 2026, mené par lecture du code (référence locale `3ade8b54`, branche `main`, arbre de travail avec modifications non commitées). Il n'existe pas de document d'audit séparé : sa synthèse est en section 2 et chaque PRP revérifie ses constats.
> Suite de : [V10](../V10/README.md), dont les [contrats communs](../V10/README.md#3-contrats-communs-aux-dix-prps) restent applicables.

V10 a fiabilisé le parcours **courses → rangement → stock → choix du repas → cuisine → stock actualisé**. V11 ferme ce qui reste ouvert autour : le menu de la semaine ne produit pas de courses, rien ne rappelle l'utilisateur, le foyer ne partage rien, et plusieurs écrans affichent des chiffres ou des réglages sans effet.

## 0. À vérifier avant tout le reste

La migration `20250803065407` programme chaque nuit à 2 h un appel à la fonction Edge `cleanup-shopping-list`. Aucune migration ultérieure ne retire cette tâche. La fonction présente deux défauts indépendants :

- **Perte de données.** Avec la clé de service, elle supprime sur tous les comptes les lignes `is_purchased = true` dont `updated_at` a plus de vingt-quatre heures, donc des achats « à ranger » avant leur rangement. Le filtre porte sur la dernière modification, pas sur le moment du cochage. Elle supprime aussi l'historique `recipe_conversations` au-delà de cent entrées par compte.
- **Route ouverte.** `supabase/config.toml` déclare `verify_jwt = false` pour cette fonction, son code ne contrôle pas l'appelant et répond à toute origine (CORS `*`). Si elle est déployée, quiconque connaît l'URL du projet peut déclencher ces suppressions à tout moment, sans attendre la tâche nocturne.

Trois autres fonctions Edge font confiance à un identifiant de compte fourni par l'appelant et travaillent avec la clé de service :

- `recipe-assistant` lit `userId` dans le corps de la requête, lit le stock et les recettes de ce compte, appelle OpenAI et écrit pour lui. Elle insère en outre cette valeur sans échappement dans un filtre `.or(...)`.
- `panic-mode` vérifie seulement la présence d'un en-tête d'autorisation, puis lit et écrit pour le `userId` du corps.
- `indian-price-estimator` utilise la clé de service et peut écrire dans `recipe_price_estimates`.

La passerelle exige un JWT, mais la clé anonyme publique en est un. Si ces fonctions sont déployées, un tiers peut lire les données d'un autre compte et consommer le crédit OpenAI. Aucun appelant n'a été trouvé dans l'application.

Le contrôle de la tâche (`cron.job`, historique d'exécution) et du déploiement de ces fonctions passait avant toute autre étape V11, indépendamment de l'ordre des lots :

- retrait de la fonction de nettoyage et de sa tâche, sans remplacer la purge des conversations : [V11-05](PRP-V11-05-Stock-Et-Courses.md), étape E0 « Nettoyage nocturne neutralisé », section 4 (D13 et D14, validées) ;
- dépublication immédiate des fonctions exposées si elles sont déployées, réversible par redéploiement : [V11-06](PRP-V11-06-Consolidation-Design-Mesure.md), décision D9 (validée).

**Réalisé les 22 et 23 novembre 2026 sur le projet `jwoxacnflphclslpqfzs` (production).**

- Constat : la tâche `cleanup-shopping-list-daily` était active et avait réussi chaque nuit jusqu'au 22 novembre à 2 h UTC. Les quatre fonctions `cleanup-shopping-list`, `recipe-assistant`, `ai-assistant-enhanced` et `indian-price-estimator` étaient déployées ; `panic-mode` ne l'était pas. Aucune réponse HTTP n'était plus conservée : le nombre d'achats effacés n'est pas connu.
- Les quatre fonctions sont supprimées ; plus aucune fonction Edge n'est déployée.
- La migration `20261122204021_remove_cleanup_shopping_list_cron.sql` a été exécutée seule, puis inscrite dans l'historique par `supabase migration repair`. `cron.job` ne contient plus que `process-deletion-requests`. Le code est fusionné dans `main` ([#130](https://github.com/faizal-nguyen/smart-pantry-pro/pull/130)).
- L'historique distant compte onze migrations : huit jusqu'à `20261106154633`, puis `20261122140000`, `20261122150000` et `20261122204021`, chacune exécutée seule puis inscrite par `supabase migration repair`. `supabase db push` tenterait de rejouer toutes les autres : chaque migration se passe seule tant que l'historique n'est pas rapproché.

### Défauts du code relevés en relecture, corrigés hors série

Ils existaient indépendamment de V11. Leur correction a été sortie des lots (section 4.1) et fusionnée le 23 novembre 2026 ; chaque migration a été appliquée en production avant la fusion du code qui en dépend.

- **Faux succès de confirmation de l'assistant.** `claimPlanned` passait l'action à `executed` avant d'appeler son gestionnaire (`ActionLogWriter.ts`). Corrigé par [#133](https://github.com/faizal-nguyen/smart-pantry-pro/pull/133) : état `executing` (migration `20261122150000`) ; une action restée en cours plus de deux minutes est rapprochée du reçu `stock_commands`, exécutée s'il existe, « à vérifier » sinon ; l'annulation est refusée tant qu'elle est en cours. Le reste de [V11-04](PRP-V11-04-Assistant-Chef.md) E2 demeure.
- **Intention perdue sur 429.** Le client des commandes effaçait l'intention en attente sur une réponse 429. Corrigé par [#131](https://github.com/faizal-nguyen/smart-pantry-pro/pull/131) pour les commandes de stock, la cuisson et la mise au rebut ; l'import de recettes garde sa règle actuelle. Extrait de [V11-01](PRP-V11-01-Boucle-Menus-Courses.md) E1.
- **Suppression de compte déclarée terminée trop tôt.** La demande pouvait être marquée terminée alors que l'effacement des fichiers avait échoué (`settings.privacy.routes.ts`). Corrigé par [#132](https://github.com/faizal-nguyen/smart-pantry-pro/pull/132) : la demande reste `processing` tant que des fichiers de l'utilisateur restent dans le stockage (migration `20261122140000`), et l'écran Confidentialité affiche son état et propose de réessayer. Limites : l'effacement des photos n'est relancé que par l'utilisateur, et les demandes déjà marquées terminées n'ont pas été rouvertes. Le reste de [V11-02](PRP-V11-02-Retention-Foyer-Hors-Ligne.md) E5 demeure.
- **`recipe_conversations` dans la suppression de compte.** Vérifié : `private.delete_user_rows` efface toutes les tables publiques qui ont une colonne `user_id`, dont celle-ci. Le sort de la table elle-même relève de V11-06 E8 (V11-06 D9, V11-05 D14).

## 1. Documents, ordre et estimations

La relecture a fait apparaître deux préalables communs, qui changent l'ordre de fait :

- **P0, immédiat.** V11-05 E0 (1 à 2 jours) et le contrôle des fonctions Edge de la section 0. C'est la condition d'ouverture de V11-01 E5, V11-02 E0 et V11-06 E0.
- **P1, contrat des écritures de la liste.** V11-05 E1 et E2 (section 7) se livrent avant V11-01 E1 (`menu_add_missing`), V11-02 E3 (raccordement de la liste) et V11-04 E5 (raccord de l'outil d'ajout). V11-05 commence donc avant V11-01.

Ordre de réalisation proposé, étape par étape :

| Rang | Étapes | Contenu | Condition d'ouverture | Durée |
| --- | --- | --- | --- | --- |
| 1 | V11-05 E0 et V11-06 D9 | Constat distant ; retrait de `cleanup-shopping-list` et de sa tâche ; dépublication des fonctions exposées | Aucune | Réalisé le 22 novembre 2026 |
| 2 | Correctifs avancés | Faux succès de confirmation (extrait de V11-04 E2), intention perdue sur 429 (extrait de V11-01 E1), suppression de compte terminée trop tôt (extrait de V11-02 E5) | Aucune ; validés le 22 novembre 2026 | Réalisé le 23 novembre 2026 (#131 à #133) |
| 3 | V11-05 E1 et E2 | Référence, puis commandes de la liste, primitive d'agrégation, journal annulable, raccordement du hook et de l'assistant | Rang 1 | Réalisé le 23 novembre 2026 ([E1](../../docs/implementations/V11-05-E1.md), [E2](../../docs/implementations/V11-05-E2.md)) |
| 4 | [V11-01](PRP-V11-01-Boucle-Menus-Courses.md) E0 à E5 | Calcul des courses du menu, récapitulatif, menu modifiable, semaine proposée, ticket et prix | Rang 3 ; E5 après le rang 1 | 6 à 8 semaines ; E0 réalisée le 23 novembre 2026 ([référence](../../docs/implementations/V11-01-E0.md)) ; E1a réalisée le 24 novembre 2026 ([compte rendu](../../docs/implementations/V11-01-E1.md)) ; E1b réalisée le 24 novembre 2026 ([compte rendu](../../docs/implementations/V11-01-E1b.md)) ; E2 réalisée le 24 novembre 2026 ([compte rendu](../../docs/implementations/V11-01-E2.md)) |
| 5 | [V11-06](PRP-V11-06-Consolidation-Design-Mesure.md) E0 à E6 | Chiffres faux retirés, analyses, une seule pile d'interface, retraits R1 à R10, accueil, paramètres | Rang 1 | 11 à 15 jours |
| 6 | Jalon D15 | Révocation des écritures directes de `authenticated` sur `shopping_list` | Tous les écrivains migrés (hook, assistant, `menu_add_missing`, `recipe_add_missing`, route historique retirée par R9) et un cycle de publication depuis le rang 3 | Une migration |
| 7 | V11-06 E8 | Suppression des tables orphelines, `recipe_conversations` en premier si `recipe-assistant` est retirée | Inventaire E0, sauvegarde restaurée à l'essai, liste validée table par table | 2 à 3 jours |
| 8 | [V11-05](PRP-V11-05-Stock-Et-Courses.md) E3 à E8 | Emplacements, ouverture et repère, ergonomie du stock, rayons et prix, suggestions, inventaire complet | Rang 3 | Reste de V11-05 (5 à 6 semaines au total) |
| 9 | [V11-03](PRP-V11-03-Recettes-Recherche-Cuisson.md) E0 à E6 | Lecture serveur paginée, tri, facettes, recherche, badge, favoris et collections, cuisson | Moteur V10-03 | 4 à 5 semaines |
| 10 | [V11-04](PRP-V11-04-Assistant-Chef.md) E0 à E7 | Admission, flux d'étapes, contexte de page, rendu, planification, brief du jour | E5 après le rang 4 ; E6 après V11-02 E2 | 4 à 5 semaines |
| 11 | [V11-02](PRP-V11-02-Retention-Foyer-Hors-Ligne.md) E1 à E8 | Rappels, raccordement de la liste, hors ligne, foyer F1 à F3, introduction | E3 après le rang 3 ; E5 après le rang 6 ; E6 après V11-05 E3 ; E7 après le rang 4 | 7,5 à 10 semaines |

Les rappels de V11-02 (E1 et E2) peuvent être avancés à tout moment après le rang 1 : ils ne dépendent d'aucun autre lot. V11-06 E7 (mesure) reste en dernier, après la décision D7 et la confirmation de la base légale. Les étapes de chaque PRP restent livrables indépendamment une fois leur condition d'ouverture remplie.

| PRP | Résultat attendu | Avant relecture | Après relecture |
| --- | --- | --- | --- |
| V11-01 | Courses de la semaine calculées depuis le menu, menu modifiable, semaine proposée, ticket jusqu'au rangement | 4 à 5 semaines | 6 à 8 semaines |
| V11-02 | Alertes de péremption envoyées, liste lisible et cochable sans réseau, foyer partagé | 5 à 7 semaines | 7,5 à 10 semaines |
| V11-03 | Tri, facettes, recherche élargie, badge de stock, écran allumé et fin de minuteur | 3 à 4 semaines | 4 à 5 semaines |
| V11-04 | Admission des requêtes, flux d'étapes, contexte de page, planification, brief du jour, plafond de dépense | 3 à 4 semaines | 4 à 5 semaines |
| V11-05 | Nettoyage neutralisé, contrat de la liste, repères, réglages, rayons, suggestions, inventaire | 3 à 4 semaines | 5 à 6 semaines |
| V11-06 | Analyses limitées au mesuré, une seule pile d'interface, retraits réversibles, accueil hiérarchisé | 8 à 12 jours | 11 à 15 jours |

Pour une personne à temps plein, le total passe d'environ vingt à vingt-six semaines à environ vingt-neuf à trente-sept, auxquelles s'ajoutent V11-06 E8 et les correctifs avancés. La hausse vient surtout de trois ajouts que la première rédaction sous-estimait : des commandes SQL versionnées et contrôlées en base au lieu d'écritures directes, des migrations de reprise des données existantes, des tests de concurrence et d'appel direct. Chaque estimation est à recalibrer après l'E0 du lot.

## 2. Synthèse de l'audit

| Domaine | Constat principal | Lot |
| --- | --- | --- |
| Fonctions Edge | Nettoyage destructif sans authentification ; trois fonctions qui se fient à l'identifiant fourni par l'appelant | V11-05 E0, V11-06 D9 |
| Écritures de la liste | Insertion, cochage et suppression directs, sans version ; la RPC des commandes est appelable directement, sans passer par la validation de l'API | V11-05 E2 |
| Menus | Planifier un repas ne crée aucune ligne de courses ; aucune interface ne propose une semaine ; un repas cuisiné n'est pas relié à sa consommation | V11-01 |
| Ticket de caisse | Routes API présentes, sans écran, sans persistance, hors commandes V10 ; valeurs inventées pour les champs illisibles | V11-01 |
| Rappels | Réglages et gestionnaire push présents ; aucun abonnement, aucun envoi | V11-02 |
| Foyer | Tables d'août 2025 sans code ; tout est strictement par compte | V11-02 |
| Hors ligne | Seule la coque est en cache ; cocher un article n'est pas une commande idempotente | V11-02 |
| Recettes | Recherche sur le titre, aucun tri, facettes inutilisées, pas d'état de stock sur les cartes, doublons entre catalogue et recettes enregistrées | V11-03 |
| Cuisson | Pas d'écran maintenu allumé, pas de signal de fin de minuteur | V11-03 |
| Assistant | La route diffusée existe sans appelant et n'émet que le texte final d'un bloc ; aucun contexte de page ; aucun cumul de dépense par utilisateur ; confirmation marquée exécutée trop tôt | V11-04 |
| Stock | Dates saisies à la main, seuil codé en dur et sans appelant, pas de tri | V11-05 |
| Liste de courses | Rayon et prix saisis mais inutilisés, ajout manuel sans agrégation | V11-05 |
| Analyses | « Économies » toujours nulles, pourcentages et montants codés en dur dans les graphiques, lots épuisés comptés | V11-06 |
| Interface | Deux piles de notifications, couche Material You résiduelle, code sans appelant | V11-06 |
| Mesure | Aucune analytique produit ; un réglage de consentement existe sans effet | V11-06 |

## 3. Points de couture entre lots

- **Écritures de la liste.** V11-05 E2 (section 7) définit les commandes de la liste (`shopping_add`, `shopping_check`, `shopping_update`…), une primitive d'agrégation à deux modes (`increment`, `complete_to`) et le journal `shopping_movements`, annulable par `undo_stock`. V11-01 utilise `increment` pour `menu_add_missing` : l'aperçu a déjà déduit ce que la liste contient, et `complete_to` compterait deux fois une ligne partagée par deux besoins ([V11-01 E1](../../docs/implementations/V11-01-E1.md), section 3). Il utilise ensuite `shopping_check` et `shopping_update` pour le rapprochement du ticket. V11-02 étend ce contrat au foyer sans créer de commande. V11-04 raccorde son outil d'ajout à `shopping_add` et remplace son inverse par `undo_stock`. Les écritures directes de `authenticated` sur `shopping_list` sont révoquées après un cycle de publication (V11-05 D15), au plus tard avant le foyer F1.
- **Contrôles en base.** `execute_stock_command` est appelable directement par `authenticated` : la validation zod de l'API ne suffit pas. Chaque nouvelle commande vérifie dans sa transaction SQL la propriété et les références de même propriétaire, ou de même foyer à partir de V11-02 (V11-05, section 6).
- **Prix.** Il y a trois sources distinctes. Les prix payés et datés (`purchase_prices`) viennent des tickets (V11-01 E5). Le prix estimé d'une ligne (`estimated_line_price`, V11-05 E6) ne sert qu'au total estimé de la liste. Les anciens `estimated_price` ne sont plus additionnés. Après V11-06 E1a, les analyses ne lisent plus aucun prix estimé ; une dépense réelle ne s'y affiche qu'à partir des prix payés. Le coût par portion de V11-03 reste un affichage futur, à fonder sur les prix payés.
- **Semaine proposée.** V11-01 section 6 définit une proposition sans état (`proposal_id`, `expires_at`, versions lues) et un aperçu des courses pour une proposition non enregistrée. V11-04 E5 l'applique par `apply_week_plan` et `add_week_missing`, deux outils `medium` soumis à confirmation, qui passent par `update_menu`. Les courses ne s'ajoutent qu'une fois la semaine enregistrée.
- **Repas cuisiné.** `consume_recipe` reçoit `meal_plan_entry_id` et `entry_version`, depuis la carte comme depuis la fiche (V11-01 E1). Il y a au plus une consommation active par repas.
- **Canal de rappel.** Il est défini par V11-02 E1 et E2. La charge utile ne contient aucune donnée de profil et le push aucune idée de recette. Le brief du jour de V11-04 E6 a besoin d'un déclenchement quotidien même sans lot à échéance.
- **Plafond de dépense.** V11-04 E2 introduit une réservation atomique au jour et au mois. La lecture de ticket de V11-01 E5 y réserve son coût avant l'appel au modèle.
- **Foyer.** V11-02 reprend par palier les objets des autres lots : contributions du menu et scans de ticket (F1) ; emplacements de V11-05, lecture du stock par le moteur et caches (F2) ; menus et gestionnaires de l'assistant (F3).
- **Fonctions Edge et tables.** Le nettoyage est retiré par V11-05 E0, les fonctions exposées sont dépubliées par V11-06 D9. Les tables orphelines sont inventoriées par V11-06 E0, déclencheurs et cascades compris, puis supprimées par V11-06 E8 après sauvegarde vérifiée et liste validée table par table (V11-05 D12).
- **Suppressions de code.** `smartMealPlannerService.ts` est retiré par V11-01 E4 ; `streamingAIService.ts`, `nutritionalAIService.ts` et le flux `/api/assistant/stream` par V11-04. Le reste revient à V11-06, lots R1 à R10, dont `AssistantProvider` et les anciennes routes de favoris.
- **Client des commandes.** Sur une réponse 429, le client garde l'intention en attente depuis [#131](https://github.com/faizal-nguyen/smart-pantry-pro/pull/131). La règle est centralisée dans `isRolledBackRefusal` ([stockCommandRefusal.ts](../../src/services/stockCommandRefusal.ts)) ; chaque nouveau flux de commande la réutilise.
- **Estimateur de péremption.** `estimateExpiryDate` (service de ticket) contient des durées codées en dur. V11-01 ne le reprend pas ; V11-05 E4 le remplace par un repère sourcé, jamais écrit comme date.

## 4. Décisions à rendre en priorité

Chaque PRP contient son tableau complet de décisions proposées, avec l'alternative écartée.

### 4.1 Validées par l'utilisateur le 22 novembre 2026

| Décision | Retenu | PRP |
| --- | --- | --- |
| Nettoyage nocturne | Retrait pur de la fonction et de sa tâche ; purge des conversations non remplacée | V11-05, D13 et D14 |
| Fonctions Edge exposées | Dépublication immédiate si elles sont déployées | V11-06, D9 |
| Tables orphelines | Suppression par V11-06 E8, après l'inventaire de V11-06 E0, une sauvegarde vérifiée et une liste validée table par table | V11-05 D12, V11-06 D8 |
| Écritures directes sur la liste | Révoquées une fois tous les écrivains passés par les commandes, après un cycle de publication | V11-05, D15 |
| Départ d'un membre du foyer | Ses lignes partagées sont réattribuées au propriétaire du foyer | V11-02 |
| Correctifs avancés | Sortis de leur lot et livrés hors série (#131 à #133, section 0) | V11-01, V11-02, V11-04 |
| Cible d'une fusion (23 novembre 2026) | La ligne non cochée la plus ancienne dans une unité convertible ; jamais une ligne cochée | V11-05, D16 |
| Décisions de V11-01 (23 novembre 2026) | D1 à D14 validées ; choix explicites : D3 repas du jour à la fin de semaine, D8 Menus sous Recettes, D10 texte du ticket seul, D14 reliquat à acheter | V11-01 |

### 4.2 À rendre en priorité

Celles-ci conditionnent plusieurs lots ou une donnée existante :

| Décision | Proposition | Alternative | PRP |
| --- | --- | --- | --- |
| Modèle du foyer | Nouvelles tables, `household_id` nullable, un foyer par compte | Réutiliser les tables d'août 2025 | V11-02 |
| Conflit sur une coche | Version attendue ; état déjà atteint, confirmé sans écriture ; sinon à vérifier | Dernier état écrit | V11-02 |
| Suppression du compte d'un membre | Lignes et copies réattribuées comme pour un départ, foyer conservé, fin seulement après effacement des fichiers | Effacer ses lignes partagées, ce qui viderait la liste des autres | V11-02 |
| Flux `/onboarding` | Le retirer après import des réponses, garder la carte « Prendre tes repères » | Le relier au profil | V11-02 |
| Repère de conservation | Calculé à la lecture, jamais écrit comme date | Préremplir la date de péremption | V11-05, D1 |
| Prix d'une ligne | Nouvelle colonne `estimated_line_price` ; anciens prix non additionnés | Convertir les anciennes valeurs | V11-05, D9 |
| Périmètre de la bibliothèque | Lecture serveur sur le périmètre accessible sous RLS, recettes publiques comprises | Candidats du moteur, plafonnés | V11-03, D1 |
| Favoris | Une seule source ; favoris dus à la règle « note ≥ 4 » convertis après confirmation | Retrait simple de la règle | V11-03, D5 |
| Badge de stock | « En stock, n à vérifier » dès qu'un essentiel est incertain | « Tout en stock » | V11-03, D12 |
| Diffusion de l'assistant | Étapes en direct, texte validé envoyé en un bloc | Diffusion du texte par fragments | V11-04, D12 |
| Plafond de dépense | Réservation atomique au jour et au mois, refus si le cumul est illisible ; valeurs fixées en E0 | Limites horaires seules | V11-04, D9 |
| Catalogue des modèles | Visible par chaque compte connecté, sans secrets | Réservé au propriétaire | V11-04, D10 |
| Mesure produit | Dériver la boucle des données métier ; toute collecte nouvelle soumise à un consentement vérifié côté serveur | Outil d'analytique dédié | V11-06, D7 |
| Traduction | Différée | Couche de traduction maintenant | V11-06, D6 |

Une décision proposée devient définitive lorsqu'elle est validée dans le lot concerné. La rédaction de ce dossier ne vaut validation d'aucune réalisation.

## 5. Limites de ce dossier

- Les constats portent sur l'arbre de travail local. Sur l'environnement distant, seuls les tâches planifiées, les fonctions déployées, l'historique des migrations et les objets modifiés par chaque migration appliquée ont été consultés (section 0) ; le reste du schéma ne l'a pas été.
- La relecture Codex était statique, sur la même copie locale. Ses preuves ont été revérifiées dans le code ; les affirmations sur des services externes (Supabase Realtime, Vercel, iOS, consentement) sont sourcées dans les PRP ou marquées « à confirmer ».
- Aucun test, build ni parcours n'a été exécuté pour la rédaction des PRP. Les correctifs de la section 0 ont été vérifiés par build, types, lint et tests avant fusion.
- Des modifications locales non commitées touchent l'assistant et le moteur de recommandation ; V11-03 et V11-04 demandent de revalider leur point de départ en E0.
- Les contraintes de navigateur (push web sur iPhone, maintien de l'écran allumé) restent à confirmer sur l'appareil.
