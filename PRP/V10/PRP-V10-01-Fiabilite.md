# PRP V10 01 Fiabilité des données et des actions

> Statut : implémentation locale réalisée ; homologation Supabase et Safari/iPhone ouverte.
> Compte rendu : [réalisation, preuves et critères ouverts](../../docs/implementations/V10-01.md).
> Date : 2026-10-08.
> Priorité : P0 pour l’intégrité du stock, P1 pour les parcours cassés.
> Dépendances : schéma actif du code couvert par des tests PostgreSQL locaux ; schéma distant de la bonne application à confirmer avant déploiement.
> Estimation : 1 à 2 semaines, à réviser après l’analyse des migrations.
> Index : [feuille de route V10](README.md).
> Source : [audit du 8 octobre](../../docs/AUDIT-PRODUIT-MOBILE-IOS-2026-10-08.md).

## 0. Décisions de réalisation

| Sujet | Décision V10 |
| --- | --- |
| Résultat d’une mutation | Réussite après confirmation d’écriture ; échec et synchronisation en attente ont leurs propres états |
| Transfert et cuisine | Commandes serveur atomiques, protégées contre doublons et concurrence |
| Unités | Conversions par dimension ; grammes, millilitres et pièces comme bases internes lorsque les informations sont suffisantes |
| Recettes | Résolution commune des origines historiques, en conservant les personnalisations de bibliothèque |
| Autorisation | Propriétaire dérivé de la session validée ; identifiant utilisateur du payload non autoritaire |
| Annulation | Mouvement inverse d’une opération identifiée, avec contrôle de l’état courant |
| Effet des boutons | Même commande métier que l’assistant, avec identifiant de recette explicite |
| Feedback | Un hôte de notifications commun, complété par les erreurs inline nécessaires à la récupération |
| Surface mobile | Réparer immédiatement les actions masquées, contraste et unités ; refonte des parcours dans V10-02 |

Les types et noms de tables cibles de cette PRP sont à intégrer au modèle existant après inspection. Leur présence dans ce document ne signifie pas qu’ils existent déjà.

## 1. Problème et résultat attendu

Un utilisateur doit pouvoir cocher une course, la ranger dans son stock, sauvegarder une recette, la cuisiner et retrouver des quantités justes après actualisation. Aujourd’hui, certains chemins ignorent des erreurs de base, déduisent les nombres sans leur unité ou déclarent une création sans persistance.

La sortie de ce lot est une boucle métier fiable. En cas de coupure, refus d’écriture ou double pression, l’utilisateur conserve ses données et peut reprendre l’action. Cette garantie est la fondation de la routine mobile et du futur client iOS.

### État de départ à revalider

| Constat | Origine active | Conséquence |
| --- | --- | --- |
| B01 | `useShoppingList.addAllToInventory` | Suppression possible des courses après insertion de stock refusée |
| B02 | `RecipeDetail.handleCook` | Unités différentes mal soustraites ; erreurs de mise à jour ignorées |
| B03 | `AddRecipeDialog` et callback dans `Recipes` | Formulaire fermé sans sauvegarde |
| B04 | `useUserRecipes.addFromCatalog` | Retour fictif sans lien de bibliothèque persisté |
| B05 | `SmartShoppingList` | Booléen de cochage manquant |
| B06 | `AppNavigation` et `useFamilyMode` | Paramètres interdits au profil adulte par défaut |
| B07 | Arbre actif de `App` | Hôtes Toaster et Sonner absents |
| B08 | File vidéo locale `SocialVideoImportQueue` | Build standard échoue avant le frontend |
| D01 et D02 | Résolveurs et analyse de disponibilité | Origines de recette, quantités et unités interprétées différemment |
| D09 à D11 | Invalidations et boutons des panneaux | États périmés, caches non isolés, résultats de commande divergents |

Les reproductions étaient locales et fictives. La file vidéo et son test étaient non versionnés ; préserver les changements préexistants et documenter le commit effectivement corrigé.

