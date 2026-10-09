# PRP V10-03 — Personnalisation et recommandations

> Statut : proposition cadrée, contrats à confirmer après V10-01.
> Date : 2026-10-08.
> Priorité : P1.
> Dépendances : [Fiabilité](PRP-V10-01-Fiabilite.md), surfaces de [Routine mobile](PRP-V10-02-Routine-Mobile.md), disponibilité des données produit.
> Références : [feuille de route](README.md), [audit](../../docs/AUDIT-PRODUIT-MOBILE-IOS-2026-10-08.md), PRP-223, PRP-225, PRP-226, PRP-227, PRP-235 et PRP-239.
> Estimation indicative : 2 à 3 semaines, selon l’état réel des profils et données nutritionnelles.

## 1. Problème et objectif

L’utilisateur veut des recettes adaptées à son stock, à son envie et à ses besoins. L’audit montre que le moteur utilise encore des valeurs constantes pour certains critères, que des préférences restent locales et que la disponibilité mélange des unités et des lots sans qualification suffisante.

Le lot doit produire une à trois suggestions compréhensibles, réellement influencées par le profil et le contexte du repas. Chaque suggestion indique pourquoi elle convient, les ingrédients manquants et les limites des données utilisées.

Constats propriétaires : D03 à D07, ainsi que l’enrichissement de D02. Les références de recettes, conversions et invalidations sont fournies par V10-01. Les écrans de V10-02 ne doivent pas avoir leur propre moteur concurrent.

## 2. Décisions conservées et périmètre

Le positionnement de [PRP-227](../PRP-227-Personal-Nutrition-Coach.md) est conservé : cuisine et nutrition de bien-être, objectifs qualitatifs et contraintes explicites. La V1 ne demande pas âge, poids, taille, sexe, pathologies ou traitements. Elle ne produit pas de diagnostic, de prescription ou de cible médicale calculée.

Les cibles de calories ou protéines restent facultatives, saisies volontairement, nullables et masquées par défaut. Le parcours quotidien ne dépend pas de leur présence. HealthKit et un suivi clinique sont hors périmètre de ce lot.

Le moteur serveur PRP-226 sélectionne les recettes et calcule les critères. Le modèle de langage peut expliquer, proposer une adaptation ou clarifier une envie. Une explication générée ne doit pas contredire les résultats structurés du moteur.

Inclus : profil synchronisé, préférences culinaires, exclusions, contexte du moment, ingrédients normalisés, classement, raisons, incertitudes et retour utilisateur. La politique alimentaire de PRP-239 continue de s’appliquer.

Hors périmètre : bilan de santé, collecte systématique de symptômes, plan alimentaire clinique, compléments, gamification nutritionnelle et génération complète de menus hebdomadaires. Les anciens `HealthDashboard` et `useNutritionalAI` ne sont pas réintroduits comme solution V1.

## 3. Profil explicite et source de vérité

Le profil est enregistré par compte côté serveur. `nutrition_profiles` est le modèle proposé par PRP-227 : vérifier les migrations, types générés, lecteurs et déploiement avant de le créer ou de l’étendre. Le nom d’un modèle décrit dans une PRP ne démontre pas son existence en base.

| Domaine | Données utiles | Règle |
| --- | --- | --- |
| Contraintes | Allergies déclarées, ingrédients exclus, régime alimentaire | Explicites, modifiables et prioritaires sur le classement |
| Goûts | Cuisines, ingrédients appréciés, ingrédients évités | Préférences ; ne deviennent pas une allergie par inférence |
| Cuisine | Temps habituel, niveau, matériel, portions habituelles | Valeurs facultatives et adaptées au repas courant |
| Besoins | Objectifs qualitatifs choisis par l’utilisateur | Raisons culinaires mesurables, sans promesse médicale |
| Nutrition facultative | Cibles manuelles si activées | Valeurs nullables ; absence sans pénalité arbitraire |
| Provenance | Version, date de modification, origine explicite ou importée | Permettre synchronisation, correction et migration |

Le contexte d’un repas — quinze minutes disponibles, envie de quelque chose de chaud, nombre de portions — n’écrase pas les préférences durables. Il accompagne la demande et peut être réinitialisé au repas suivant.

### Allergies et mémoire

Les allergies du profil sont la référence immédiate du filtrage, conformément à PRP-227. Leur application n’attend pas la validation d’une mémoire assistant. Une mémoire sensible créée en parallèle reste contrôlable par l’utilisateur.

