# PRP V10-03A — Aperçus et cohérence des recettes

> Statut : A0 à A3 implémentés et testés localement ; A4 contrôlé sur banc fictif, homologation production et iPhone ouverte.
> Date : 2026-10-09.
> Priorité : P1, avant la refonte visuelle et les lots iOS.
> Dépendances : références de [V10-01](PRP-V10-01-Fiabilite.md), bibliothèque de [V10-02](PRP-V10-02-Routine-Mobile.md), moteur et profil de [V10-03](PRP-V10-03-Personnalisation.md).
> Source : [audit du 9 octobre](../../docs/AUDIT-DESIGN-MEMOIRE-VOIX-2026-10-09.md), constats R01, R02 et N01 ; référence locale `dda2602`.
> Estimation indicative : 5 à 7 jours de développement et vérification, à réviser après inventaire des contrats.

Réalisation : [rapport V10-03A](../../docs/implementations/V10-03A.md), tests, captures, matrice des origines et limites sur les métadonnées personnelles. Les critères cochés ci-dessous correspondent aux preuves locales ; ils ne valident pas les URL de production ou Safari sur appareil réel.

## 1. Problème et résultat attendu

L'utilisateur doit ouvrir une recette pour retrouver sa photo. La bibliothèque active a perdu le champ média pendant la projection des données ; les suggestions possèdent une URL mais ne l'affichent pas. Les anciennes cartes avec images ne sont plus montées par cette route.

La fiche présente aussi une nutrition calculée par un ancien composant client : une valeur absente peut devenir zéro, un badge Nutri-Score provient d'une heuristique locale et la source affichée reste Open Food Facts quelle que soit l'origine réelle.

Le résultat attendu est une recette reconnaissable et appétissante avant ouverture, puis une fiche cohérente avec le moteur V10-03. Une photo absente, une composition incomplète ou une panne ne devient pas une information inventée.

## 2. Périmètre

Inclus : photos de bibliothèque, catalogue et suggestions ; contrat média commun ; états de chargement et d'échec ; durée et portions cohérentes ; évaluation structurée d'une recette dans sa fiche ; suppression des certitudes nutritionnelles injustifiées.

Le lot enrichit les composants actifs. Il ne réactive pas l'ancienne bibliothèque, ne change pas les commandes de cuisine, ne génère pas de photos et ne lance pas une migration globale d'imports. Une panne d'URL ou de Storage constatée en environnement réel donne lieu à une correction ciblée documentée.

La hiérarchie générale et la direction visuelle appartiennent à [V10-03B](PRP-V10-03B-Design-Culinaire.md). L'aperçu créé ici doit pouvoir y être réutilisé.

## 3. État vérifié et points à confirmer

| Surface active | État établi dans le code | Vérification de démarrage |
| --- | --- | --- |
| [RoutineRecipeLibrary](../../src/components/recipes/RoutineRecipeLibrary.tsx) | Projection sans média ; cartes sans image | Revalider les trois origines et les références de chaque ligne |
| [PersonalizedRecipeSuggestions](../../src/components/recipes/PersonalizedRecipeSuggestions.tsx) | Le renderer omet `image_url` | Vérifier aussi les recettes à vérifier et écartées |
| [recipe-model](../../packages/shared/src/recipe-model.ts) | Photo personnelle prioritaire sur celle du catalogue | Rechercher les autres résolveurs et leurs callers avant convergence |
| [RecipeDetail](../../src/pages/RecipeDetail.tsx) | Photo encore affichée ; ancien composant nutrition monté | Vérifier adaptations personnelles, portions et état de cuisson |
| [RecipeNutrition](../../src/components/recipes/RecipeNutrition.tsx) | Calcul et provenance distincts du moteur V10-03 | Inventorier ses consommateurs avant remplacement |
| [PersonalizationScoring](../../apps/api/src/services/recommendations/PersonalizationScoring.ts) | Estimation structurée avec inconnues et sources | Identifier les fonctions réutilisables pour une recette déterminée |

Le SHA déployé, les URL réelles, l'application des migrations et Safari sur l'iPhone restent non validés par l'audit. L'étape initiale distingue bug de rendu, URL périmée et droit d'accès ; elle ne déduit pas une panne de Storage de l'absence de balise image.

## 4. Référence et contrat média

Une carte conserve sa `RecipeRef` complète : source parmi `recipes`, `user_recipes`, `recipes_catalog` et identifiant de cette source. Un enrichissement média ne remplace jamais l'identifiant de bibliothèque par celui du catalogue.

