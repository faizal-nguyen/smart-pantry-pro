# PRP V10-02 — Routine mobile

> Statut : implémenté et testé localement ; homologation déployée et matérielle ouverte.
> Date : 2026-10-08.
> Réalisation : 2026-10-09 ; [rapport, tests et captures](../../docs/implementations/V10-02.md).
> Priorité : P1, après les corrections de fiabilité.
> Dépendance : [V10-01 Fiabilité](PRP-V10-01-Fiabilite.md).
> Références : [feuille de route V10](README.md), [audit](../../docs/AUDIT-PRODUIT-MOBILE-IOS-2026-10-08.md), PRP-230, PRP-232, PRP-234, PRP-237 et PRP-238.
> Estimation indicative : 2 à 3 semaines, à ajuster sur le premier lot.

## 1. Problème et résultat attendu

L’application propose des fonctions utiles, mais leur accès et leur enchaînement demandent trop d’effort. Le stock est derrière une page intermédiaire, les cartes consacrent beaucoup d’espace aux photos, les actions de cuisine changent selon la largeur et les courses ne conduisent pas clairement au rangement des produits.

L’objectif est de permettre une boucle quotidienne courte : **voir ce qui est disponible → choisir un repas → cuisiner → confirmer les ingrédients utilisés → retrouver un stock actualisé**. Au retour des courses, l’ajout au stock doit suivre le même principe de confirmation.

Les constats de départ sont U04 à U08, D08, M01 et M03. Les corrections urgentes de visibilité, contraste et unités de V10-01 constituent le socle ; ce lot organise les parcours complets. Aucun gain de temps n’est encore mesuré.

## 2. Décisions proposées et périmètre

La navigation principale comporte quatre entrées : **Aujourd’hui, Stock, Cuisiner, Courses**. Le profil et les paramètres sont accessibles depuis l’en-tête. L’assistant est accessible dans le contexte courant et conserve une route dédiée pour les conversations longues.

Cette proposition doit être essayée sur iPhone avant de remplacer définitivement la hiérarchie de PRP-230. Le test vérifie aussi que l’assistant reste facile à trouver : il aide à choisir, remplacer ou expliquer un ingrédient sans interrompre la tâche en cours.

Inclus : navigation, accueil utile, première utilisation progressive, stock compact, préparation des courses, session de cuisine, reprise d’un partage et accessibilité des quatre parcours. Les composants et tokens existants sont réutilisés.

Hors périmètre : refonte approfondie des menus hebdomadaires, gamification, nouveaux modes familiaux, classement nutritionnel de V10-03 et développement natif. Le mode familial existant continue de protéger les opérations qui lui sont effectivement interdites.

## 3. Navigation et routes

| Entrée | Destination de travail | Comportement |
| --- | --- | --- |
| Aujourd’hui | `/kitchen` | Propose une prochaine action et jusqu’à trois repas pertinents |
| Stock | `/pantry/inventory` | Ouvre directement l’inventaire, avec recherche et filtres conservés |
| Cuisiner | `/kitchen/recipes` | Recherche dans toutes les origines de recettes, favoris et recettes personnelles |
| Courses | `/shopping/list` | Affiche les achats restants et permet de ranger les achats cochés |
| Profil et paramètres | Routes existantes de paramètres | Accès adulte direct et paramètres alimentaires accessibles |
| Assistant | Route et panneau existants | Contexte explicite de la recette ou du produit, sans déduire son identité de son nom |

Ces destinations sont à confronter au routeur actif lors de la réalisation. Les liens déjà partagés, favoris et destinations de notifications disposent d’une redirection ou d’un traitement compatible.

- La racine authentifiée conduit à Aujourd’hui ; elle ne renvoie plus systématiquement vers Insights.
- Les raccourcis du manifest, liens de notifications et retours d’authentification utilisent une destination reconnue par le routeur. Si une ancienne URL contient `?tab=...`, un adaptateur la traduit explicitement.
- Un lien vers une recette conserve sa référence commune V10-01. Une connexion intercalée ne perd pas sa destination.
- Le shell responsive et son fournisseur existants sont la référence unique. La visibilité d’une action dépend de l’espace disponible et du shell affiché ; le seuil `sm` actuel de 430 px ne suffit pas à décider que le téléphone est devenu un écran desktop.
- L’assistant reçoit les identifiants et le contexte de lecture. Les opérations sur le stock passent par les commandes partagées de V10-01.

