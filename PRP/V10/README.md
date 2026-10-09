# V10 Routine quotidienne et application iOS

> Statut : V10-01 et V10-02 implémentés et testés localement ; homologation environnement/matériel ouverte. V10-03 à V10-05 restent à réaliser.

[Publication Git des deux lots : commit, PR et contrôles](../../docs/implementations/V10-publication.md).
> Date : 2026-10-08.
> Produit : Smart Grocery, application Smart Pantry Pro.
> Utilisateur principal : Faizel, sur iPhone 17 Pro Max.
> Source : [audit produit et mobile](../../docs/AUDIT-PRODUIT-MOBILE-IOS-2026-10-08.md).

V10 organise les améliorations autour de trois usages : garder l’inventaire de ses ingrédients à jour, cuisiner ses recettes et choisir un repas adapté à ses envies, besoins et contraintes alimentaires. La cible est une application iOS complète, avec un backend commun au web.

Le parcours directeur est **courses → rangement → stock → choix du repas → cuisine → stock actualisé**. Chaque étape doit apporter un résultat vérifiable et préserver la saisie lorsqu’elle échoue.

Ce dossier contient la feuille de route et cinq PRPs. Les réalisations locales de [V10-01](../../docs/implementations/V10-01.md) et [V10-02](../../docs/implementations/V10-02.md), leurs tests et leurs captures sont documentés. Les cases de sortie restent ouvertes tant que les preuves déployées et matérielles correspondantes ne sont pas produites.

## 1. Documents et ordre de réalisation

| Étape | PRP | Résultat attendu | Dépendances | Estimation indicative |
| --- | --- | --- | --- | --- |
| 1 | [V10-01 Fiabilité](PRP-V10-01-Fiabilite.md) | Stock juste, recettes persistées, écritures récupérables et build fonctionnel | État actuel du dépôt à revalider | 1 à 2 semaines |
| 2 | [V10-02 Routine mobile](PRP-V10-02-Routine-Mobile.md) | Aujourd’hui, stock direct, ergonomie iPhone et cuisine pas à pas | Commandes et références de V10-01 | 2 à 3 semaines |
| 3 | [V10-03 Personnalisation](PRP-V10-03-Personnalisation.md) | Profil synchronisé, exclusions explicites et recommandations justifiées | V10-01 ; surfaces de V10-02 | 2 à 3 semaines |
| 4 | [V10-04 Prototype iOS](PRP-V10-04-Prototype-iOS.md) | Choix technique validé sur scan, hors ligne, synchronisation et cuisine | Contrats de V10-01 ; parcours de V10-02 | Environ 1 semaine |
| 5 | [V10-05 Pilote iOS](PRP-V10-05-Pilote-iOS.md) | Application native sur les quatre usages principaux et essai réel de 14 jours | Sorties de V10-01 à V10-04 | 4 à 8 semaines de réalisation, puis observation |

Ces durées supposent une personne à temps plein en développement, une intervention design ponctuelle et les accès de test disponibles. Ce sont des estimations à recalibrer après V10-01. Le pilote inclut une période d’usage réel qui doit apparaître dans le calendrier.

V10-01 constitue la première spécification détaillée de réalisation. Les autres documents sont cadrés avec leurs contrats, scénarios, PRs et critères de sortie ; ils sont à relire sur le code et les résultats disponibles au démarrage de leur lot. Le prototype peut être préparé après stabilisation des contrats, sans attendre toutes les finitions de personnalisation.

## 2. Besoins confirmés et choix proposés

| Sujet | Statut | Conséquence |
| --- | --- | --- |
| Maintenir l’inventaire et cuisiner | Besoin exprimé par l’utilisateur | Priorité aux écritures, unités et actions quotidiennes |
| Recettes selon santé, envie et besoin | Besoin exprimé par l’utilisateur | Profil alimentaire explicite, contexte du repas et raisons lisibles |
| iPhone 17 Pro Max puis application iOS complète | Cible exprimée par l’utilisateur | Tests réels sur cet appareil et pilote natif |
| Aujourd’hui, Stock, Cuisiner, Courses | Proposition produit V10 | Parcours à valider dans V10-02 ; assistant contextuel et profil accessibles |
| React Native avec Expo | Hypothèse technique recommandée | À confirmer par V10-04 ; SwiftUI reste une alternative évaluée |
| Santé et bien-être en V1 | Continuité de PRP-227 | Contraintes explicites et objectifs qualitatifs ; HealthKit facultatif ensuite |