| Origine | Résolution du média |
| --- | --- |
| Recette personnelle historique | `recipes.image_url` |
| Recette de bibliothèque | `user_recipes.custom_photo_url`, sinon `catalog_recipe.photo_url`, selon le mapper partagé |
| Catalogue | `recipes_catalog.photo_url`, exposé sous `image_url` au composant |
| Suggestion | `image_url` de la recette évaluée, avec la même priorité personnelle |

Normaliser chaîne vide et valeur absente. Réutiliser le mapper partagé ; compléter le contrat si nécessaire après inventaire des types. Éviter un résolveur différent par écran.

Un composant partagé d'aperçu est proposé, avec URL, titre, variante de taille et priorité de chargement. Son emplacement exact est choisi parmi les composants de recettes existants ; il ne dépend pas du classement ni d'un client Supabase.

Exigences :

- La première carte visible charge son image sans attendre le détail ; les suivantes peuvent être différées.
- Réserver les dimensions pour éviter le déplacement des actions ; proposer un ratio 4:3, révisable dans V10-03B.
- Le cadrage conserve un plat reconnaissable ; les titres longs n'écrasent pas la photo ou les actions.
- Après erreur, conserver titre et accès à la recette avec un état discret. Aucun rafraîchissement infini ni photo aléatoire.
- Une URL signée expirée n'est renouvelée que par un chemin autorisé déjà vérifié, avec reprise bornée. Ne pas ouvrir publiquement un bucket pour corriger un aperçu.
- Si la photo décrit une adaptation personnelle, ne pas lui substituer une autre préparation sans qualification.
- Une carte constitue une navigation compréhensible au clavier et au lecteur d'écran. L'alternative textuelle évite la répétition du titre lorsqu'il nomme déjà le lien.

## 5. Évaluation de la fiche par le moteur commun

La fiche doit pouvoir évaluer une recette accessible même si elle n'apparaît pas dans les trois meilleures suggestions. Réutiliser les calculs V10-03 ; ne pas appeler le classement puis chercher la recette dans sa sortie.

Contrat proposé, à intégrer à [recommendations.routes](../../apps/api/src/routes/recommendations.routes.ts) et aux types partagés :

```text
POST /api/v1/recommendations/evaluate
Entrée : { recipe: RecipeRef, servings: number }
Sortie : {
  reference, servings, profile_version, stock_version, calculated_at,
  availability, constraints, nutrition
}
```

Cette route est nouvelle, en lecture seule. Le backend dérive le compte de la session, résout la recette et ses modifications, vérifie son accès, puis applique le même évaluateur que les recommandations. Ne pas accepter un propriétaire choisi par le client.

Les erreurs d'accès et références obsolètes suivent la convention API existante sans divulguer une recette privée. Les données manquantes produisent un résultat qualifié ; une panne technique produit une erreur réessayable.

La clé de cache inclut le compte, la référence, les portions et les versions pertinentes. Un changement de profil, d'ingrédients, de stock ou une déconnexion invalide le résultat ; une réponse tardive d'un autre compte ne l'affiche pas.

## 6. Présentation des informations

| Information | Règle |
| --- | --- |
| Durée | Même calcul entre cartes et fiche ; distinguer préparation, cuisson et repos lorsque renseignés ; inconnu ne vaut pas zéro |
| Portions | Base de la recette et portions choisies explicites ; nutrition et quantités suivent la même adaptation |
| Disponibilité | Lots éligibles, unités interprétables et manquants issus du moteur ; aucune promesse fondée seulement sur le nom |
| Contraintes | Incompatible, informations suffisantes ou à vérifier selon V10-03 ; avertissement pertinent visible avant cuisine |
| Nutrition | Valeurs nullables, par portion, statut disponible/partiel/indisponible et couverture des ingrédients |
| Sources | Origines réellement utilisées et date lorsqu'elle existe ; source manuelle identifiée comme telle |

Retirer le badge Nutri-Score issu de l'heuristique locale. Ce lot ne crée pas un nouvel algorithme officiel de notation. Une éventuelle note provenant d'une source validée exige son propre contrat et ne se déduit pas d'ingrédients incomplets.

La fiche affiche une synthèse brève, puis les sources et limites dans un détail accessible. Une nutrition indisponible n'empêche pas de lire ou cuisiner une recette ; elle ne reçoit pas des macros fictives. Les valeurs du moteur ne sont pas recalculées par GPT.