Un contrôle préparatoire a aussi identifié `expiration_date`/`is_checked` dans des repositories API historiques, tandis que les hooks actifs utilisent `expiry_date`/`is_purchased`. Leur simple existence ne prouve pas leur compatibilité avec le parcours actuel.

## 2. Périmètre

### Inclus

- Build partagé, API et frontend ; corrections ciblées des types vidéo concernés.
- Persistance réelle de recette manuelle et de lien catalogue, avec reprise du brouillon.
- Cochage explicite des courses et récupération sur refus d’écriture.
- Quantités, unités, disponibilité et références de recette communes.
- Transfert courses → inventaire, consommation de repas et annulation contrôlée.
- Autorisation de ces opérations, idempotence et tests de concurrence.
- Invalidation commune de stock, courses, badges, analyse et recommandations.
- Isolation des caches et fichiers de travail par compte.
- Accès adulte aux paramètres et feedback visible.
- Correctifs mobile urgents U01 à U03 et affichage des unités.

### Hors de ce lot

Accueil et navigation cible, mode cuisine complet, profil nutritionnel, classement santé, application native et planification de notifications relèvent des PRPs suivantes. Les imports vidéo avancés continuent dans PRP-240 ; ce lot traite leur obstruction du build.

## 3. Scénarios prioritaires

| Scénario | Résultat attendu |
| --- | --- |
| Cocher puis décocher une course | La case, le compteur et l’état persisté correspondent après actualisation |
| Ranger six articles avec une écriture refusée | Le transfert ne supprime aucun article sans stock confirmé ; la sélection reste récupérable |
| Relancer le même transfert après réponse perdue | Le résultat de la commande initiale est retourné, sans seconde insertion |
| Consommer 200 g d’un lot de 1 kg | Il reste 0,8 kg, ou 800 g dans la représentation normalisée |
| Préparer quatre portions d’une recette prévue pour deux | Les quantités requises sont multipliées par deux une seule fois |
| Une quantité est donnée en pièce et l’autre en grammes | Une conversion explicite est requise ; aucune soustraction arbitraire |
| Deux appareils consomment le dernier stock | Une opération est confirmée ; l’autre reçoit un résultat récupérable, sans quantité négative |
| Sauvegarder une recette puis se reconnecter | La recette complète et ses ingrédients sont retrouvés |
| Ajouter deux fois le même catalogue | Un lien de bibliothèque unique est conservé |
| Utilisateur A soumet un identifiant appartenant à B | Aucune lecture privée, écriture, journal ou invalidation de B n’est produit |
| Annuler un repas après une correction de stock | L’inverse est calculé sur l’état courant ou un conflit expliqué ; la correction n’est pas écrasée |

## 4. Contrats métier et cohérence du schéma

### Référentiel de réalisation

Avant une migration, produire une matrice des colonnes réelles, types partagés, services, RPC et consommateurs. Le hook actif et ses requêtes servent à localiser le parcours ; le schéma de l’environnement de test confirme ce qui peut être écrit. Régénérer les types depuis ce schéma lorsque nécessaire.

Étendre les services existants quand ils sont compatibles. Corriger ou adapter les repositories divergents avant de les raccorder. `transfer_inventory` décrit un transfert entre lots : il ne remplace pas le rangement d’articles de courses.

### Référence de recette

Le contrat transporte l’origine de stockage et l’identifiant demandé, avec identifiants canonique et de bibliothèque distincts lorsque nécessaire. La résolution reprend `src/lib/recipeSource.ts` ; les portions, ingrédients et personnalisations sont accessibles au service métier serveur.

Les origines `recipes`, `user_recipes` avec ou sans catalogue et `recipes_catalog` disposent de cas de test. Une recette de bibliothèque personnalisée ne devient pas sa recette catalogue de base lors de la consommation.

### Quantités et disponibilité

