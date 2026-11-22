# PRP V11-03 — Trouver, choisir et cuisiner une recette

> Statut : Brouillon — décisions proposées, non validées par l'utilisateur.
> Date : 2026-11-22.
> Priorité : P1 pour la recherche, les filtres, le tri et le badge de stock ; P1 pour l'écran allumé et la fin de minuteur en cuisine ; P2 pour collections, note, saison, partage et impression.
> Dépendances : références et commandes de [V10-01](../V10/PRP-V10-01-Fiabilite.md), session de cuisine de [V10-02](../V10/PRP-V10-02-Routine-Mobile.md), moteur et profil de [V10-03](../V10/PRP-V10-03-Personnalisation.md). Aucune étape E0 à E6 ne dépend d'un autre lot V11 : les affichages de restes et de coût par portion viendront de [V11-01](PRP-V11-01-Boucle-Menus-Courses.md) et ne sont pas spécifiés ici ; ni notification locale ni file hors ligne ne sont attendues de [V11-02](PRP-V11-02-Retention-Foyer-Hors-Ligne.md).
> Coordination : [V11-01](PRP-V11-01-Boucle-Menus-Courses.md) (menus, courses, restes, tickets), [V11-02](PRP-V11-02-Retention-Foyer-Hors-Ligne.md) (notifications, foyer, hors-ligne), [V11-04](PRP-V11-04-Assistant-Chef.md) (assistant), [V11-05](PRP-V11-05-Stock-Et-Courses.md) (stock et liste de courses), [V11-06](PRP-V11-06-Consolidation-Design-Mesure.md) (design, analytique, nettoyage) ; voix mains libres dans [V10-03E](../V10/PRP-V10-03E-Voix-Cuisine.md).
> Source : audit fonctionnel du 22 novembre 2026, constats revérifiés sur le disque le même jour (branche `main`, arbre de travail avec modifications locales non commitées).
> Relecture : Codex, 22 novembre 2026 ; constats vérifiés dans le code et intégrés.
> Estimation indicative : 4 à 5 semaines pour E0 à E6, hors E7 (3 à 4 avant relecture : périmètre de lecture, commandes SQL des écritures et reprise des données ajoutés). Hypothèses : une personne à temps plein, pas de nouveau fournisseur, un iPhone de test disponible pour E5. À recalibrer après E0 sur les seuils de complétude, de taille de réponse et de latence p95 mesurés.

## 1. Problème et résultat attendu

La bibliothèque affiche toutes les recettes dans un ordre fixe, se filtre par texte, cuisine et origine, et ne dit pas ce qui est faisable avec le stock. Le moteur de recommandation sait pourtant classer une recette en « faisable maintenant », « presque », « à vérifier » ou « exclue », mais l'interface n'en présente que trois par catégorie (valeur par défaut, plafond serveur de 20), sur un périmètre de candidats plus étroit que celui de la bibliothèque. En cuisine, l'écran s'éteint, un minuteur terminé ne se signale pas et les quantités ne sont pas visibles à côté de l'étape.

Résultat attendu, vérifiable par un parcours unique : depuis la bibliothèque, l'utilisateur tape « pates » ou « poulet », restreint à trente minutes et à un type de repas, trie par proximité avec son stock, lit sur chaque carte ce qui manque ou reste à vérifier, ouvre la recette et la cuisine sans toucher l'écran pour le rallumer, puis est prévenu quand un minuteur se termine. Les filtres survivent au retour arrière et au partage de l'adresse, et aucune recette visible aujourd'hui ne disparaît de la bibliothèque.

## 2. Périmètre et limites

Inclus :

- recherche sur titre, ingrédients et tags, insensible aux accents, avec délai de frappe ;
- facettes (temps, type de repas, difficulté, régime, famille de protéine), tri, puces actives et compteur ;
- badge de stock sur les cartes, évalué en lot côté serveur ;
- favoris cohérents, collections, note et notes libres après cuisson, avec reprise des données historiques ;
- saison dans le score ; contexte du repas sur la page Recettes ;
- mode cuisson : écran allumé, fin de minuteur signalée, ingrédients de l'étape, durées détectées ;
- partage lisible sans compte, impression ; onglets et restes de code de la page Recettes.

Exclus, cités comme frontières : menus → courses, génération de semaine, restes et scan de ticket (V11-01) ; notifications poussées, foyer et hors-ligne (V11-02) ; assistant, y compris ses entrées sur la fiche et en cuisson (V11-04) ; stock et liste de courses (V11-05) ; refonte visuelle, analyses, analytique et nettoyage général (V11-06).

Non-objectifs : redéfinir le prototype mains libres de V10-03E ; créer un second chemin de calcul de disponibilité à côté du moteur ; recherche sémantique sans corpus de requêtes ; publier un catalogue public de recettes ; modifier la confirmation de fin de cuisine et la commande `consume_recipe`.

## 3. État de départ et surfaces actives

Le point de départ est à revalider en E0 : `RecommendationEngine.ts`, `RecommendationModelContext.ts` et leur test ont des modifications locales non commitées (groupes de types de repas élargis, filtre de type de repas levé quand une requête texte est fournie). Cette PRP décrit l'état du disque, pas celui du dernier commit.