## 7. Parcours et cas limites

1. Ouvrir Cuisiner : voir les photos existantes, rechercher, filtrer et ouvrir la bonne recette.
2. Choisir une suggestion : retrouver la même photo, la même adaptation et les mêmes portions dans la fiche.
3. Modifier les portions : recalculer quantités, disponibilité et nutrition sans réécrire la recette.
4. Ouvrir une recette hors classement : obtenir son évaluation ou une erreur lisible, jamais une fiche de substitution.
5. Cuisiner : conserver les reçus et consommations V10-01/V10-02.
6. Perdre le réseau : conserver le contenu déjà chargé ; qualifier l'évaluation ancienne et proposer une reprise.

Tester URL cassée, image absente, recette importée, photo personnalisée, titre long, ingrédients remplacés, unités incompatibles, composition inconnue, profil changé pendant une lecture et changement de compte.

## 8. Découpage de réalisation

| Étape / PR | Livrable | Preuve requise |
| --- | --- | --- |
| A0 — Contrats | Matrice des trois origines, lecteurs actifs, média et nutrition ; état de l'environnement | Aucun champ ou droit d'accès supposé à partir d'un ancien composant |
| A1 — Aperçus | Projection enrichie, composant commun, bibliothèque et suggestions | Photos et états d'échec vérifiés sans ouverture de fiche |
| A2 — Évaluation | Fonction commune, route en lecture et contrat partagé | Même résultat fiche/suggestion à données et portions égales |
| A3 — Fiche | Remplacement du calcul client concurrent, sources et états honnêtes | Inconnu distinct de zéro ; cuisine et adaptations préservées |
| A4 — Homologation | Captures et rapport de tests sur environnement identifié et iPhone | Limites et éventuels problèmes d'URL séparés des corrections de rendu |

A1 peut être livré avant A2/A3. A2 ne devient pas un second moteur : refactoriser le calcul existant avec ses tests, puis brancher les deux consommateurs.

## 9. Validation

- Tests métier : trois références, priorité de photo, adaptation et portions, nutrition partielle, source manuelle, exclusions et isolation par compte.
- Tests de route : session obligatoire, recette privée inaccessible, réponse versionnée, panne distinguée d'un résultat incomplet.
- UI ciblée : image chargée/cassée/absente, maintien du titre et des actions, filtres et ouverture de la bonne référence.
- Non-régression : `npm run test:v10:client`, `npm run test:v10:api`, puis `npm run build` après modifications.
- Banc fictif : `npm run test:v10:ui`, page `/scripts/fixtures/v10/index.html` ; compléter ses données pour les trois origines et les suggestions remplies.
- Contrôle réel : Safari sur iPhone 17 Pro Max, clair/sombre, réseau mobile et chargement à froid. Ne pas publier les URL privées ou captures contenant des données personnelles.

Aucune migration de base n'est présumée nécessaire. Si l'inventaire révèle un changement de contrat serveur ou Storage, le documenter avec migration minimale, test de droits et procédure de retour arrière avant réalisation.

## 10. Critères de sortie

- [x] Chaque origine avec une image valide affiche un aperçu avant ouverture, sur banc local.
- [x] La photo personnelle reste prioritaire et l'identité de recette reste inchangée.
- [x] Suggestions, bibliothèque et fiche utilisent un contrat média commun.
- [x] Chargement, absence et panne d'image restent utilisables sans saut majeur de mise en page.
- [x] Une fiche hors classement peut obtenir l'évaluation du moteur commun.
- [x] Portions, adaptations, contraintes et nutrition concordent entre fiche et suggestions ; une base absente reste inconnue.
- [x] Valeur absente, estimation partielle et source manuelle sont représentées correctement.
- [x] L'ancien badge heuristique et le calcul nutritionnel concurrent ne sont plus actifs dans la fiche.
- [ ] Tests, environnement, SHA et essai matériel sont consignés ; aucune validation distante n'est déduite du banc fictif.

## 11. Retour arrière et transmission

Les corrections média peuvent être conservées indépendamment de la nouvelle évaluation. Un retour arrière de l'évaluation ne doit pas réintroduire les faux zéros ou l'ancien badge comme solution de secours : afficher temporairement une information indisponible.

Livrer un rapport d'implémentation, la matrice de contrats, les preuves et les limites ouvertes. V10-03B reprend le composant d'aperçu ; V10-03D et iOS consomment les mêmes résultats structurés sans les réinventer.