| Information | Règle |
| --- | --- |
| Unité de lot | Lire l’unité réellement portée par le modèle ; mapper notamment `product.unit_type` dans le contrat |
| Dimension | Masse, volume ou comptage ; incompatibilité distincte d’une quantité insuffisante |
| Conversion | kg ↔ g, L ↔ ml et pièces identiques ; contenants et cuillères demandent un facteur connu |
| Portions | Utiliser la quantité de base de recette et le ratio de portions choisi |
| Précision | Exacte, estimée ou inconnue ; estimation identifiée dans le résultat |
| Produit absent | Ingredient manquant, avec quantité requise |
| Produit reconnu | Vérifier aussi quantité et unité ; un match sémantique ne garantit pas la disponibilité |
| Arithmétique | Quantités décimales contrôlées, règles d’arrondi communes ; pas de clamp à zéro pour masquer un déficit |

Le moteur, la fiche et la commande consomment le même calcul. Les règles enrichies sur DLC/DDM et nutrition sont livrées par V10-03 ; ce lot ne présente pas les lots non vérifiés comme une certitude alimentaire.

### Contrat de commande

| Champ conceptuel | Usage |
| --- | --- |
| `command_id` | UUID stable généré lors de l’intention, réutilisé après interruption |
| `command_type` | Transfert, consommation, correction ou annulation |
| `payload_version` | Version de validation du contrat |
| `payload` | Référence de recette, portions, lots ou articles sélectionnés, unités et ajustements |
| Versions attendues | Détection d’une modification depuis l’aperçu, lorsque nécessaire |
| Propriétaire | Dérivé côté serveur ; ne dépend pas du compte déclaré dans le payload |
| Résultat | Identité de l’opération, quantités confirmées, tables et références affectées |
| Échec | Code métier stable et action possible : corriger, réessayer ou relire l’état |

Les noms d’opérations sont des contrats cibles, pas des endpoints déjà livrés. Les routes finales doivent s’intégrer à l’API versionnée existante et être couvertes par les tests API et client.

## 5. Transaction, concurrence et autorisation

### Exécution d’une commande

1. Valider la session, le payload et sa version.
2. Chercher l’identité de commande dans l’espace du compte ; un résultat déjà confirmé est retourné sans répéter l’effet.
3. Ouvrir une transaction de base, contrôler la propriété de toutes les lignes et verrouiller les lots ou articles dans un ordre stable.
4. Valider les versions, unités et quantités sur l’état verrouillé.
5. Appliquer le mouvement et ses effets de stock, courses et journal concernés.
6. Enregistrer la commande confirmée et son résultat dans la même transaction, puis confirmer au client.

Une suite d’appels Supabase successifs ou `Promise.all` ne constitue pas cette transaction. Un refus d’une étape annule les effets du groupe.

L’identité de commande est unique par compte et type, avec comparaison du payload normalisé. La même clé avec un autre payload est refusée. Un article déjà transféré ne peut pas être transféré une deuxième fois avec une nouvelle clé concurrente.

### Sécurisation des fonctions existantes

La migration locale `20251004000001_add_transaction_functions.sql` définit `consume_inventory_item` en `SECURITY DEFINER`, avec un `p_user_id` fourni et sans contrôle d’égalité avec l’utilisateur courant dans le corps lu. Ce constat porte sur le fichier, pas sur la fonction actuellement déployée.

Avant réutilisation, vérifier définition réelle, grants et appelants ; dériver ou vérifier strictement l’identité, valider les montants dans la base et restreindre l’exécution. Privilégier les droits de l’appelant lorsque compatibles. Une fonction privilégiée nécessaire doit rester interne ou avoir une autorisation explicite qui résiste à un appel direct.