Points d’entrée actuels : [Index](../../src/pages/Index.tsx), [navigation](../../src/components/navigation/AppNavigation.tsx) et [page d’inventaire](../../src/pages/Inventory.tsx). Leurs chemins et usages sont à revalider sur le commit du lot.

## 4. Première utilisation

L’utilisateur doit atteindre une première valeur avant de compléter son profil.

1. Expliquer en une phrase le bénéfice : savoir quoi cuisiner avec son stock.
2. Proposer d’ajouter cinq ingrédients courants, avec ajout manuel toujours disponible.
3. Afficher une première recette et permettre de l’enregistrer ou de la cuisiner.
4. Proposer ensuite de compléter progressivement l’inventaire et les préférences.

Chaque étape est facultative, reprenable et identifiée par compte. Une introduction passée sur un appareil ne réapparaît pas comme une inscription complète sur un autre. La saisie courante est conservée en cas de fermeture ou de connexion nécessaire.

Les allergies et exclusions déjà connues s’appliquent immédiatement. Tant que V10-03 n’est pas livré, l’interface expose les limites des suggestions et n’annonce pas une personnalisation santé qui n’est pas calculée.

Objectif proposé : premier repas sélectionnable en moins d’une minute après un inventaire minimal ; un inventaire initial de 20 produits ne doit pas nécessiter de remplir les métadonnées facultatives de chaque produit. Le temps réel sera mesuré, sans transformer ces objectifs en résultats acquis.

## 5. Aujourd’hui

L’accueil répond à « que puis-je faire maintenant ? ».

| Bloc | Règle |
| --- | --- |
| Prochaine action | Reprendre une cuisine, ranger des achats, vérifier un produit ou choisir un repas selon l’état réel |
| À utiliser bientôt | Petit nombre de produits, date lisible et action vers le stock |
| Idées pour le repas | Jusqu’à trois recettes ; raison, durée, portions et ingrédients manquants |
| Contexte du moment | Temps disponible, envie ou occasion, modifiables sans ouvrir un formulaire long |

Les statistiques générales et analyses détaillées restent accessibles ailleurs. Elles n’occupent pas l’espace initial au détriment d’une action utile. Les états vides proposent une action adaptée : ajouter quelques ingrédients, enregistrer une recette ou réessayer une lecture.

Une suggestion dit « ingrédients disponibles » uniquement après contrôle des quantités, unités et lots. Si le classement personnalisé n’est pas encore disponible, les raisons portent sur le stock, le temps et les préférences réellement appliquées. Le contrat enrichi est défini dans V10-03.

## 6. Stock facile à maintenir

La liste compacte est la présentation initiale proposée. Une présentation en cartes peut être conservée comme préférence par compte, sans imposer de grand emplacement photo pour un produit sans image.

Chaque ligne présente le nom, la quantité avec unité, la zone, la date utile et les actions principales. Elle distingue quantité précise, estimation et quantité à vérifier. Un nombre sans unité n’est pas une information suffisante.

Actions courantes : corriger une quantité, ajouter ou consommer une petite quantité, déplacer le produit, modifier sa date et marquer qu’il n’en reste plus. Une action destructrice affiche son résultat et, lorsque le domaine le permet, une annulation par commande inverse V10-01.

La recherche et les filtres sont accessibles sans ouvrir plusieurs menus. Le geste de balayage peut accélérer une action, mais une commande visible reste disponible. Une correction habituelle vise environ cinq secondes à partir de la liste.

### Dates cohérentes

Aujourd’hui, Stock et fiche produit utilisent le même calcul de jours calendaires et le même fuseau de référence. Le contrat distingue une date seule d’un horodatage. Un produit ne doit pas être annoncé « dans un jour » dans une vue et « aujourd’hui » dans une autre à cause d’un mélange de `floor` et `ceil`.

La date est aussi affichée explicitement, notamment autour de minuit et lors d’un changement de fuseau. Le type de date, sa présence et les règles d’éligibilité relèvent du modèle partagé avec V10-03 ; aucune date inconnue n’est remplacée arbitrairement.

## 7. Cuisiner pas à pas

La fiche de recette conserve les ingrédients et propose un bouton principal « Commencer ». Une session permet ensuite d’avancer dans les étapes, de retrouver la précédente, de régler les portions et d’utiliser les minuteurs associés.

Les portions dérivent toujours des quantités de base de la recette. Une succession de changements de portions ne multiplie pas à nouveau les quantités déjà ajustées. La référence de recette et ses adaptations sont conservées pendant toute la session.