Une décision indiquée comme proposée devient définitive lorsqu’elle est validée dans le lot concerné. La rédaction de ce dossier ne constitue pas une validation des implémentations futures.

## 3. Contrats communs aux cinq PRPs

1. **Référence de recette commune.** Bibliothèque, fiche, recommandations, menus et journal identifient la même recette et ses ingrédients, quelle que soit son origine historique.
2. **Quantité interprétable.** Une quantité porte une unité et sa précision. Masse, volume et pièces ne se convertissent pas entre dimensions sans information explicite.
3. **Commande vérifiable.** Achat, consommation et correction disposent d’une identité de commande ; un second envoi ne répète pas l’effet.
4. **Écriture atomique.** Les changements d’un transfert ou d’un repas sont confirmés ensemble. Un échec conserve un état récupérable.
5. **Profil par compte.** La base serveur est la référence des préférences synchronisées ; la mémoire assistant enrichit le contexte sans remplacer les exclusions explicites.
6. **Synchronisation lisible.** En attente, synchronisé, en conflit et à corriger correspondent à des états différents dans le produit.
7. **Isolation des données.** Les caches et files locales sont séparés par utilisateur ; l’autorisation est dérivée de la session serveur.
8. **Raison justifiée.** Une suggestion n’affirme une disponibilité ou une compatibilité que lorsque les données nécessaires sont présentes.

Les commandes ont un contrat partagé entre UI web, assistant et client iOS. Les lectures et protections existantes restent réutilisables après vérification de leur compatibilité avec le schéma actif.

## 4. Répartition des constats de l’audit

| Lot propriétaire | Constats traités |
| --- | --- |
| V10-01 | B01 à B08 ; D01, D02, D09, D10, D11 ; corrections urgentes U01, U02, U03 et unités de U04 ; sécurisation de M02 et références de M01 |
| V10-02 | U04 à U08 ; D08 ; expérience M01, reprise du partage M03 ; sessions de cuisine et première utilisation |
| V10-03 | D03 à D07 ; disponibilité enrichie de D02 ; profils, consentement, classement et feedback |
| V10-04 | Validation technique de M02 sur iOS ; caméra, permissions, partage, cycle de vie et choix du client natif |
| V10-05 | Version durable de M02 ; livraison M04 et M05 ; adaptation native des quatre surfaces et pilote |

Les recouvrements correspondent à une correction fonctionnelle suivie de son expérience utilisateur ou de sa généralisation native. Une PR ultérieure réutilise le contrat validé ; elle ne réimplémente pas le même effet.

Un contrôle complémentaire local a identifié deux points à examiner avant réutilisation des anciens services : des colonnes API diffèrent des modèles des hooks actifs, et la migration de `consume_inventory_item` définit une fonction privilégiée recevant `p_user_id`. V10-01 comprend leur vérification et leurs tests d’autorisation. Cela ne démontre pas leur état en production.

## 5. Continuité avec les PRPs existantes

| Référence | Réutilisation dans V10 |
| --- | --- |
| [PRP-230 Navigation](../PRP-230-UX-Sprint-2-Routing-Navigation-Shell.md) | Shell et routes ; proposition V10-02 pour la navigation quotidienne |
| [PRP-232 Recettes](../PRP-232-Recipe-Experience-V2.md) | Bibliothèque, imports et fiche ; réparations d’écriture V10-01 |
| [PRP-234 Aujourd’hui et menus](../PRP-234-Today-Kitchen-And-Menus.md) | Hooks et données existants ; nouvelle hiérarchie V10-02 |
| [PRP-235 Paramètres](../PRP-235-Settings-Memory-Nutrition-Data.md) | Sections, mémoire, confidentialité et préférences |
| [PRP-237 Design](../PRP-237-World-Class-Visual-Redesign-2026.md) | Tokens, primitives et vocabulaire, sans réintroduire les démos historiques |
| [PRP-238 Mobile](../PRP-238-Mobile-Foundation-V3.md) | Layout authentifié et fournisseur responsive déjà présents |
| [PRP-223 Mémoire](../PRP-223-Assistant-Memory-Foundation.md) | Historique, mémoire sensible et journal de cuisine |
| [PRP-225 Produits](../PRP-225-Product-Intelligence-OpenFoodFacts.md) | Sources et couverture nutritionnelles |
| [PRP-226 Recommandations](../PRP-226-Kitchen-Recommendation-Engine.md) | Moteur serveur unique, enrichi par V10-03 |
| [PRP-227 Nutrition](../PRP-227-Personal-Nutrition-Coach.md) | Objectifs qualitatifs et contraintes, sans collecte médicale en V1 |
| [PRP-239 Qualité recette](../PRP-239-Recipe-Policy-Ingredient-Quality-Chef-Agent.md) | Politique alimentaire et qualité des ingrédients conservées |
| [PRP-240 Vidéo](../PRP-240-Social-Video-Recipe-Import-V2.md) | Rétablissement du build dans V10-01 ; extensions vidéo hors priorité quotidienne |