Les nouvelles tables exposées sont protégées par RLS et des grants adaptés. Tester les permissions de lecture et d’écriture, y compris les lignes retournées. L’accès au journal et aux mouvements doit rester limité au compte concerné. [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

### Mouvements et annulation

Le modèle cible trace une commande et ses mouvements : type, lot, delta dans l’unité de référence, origine et date. Les tables `stock_commands` et `stock_movements` sont des noms proposés, à ajuster au schéma inspecté. Les droits nécessaires au journal de cuisine font partie de la migration de commande.

Annuler référence l’opération initiale et produit un inverse unique. Ne pas restaurer une ancienne quantité absolue. Si un lot a changé de manière incompatible, expliquer le conflit et proposer une correction ; une seconde annulation du même mouvement ne répète pas l’effet.

Les migrations sont créées et testées pendant la réalisation, avec inventaire des politiques, indexes et effets sur l’historique. Ce document ne crée aucune migration.

## 6. Intégration dans les surfaces existantes

| Surface | Points de départ existants | Changement |
| --- | --- | --- |
| Contrats | `packages/shared/src`, `src/lib/recipeSource.ts` | Références, unités, entrées et résultats de commande partagés |
| Stock | `useInventory`, `InventoryService`, `InventoryRepository` | Mapping du schéma actif ; adapter les mutations et conserver le rollback optimiste |
| Courses | `useShoppingList`, `SmartShoppingList`, services shopping | Booléen explicite ; transfert contrôlé depuis une sélection persistée |
| Recettes | `AddRecipeDialog`, `useRecipes`, `useUserRecipes`, `Recipes` | Création complète et lien catalogue persistés ; unicité et brouillon |
| Cuisine | `RecipeDetail`, `useRecipeInventoryAnalysis` | Aperçu cohérent puis commande de consommation et annulation |
| Assistant et panneaux | `recipeActions`, handlers de l’assistant, `agentEvents` | Boutons connus reliés à la commande ; effet confirmé identique |
| Recommandations | `RecommendationEngine`, `CookabilityScorer`, `RecommendationEventWriter` | Origines unifiées, disponibilité partagée et invalidation après écriture |
| Shell | `App`, `AuthSessionContext`, `AppNavigation`, `useNavCounts` | Feedback, accès settings, caches par compte et événements de mutation |
| Styles | `tailwind.config.ts`, `index.css`, barres de recettes et courses | Limites mobile cohérentes, offsets réels, contraste et unités |

Les futurs modules de commande doivent être placés dans les services API et types partagés existants. Leur logique doit être indépendante des composants DOM afin d’être réutilisée depuis iOS.

### Sauvegarde des recettes

La création manuelle enregistre recette et ingrédients comme une opération cohérente. Les helpers de sauvegarde d’import existants sont réutilisés si leur contrat est compatible ; éviter de créer un second pipeline qui diverge sur les unités ou la politique recette.

Le catalogue crée un lien unique entre utilisateur et recette, puis relit son état. L’app ne valide pas un identifiant temporaire comme une création persistée. La saisie est conservée en cas d’erreur et le formulaire ne se ferme qu’après confirmation.

### Caches et rafraîchissement

Les clés de données privées incluent le compte et les paramètres qui influencent réellement la réponse : recette, portions, objectif, temps et version du contexte. Un événement confirmé déclenche les invalidations nécessaires des deux côtés de l’API.

Une modification manuelle et une action assistant suivent les mêmes règles. Le client relit stock, courses, badges et analyse ; le serveur retire ou renouvelle le cache de recommandations concerné. Le changement de compte purge les données et l’état de conversation du compte précédent.

Auditer le cache Supabase du service worker avant de l’étendre. Les réponses privées ne restent pas accessibles sous une clé partagée entre comptes. Une mutation hors ligne ne peut pas être annoncée comme confirmée côté serveur : sa file durable est éprouvée dans V10-04 puis livrée dans V10-05.

## 7. États UX et erreurs

| État | Comportement |
| --- | --- |
| Prêt | Action disponible avec destination, quantité ou effet compréhensible |
| En cours | Action protégée contre double pression ; saisie conservée |
| Confirmé | Résumé des effets réellement enregistrés et possibilité d’annulation appropriée |
| Réponse perdue | Relire la commande par son identité avant de proposer une nouvelle intention |
| Donnée invalide | Message auprès du champ concerné, correction possible |
| Stock modifié | Relire l’aperçu, montrer ce qui a changé et demander une confirmation des ajustements |
| Écriture refusée | Aucun faux succès ; brouillon ou sélection conservé ; bouton Réessayer |
| Hors ligne | Lecture disponible lorsqu’elle est fiable ; écriture indiquée en attente uniquement si elle a été sauvegardée durablement |
| Session expirée | Reconnexion et reprise de l’intention sans changer de compte ni perdre le brouillon |

Le système de notifications commun est monté dans le shell. Les messages et actions Annuler sont accessibles au lecteur d’écran et ne sont pas recouverts par les barres mobiles. Un message de réussite ne remplace pas la présence de la donnée dans son écran.

## 8. Découpage en PRs

| PR | Travail | Dépendance | Preuve de sortie |
| --- | --- | --- | --- |
| PR1 Référence de build et feedback | Corriger les types vidéo, monter l’hôte de notifications et corriger l’accès settings | État du checkout inventorié | Build complet ; erreur visible ; accès adulte confirmé |
| PR2 Persistance des entrées | Cochage, recette complète, ajout catalogue, brouillons et unicité | PR1 | Actualisation et reconnexion retrouvent les données ; refus d’écriture récupérable |
| PR3 Modèles communs | Mapping de schéma, référence recette, unités, disponibilité ; audit des fonctions privilégiées | PR1 | Cas des origines et conversions couverts ; contrôles négatifs d’autorisation |
| PR4 Commandes atomiques | Transfert, repas, movements, journal et annulation, idempotence et concurrence | PR2 et PR3 | Aucun effet partiel ; relance identique sans doublon ; lot concurrent maîtrisé |
| PR5 Intégration et caches | Raccorder tous les boutons, assistant, invalidations et purge par compte | PR4 | Parcours cohérent sur toutes les surfaces sans actualisation forcée |
| PR6 Mobile et régression | Barre recette, FAB courses, contraste, unités ; boucle complète | PR5 | Scénarios réels Safari/iPhone et preuves de regression |

Les corrections de permissions nécessaires à une nouvelle commande sont intégrées avant son exposition. La résolution des défauts reproductibles est prioritaire sur le nettoyage général des nombreuses erreurs de lint historiques.

## 9. Stratégie de validation

### Tests ciblés

- Conversions exactes : kg/g, L/ml, pièces, décimales et arrondis ; refus d’unités inconnues ou incompatibles.
- Disponibilité par recette et portions, sur chaque origine de stockage et personnalisation.
- Création de recette complète : ingrédient refusé, réponse perdue, actualisation et duplication de catalogue.
- Transaction avec une écriture refusée : stock, liste, journal et résultat de commande restent cohérents.
- Concurrence sur le même lot et sur des sélections de courses qui se recouvrent.
- Commande rejouée, clé réutilisée avec payload différent et seconde annulation.
- Accès intercomptes via API, RPC directe et données retournées ; montants nuls ou négatifs refusés.
- Invalidations après mutation manuelle et assistant ; compte A puis B, en ligne et hors ligne.

### Vérification des parcours

Les données de test comprennent des lots de riz en kg et g, des liquides en L et ml, des produits comptés en pièces, deux dates de lots, deux utilisateurs, une recette personnelle, une recette catalogue et une personnalisation de bibliothèque.

Parcourir cocher → ranger → ouvrir la recette → confirmer les portions → terminer → relire le stock. Tester un échec à chaque transition critique, une relance et une annulation. Conserver les captures, résultats d’API et état final de base de l’environnement de test.

Les scripts actuels du dépôt comprennent `npm run build`, `npm test -- --runInBand` et `npm run test:api`. Les exécuter dans un environnement où les dépendances sont réellement disponibles, avec les suites ciblées adaptées aux nouvelles commandes. Le lint des fichiers modifiés doit passer ; l’état historique global est documenté séparément.

Safari et l’iPhone 17 Pro Max sont requis pour la validation matérielle. Chrome à 375/440 px constitue un contrôle complémentaire. Vérifier thèmes clair/sombre, clavier, retour arrière, texte agrandi, safe areas et lecture des boutons par VoiceOver.

## 10. Critères d’acceptation

La réalisation locale couvre les six étapes prévues. Le [compte rendu V10-01](../../docs/implementations/V10-01.md) distingue les preuves locales des validations déployées et matérielles encore requises pour chaque critère. Ces cases représentent l’homologation de sortie du lot, pas la seule présence du code ; elles restent ouvertes dans l’attente de ces preuves et du SHA de réalisation.

- [ ] AC01 Le build partagé, API et frontend passe sur le commit corrigé.
- [ ] AC02 Les paramètres sont accessibles au profil adulte et leurs erreurs sont visibles.
- [ ] AC03 Le cochage se persiste et reste cohérent après actualisation et reconnexion.
- [ ] AC04 Recette manuelle et ingrédients sont sauvés ensemble ; une erreur préserve le brouillon.
- [ ] AC05 L’ajout catalogue se persiste, reflète l’état réel et reste unique.
- [ ] AC06 Un transfert échoué ne perd ni article ni intention et ne laisse pas d’effet partiel.
- [ ] AC07 Le rejouage d’un transfert confirmé n’ajoute pas une seconde quantité.
- [ ] AC08 Consommer 200 g d’un lot de 1 kg laisse 800 g équivalents ; les portions sont prises en compte.
- [ ] AC09 Une unité incompatible et un déficit concurrent sont traités explicitement, sans stock négatif.
- [ ] AC10 Une consommation confirmée correspond à un mouvement et un journal cohérents ; une relance ne les duplique pas.
- [ ] AC11 L’annulation ne rétablit pas un snapshot périmé et ne peut pas être appliquée deux fois.
- [ ] AC12 Les origines de recette et personnalisations fonctionnent dans bibliothèque, fiche, menu et recommandations.
- [ ] AC13 Écritures manuelles et assistant rafraîchissent stock, courses, badges, analyses et recommandations.
- [ ] AC14 Les permissions API et RPC directes empêchent A de lire ou modifier les données privées de B.
- [ ] AC15 Un changement de compte ne réutilise ni cache privé ni file de travail du précédent.
- [ ] AC16 À 375 et 440 px, actions visibles, boutons non recouverts, unités présentes et ingrédients lisibles.
- [ ] AC17 La boucle entière et les cas d’échec sont testés sur l’environnement approprié, avec preuves distinguées des captures fictives de l’audit.

## 11. Déploiement progressif et risques

Livrer les changements de schéma compatibles avant de raccorder les nouvelles commandes. Vérifier la compatibilité avec les anciennes sessions web ; la suppression des chemins d’écriture remplacés se fait après validation de leurs appelants.

Un incident d’intégrité suspend les nouvelles commandes concernées et préserve mouvements, clés d’idempotence et résultats. Le retour de version du client ne doit pas réactiver un transfert ou une soustraction connus comme dangereux. Prévoir un mode explicite de lecture lorsque l’écriture ne peut plus être garantie.

| Risque | Mesure |
| --- | --- |
| Services historiques incompatibles | Matrice de colonnes et tests de schéma avant raccordement |
| Quantités anciennes sans unité fiable | Mapping vérifiable ou correction utilisateur, sans conversion devinée |
| Plusieurs origines de recette | Réutilisation du résolveur, références explicites, tests de personnalisations |
| RPC privilégiée insuffisamment protégée | Grants, identité, validation de quantité et tests négatifs avant exposition |
| Réponse perdue après commit | Résultat retrouvé par la même identité de commande |
| Ancien cache du service worker | Contrôle des versions et purge des données privées |
| Dépendances locales non téléchargées | Référence de validation dans un checkout utilisable, sans déclarer les commandes bloquées comme réussies |

## 12. Sortie du lot

V10-01 est terminé lorsque les critères AC01 à AC17 ont leurs preuves et que la boucle métier fonctionne sans correction manuelle de base. Reporter le commit, les suites exécutées, les scénarios matériels et les éventuels écarts dans le compte rendu de lot.

Les contrats validés alimentent [V10-02](PRP-V10-02-Routine-Mobile.md), [V10-03](PRP-V10-03-Personnalisation.md) et [V10-04](PRP-V10-04-Prototype-iOS.md). Aucun effet de stock parallèle n’est ajouté dans ces lots.
