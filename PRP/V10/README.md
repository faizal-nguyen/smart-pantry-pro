# V10 Routine quotidienne, consolidation et application iOS

> Statut : V10-01, V10-02, V10-03, V10-03A et V10-03B implémentés et testés localement ; homologation environnement/matériel ouverte. Cuisine personnelle, avec grandes photos, est la direction 03B choisie par l'utilisateur ; les essais sur iPhone restent ouverts. V10-03C à V10-03E sont rédigés, sans réalisation. V10-04 et V10-05 restent à réaliser.

[Publication Git V10 : commits, PRs et contrôles](../../docs/implementations/V10-publication.md).
> Création : 2026-10-08. Mise à jour : 2026-10-10.
> Produit : Smart Grocery, application Smart Pantry Pro.
> Utilisateur principal : Faizel, sur iPhone 17 Pro Max.
> Sources : [audit produit et mobile](../../docs/AUDIT-PRODUIT-MOBILE-IOS-2026-10-08.md) ; [audit design, mémoire, agent et voix](../../docs/AUDIT-DESIGN-MEMOIRE-VOIX-2026-10-09.md).

V10 organise les améliorations autour de trois usages : garder l’inventaire de ses ingrédients à jour, cuisiner ses recettes et choisir un repas adapté à ses envies, besoins et contraintes alimentaires. La cible est une application iOS complète, avec un backend commun au web.

Le parcours directeur est **courses → rangement → stock → choix du repas → cuisine → stock actualisé**. Chaque étape doit apporter un résultat vérifiable et préserver la saisie lorsqu’elle échoue.

Ce dossier contient la feuille de route et **dix PRPs**. À la demande de l'utilisateur, cinq lots de consolidation précèdent les deux lots iOS : aperçus, design, mémoire de l'assistant dans l'application, modèles et voix.

Les réalisations locales de [V10-01](../../docs/implementations/V10-01.md), [V10-02](../../docs/implementations/V10-02.md), [V10-03](../../docs/implementations/V10-03.md), [V10-03A](../../docs/implementations/V10-03A.md) et [V10-03B](../../docs/implementations/V10-03B.md), leurs tests et leurs limites sont documentés. Les critères de production et d'essai matériel restent ouverts tant que leurs preuves ne sont pas produites. V10-03C à V10-03E restent des spécifications à réaliser.

## 1. Documents et ordre de réalisation

| Étape | PRP | Résultat attendu | Dépendances | Estimation indicative |
| --- | --- | --- | --- | --- |
| 1 | [V10-01 Fiabilité](PRP-V10-01-Fiabilite.md) | Stock juste, recettes persistées, écritures récupérables et build fonctionnel | État actuel du dépôt à revalider | 1 à 2 semaines |
| 2 | [V10-02 Routine mobile](PRP-V10-02-Routine-Mobile.md) | Aujourd’hui, stock direct, ergonomie iPhone et cuisine pas à pas | Commandes et références de V10-01 | 2 à 3 semaines |
| 3 | [V10-03 Personnalisation](PRP-V10-03-Personnalisation.md) | Profil synchronisé, exclusions explicites et recommandations justifiées | V10-01 ; surfaces de V10-02 | 2 à 3 semaines |
| 4 | [V10-03A Recettes et aperçus](PRP-V10-03A-Recettes-Apercus.md) | Photos rétablies ; fiche, portions et nutrition cohérentes avec le moteur commun | Références et moteur V10-01 à V10-03 | 5 à 7 jours |
| 5 | [V10-03B Design culinaire](PRP-V10-03B-Design-Culinaire.md) | Contenu visible rapidement, hiérarchie simple et langage concret | Parcours V10-02 ; aperçus V10-03A | 5 à 8 jours, plus essais |
| 6 | [V10-03C Mémoire fiable](PRP-V10-03C-Memoire-Fiable.md) | Goûts, habitudes et échanges utiles ; correction, oubli et partage cohérents | Profil V10-03 ; commandes V10-01 ; coordination design | 6 à 10 jours |
| 7 | [V10-03D Agent et modèles](PRP-V10-03D-Agent-Modeles.md) | Rôles configurables, Responses, coût fidèle et choix fondé sur benchmark | Backend V10 ; politique de mémoire V10-03C | 4 à 7 jours, hors attente d'accès |
| 8 | [V10-03E Voix en cuisine](PRP-V10-03E-Voix-Cuisine.md) | Dictée actualisée et corrigible ; décision sur la voix mains libres | Politique V10-03C ; backend stable pour la comparaison | 3 à 5 jours de dictée, puis 2 à 4 de prototype |
| 9 | [V10-04 Prototype iOS](PRP-V10-04-Prototype-iOS.md) | Choix technique validé sur scan, hors ligne, synchronisation, cuisine et questions audio natives | Contrats V10-01 à V10-03 ; sorties web V10-03A à V10-03E | Environ 1 semaine, à recalibrer sur l'audio |
| 10 | [V10-05 Pilote iOS](PRP-V10-05-Pilote-iOS.md) | Application native sur les quatre usages principaux et essai réel de 14 jours | Consolidation web et décision V10-04 | 4 à 8 semaines de réalisation, puis observation |