| Élément | État établi | Travail prévu |
| --- | --- | --- |
| [RoutineRecipeLibrary](../../src/components/recipes/RoutineRecipeLibrary.tsx) | Recherche, cuisine, Toutes / Mes recettes / Favoris ; état en URL avec `replace` ; aucun tri ni badge. Le lien « Cuisiner avec » filtre par identifiant de produit (lignes `recipe_ingredients`) **et** par nom (`ingredient_name`, ingrédients JSON). Le dédoublonnage catalogue est inopérant : il compare à des lignes `source: 'recipes_catalog'`, alors que la copie enregistrée porte `user_recipes` ; une recette du catalogue enregistrée apparaît deux fois | Barre de recherche à délai, feuille de filtres, tri, puces, badge, dédoublonnage serveur |
| [useRecipes](../../src/hooks/useRecipes.ts) | Charge sans borne `recipes` (les siennes **et** les publiques des autres comptes) et `user_recipes` ; alimente la bibliothèque. `RecipesContent` en monte une seconde instance qui recharge recettes et collections à l'ouverture | Remplacé pour la bibliothèque par une lecture serveur paginée ; seconde instance retirée |
| [useRoutineCatalog](../../src/hooks/useRoutineCatalog.ts) | `ilike` sur `title`, 20 par page, une requête par touche (annulée par `abortSignal`), sensible aux accents | Recherche serveur commune |
| [recipe-search](../../packages/shared/src/recipe-search.ts) | `recipeNameMatchScore` : titre seul ; mots normalisés par `ingredientNameTokens` (accents, ligatures, pluriels), mots de liaison retirés, une ou deux fautes tolérées au-delà de quatre lettres ; appliqué côté client, mais le catalogue est d'abord réduit par l'`ilike` serveur | Étendu aux ingrédients et tags ; même sémantique pour les trois origines |
| [useUserRecipes](../../src/hooks/useUserRecipes.ts) | **Actif** : fournit `personal_rating` au filtre Favoris et l'ajout depuis le catalogue (`add_catalog_recipe`). Ses `sortBy` et filtres de difficulté, [useRecipeCatalog](../../src/hooks/useRecipeCatalog.ts) et `useUserCollections` n'ont pas d'appelant actif | Ajout catalogue conservé ; le reste retiré ou raccordé après inventaire E0 |
| [RecommendationEngine](../../apps/api/src/services/recommendations/RecommendationEngine.ts) | Candidats : recettes **propres** de `recipes` (pas les publiques d'autres comptes), 1000 de `user_recipes`, 200 plus récentes du catalogue, filtrés après lecture. `libraryConstraintsForUser` lit ce même périmètre ; il est appelé par `/library-state` à chaque ouverture de la page. `loadProducts` lit tous les produits liés en un seul `.in()` | Évaluation de disponibilité en lot sur un périmètre corrigé, mêmes fonctions |
| [PersonalizationScoring](../../apps/api/src/services/recommendations/PersonalizationScoring.ts) | `evaluateAvailability` rend `available` même quand un essentiel est en stock dans une unité non convertible ou sans quantité mesurée : l'incertitude est portée par `uncertainties` (choix du 8 novembre, test « everyday lots » de `Personalization.test`). `NEAR_DATE` est une raison du classement des suggestions, pas de l'évaluation. Ni saison ni note dans le score | Projection de disponibilité partagée ; composante saison ; note comme signal de goût |
| [RecipeFacetExtractor](../../apps/api/src/services/recipes/RecipeFacetExtractor.ts) | Familles de protéine par règles ; `vegetarien` et `vegan` déduits de l'absence de famille carnée, y compris pour une liste vide. Stockées dans `recipes.recipe_facets` (index GIN) par [backfill-recipe-facets](../../scripts/backfill-recipe-facets.ts). Le moteur recalcule les familles à la volée et applique le régime par `evaluateConstraints`, pas par ces facettes | Règle des familles de protéine seulement |
| `recipes_catalog` | Temps à `0` et difficulté à `3` par défaut SQL ; `recipeDurationMinutes` accepte un total de 0 ; `search_vector` GIN sur titre, description et tags | Provenance des valeurs par défaut mesurée en E0 |
| [personalization](../../packages/shared/src/personalization.ts) | `MealContextSchema` porte déjà `timeLimitMinutes`, `mealType`, `course`, `cuisine`, `ingredient`, `proteinFamily`, `dietaryFlag` ; `query` bornée à 200 caractères | Schéma de filtres dérivé, pas dupliqué |
| [recipes.routes](../../apps/api/src/routes/recipes.routes.ts) | Montées sous `/api/v1/recipes`, sans appelant dans `src/` : `/search` (recherche texte de `RecipeRepository`), `/cookable` et `/suggestions` (heuristiques de stock de `RecipeService`), `/favorites` et `POST /:id/favorite` (bascule de `recipes.is_favorite`, troisième source de favoris) | Non réutilisées ; consommateurs externes vérifiés en E0 avant tout retrait |
| [useRecipeFavorites](../../src/hooks/useRecipeFavorites.ts) | Table `routine_recipe_favorites`, clé `(user_id, recipe_id)` sans la source ; insertion ou suppression directe par le client selon sa lecture en cache ; droits `INSERT` et `DELETE` accordés à `authenticated`. La bibliothèque y ajoute `personal_rating >= 4`, qu'aucun écran actuel n'écrit mais que des lignes historiques peuvent porter | Favori = une source, écrite par commande |
| [AfterCookingFeedback](../../src/components/recipes/AfterCookingFeedback.tsx) | « À refaire », « Trop long », « Je n'aime pas », pris en compte par le moteur ; pas de note ni de texte libre | Note et notes ajoutées au même endroit |
| [featureGates](../../src/lib/featureGates.ts) | `collections.unlimited` bloquée en gratuit : indicateur d'interface sans valeur de quota, qui renvoie au serveur un contrôle qui n'existe pas | Quota appliqué par le serveur |
| [MealContextPanel](../../src/components/recipes/MealContextPanel.tsx), [mealContext](../../src/lib/mealContext.ts) | Monté sur l'accueil seulement ; [PersonalizedRecipeSuggestions](../../src/components/recipes/PersonalizedRecipeSuggestions.tsx) reçoit `{ goal:'tonight' }` par défaut sur la page Recettes | Même contexte sur les deux pages |
| [food-guidance](../../packages/shared/src/food-guidance.ts) | Calendrier de saison par mois, France métropolitaine, source citée ; voir [guidance du 10 novembre](../../docs/FOOD-GUIDANCE-2026-11-10.md) | Réutilisé par le score |
| [CookingSessionPage](../../src/pages/kitchen/CookingSessionPage.tsx), [cookingSessions](../../src/services/cookingSessions.ts) | Session en stockage local par compte ; étapes en texte, ingrédients pour le repas entier ; minuteurs sur échéance absolue `ends_at`, rafraîchis chaque seconde, affichés seulement pendant `in_progress`, sans libellé ni acquittement dans le schéma | Écran allumé, signal de fin, ingrédients par étape, durées détectées |
| [RecipeDetail](../../src/pages/RecipeDetail.tsx) | Partage ou copie de l'URL `/kitchen/recipes/:id?source=…`, route authentifiée ; pas d'impression | Partage en texte, impression |
| [Recipes](../../src/pages/Recipes.tsx) | Trois onglets ; Découvrir et Importer sont deux boutons au-dessus de la liste d'onglets ; effet vide, `setActiveTab('feed')`, `RecipeOnboarding` jamais ouvert | Navigation et code alignés |

Infrastructure de recherche : `pg_trgm` et `unaccent` sont créées par [20260508120000](../../supabase/migrations/20260508120000_products_augmentation_assistant.sql) ; `vector` sert aux produits ([20260520120000](../../supabase/migrations/20260520120000_products_embedding_column.sql)) et au texte des ingrédients ([20260521120004](../../supabase/migrations/20260521120004_ingredient_embeddings.sql)). Aucune recette n'a d'embedding. Le catalogue a déjà un `search_vector` (configuration `french`), dont la couverture réelle est mesurée en E0.

## 4. Continuité avec les PRP antérieures

| Référence | Ce qui est repris |
| --- | --- |
| [PRP-232](../PRP-232-Recipe-Experience-V2.md) | Contrat d'état en URL (`tab`, `filter`, `search`) et découpage de la page ; ses onglets `feed` et `inbox` sont déjà redirigés et ne sont pas rétablis |
| [PRP-226](../PRP-226-Kitchen-Recommendation-Engine.md) | Moteur serveur unique, composantes de score, raisons déterministes ; la saison s'ajoute comme composante, pas comme second moteur |
| [V10-03A](../V10/PRP-V10-03A-Recettes-Apercus.md) | `RecipePreview`, origine de l'image et cohérence fiche ↔ moteur ; les cartes gardent ce rendu |
| [V10-03F](../V10/PRP-V10-03F-Decouverte-Culinaire.md) | Découverte et vérification des imports inchangées ; seul leur accès depuis la page est traité |
| [V10-03E](../V10/PRP-V10-03E-Voix-Cuisine.md) | Prototype mains libres et ses limites d'arrière-plan : repris tels quels, non redéfinis |

Contrats communs de [V10](../V10/README.md) appliqués ici : référence de recette commune (1) pour toute carte, filtre, favori et collection, toujours `(source, id)` ; quantité interprétable (2) et raison justifiée (8) pour le badge, qui n'affirme « tout en stock » que si quantités et unités sont établies ; commande vérifiable (3) pour note, collection et favori ; isolation des données (7) pour les caches de recherche et les curseurs ; coût vérifiable (10) pour tout essai sémantique ; voix et texte cohérents (11) pour les actions de minuteur.

## 5. Décisions proposées

Aucune n'est validée. Chacune se tranche dans l'étape indiquée.

| N° | Sujet | Proposition | Alternative écartée | Étape |
| --- | --- | --- | --- | --- |
| D1 | Où filtrer et trier | Une lecture serveur paginée pour les trois origines, sur le périmètre accessible sous RLS (celui de la bibliothèque actuelle), filtres, dédoublonnage et tri appliqués avant la pagination | Garder le filtrage client : charge tout et ne peut pas trier le catalogue par stock. Paginer les candidats du moteur : fait disparaître les recettes publiques et celles au-delà des plafonds | E1 |
| D2 | Tri par défaut | Avec une recherche : pertinence, puis stock. Sans recherche : « Proches de mon stock ». Départage stable par titre puis référence `(source, id)` | Conserver l'ordre actuel (date d'ajout, puis titre du catalogue) | E3 |
| D3 | Options de tri | Pertinence (avec recherche), proches de mon stock, plus rapides, cuisinées récemment, jamais cuisinées, ajoutées récemment. Les tris d'historique lisent le même historique que `/library-state` (déclarations et journal non annulé) ; s'il est incomplet, ces tris sont indisponibles et le disent | Lire les 200 dernières entrées du journal chargées par le moteur : « jamais cuisinée » deviendrait faux. Tri par note : reporté tant que la note n'est pas saisie (D7) | E3 |
| D4 | Régime et allergènes | Le profil reste appliqué par le moteur ; le filtre ajoute un régime pour cette recherche seulement, évalué par `evaluateConstraints` et non par les facettes stockées ; les recettes « à vérifier » restent visibles avec leur mention, les exclusions du profil restent masquées | Filtrer sur `recipe_facets.dietary` : une liste d'ingrédients vide y est végane. Masquer tout ce qui n'est pas « compatible » : cache des recettes sur une donnée incomplète | E2 |
| D5 | Favoris | Une seule source, `routine_recipe_favorites`, écrite par commande. Les recettes affichées en favori par la seule règle `personal_rating >= 4` sont comptées en E0, puis proposées une fois à l'utilisateur en conversion confirmée ; la règle n'est retirée qu'après cette proposition. `recipes.is_favorite` et ses routes ne sont pas raccordés | Convertir sans confirmation : écrit à la place de l'utilisateur. Retirer la règle sans proposition : des favoris visibles disparaissent | E0, E4 |
| D6 | Collections | Listes nommées par compte, référence `(source, id)` ; quota de création appliqué par la commande serveur, valeur fixée en E0. Au passage en gratuit, les collections existantes restent lisibles et modifiables, seule la création au-delà du quota est refusée | Tags personnels libres : doublonnent collections et tags. Quota vérifié par l'interface seule : contournable | E4 |
| D7 | Note | Note de 1 à 5 et texte libre, facultatifs, proposés après cuisson à côté du retour existant ; le texte libre n'est pas `personal_notes`, qui sert de description de repli aux recettes enregistrées. Notes et appartenances historiques reprises par une reprise rejouable (§6) | Remplacer « À refaire / Trop long / Je n'aime pas » par des étoiles : perd la raison du retour | E4 |
| D8 | Saison | Composante de score de faible poids, avec raison affichée, neutre pour un ingrédient dont la saison est inconnue ; jamais un filtre implicite. Version du référentiel et poids inclus dans la clé de cache du moteur | Exclure les recettes hors saison | E6 |
| D9 | Fin de minuteur | Son et vibration quand la page est visible, émis par l'onglet qui affiche la session ; rattrapage visuel au retour. Pas de notification locale dans ce lot | Promettre une alarme en arrière-plan depuis le web | E5 |
| D10 | Partage | Texte de la recette à champs explicites (titre, portions, ingrédients, étapes, source), même projection pour partage, copie et impression ; lien de l'application en complément | Page publique par jeton : ouvre un sujet de droits et de modération, à instruire séparément | E6 |
| D11 | Recherche sémantique | Différée ; décidée sur un corpus de requêtes fournies volontairement, sans journal du texte saisi | Embeddings de recettes dès maintenant ; journaliser les recherches des utilisateurs | E7 |
| D12 | Badge et incertitude | « Tout en stock » seulement si `available` sans incertitude sur un essentiel ; sinon « En stock, n à vérifier » | Afficher « Tout en stock » pour tout `available`, comme le statut brut du moteur | E3 |