Une préférence inférée par l’assistant est proposée pour confirmation. Une inférence ne peut ni supprimer ni assouplir une exclusion explicite. En cas de désaccord entre profil et mémoire, le profil explicite gouverne la recommandation et le conflit est signalé dans les paramètres.

## 4. Migration et synchronisation des préférences

Avant réalisation, inventorier les sources actives : sections de paramètres, stockage local, mémoire assistant, hooks de personnalisation et données serveur. L’audit identifie notamment un enregistrement local des préférences de cuisine et une migration initiale qui ne garantit pas les modifications suivantes.

La migration s’effectue par compte et version de schéma. Elle est idempotente, garde une provenance et ne remplace pas une préférence serveur plus récente par une copie locale ancienne.

| Situation | Comportement |
| --- | --- |
| Profil serveur absent | Proposer la reprise des valeurs locales attribuables au compte ; confirmer les contraintes sensibles |
| Profil serveur déjà renseigné | Comparer les valeurs et proposer la résolution des écarts |
| Nouvelle modification dans les paramètres | Enregistrer côté serveur, confirmer la version et invalider le classement |
| Modification simultanée sur deux appareils | Détecter la version dépassée ; ne pas écraser silencieusement des exclusions |
| Déconnexion ou changement de compte | Fermer le profil précédent et séparer les caches |

Un simple indicateur de migration sur l’appareil ne constitue pas la synchronisation. La réponse à une lecture de profil est versionnée et chaque écriture doit pouvoir être vérifiée après reconnexion.

## 5. Pipeline de recommandation

Le pipeline commun est exécuté côté serveur, avec des données appartenant à l’utilisateur autorisé.

1. Résoudre le profil, sa version et le contexte du repas.
2. Charger les recettes de toutes les origines via le contrat V10-01, avec leurs adaptations personnelles.
3. Normaliser ingrédients, unités, portions et métadonnées de contraintes.
4. Appliquer les exclusions et qualifier les inconnues.
5. Calculer les ingrédients disponibles à partir des lots éligibles.
6. Calculer les critères de classement disponibles et leur couverture.
7. Sélectionner quelques recettes, produire les raisons structurées et les manquants.
8. Présenter les suggestions dans Aujourd’hui, les recettes et l’assistant avec le même contrat.

Les lecteurs actuels à faire converger sont [RecommendationEngine](../../apps/api/src/services/recommendations/RecommendationEngine.ts), [CookabilityScorer](../../apps/api/src/services/recommendations/CookabilityScorer.ts), [PreferenceScorer](../../apps/api/src/services/recommendations/PreferenceScorer.ts) et [useTodayRecommendations](../../src/hooks/useTodayRecommendations.ts).

## 6. Contraintes avant classement

Une allergie ou exclusion connue ne devient pas seulement un score plus faible. Une recette incompatible est écartée du groupe de suggestions compatibles avant le classement.

La vérification utilise les ingrédients et métadonnées structurées, avec identifiants, synonymes validés et provenance. Le titre, les tags et la description ne suffisent pas à garantir l’absence d’un ingrédient. Un titre « sans lait » avec du beurre dans la liste ne doit pas être accepté automatiquement.

| État | Présentation et sélection |
| --- | --- |
| Incompatibilité connue | Recette exclue des suggestions compatibles ; raison consultable |
| Informations suffisantes, aucune incompatibilité identifiée | Compatibilité avec les contraintes renseignées, selon les ingrédients connus |
| Information essentielle inconnue | Statut « à vérifier » ; pas de badge garantissant la compatibilité |
| Substitution proposée | Recette adaptée à revalider sur ses ingrédients effectifs |

Pour une allergie déclarée, une incertitude pertinente ne rejoint pas les suggestions confirmées compatibles. L’absence d’information sur les traces ou la contamination croisée reste une limite des sources ; elle ne peut être transformée en certification par l’assistant.

Une adaptation personnelle de recette est vérifiée avant sa version canonique : remplacer un ingrédient peut changer la compatibilité et les valeurs nutritionnelles. Les règles sans porcin ou sans alcool de la politique PRP-239 sont intégrées selon son contrat, sans affaiblir les exclusions de l’utilisateur.

## 7. Stock, lots et dates