Ces durées supposent une personne à temps plein en développement, une intervention design ponctuelle et les accès de test disponibles. Elles sont indicatives : les trois premiers lots ont leurs rapports de réalisation ; les nouveaux lots sont à recalibrer après leur inventaire initial. Les essais matériels et l'observation du pilote doivent apparaître dans le calendrier.

Les suffixes 03A à 03E préservent les références iOS déjà utilisées. L'ordre produit est **aperçus → design → mémoire → agent → voix → prototype iOS → pilote**. La politique et les cas de test mémoire peuvent avancer pendant le design ; la dictée peut migrer avant le choix final de modèle une fois la politique de partage validée.

Chaque PRP décrit périmètre, contrats, étapes, vérifications et critères de sortie. Revalider ses points d'entrée sur le code au démarrage. La préparation matérielle iOS peut commencer en amont ; son développement doit reprendre les parcours et contrats consolidés. La voix continue reste une décision de prototype, pas une condition imposée au pilote.

## 2. Besoins confirmés et choix proposés

| Sujet | Statut | Conséquence |
| --- | --- | --- |
| Maintenir l’inventaire et cuisiner | Besoin exprimé par l’utilisateur | Priorité aux écritures, unités et actions quotidiennes |
| Recettes selon santé, envie et besoin | Besoin exprimé par l’utilisateur | Profil alimentaire explicite, contexte du repas et raisons lisibles |
| iPhone 17 Pro Max puis application iOS complète | Cible exprimée par l’utilisateur | Tests réels sur cet appareil et pilote natif |
| Retrouver les images avant ouverture de recette | Régression signalée et établie dans les renderers actifs | Correction V10-03A, sans réactiver l'ancienne bibliothèque |
| Retirer le côté « AI slop » | Demande explicite de design | Hiérarchie culinaire, photos, saisie progressive et mots concrets dans V10-03B |
| Mémoire de l'assistant dans l'application | Périmètre confirmé par l'utilisateur | Goûts, habitudes, retours et continuité ; consultation, correction et oubli |
| Réexaminer les modèles et la voix | Demande explicite d'analyse puis de PRP | Migration compatible, coût, benchmark et dictée actualisée |
| Aujourd’hui, Stock, Cuisiner, Courses | Proposition produit V10 | Parcours à valider dans V10-02 ; assistant contextuel et profil accessibles |
| Cuisine personnelle, grandes photos | Choix confirmé par l'utilisateur le 2026-10-10 | Variante par défaut ; ergonomie à valider sur iPhone dans V10-03B |
| Luna, Sol et transports vocaux récents | Candidats documentés, pas encore évalués sur le compte | Aucun changement de production par la seule rédaction des PRP |
| React Native avec Expo | Hypothèse technique recommandée | À confirmer par V10-04 ; SwiftUI reste une alternative évaluée |
| Santé et bien-être en V1 | Continuité de PRP-227 | Contraintes explicites et objectifs qualitatifs ; HealthKit facultatif ensuite |

Une décision indiquée comme proposée devient définitive lorsqu’elle est validée dans le lot concerné. La rédaction de ce dossier ne constitue pas une validation des implémentations futures.

## 3. Contrats communs aux dix PRPs

1. **Référence de recette commune.** Bibliothèque, fiche, recommandations, menus et journal identifient la même recette et ses ingrédients, quelle que soit son origine historique.
2. **Quantité interprétable.** Une quantité porte une unité et sa précision. Masse, volume et pièces ne se convertissent pas entre dimensions sans information explicite.
3. **Commande vérifiable.** Achat, consommation et correction disposent d’une identité de commande ; un second envoi ne répète pas l’effet.
4. **Écriture atomique.** Les changements d’un transfert ou d’un repas sont confirmés ensemble. Un échec conserve un état récupérable.
5. **Profil par compte.** La base serveur est la référence des préférences synchronisées ; la mémoire assistant enrichit le contexte sans remplacer les exclusions explicites.
6. **Synchronisation lisible.** En attente, synchronisé, en conflit et à corriger correspondent à des états différents dans le produit.
7. **Isolation des données.** Les caches et files locales sont séparés par utilisateur ; l’autorisation est dérivée de la session serveur.
8. **Raison justifiée.** Une suggestion n’affirme une disponibilité ou une compatibilité que lorsque les données nécessaires sont présentes.
9. **Mémoire contrôlable.** Une information a une destination, une provenance et un effet vérifiables ; les règles de partage sont communes au contexte, aux tools et aux résumés.
10. **Coût et modèle vérifiables.** Modèle configuré et modèle servi sont distingués ; coût inconnu ne devient pas zéro.
11. **Voix et texte cohérents.** Les transports appellent les mêmes commandes ; la transcription seule ne modifie pas le stock.

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