## 6. Contrats de données

**Requête de bibliothèque.** Un schéma partagé `RecipeLibraryQuerySchema`, dans `packages/shared`, réutilise les énumérations de `MealContextSchema` plutôt que de les redéclarer. Chaque champ n'est accepté qu'à partir de l'étape qui le livre ; avant, le serveur le refuse :

```text
q            texte libre, borné comme MealContext.query                       E1
origin       all | personal | favorites                                        E1
             collection:<id>                                                   E4
cuisine      clé de cuisine existante                                          E2
max_minutes  durée totale maximale                                             E2
meal         breakfast | lunch | dinner | snack                                E2
difficulty   easy | medium | hard   (regroupement de la valeur 1–5, en E0)     E2
protein      famille de RecipeFacetExtractor                                   E2
diet         vegetarien | vegan   (évalué par evaluateConstraints)             E2
ingredient   { product_id?, name }  (les deux formes du lien actuel)           E1
sort         relevance | added                                                 E1
             stock | time | cooked_recent | never_cooked                       E3
cursor       pagination opaque                                                 E1
```

Une valeur inconnue est ignorée côté client et refusée côté serveur. Dans la bibliothèque, chaque facette active filtre, avec ou sans texte : la levée du filtre de type de repas en présence de texte, propre aux suggestions du moteur, n'est pas reprise. Une recette dont la durée, le type de repas ou la difficulté est inconnue n'est pas rangée dans une valeur par défaut : elle sort du résultat dès que la facette correspondante est active, et le compteur l'annonce une seule fois par recette, même si plusieurs facettes sont inconnues. Tant qu'E0 n'a pas établi la provenance des valeurs par défaut du catalogue, une durée totale de 0 et la difficulté `3` du catalogue sont traitées comme inconnues.

