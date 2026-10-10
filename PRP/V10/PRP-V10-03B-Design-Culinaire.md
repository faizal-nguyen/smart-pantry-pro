# PRP V10-03B — Design culinaire et parcours quotidiens

> Statut : B0 à B4 livrés côté code et banc local ; direction Cuisine personnelle confirmée par l'utilisateur le 2026-10-10. Mesures humaines et homologation B5 sur iPhone ouvertes. Voir le [rapport d’implémentation](../../docs/implementations/V10-03B.md).
> Date : 2026-10-09.
> Réalisation locale : 2026-10-10 ; aucun déploiement ni changement de base distante.
> Priorité : P1 pour la hiérarchie quotidienne ; P2 pour les finitions secondaires.
> Dépendances : parcours et commandes de [V10-02](PRP-V10-02-Routine-Mobile.md), recommandations de [V10-03](PRP-V10-03-Personnalisation.md), aperçu partagé de [V10-03A](PRP-V10-03A-Recettes-Apercus.md).
> Source : [audit du 9 octobre](../../docs/AUDIT-DESIGN-MEMOIRE-VOIX-2026-10-09.md), constats D01 à D05 et observations responsive ; référence locale `dda2602`.
> Estimation indicative : 5 à 8 jours, plus disponibilité pour les essais sur téléphone.

## 1. Problème et résultat attendu

L'application a une base visuelle sobre, mais l'usage quotidien reste encombré : cinq champs avant les idées de repas, recommandations avant la bibliothèque, nombreux contrôles avant les ingrédients et retours sur chaque recette avant même de la cuisiner.

Le besoin exprimé est de retirer le côté « AI slop » et de donner envie de revenir cuisiner. Le résultat attendu est une application personnelle de cuisine : plats visibles, contenu utile rapidement, verbes concrets et aide attachée à la tâche.

Dans le banc fictif de l’audit initial, la recherche de bibliothèque commence vers 683 px et le premier titre vers 820 px à 440 px de large ; le premier ingrédient commence vers 610 px à 375 px. Ces repères excluent le bandeau de test. Ils ne mesurent ni la production ni une recommandation remplie. La [baseline du 10 octobre](../../docs/audits/2026-10-10-v10-03b/baseline.json) tient compte de l’implémentation locale 03A ; les mesures avant/après 03B sont comparées dans son rapport.

## 2. Principes et périmètre

Les quatre destinations Aujourd'hui, Stock, Cuisiner et Courses sont conservées. L'assistant accompagne une décision ou une action ; le stock, les recettes et les courses restent directement utilisables.

| Principe | Traduction observable |
| --- | --- |
| Donner envie de cuisiner | Photos existantes, titres lisibles, durée utile et première recette visible rapidement |
| Simplifier le choix | Une action principale par situation ; contexte compact modifiable à la demande |
| Montrer le contenu avant les réglages | Filtres secondaires repliables et saisie progressive |
| Parler simplement | Tutoiement cohérent, actions concrètes, erreurs avec une reprise possible |
| Préserver la confiance | Attente, erreur, conflit et confirmation restent distincts |
| Laisser vérifier | Méthode, provenance et versions dans un détail ; incertitude nécessaire à la décision visible |

Inclus : Aujourd'hui, bibliothèque, suggestions, fiche, Stock, Courses, aide contextuelle, accès à la mémoire et navigation mobile des paramètres. Les mêmes composants restent utilisables sur desktop.

Le lot n'introduit pas de nouveau moteur métier, d'illustrations générées systématiques, de mascotte, de score quotidien, de récompenses ou de migration de framework. La mémoire fonctionnelle, les modèles et les transports audio appartiennent aux lots C, D et E.

## 3. Direction visuelle proposée

Proposer deux variantes exécutables de Aujourd'hui et Cuisiner avec les mêmes données et contrats :

1. **Cuisine personnelle** : une photo principale, peu de bordures, palette chaude neutre et détails secondaires discrets.
2. **Carnet de cuisine** : liste plus compacte, photos plus petites, séparation typographique nette et accès rapide à davantage de recettes.

Comparer densité, lisibilité, temps de choix et confort à une main. Consigner le choix et ses raisons avant généralisation. Les couleurs finales et le ratio des photos restent des propositions à éprouver, pas des décisions déjà validées.

Les tokens de [index.css](../../src/index.css) et les primitives existantes servent de base : une famille de caractères pour l'interface, échelle de tailles et espacements cohérente, accent limité aux actions et statuts. Les icônes expliquent une action ; pas de décor robot ou étoiles pour signaler arbitrairement une fonction.

Vérifier clair/sombre, contrastes et états de focus sur chaque token changé. Corriger notamment le pied de dialogue qui utilise `hsl(var(--background))` alors que la variable contient une couleur OKLCH : utiliser la syntaxe compatible avec les tokens actuels.

La [PRP-237](../PRP-237-World-Class-Visual-Redesign-2026.md) reste une référence de primitives. Ses captures anciennes et son orientation « assistant-first » ne gouvernent pas les écrans V10 actuels.

## 4. Hiérarchie par écran