Le tableau précédent se réfère à l'audit des 7–8 octobre. Les identifiants de l'audit complémentaire du 9 octobre ont leur propre répartition :

| Lot propriétaire | Constats du 9 octobre |
| --- | --- |
| V10-03A | R01, R02 et N01 : photos et cohérence de la fiche |
| V10-03B | D01 à D05 : hiérarchie, contrôles, couleur de dialogue et langage |
| V10-03C | M01 à M05 : destination, classification, partage, gestion et continuité |
| V10-03D | A01 : modèles, transport, escalades et coût |
| V10-03E | V01 : transcription, fragmentation des entrées et comparaison vocale |

Un contrôle complémentaire local a identifié deux points à examiner avant réutilisation des anciens services : des colonnes API diffèrent des modèles des hooks actifs, et la migration de `consume_inventory_item` définit une fonction privilégiée recevant `p_user_id`. V10-01 comprend leur vérification et leurs tests d’autorisation. Cela ne démontre pas leur état en production.

## 5. Continuité avec les PRPs existantes

| Référence | Réutilisation dans V10 |
| --- | --- |
| [PRP-230 Navigation](../PRP-230-UX-Sprint-2-Routing-Navigation-Shell.md) | Shell et routes ; proposition V10-02 pour la navigation quotidienne |
| [PRP-232 Recettes](../PRP-232-Recipe-Experience-V2.md) | Bibliothèque, imports et fiche ; réparations d’écriture V10-01 |
| [PRP-234 Aujourd’hui et menus](../PRP-234-Today-Kitchen-And-Menus.md) | Hooks et données existants ; nouvelle hiérarchie V10-02 |
| [PRP-235 Paramètres](../PRP-235-Settings-Memory-Nutrition-Data.md) | Sections, mémoire, confidentialité et préférences |
| [PRP-237 Design](../PRP-237-World-Class-Visual-Redesign-2026.md) | Tokens et primitives ; hiérarchie actualisée par V10-03B, quatre destinations conservées |
| [PRP-238 Mobile](../PRP-238-Mobile-Foundation-V3.md) | Layout authentifié et fournisseur responsive déjà présents |
| [PRP-223 Mémoire](../PRP-223-Assistant-Memory-Foundation.md) | Historique, mémoire sensible et journal de cuisine |
| [PRP-225 Produits](../PRP-225-Product-Intelligence-OpenFoodFacts.md) | Sources et couverture nutritionnelles |
| [PRP-226 Recommandations](../PRP-226-Kitchen-Recommendation-Engine.md) | Moteur serveur unique, enrichi par V10-03 |
| [PRP-227 Nutrition](../PRP-227-Personal-Nutrition-Coach.md) | Objectifs qualitatifs et contraintes, sans collecte médicale en V1 |
| [PRP-239 Qualité recette](../PRP-239-Recipe-Policy-Ingredient-Quality-Chef-Agent.md) | Politique alimentaire et qualité des ingrédients conservées |
| [PRP-240 Vidéo](../PRP-240-Social-Video-Recipe-Import-V2.md) | Rétablissement du build dans V10-01 ; extensions vidéo hors priorité quotidienne |

Pour le périmètre des dix lots, V10 précise l’ordre de réalisation et les critères complémentaires. Une PR qui change un contrat doit mettre à jour cette PRP et les références concernées. Les règles métier non modifiées continuent de s’appliquer. Les anciens composants sont réutilisés uniquement après vérification des routes et callers actifs.

## 6. Conditions de passage