Le filtre `ingredient` garde les deux appariements du lien « Cuisiner avec » : par identifiant de produit sur les lignes `recipe_ingredients`, par nom normalisé sur les ingrédients JSON du catalogue et des recettes enregistrées.

**Facettes.** `RecipeFacetExtractor` reste la seule règle des familles de protéine. Le régime passe par `evaluateConstraints`, qui rend `compatible`, `verify` ou `incompatible` : une recette sans ingrédients est « à vérifier », jamais végane. E0 mesure, par origine, la part de recettes ayant des facettes stockées, une durée, un type de repas et une difficulté. Si le catalogue et les recettes liées n'ont pas de facettes stockées, E1 choisit entre les calculer à la lecture, comme le moteur aujourd'hui, ou les stocker par une migration additive et le script de backfill existant.

**Projection de disponibilité.** Produite par `evaluateAvailability`, sans nouvelle règle, et partagée avec `/evaluate` : portions évaluées, nombre d'essentiels à acheter, nombre d'essentiels incertains (`QUANTITY_UNKNOWN`, `UNIT_UNKNOWN`, `UNIT_INCOMPATIBLE`, lot utilisé sans date ou sans quantité mesurée), présence d'un lot utilisé proche de sa date.

| Projection | Texte de carte |
| --- | --- |
| `available`, aucune incertitude | « Tout en stock » |
| `available`, n essentiels incertains | « En stock, n à vérifier » |
| `missing`, n essentiels à acheter | « Il manque n » ; les trois premiers noms sur la fiche |
| `verify` | « Quantités à vérifier » |
| Lot alloué proche de sa date | Mention ajoutée : « Utilise un produit à finir », calculée depuis les allocations, pas reprise de la raison `NEAR_DATE` du classement |
| Contrainte `incompatible` | Mention du profil ; pas de badge de stock |