| Surface | Première information utile | Actions et informations secondaires |
| --- | --- | --- |
| Aujourd'hui | Session de cuisine à reprendre, besoin urgent réel ou une idée de repas avec photo | Contexte du repas compact ; modifier temps, envie et portions dans un panneau |
| Cuisiner | Recherche et recettes parcourables avec aperçus | Filtres, suggestions et imports identifiables, sans repousser toute la bibliothèque |
| Fiche | Photo, titre, durée, portions et action de cuisine | Ingrédients, manquants, contraintes ; détails nutritionnels et méthode accessibles |
| Stock | Recherche courte puis ingrédients et quantité | Ajout clair ; catégorie, zone, statut et présentation dans des contrôles secondaires |
| Courses | Lignes à cocher et rangement des achats | Ajout compact ; unité, quantité et édition à la demande |
| Assistant | Question liée au contexte et résultat utile | Conversation complète et mémoire retrouvables ; états techniques traduits en actions |
| Paramètres | Liste de rubriques lisible sur téléphone | Profil alimentaire, mémoire et confidentialité distincts, accessibles par lien direct |

L'ordre de priorité de Aujourd'hui est explicite : reprise en cours, alerte pertinente, choix d'un repas. Une alerte ou session peut donc occuper le premier écran ; l'état normal sans urgence doit montrer une photo et un titre dès le premier viewport à 375 × 812 et 440 × 956, sans bandeau de test.

La bibliothèque garde la recherche et les filtres par ingrédient, favoris et origine. Un état vide ne propose pas un lien qui ramène au même emplacement sans changement : proposer une action effective ou un ancrage utile.

## 5. Parcours et actions

### Choisir et cuisiner

Le contexte affiche une phrase courte, par exemple fictif « Ce soir · 20 min · 2 personnes ». Modifier ouvre les champs utiles sans réinitialiser les autres valeurs. Une carte donne photo, titre, durée et une raison vérifiable.

« Pas ce soir » reste disponible avant le choix et ne devient pas une préférence permanente. « À refaire » et « Trop long » sont proposés après la cuisine ou dans une entrée de retour dédiée, en réutilisant les commandes de feedback V10-03.

Les contraintes et compositions à vérifier restent visibles au moment du choix. Réduire le volume de texte ne supprime pas une information qui change la décision.

### Corriger le stock

Une ligne expose ingrédient, quantité, unité et signal pertinent de date. L'action de correction courante est immédiate ; les actions rares passent dans un menu avec libellés explicites.

Le dialogue conserve valeur saisie, conflit et reprise de V10-01. Le placeholder de saisie multiligne comporte un vrai retour à la ligne, pas le texte littéral `\n`.

### Faire les courses

La liste arrive avant le formulaire complet. Ajouter un nom reste court ; modifier quantité ou unité ouvre les champs nécessaires. Le groupe acheté et l'action de rangement sont faciles à reconnaître.

Cocher un achat et le transférer au stock gardent des significations différentes. Les commandes en attente et leurs reprises restent accessibles ; déplacer les contrôles ne change pas les écritures.

### Retrouver l'aide et ses préférences

L'aide contextuelle et la conversation complète partagent vocabulaire et états. L'entrée mémoire ouvre une section compréhensible, avec lien au profil alimentaire. Les boutons de correction et oubli ne simulent pas un comportement avant V10-03C.

## 6. Langage et états

| État | Exigence |
| --- | --- |
| Chargement | Nommer le contenu en cours de lecture ; conserver la place utile et éviter les actions trompeuses |
| Vide | Expliquer ce qui manque et proposer une action réalisable depuis cet écran |
| Erreur | Expliquer l'échec, conserver la saisie et proposer une reprise |
| Hors ligne | Distinguer données déjà chargées, intention conservée et résultat serveur non confirmé |
| Succès | Nommer l'effet réellement confirmé ; une animation seule ne suffit pas |
| Conflit | Montrer la version actuelle et la décision à reprendre, sans écrasement silencieux |
| Données incomplètes | « À vérifier » ou « Information indisponible », jamais un zéro ou un badge de certitude |

Adopter le tutoiement constant dans les parcours modifiés. Les actions utilisent Ajouter, Corriger, Cuisiner, Réessayer, Modifier ou Oublier selon leur effet réel. Retirer des états quotidiens les mots de cache, pipeline, moteur et version ; les conserver dans les détails lorsqu'ils aident à vérifier.

Faire l'inventaire des chaînes actives avant remplacement. Une recherche globale sans contrôle des callers ne suffit pas à déclarer l'application harmonisée.

## 7. Accessibilité et responsive

- Cibles tactiles courantes d'au moins 44 × 44 CSS px ; écart suffisant entre actions voisines.
- Aucun défilement horizontal de page à 375 et 440 px ; desktop conserve une largeur et une densité adaptées.
- Texte agrandi et zoom : titres, quantités, erreurs et validation restent accessibles.
- Safe areas, barre basse, clavier et dialogue ne recouvrent pas l'action principale.
- Focus visible, ordre de lecture logique, nom d'action précis et annonce du résultat par les mécanismes existants.
- Le contenu ne dépend pas d'un swipe, d'une couleur ou d'un survol seul.
- Tester photos absentes, titres longs, cent ingrédients, liste vide et liste en attente de synchronisation.