| État | Stock et comportement |
| --- | --- |
| Préparée | Recette, portions et ingrédients consultés ; aucun stock consommé |
| En cours | Étape et minuteurs conservés ; navigation et verrouillage n’effacent pas la progression |
| À confirmer | Récapitulatif des quantités et lots réellement utilisés ; substitutions explicites |
| Confirmation en attente | Commande V10-01 conservée ; un second appui réutilise son identité |
| Terminée | Consommation et journal confirmés ensemble ; stock et recommandations rafraîchis |
| À corriger | Conflit, manque de stock ou conversion impossible expliqués sans faux succès |

L’utilisateur peut utiliser un ingrédient acheté hors inventaire : il le signale dans le récapitulatif. Cette déclaration ne crée pas silencieusement un stock fictif. Démarrer ou abandonner une session ne consomme rien.

Après confirmation, une note de goût ou un favori est facultatif. Le journal n’exige pas de nouvelle saisie pour enregistrer la cuisine déjà confirmée.

### Reprise et persistance

Une session possède une identité, un propriétaire, une référence de recette, les portions, l’étape et l’état de confirmation. Le mécanisme de persistance est choisi après inventaire des mécanismes existants ; il ne crée pas un second journal de consommation.

La sauvegarde de progression et la commande de consommation sont deux objets différents. Une reprise charge la progression, puis vérifie le statut serveur d’une commande déjà envoyée. Elle ne répète pas la consommation au motif que l’écran a été fermé.

La version web vérifie sa persistance après rechargement et expiration de session. La robustesse native après arrêt du processus et la file durable hors ligne sont éprouvées dans V10-04 puis livrées dans V10-05. Le web n’annonce pas une synchronisation hors ligne encore absente.

## 8. Courses et rangement

La liste sépare les achats restants des produits cochés. Cocher un achat prépare son rangement ; le transfert au stock reste une action explicite et atomique.

« Ranger mes achats » ouvre un récapitulatif des produits sélectionnés. Les quantités et unités sont préremplies, les zones et dates peuvent être ajustées rapidement, et une erreur indique précisément ce qui doit être corrigé. Une date inconnue reste inconnue.

La confirmation utilise la commande V10-01. Pendant l’attente, les lignes restent visibles avec leur statut ; après succès, le stock mis à jour est accessible directement. Une réponse perdue peut être retrouvée par l’identité de commande.

Les catégories et éventuels magasins servent au parcours réel de courses. Leur réglage ne doit pas être nécessaire à un premier achat. L’ajout rapide et les cases à cocher restent accessibles avec le clavier et la barre de navigation affichés.

## 9. Capture d’un partage

Un lien de recette partagé devient un brouillon identifiable avant toute navigation. Le brouillon contient la source, son état et la destination souhaitée ; il est lié au compte dès qu’une session valide est disponible.

- Si l’utilisateur doit se connecter, le brouillon est repris ensuite.
- Si l’import échoue, la source reste visible et peut être réessayée ou copiée.
- Si une recette est enregistrée, sa référence commune permet d’ouvrir la fiche et la bibliothèque.
- Un doublon est expliqué ; une fermeture ou un `finally` ne doit pas effacer la capture avant confirmation.

Ce lot corrige le parcours web M03. L’intégration du partage iOS et ses limites de cycle de vie appartiennent aux deux lots natifs. Les extensions de l’import vidéo PRP-240 restent séparées.

## 10. Règles UI et accessibilité

Les textes sont en français et les libellés de catégories sont compréhensibles. Les boutons d’icône ont un nom accessible précis. La couleur seule ne porte pas l’information de disponibilité, de date ou d’erreur.

Les cibles tactiles visent au moins 44 × 44 dans la conception iPhone ; les dimensions CSS et la prise en compte des zones sûres sont vérifiées sur appareil. Les libellés peuvent s’agrandir sans masquer l’action principale. Les contrastes sont testés dans les thèmes réellement proposés.

La barre basse, les boutons fixes, les fenêtres modales et le clavier ne se recouvrent pas. Une action critique ne disparaît pas entre 375 et 440 px. Les dialogues gèrent le focus et le défilement ; VoiceOver peut parcourir le stock, les étapes et le récapitulatif de confirmation dans un ordre utile.

Les états chargement, vide, erreur et session expirée sont conçus pour chaque vue. Une modification non confirmée reste visible et reprenable. Une animation n’est jamais la seule preuve de réussite.