**Note et collections.** `user_recipes` porte `personal_rating`, `personal_notes` et un tableau `collections`. Deux modèles historiques de collections existent dans les migrations : `recipe_collections` avec sa table de liaison `collection_recipes`, qui ne référence que `recipes` ; `user_collections` avec le tableau `user_recipes.collections`. `add_catalog_recipe` écrit encore `collections` et `personal_notes` dans `user_recipes`, et `mapLibraryRecipe` réutilise `personal_notes` comme description. Les recettes de la table `recipes` n'ont pas ces colonnes. E0 établit ce qui existe dans le schéma actif et ce que contiennent ces colonnes. La cible proposée est un stockage par compte et par référence `(source, id)`, identique pour les trois origines, avec RLS en lecture par propriétaire et écritures par commande seulement.

Reprise des données historiques : une fonction rejouable par compte copie notes, appartenances et favoris déduits vers la cible, sans double effet au second passage, avec un rapport de comptage conservé. Les favoris déduits ne sont écrits qu'après confirmation (D5). Pendant la transition, `add_catalog_recipe` cesse d'écrire `collections` ; s'il ne peut être modifié dans la même étape, la reprise est rejouée après chaque ajout. Les nouvelles tables entrent dans `export_user_data` et dans l'effacement du compte par `user_id`. Aucune table n'est créée par la rédaction de cette PRP.

## 7. API

Les routes suivent l'enveloppe et les limites de [recommendations.routes](../../apps/api/src/routes/recommendations.routes.ts). Noms à confirmer en E1.

```text
POST /api/v1/recommendations/library
Entrée : RecipeLibraryQuery
Sortie E1 : { items: [{ reference, name, image, duration, servings, origin }],
              total, hidden_unknown: { count, by_facet }, next_cursor, calculated_at }
Ajout E3  : items[].availability: { status, servings, missing_count, uncertain_count, near_date }
            items[].constraint_status, items[].last_cooked_at, items[].cooked_count
            stock_state: available | unavailable, history_state: complete | incomplete, stock_version
Effet  : aucun ; lecture seule
```

**Périmètre.** Le serveur lit, avec le client de l'utilisateur et donc sous RLS, les recettes accessibles aujourd'hui dans la bibliothèque : propres et publiques de `recipes`, `user_recipes` du compte, catalogue. Il applique filtres, dédoublonnage et tri **avant** la pagination : la copie enregistrée d'une recette du catalogue et la recette elle-même forment une seule carte, rapprochées par `canonicalId`, et la référence concrète `(source, id)` de la copie est celle des écritures. Le total compte les cartes dédoublonnées. Le périmètre des candidats du moteur (recettes propres seulement, plafonds 1000, 1000 et 200 avant filtrage) n'est pas repris ; toute restriction encore nécessaire, par exemple pour le tri par stock, est annoncée à l'écran.

**Évaluation.** Le stock, le profil et l'historique sont lus une fois par requête ; les produits liés, nécessaires aux contraintes, sont lus par lots bornés et non par un `.in()` de tous les identifiants. Aucune requête par carte. Coût à instruire en E0 avant de retenir D1 : nombre de recettes par origine sur le compte réel, durée de l'évaluation complète, taille de la réponse, latence p95. Si l'évaluation complète est trop lente pour trier par stock, le repli proposé est de trier par stock les seules recettes personnelles et liées, et de présenter le catalogue ensuite par titre, en le disant à l'écran.

**Stock illisible et curseur.** Si le stock ne peut être lu, la réponse rend les recettes sans disponibilité, `stock_state: unavailable`, et refuse le tri par stock avec ce motif. Le curseur est lié au compte, aux filtres, au tri et aux versions qui déterminent l'ordre (empreinte du stock, version du profil, jour) ; un curseur périmé renvoie un code explicite et le client recharge la première page. L'empreinte de stock actuelle (`stockFingerprint`) ne couvre ni le profil ni la date : elle n'est pas le seul critère de péremption.

Les routes `/recipes/search`, `/cookable`, `/suggestions`, `/favorites` et `/:id/favorite` ne sont pas raccordées : elles calculent la disponibilité ou les favoris autrement que le moteur.

**Écritures.** Favori, collection et note passent par des commandes d'état explicite (« mettre en favori », « retirer des favoris », « ajouter à la collection », « noter » : jamais une bascule), sur le modèle des commandes V10 : identité de commande, version attendue de l'objet modifié, reçu durable. Elles s'exécutent dans une fonction SQL qui vérifie dans la transaction le compte, l'accès à la recette selon les mêmes règles que la fiche, l'appartenance de la collection et le quota : la RPC est appelable directement par `authenticated`, la validation zod côté Express ne suffit pas. Un rejeu identique rend le même reçu ; une version périmée rend un conflit lisible. Les droits `INSERT` et `DELETE` directs sur `routine_recipe_favorites` sont retirés une fois tous les clients migrés.

## 8. Recherche

Premier temps, livré en E1 :

- une sémantique de correspondance unique pour les trois origines, celle de `recipeSearchWords` et `recipeWordMatches` (accents, ligatures, pluriels, mots de liaison, fautes), appliquée au titre, aux noms d'ingrédients et aux tags ;
- côté base, une présélection au moins aussi large que cette correspondance, puis inclusion et classement décidés par les fonctions partagées : un `unaccent` + `ilike` seul reproduirait les faux négatifs actuels du catalogue (pluriels, fautes). La forme (colonne normalisée, trigramme, `search_vector` existant) se choisit sur le plan d'exécution et sur un test de faux négatifs mesurés en E0 ;
- classement : titre exact, puis titre partiel, puis ingrédient, puis tag ;
- délai de frappe côté client avant requête, annulation de la requête précédente, et aucune requête pour une saisie vide ; la valeur du délai est fixée en E1 sur l'iPhone de test, pas dans ce document ;
- l'URL reçoit la valeur après le délai, pas à chaque touche.