La disponibilité est calculée pour les portions demandées. Masse, volume et pièces suivent le contrat de conversion V10-01 ; les conversions inconnues restent inconnues.

Les lots sont traités séparément avant agrégation. Le moteur conserve leurs dates, zones et quantités ; il ne transforme pas tous les lots d’un produit en un stock global réputé utilisable.

| Donnée | Règle proposée |
| --- | --- |
| DLC dépassée connue | Lot exclu des suggestions automatiques fondées sur le stock utilisable |
| DDM dépassée connue | Signaler une vérification ; ne pas assimiler automatiquement DDM et DLC |
| Date absente ou type inconnu | Conserver l’incertitude ; pas de promesse de fraîcheur |
| Quantité estimée | Qualifier la disponibilité et permettre une correction |
| Quantité insuffisante | Afficher le manque réel dans l’unité appropriée |
| Plusieurs lots utilisables | Proposer la priorité de date, sans dépasser la quantité de chaque lot |

Ce tableau est une politique produit de classement, pas une détermination de sécurité alimentaire. Si les données actuelles ne distinguent pas les types de dates, les migrations et la saisie doivent le permettre avant d’appliquer une règle spécifique.

L’explication « à cuisiner rapidement » s’appuie sur les mêmes jours calendaires que V10-02. Elle n’encourage pas à consommer un lot exclu pour améliorer l’anti-gaspillage.

## 8. Critères et explications calculés

| Critère | Entrées nécessaires | Traitement si absent |
| --- | --- | --- |
| Disponibilité | Quantités, unités, lots, portions | Distinguer ingrédients présents et suffisance inconnue |
| Temps | Durée totale pertinente, temps disponible | Indiquer la durée inconnue au lieu de promettre quinze minutes |
| Goûts | Préférences explicites et retours | Valeur neutre interne possible, sans prétendre connaître le goût |
| Anti-gaspillage | Lots éligibles et dates connues | Ne pas inventer une urgence |
| Besoin nutritionnel choisi | Données produit, portions, couverture du calcul | Critère absent ou dégradé, avec incertitude explicite |
| Variété | Historique de cuisine réel et préférences | Pas de faux score de nouveauté sur un historique vide |

Les valeurs constantes actuelles de `nutritionFit` et `novelty` ne sont plus présentées comme des calculs personnalisés. Un critère indisponible est identifié dans la réponse ; la normalisation du classement n’avantage pas artificiellement une recette incomplète.

Une répétition n’est pas forcément indésirable. Les retours « à refaire », « je n’aime pas », « trop long » ou « pas aujourd’hui » ont des effets différents et ne deviennent pas tous une pénalité permanente.

### Contrat de sortie proposé

Chaque suggestion expose une référence de recette, les portions, la durée, la disponibilité, les manquants, le résultat des contraintes et les raisons structurées. Elle porte aussi la version du profil, l’état ou la version de stock utilisé, la date du calcul et la couverture des données nutritionnelles.

Les codes de raisons distinguent, par exemple, utilisation d’un lot proche de sa date, durée adaptée, goût déclaré et objectif qualitatif calculable. Les champs exacts sont stabilisés avec les contrats existants de PRP-226 ; aucun nouveau format concurrent n’est introduit dans le client natif.

## 9. Nutrition estimée et qualité des données

Réutiliser les sources produit PRP-225 et les estimations existantes après vérification. La présence d’une estimation sur une fiche ne démontre pas que toutes les recettes disposent d’une couverture suffisante pour le classement.

Le calcul renseigne source, date, base de quantité, portions et couverture. Les unités, rendements et différences cru/cuit sont traités explicitement lorsque nécessaires. Une quantité en pièces sans poids connu ne reçoit pas un poids arbitraire silencieux.

L’interface utilise « estimation » et distingue données connues, estimées et absentes. Le score Insights actuellement fondé sur des notes ou de la variété ne devient pas un indicateur de qualité nutritionnelle : soit son libellé correspond réellement au calcul, soit il est retiré de cette présentation.

Un objectif qualitatif n’est exploité pour le classement que si sa traduction est documentée et soutenue par les données. L’explication ne promet pas de corriger un symptôme ou d’obtenir un résultat de santé.

## 10. Paramètres, confidentialité et feedback

Le profil alimentaire est modifiable depuis les paramètres et depuis une suggestion. Les changements ont un résultat visible et modifient les prochaines recommandations sans délai de cache inexpliqué.