| Sortie | Preuve requise |
| --- | --- |
| V10-01 → routine mobile | Persistance après reconnexion, transfert et consommation atomiques, unités et isolation par compte testées, build réussi |
| V10-02 → usage régulier | Scénarios principaux sur iPhone réel, actions lisibles et accessibles, première recette utilisable rapidement |
| V10-03 → recommandations personnalisées | Exclusions respectées, inconnues explicites, effets de changement de profil et de stock vérifiés |
| V10-03A → design | Photos pour les trois origines ; état image cassée ; portions, nutrition et contraintes cohérentes entre fiche et moteur |
| V10-03B → expérience consolidée | Variantes comparées, contenu accessible rapidement, erreurs préservées et essai iPhone documenté |
| V10-03C → mémoire réutilisable | Classification, partage commun, correction/oubli, concurrence et continuité éprouvés sur deux comptes et deux clients |
| V10-03D → modèles activables | Benchmark, coût et latence, tools/confirmations préservés, configuration et retour arrière vérifiés |
| V10-03E → décision vocale | Dictée réelle validée ; comparaison et décision explicites ; limites web transmises au prototype natif |
| V10-04 → développement natif | Rapport d’essai matériel et décision technique argumentée, avec risques et estimation ajustée |
| V10-05 → extension du pilote | 14 jours d’utilisation, aucun incident de perte de données ouvert, synchronisation et reprise validées |

Une validation locale fictive ne vaut pas une validation Supabase déployée ni un essai Safari ou iPhone. Un contrôle bloqué est enregistré comme non validé ; il ne devient pas une réussite par défaut.

La sortie web V10-03E n'exige pas une conversation continue en arrière-plan. V10-04 produit la preuve native manquante ; V10-05 inclut uniquement les capacités retenues et homologuées.

## 7. Mesures du résultat

Les objectifs sont proposés, sans mesure initiale confirmée : concordance d’au moins 90 % sur un échantillon de 20 ingrédients, correction courante en environ 5 secondes, première sélection de repas en moins d’une minute et absence de faux succès ou de double consommation. Le journal d’usage note également les abandons et leur cause.

Les mesures produit portent sur des actions et leurs résultats. Le contenu de santé, les conversations et les jetons de session ne sont pas inclus dans une télémétrie ordinaire.

Les nouveaux lots ajoutent temps avant le premier plat, erreurs de mémorisation, corrections de transcription, latence p50/p95 et coût par tâche réussie. Les seuils de benchmark sont fixés avant les essais, sur des données fictives et un budget borné.

## 8. Preuves et limites de départ

- [Audit détaillé](../../docs/AUDIT-PRODUIT-MOBILE-IOS-2026-10-08.md).
- [Cinq reproductions isolées](../../docs/audits/2026-10-08/reproductions.json).
- [Résultats et limites de validation](../../docs/audits/2026-10-08/validation.json).
- [Recette à 375 px](../../docs/audits/2026-10-08/recipe-small-phone.png) et [à 440 px](../../docs/audits/2026-10-08/recipe-wide-phone.png).
- [Restriction des paramètres](../../docs/audits/2026-10-08/settings-restriction.png) et [courses sur mobile](../../docs/audits/2026-10-08/shopping-mobile.png).
- [Audit de consolidation du 9 octobre](../../docs/AUDIT-DESIGN-MEMOIRE-VOIX-2026-10-09.md) et [observations/reproductions](../../docs/audits/2026-10-09-design-memoire-voix/observations.json).

Les preuves initiales des 7 et 8 octobre utilisent des données fictives et décrivent un build alors en échec. Les rapports de réalisation V10-01 à V10-03 donnent la référence locale suivante. L'audit du 9 octobre porte sur `dda2602`, après ces lots, et distingue nouvelles régressions, données de test et vérifications distantes non obtenues. Aucun de ces rapports ne valide à lui seul le déploiement ou l'iPhone.

## 9. Checklist de préparation

- [x] Confirmer l’état du code et les modifications préexistantes au démarrage de V10-01 : HEAD `818ce526`, changements préexistants préservés.
- [ ] Disposer d’un environnement de test de la bonne application, avec comptes séparés et données fictives.
- [x] Produire la matrice schéma actif → contrats partagés avant de réutiliser les services historiques : [matrice du code et du test local](../../docs/implementations/V10-01.md). Le schéma distant reste à vérifier.
- [x] Documenter la réalisation locale et la publication Git de V10-01 à V10-03 ; homologation distante et matérielle encore ouverte.
- [x] Rédiger les cinq PRP de consolidation, avec dépendances et critères de sortie.
- [ ] Inventorier sur le SHA de travail les médias, l'évaluation de fiche, la mémoire, les réglages de partage et les modèles actifs.
- [ ] Produire les preuves de sortie V10-03A à V10-03E avant reprise des parcours dans iOS.
- [ ] Réviser les estimations et spécifications des lots suivants sur les résultats obtenus.

La prochaine réalisation est V10-03A, puis V10-03B. L'homologation de V10-01 à V10-03 reste à mener sur le bon environnement Supabase, avec deux comptes, deux clients et l'iPhone 17 Pro Max. Les fondations restent communes ; V10-04 et V10-05 reprennent ensuite les sorties de consolidation sans emporter les défauts actuels dans un nouveau client.