Second temps, E7, conditionnel : un corpus de requêtes fournies volontairement (séances de test, saisies d'essai) remplace tout journal du texte tapé, conformément aux règles de minimisation de V11-06, qui excluent le texte libre de la mesure. La recherche sémantique n'est étudiée que si ce corpus montre des demandes que titre, ingrédients et tags ne peuvent pas satisfaire (« plat réconfortant », « quelque chose de frais »). Un essai réutiliserait `EmbeddingService`, qui appelle le fournisseur sans reçu de coût : il ne se ferait qu'en exécution serveur bornée, avec reçu, plafond et repli lexical (contrat V10 n° 10).

## 9. Parcours et états d'interface

**Bibliothèque sur mobile.** Une ligne : champ de recherche, bouton « Filtres » avec le nombre de filtres actifs, sélecteur de tri. Sous cette ligne, les puces des filtres actifs, chacune retirable, et « Tout retirer ». La feuille de filtres s'ouvre depuis le bas, regroupe Temps, Type de repas, Difficulté, Régime, Protéine, Cuisine, Origine, et affiche en bas « Voir n recettes », mis à jour avant fermeture. Sur grand écran, les mêmes groupes tiennent dans une colonne.

| État | Ce que l'utilisateur voit |
| --- | --- |
| Chargement | Cartes fantômes ; les filtres restent utilisables |
| Résultats | Compteur, cartes avec badge, tri actif nommé |
| Badge en attente | Carte affichée sans badge ; pas de « Tout en stock » par défaut |
| Stock illisible (`stock_state`) | Recettes affichées sans badge, tri par stock indisponible et expliqué, réessai |
| Historique incomplet (`history_state`) | Tris « cuisinées récemment » et « jamais cuisinées » indisponibles, avec la raison |
| Aucun résultat | Filtres actifs rappelés, retrait d'un filtre ou de tous, accès à l'import |
| Recettes masquées par donnée inconnue | Nombre et raison, lien pour les afficher |
| Erreur | Message, réessai, saisie et filtres conservés |

**Persistance.** Tous les filtres et le tri vivent dans l'URL, avec `replace` comme aujourd'hui, pour ne pas empiler l'historique. Le retour depuis une fiche restaure position et filtres par `useRecipeListReturn`. Les paramètres existants (`search`, `filter`, `cuisine`, `ingredient`, `ingredient_name`) gardent leur sens : les liens profonds depuis le stock continuent de fonctionner.

**Lectures de la page.** E1 migre toutes les lectures déclenchées à l'ouverture de la bibliothèque : la seconde instance de `useRecipes` (recettes et collections), l'appel de `/library-state`, qui relit le périmètre du moteur pour les contraintes, et le `.in()` des ingrédients. L'ajout depuis le catalogue et la confirmation d'import restent fonctionnels. Le nombre de requêtes est mesuré pour l'écran entier, pas pour la seule liste.

**Contexte du repas.** L'onglet « Pour toi » et le dialogue « Idées avec mon stock » reçoivent le même contexte que l'accueil (temps, occasion, portions, envie) au lieu de l'entrée fixe. Le contexte est partagé entre les deux pages par compte ; son emplacement de stockage est choisi en E6.

**Page Recettes.** Découvrir et Importer deviennent des destinations lisibles par les technologies d'assistance comme les trois autres, ou restent des actions clairement distinctes de la liste d'onglets : le choix visuel revient à V11-06, le comportement (URL, focus, annonce) est fixé ici. L'effet vide, la valeur `feed` et l'ouverture jamais déclenchée de l'ancien accueil sont retirés.

**Mode cuisson.**

- Écran allumé pendant l'état « en cours », par l'API Screen Wake Lock, redemandée quand la page redevient visible et relâchée à la sortie. Safari l'annonce depuis la version 16.4 ([notes WebKit](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/)) et, pour une application ajoutée à l'écran d'accueil, depuis iOS 18.4 ([notes WebKit](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/)). La demande peut être refusée, notamment en économie d'énergie ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)) : l'état « écran maintenu allumé » ou « non disponible » est affiché, sans message d'erreur. Comportement sur l'iPhone de test à confirmer en E5.
- Minuteurs : le temps restant est déjà juste après un passage en arrière-plan, puisqu'il se calcule sur l'échéance. Ce qui manque est le signal. Le schéma de minuteur reçoit un libellé et un horodatage d'acquittement, en champs facultatifs pour que les sessions déjà enregistrées se relisent. À l'échéance, seul l'onglet visible qui affiche la session émet son et vibration ; l'acquittement enregistré empêche un second signal après rechargement ou dans un autre onglet. Au retour, un minuteur échu non acquitté s'affiche « Terminé depuis 2 min », sans son rétroactif. Les minuteurs restent visibles en revue et à la confirmation, et non plus seulement pendant `in_progress`. Le son n'est armé qu'après un geste de l'utilisateur.
- Ingrédients de l'étape : sous le texte, les ingrédients cités dans l'étape, avec leur quantité totale pour les portions choisies ; une quantité propre à l'étape n'apparaît que si le texte de l'étape la donne. La liste complète reste accessible depuis chaque étape. L'appariement se fait sur les noms normalisés ; une étape sans correspondance n'affiche rien plutôt qu'une liste fausse.
- Durées détectées : « 10 min », « 1 h 30 », « 20 à 25 minutes » dans le texte proposent un minuteur prérempli avec la borne basse ; rien ne démarre seul.

**Après cuisson.** À côté du retour existant : note facultative, champ de notes, ajout à une collection. Hors connexion, la saisie reste un brouillon local par compte, confirmé en ligne par la commande ; l'écran dit « non enregistré » tant que le reçu n'est pas revenu. La dernière note et les notes personnelles apparaissent sur la fiche.