Pour le périmètre des cinq lots, V10 précise l’ordre de réalisation et les critères complémentaires. Une PR qui change un contrat doit mettre à jour cette PRP et les références concernées. Les règles métier non modifiées continuent de s’appliquer.

## 6. Conditions de passage

| Sortie | Preuve requise |
| --- | --- |
| V10-01 → routine mobile | Persistance après reconnexion, transfert et consommation atomiques, unités et isolation par compte testées, build réussi |
| V10-02 → usage régulier | Scénarios principaux sur iPhone réel, actions lisibles et accessibles, première recette utilisable rapidement |
| V10-03 → recommandations personnalisées | Exclusions respectées, inconnues explicites, effets de changement de profil et de stock vérifiés |
| V10-04 → développement natif | Rapport d’essai matériel et décision technique argumentée, avec risques et estimation ajustée |
| V10-05 → extension du pilote | 14 jours d’utilisation, aucun incident de perte de données ouvert, synchronisation et reprise validées |

Une validation locale fictive ne vaut pas une validation Supabase déployée ni un essai Safari ou iPhone. Un contrôle bloqué est enregistré comme non validé ; il ne devient pas une réussite par défaut.

## 7. Mesures du résultat

Les objectifs sont proposés, sans mesure initiale confirmée : concordance d’au moins 90 % sur un échantillon de 20 ingrédients, correction courante en environ 5 secondes, première sélection de repas en moins d’une minute et absence de faux succès ou de double consommation. Le journal d’usage note également les abandons et leur cause.

Les mesures produit portent sur des actions et leurs résultats. Le contenu de santé, les conversations et les jetons de session ne sont pas inclus dans une télémétrie ordinaire.

## 8. Preuves et limites de départ

- [Audit détaillé](../../docs/AUDIT-PRODUIT-MOBILE-IOS-2026-10-08.md).
- [Cinq reproductions isolées](../../docs/audits/2026-10-08/reproductions.json).
- [Résultats et limites de validation](../../docs/audits/2026-10-08/validation.json).
- [Recette à 375 px](../../docs/audits/2026-10-08/recipe-small-phone.png) et [à 440 px](../../docs/audits/2026-10-08/recipe-wide-phone.png).
- [Restriction des paramètres](../../docs/audits/2026-10-08/settings-restriction.png) et [courses sur mobile](../../docs/audits/2026-10-08/shopping-mobile.png).

Ces preuves datent des 7 et 8 octobre 2026 et utilisent des données fictives. Le build local échouait et certaines validations étaient bloquées par des dépendances non téléchargées. Le premier lot doit établir une nouvelle référence de test sur son commit de travail.

## 9. Checklist de préparation

- [x] Confirmer l’état du code et les modifications préexistantes au démarrage de V10-01 : HEAD `818ce526`, changements préexistants préservés.
- [ ] Disposer d’un environnement de test de la bonne application, avec comptes séparés et données fictives.
- [x] Produire la matrice schéma actif → contrats partagés avant de réutiliser les services historiques : [matrice du code et du test local](../../docs/implementations/V10-01.md). Le schéma distant reste à vérifier.
- [ ] Réaliser les PRs du premier lot et renseigner ses preuves de sortie.
- [ ] Réviser les estimations et spécifications des lots suivants sur les résultats obtenus.

La prochaine étape est l’homologation de V10-01 et V10-02 sur le bon environnement Supabase et l’iPhone 17 Pro Max. V10-02 réutilise les commandes et modèles livrés par V10-01 ; les PRPs suivantes restent des documents de conception jusqu’à leur réalisation et validation.