Le consentement explique quelles données sont enregistrées et à quoi elles servent. Les préférences sensibles sont confirmables et supprimables. Les parcours d’export et d’effacement existants, notamment [usePrivacySettings](../../src/hooks/usePrivacySettings.ts), sont étendus au profil et aux caches concernés ; leur état réel est vérifié avant de déclarer un effacement terminé.

Les logs et événements produit ordinaires ne contiennent ni allergies, ni texte de santé, ni conversation complète. Les données envoyées à un modèle sont limitées au besoin de la demande et aux choix de confidentialité applicables.

Les événements de recommandation et interactions existants sont réutilisés après vérification. L’enregistrement d’un feedback ne requiert pas de recréer une recette ni une consommation.

## 11. Découpage proposé en PRs

| PR | Changement | Preuve attendue |
| --- | --- | --- |
| 1 | Matrice des profils, schéma retenu, API et versionnement | Deux comptes isolés ; préférences persistées et rechargées |
| 2 | Paramètres et migration des préférences locales | Migration répétable ; changement visible sur un autre client |
| 3 | Contraintes, ingrédients et lots | Incompatibilités exclues, inconnues identifiées, aucune conversion inventée |
| 4 | Classement, couverture nutritionnelle et raisons | Les modifications de stock, profil et contexte changent réellement les résultats |
| 5 | Intégration Aujourd’hui et assistant, feedback et confidentialité | Raisons identiques sur les surfaces ; export et effacement vérifiés |

## 12. Tests et critères de sortie

Le jeu de données utilise deux comptes, toutes les origines de recettes, des adaptations personnelles, des allergies connues, des ingrédients inconnus, des unités incompatibles et plusieurs lots. Les fixtures et appels réels sont distingués dans les preuves.

- [ ] AC01 — Les préférences sont retrouvées après reconnexion et sur un second client du même compte.
- [ ] AC02 — Un changement de régime ou d’allergie invalide les suggestions déjà calculées ; une mémoire ancienne ne le contredit pas.
- [ ] AC03 — Une allergie déclarée exclut une recette incompatible, même si le titre ou un tag affirme le contraire.
- [ ] AC04 — Une donnée essentielle inconnue ne reçoit aucun badge de compatibilité garantie.
- [ ] AC05 — Les recettes personnelles et catalogue, ainsi que leurs adaptations, passent par le même pipeline.
- [ ] AC06 — Les quantités, portions, lots et dates expliquent correctement disponibilité et manquants.
- [ ] AC07 — Une recette sans données nutritionnelles conserve une incertitude visible ; aucune constante n’est présentée comme score de santé.
- [ ] AC08 — Les raisons fournies à l’UI et à l’assistant correspondent aux critères effectivement calculés.
- [ ] AC09 — Les suggestions changent dans les scénarios stock réduit, temps réduit, allergie ajoutée et goût modifié.
- [ ] AC10 — Une tentative d’accès au profil d’un autre compte échoue côté serveur et, le cas échéant, sur les accès directs autorisés à la base.
- [ ] AC11 — Les journaux ordinaires ne contiennent pas de données sensibles ; profil et mémoire sont couverts par les parcours de confidentialité.
- [ ] AC12 — L’utilisateur peut expliquer pourquoi une suggestion apparaît et corriger la donnée qui la rend inadaptée lors d’un essai sur l’appareil cible.

Les tests sont complétés par une revue de quelques recommandations et de leurs entrées. Un score cohérent sur des fixtures ne prouve pas la qualité d’un catalogue réel incomplet.

## 13. Risques et définition de terminé

| Risque | Réponse prévue |
| --- | --- |
| Plusieurs profils concurrents | Inventaire des sources et modèle canonique avant migration |
| Allergie traitée comme goût | Exclusion préalable au classement, testée sur les ingrédients |
| Faux niveau de précision nutritionnelle | Couverture, provenance et limites dans le contrat |
| Cache conserve un profil dépassé | Version de profil et invalidation serveur commune |
| Import produit incomplet | Classement dégradé explicite ; enrichissement ciblé des produits utilisés |

Le lot est terminé lorsque les critères disposent de preuves et que les suggestions sont compréhensibles dans la boucle quotidienne. Le [pilote iOS](PRP-V10-05-Pilote-iOS.md) réutilise ces contrats et ne crée pas un second moteur de recommandations.