**Partage et impression.** Le partage et la copie envoient le même texte à champs explicites ; l'impression utilise cette projection avec une feuille de style dédiée (sans navigation ni boutons). L'URL source n'est jointe que si `safeRecipeSourceUrl` l'accepte et qu'elle n'a ni paramètres de requête ni fragment ; `safeRecipeSourceUrl` ne contrôle que le protocole et les identifiants intégrés.

## 10. Cas limites

- Recette sans portions de base : disponibilité « à vérifier », jamais « tout en stock ».
- Essentiel en stock dans une unité non convertible : « En stock, 1 à vérifier », jamais « Tout en stock ».
- Recette du catalogue enregistrée dans la bibliothèque : une seule carte, celle de la copie enregistrée ; ce n'est pas le cas aujourd'hui (§3). La carte est favorite si la copie ou la recette du catalogue l'est.
- Stock, profil ou jour modifiés pendant la consultation : relecture au retour au premier plan, au changement de jour, au changement de version du profil et sur les changements de stock reçus par le canal temps réel du compte, comme `useRecipeEvaluation` ; `useAgentDbInvalidation` ne couvre que la fenêtre courante. Une réponse plus ancienne ne remplace pas une plus récente.
- Changement de compte : caches de recherche, curseurs, contexte de repas, brouillons de note et filtres mémorisés ne suivent pas.
- Recherche d'un mot d'un seul ou deux caractères, ou de mots de liaison seuls : pas de requête, message d'aide.
- Filtre de régime demandé alors que le profil en impose déjà un : pas de doublon, la puce indique l'origine.
- Collection supprimée alors qu'elle filtre la page : retour à « Toutes », avec message.
- Passage en offre gratuite au-delà du quota de collections : collections conservées, création refusée avec la raison.
- Deux appareils mettant et retirant le même favori : la commande à version périmée rend un conflit, l'écran relit l'état.
- Minuteur terminé pendant que l'écran était verrouillé : état de rattrapage au retour, pas de son rétroactif en rafale si plusieurs sont échus.
- Deux onglets sur la même session de cuisine : le stockage local reste la référence ; l'acquittement limite le signal à un onglet, sans garantie si les deux sont visibles en même temps ; comportement consigné.
- Étape contenant une température ou une quantité (« 180 °C », « 200 g ») : non prise pour une durée.
- Recette partagée contenant une source externe avec paramètres de requête : la source n'est pas jointe.

## 11. Découpage de réalisation

Chaque étape est livrable seule ; son retrait ne casse pas les précédentes.

| Étape | Livrable | Condition de démarrage |
| --- | --- | --- |
| E0 — Référence | État du disque revalidé (modifications locales du moteur commitées ou écartées par l'utilisateur) ; nombre de recettes par origine dont publiques d'autres comptes ; couverture des facettes, de `search_vector`, des durées et difficultés, provenance des valeurs `0` et `3` ; schéma actif et contenu des deux modèles de collections et des notes ; comptage des favoris dus à la seule règle `personal_rating >= 4` et des `recipes.is_favorite` ; coût d'évaluation en lot, taille de réponse et latence p95, avec seuils retenus ; inventaire des appelants des hooks et routes, y compris consommateurs externes de l'API | Accès à l'environnement de test |
| E1 — Recherche | Schéma partagé (champs E1), lecture serveur paginée sur le périmètre RLS, dédoublonnage, titre + ingrédients + tags, filtre `ingredient` à deux formes, délai de frappe ; lectures de l'écran migrées | D1 tranchée sur les mesures E0 |
| E2 — Filtres | Feuille de filtres, puces, compteur, recettes masquées annoncées, régime par le moteur, URL | E1 |
| E3 — Stock et tri | Projection de disponibilité, badge, tris, `stock_state`, `history_state`, curseur versionné | E1 ; D2, D3, D12 |
| E4 — Favoris, collections, note | Commandes SQL, reprise rejouable et proposition de conversion des favoris, quota serveur, note et notes après cuisson, note comme signal de goût, export et effacement ; retrait des écritures directes une fois les clients migrés | Schéma E0 ; D5 à D7 |
| E5 — Cuisson | Écran allumé, signal de fin avec acquittement, ingrédients par étape, durées détectées | Indépendante de E1 à E4 |
| E6 — Contexte, saison, partage | Contexte du repas sur Recettes, saison dans le score et la clé de cache, partage en texte, impression, onglets et restes de code | E3 pour la saison |
| E7 — Sémantique (conditionnelle) | Corpus volontaire analysé et décision écrite ; réalisation seulement si la décision est positive | Corpus constitué |

E5 peut partir en premier : elle ne dépend d'aucune donnée nouvelle. E4 ajoute deux migrations au plus : schéma, commandes et reprise d'abord, retrait des droits directs ensuite ; elles sont rédigées et relues avant application, jamais appliquées par un test.

## 12. Vérification et critères de sortie

Tests à écrire d'abord, selon les conventions du dépôt (`*.v10.test.tsx` côté client, `recommendations/__tests__` et `routes/__tests__` côté API, scripts `test:*:db` pour le schéma). La suite [routine-library.v10.test](../../src/components/recipes/__tests__/routine-library.v10.test.tsx) est étendue plutôt que doublée.

- Partagé : « pates » trouve « Pâtes » ; « poulet » trouve une recette qui le contient sans le nommer dans son titre ; faux négatifs testés avec accents, ligatures (« oeuf »/« œuf »), pluriels, fautes et effacement de la saisie, sur les trois origines ; ordre titre > ingrédient > tag ; schéma refusant les valeurs inconnues et les champs d'une étape non livrée.
- API, périmètre : sur un jeu d'essai dépassant les plafonds du moteur (plus de 1000 recettes propres, plus de 200 au catalogue, recettes publiques d'un autre compte, recette du catalogue enregistrée), la lecture rend toutes les recettes accessibles, sans troncature silencieuse, et un total égal au nombre de cartes dédoublonnées ; nombre de requêtes de base constant, indépendant du nombre de recettes.
- API, disponibilité : même projection que `/evaluate` pour une même recette et un même stock ; une recette `available` avec unité non convertible n'est pas « Tout en stock » ; stock illisible rendu par `stock_state` ; curseur périmé refusé après changement de stock, de profil ou de jour.
- API, filtres : un ingrédient sans identifiant de produit retrouvé dans chaque origine ; une recette sans ingrédients n'est pas végane ; une durée de 0 du catalogue sort d'un filtre de durée.
- Écritures : compte A ne lit ni recette privée, ni note, ni collection de B, et ne peut écrire pour B ni par l'API ni par appel direct de la RPC ; commande rejouée sans double effet ; version périmée en conflit ; quota refusé par le serveur ; reprise rejouée deux fois sans doublon ; notes présentes dans l'export et absentes après effacement du compte.
- Moteur : la saison change l'ordre de deux recettes par ailleurs égales et ajoute sa raison ; elle ne retire aucune recette ; un poids nul ne sert aucun classement mis en cache avec la saison ; la note modifie le score dans le sens attendu ; les tests existants de `Personalization.test` passent sans modification de leurs attentes.
- Client : une seule requête pour une frappe rapide de plusieurs caractères (minuteries simulées) ; filtres relus depuis l'URL au rechargement ; retour arrière restaurant filtres et position ; puces et compteur cohérents ; badge absent tant que la réponse n'est pas arrivée.
- Cuisson : Wake Lock demandé à l'entrée, redemandé au retour de visibilité, relâché à la sortie, absence de l'API sans erreur ; signal émis une fois à l'échéance, non répété après rechargement, passage en revue ou ouverture d'un second onglet ; session enregistrée avant E5 relue sans erreur ; détection de durées sur un jeu de phrases françaises incluant les faux positifs du §10.
- Parcours Playwright : rechercher → filtrer → trier → ouvrir → cuisiner → noter, à 375 et 440 px, puis à 1440 px ; navigation au clavier et lecteur d'écran sur la feuille de filtres.
- Matériel : sur l'iPhone de test, écran resté allumé pendant une étape longue, dans Safari et depuis l'écran d'accueil ; comportement en économie d'énergie consigné.