Safari et VoiceOver sur appareil constituent une validation distincte des captures Chrome.

## 8. Réalisation et fichiers concernés

| Étape / PR | Livrable | Surfaces de départ |
| --- | --- | --- |
| B0 — Référence | Scénarios comparables, captures et temps de baseline | Banc V10, parcours actifs et états représentatifs |
| B1 — Variantes | Deux variantes Aujourd'hui/Cuisiner, décision consignée | [KitchenDashboard](../../src/pages/kitchen/KitchenDashboard.tsx), [RoutineRecipeLibrary](../../src/components/recipes/RoutineRecipeLibrary.tsx) |
| B2 — Fondations | Tokens validés, syntaxe couleur corrigée et vocabulaire commun | [index.css](../../src/index.css), [QuickStockDialog](../../src/components/inventory/QuickStockDialog.tsx), composants UI |
| B3 — Cuisine | Hiérarchie des idées, bibliothèque, fiche et feedback | [Suggestions](../../src/components/recipes/PersonalizedRecipeSuggestions.tsx), [RecipeDetail](../../src/pages/RecipeDetail.tsx) |
| B4 — Routine | Stock, courses, paramètres et accès contextuel | [ShoppingDashboard](../../src/pages/shopping/ShoppingDashboard.tsx), [SettingsShell](../../src/components/settings/SettingsShell.tsx), [RoutineHeader](../../src/components/navigation/RoutineHeader.tsx) |
| B5 — Homologation | Essais et mesures comparés, corrections finales | iPhone quotidien, petit viewport, clair/sombre et desktop |

L'inventaire B0 fixe le composant réellement monté de Stock et ses enfants. Modifier les routes actives et leurs primitives ; ne pas généraliser les anciens écrans suffixés sans preuve d'usage.

Aucune migration Supabase n'est attendue. Conserver API, références, reçus et séparation des caches par compte. Une nouvelle méthode de collecte produit exige le respect des réglages de confidentialité existants.

## 9. Mesures et vérification

Comparer les variantes sur les mêmes tâches : choisir un plat, trouver une recette, corriger une quantité, cocher un achat et retrouver une préférence. Relever temps, taps, défilement avant contenu, retours arrière et abandon ; consigner l'état de départ.

Objectifs proposés : première sélection de repas en moins d'une minute ; correction courante du stock en environ cinq secondes ; photo et titre dans le premier viewport de l'état normal. Ce sont des objectifs à mesurer, pas des résultats acquis.

Après changements fonctionnels, exécuter `npm run test:v10:client`, les tests API concernés et `npm run build`. Vérifier visuellement les états modifiés dans le banc `npm run test:v10:ui` à `/scripts/fixtures/v10/index.html`, puis sur Safari iPhone.

N'ajouter des tests que pour les interactions ou régressions significatives : conservation du contexte, accès à la recherche, contrôle de feedback, reprise de commande et focus. Les comparaisons de couleur et d'espacement passent par revue visuelle.

## 10. Critères de sortie

- [x] Deux variantes comparables et une décision documentée, confirmée par l'utilisateur.
- [ ] Retours sur les parcours avec le téléphone quotidien.
- [x] Aujourd'hui et Cuisiner montrent un plat rapidement dans leur état normal, vérifié aux deux viewports du banc.
- [x] Les filtres secondaires et champs avancés ne repoussent plus systématiquement le contenu.
- [x] La première action correspond à la situation : reprise, achats à ranger, urgence ou repas, vérifiés localement.
- [x] Feedback avant/après cuisine et préférence durable restent distincts.
- [x] Les erreurs, inconnues et reçus métier restent accessibles dans les parcours contrôlés.
- [x] Le pied de dialogue est opaque et lisible en clair/sombre avec les tokens actuels.
- [x] Les parcours modifiés utilisent un ton cohérent et des verbes concrets.
- [ ] Recherche, clavier, focus, texte agrandi et VoiceOver restent utilisables.
- [x] Les preuves distinguent banc fictif, environnement déployé et appareil réel.

La direction **Cuisine personnelle, avec grandes photos**, est choisie explicitement par l'utilisateur le 10 octobre 2026 ; **Carnet de cuisine** reste exécutable dans le banc. Cette préférence confirme la direction visuelle ; les essais sur iPhone restent à réaliser. Les 36 suites client (119 tests), 21 suites API (284 tests), le build et les captures Chrome sont documentés. Les cases liées au téléphone, au zoom et à VoiceOver restent ouvertes ; aucune mesure humaine de vitesse, taps ou abandon n’est encore acquise.

## 11. Retour arrière et transmission

Livrer les tokens, composants, captures comparées, décision visuelle et mesures dans le dépôt. Un retour arrière par surface conserve les corrections métier et les aperçus de V10-03A.

Le client iOS reprend la hiérarchie et les règles d'interaction validées, avec des composants natifs. Les limites matérielles et les états encore non homologués sont transmis à V10-04, sans présenter le responsive comme une validation native.