## 11. Découpage proposé en PRs

| PR | Changement | Preuve attendue |
| --- | --- | --- |
| 1 | Navigation, accueil, routes et destinations après connexion | Parcours directs, anciens liens et restrictions familiales testés |
| 2 | Stock compact, correction rapide et dates communes | Même produit cohérent dans toutes les vues ; scénario de correction chronométré |
| 3 | Session de cuisine et reprise | Portions, étapes, verrouillage et confirmation sans consommation doublée |
| 4 | Courses, rangement et brouillon de partage | Courses vers stock ; import échoué et reprise après authentification |
| 5 | Première utilisation et accessibilité des parcours | Essai iPhone réel, VoiceOver, clavier, thèmes et textes agrandis |

Chaque PR réutilise les commandes et invalidations de V10-01. Les tests portent sur les transitions et les risques ; aucune batterie de tests de classes CSS n’est demandée pour les changements visuels simples.

## 12. Validation et critères de sortie

| Scénario | Critère |
| --- | --- |
| Ouvrir l’application connectée | Une action utile visible et les quatre destinations accessibles |
| Corriger un ingrédient | Quantité avec unité, retour serveur visible, résultat retrouvé après rechargement |
| Passer de Stock à Aujourd’hui | Même état de produit et même calcul de date |
| Choisir une recette | Recettes de toutes les origines accessibles ; raisons fondées sur les données |
| Changer les portions puis revenir à la valeur initiale | Quantités identiques aux quantités de base |
| Verrouiller le téléphone pendant la cuisine | Étape retrouvée ; aucun débit de stock automatique |
| Confirmer un repas puis rouvrir l’écran | Une seule consommation et un seul journal confirmés |
| Ranger des achats avec erreur serveur | Produits conservés, erreur lisible et reprise possible |
| Partager un lien avant connexion | Source et destination conservées après authentification |
| Refuser une permission ou ne pas utiliser les gestes | Parcours manuel toujours utilisable |

- [ ] AC01 — Les quatre parcours sont essayés sur Safari et iPhone 17 Pro Max réel ; les preuves indiquent le commit, les données et l’environnement.
- [ ] AC02 — Les largeurs 375 et 440 px restent utilisables ; aucune action principale n’est masquée par un seuil responsive ou la barre basse.
- [ ] AC03 — Le clavier, les zones sûres et l’agrandissement des textes ne bloquent pas les confirmations.
- [ ] AC04 — Les corrections de stock et le rangement utilisent les commandes V10-01 ; les erreurs conservent les saisies.
- [ ] AC05 — Une session se reprend après navigation, verrouillage et rechargement selon les capacités annoncées.
- [ ] AC06 — Les dates sont cohérentes dans Stock et Aujourd’hui, y compris autour de minuit.
- [ ] AC07 — VoiceOver permet d’accomplir une correction de stock et une confirmation de cuisine.
- [ ] AC08 — La première utilisation reste facultative et conduit à une recette sans formulaire complet obligatoire.
- [ ] AC09 — Les noms accessibles, les thèmes et le vocabulaire français sont contrôlés sur les surfaces modifiées.
- [ ] AC10 — Le temps de correction, de choix du repas et les points d’abandon sont relevés ; les objectifs manqués produisent un ajustement documenté.

Les captures Chrome de l’audit sont des preuves de départ. Elles ne remplacent pas les essais Safari, VoiceOver ou iPhone de ce lot.

## 13. Risques et définition de terminé

| Risque | Réponse prévue |
| --- | --- |
| Nouvelle navigation perturbe les habitudes | Tester les quatre tâches et l’accès assistant ; conserver les redirections utiles |
| Session sauvegardée devient un second moteur de stock | Séparer progression et confirmation ; passer par le contrat de domaine commun |
| Accueil agréable mais recommandations peu fiables | Limiter les raisons aux calculs disponibles ; dépendre explicitement de V10-03 |
| Brouillons survivent sous le mauvais compte | Partitionner par propriétaire et contrôler la reprise après connexion |
| Rangement exige trop de saisie | Préremplir les valeurs connues et rendre les métadonnées facultatives explicites |

Le lot est terminé lorsque ses critères ont leurs preuves, que la boucle courses → cuisine a été parcourue sur l’appareil cible et que les écarts restants sont consignés. Le contrat de session et les parcours validés servent au [prototype iOS](PRP-V10-04-Prototype-iOS.md) et au [pilote](PRP-V10-05-Pilote-iOS.md).