Critères de sortie :

- [ ] E0 : rapport d'inventaire et mesures joints, seuils de complétude, de taille et de latence p95 fixés ; point de départ du moteur confirmé par l'utilisateur.
- [ ] Aucune recette accessible dans la bibliothèque actuelle ne disparaît du résultat, sur le jeu d'essai E0.
- [ ] Sur ce jeu d'essai, une recherche sans accents et par ingrédient rend la liste dédoublonnée attendue, pour chacune des trois origines.
- [ ] Chaque facette active est visible en puce, retirable, et présente dans l'URL.
- [ ] Aucune carte n'affiche « Tout en stock » quand une quantité ou une unité d'un essentiel n'est pas établie.
- [ ] L'ouverture de la bibliothèque ne fait aucune requête par carte, mesurée pour l'écran entier.
- [ ] Le filtre Favoris ne dépend plus d'une note que personne ne peut saisir, et aucun favori visible n'a disparu sans proposition.
- [ ] Favoris, notes et collections ne s'écrivent que par commande vérifiée en base ; ils se relisent après reconnexion et restent privés au compte.
- [ ] L'écran reste allumé en cuisine quand la plateforme l'autorise, et l'application le dit quand elle ne le peut pas.
- [ ] Un minuteur terminé se signale une fois au premier plan et se retrouve au retour.
- [ ] Une recette partagée est lisible par un destinataire sans compte.
- [ ] `npm run build`, `npm run test:v10` et les suites ajoutées passent ; les contrôles non exécutés sont notés comme non validés.

Une validation locale sur données fictives ne vaut ni pour la base déployée ni pour l'iPhone.

## 13. Retour arrière et transmission

Chaque étape se désactive seule : la lecture serveur de bibliothèque derrière un réglage, avec retour au chargement actuel ; le badge et le tri par stock sans toucher à la recherche ; la composante saison par un poids nul, inclus dans la clé de cache pour qu'aucun classement antérieur ne soit resservi, sans changer la version des autres composantes ; Wake Lock et signal sonore sans effet sur la session, les champs ajoutés aux minuteurs étant facultatifs.

Pour E4, les migrations sont additives et la reprise est rejouable. Un retour de version du client laisse notes et collections en base ; l'ancien client relit `routine_recipe_favorites` comme aujourd'hui, et les droits d'écriture directs ne sont retirés qu'après migration de tous les clients, puis rétablis si le retour l'exige. Le scénario de retour est testé : il relit les données créées pendant la transition. La règle `personal_rating >= 4` n'est retirée qu'après la proposition de conversion, et le comptage est conservé.

À transmettre : à V11-01, les emplacements réservés aux restes et au coût par portion sur la carte, V11-01 calculant lui-même les besoins de la semaine depuis les références et les portions ; à V11-02, aucune attente ; à V11-04, le schéma de requête de bibliothèque, pour que l'assistant filtre comme l'interface ; à V11-05, le lien profond `ingredient` conservé avec ses deux formes ; à V11-06, la feuille de filtres, les puces, le badge et la feuille d'impression à intégrer au langage visuel, plus la liste du code retiré ; à V10-03E, les actions de minuteur disponibles pour une commande vocale.
