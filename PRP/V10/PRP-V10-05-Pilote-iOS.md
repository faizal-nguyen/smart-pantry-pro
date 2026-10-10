# PRP V10-05 — Pilote iOS et usage quotidien

> Statut : proposition cadrée, réalisation après validation du prototype.
> Création : 2026-10-08. Dépendances actualisées : 2026-10-09.
> Priorité : P1.
> Dépendances : sorties de [V10-01](PRP-V10-01-Fiabilite.md), [V10-02](PRP-V10-02-Routine-Mobile.md), [V10-03](PRP-V10-03-Personnalisation.md), consolidation [03A](PRP-V10-03A-Recettes-Apercus.md), [03B](PRP-V10-03B-Design-Culinaire.md), [03C](PRP-V10-03C-Memoire-Fiable.md), [03D](PRP-V10-03D-Agent-Modeles.md), [03E](PRP-V10-03E-Voix-Cuisine.md) et décision [V10-04](PRP-V10-04-Prototype-iOS.md).
> Références : [feuille de route](README.md), [audit](../../docs/AUDIT-PRODUIT-MOBILE-IOS-2026-10-08.md), décision de stack à produire dans V10-04.
> Estimation indicative : 4 à 8 semaines de réalisation, puis 14 jours d’usage réel.

## 1. Objectif et définition du pilote

Livrer une première application iOS permettant à Faizel de tenir son stock à jour, trouver un repas adapté, cuisiner et préparer ses courses sur iPhone 17 Pro Max. Le pilote vérifie si ces usages deviennent assez fiables et rapides pour revenir spontanément dans la journée.

Il couvre la boucle **courses → rangement → stock → repas → cuisine → stock actualisé**. La qualité du pilote se juge sur les données conservées et les tâches accomplies, puis sur l’usage observé pendant deux semaines.

Le pilote est une étape vers l’application iOS complète. Son succès permet d’étendre le produit ; il ne suppose pas que les menus avancés, widgets, HealthKit et toutes les fonctionnalités futures sont déjà livrés.

## 2. Préconditions de réalisation

- Les commandes de stock, références de recettes et droits d’accès ont leurs preuves V10-01.
- Les parcours quotidiens et la session de cuisine ont été éprouvés dans V10-02.
- Le profil et le moteur de recommandations ont leurs critères V10-03 vérifiés.
- Les aperçus et l'évaluation de fiche sont cohérents selon V10-03A ; la hiérarchie et le langage de V10-03B ont leurs preuves d'usage.
- Mémoire, partage, correction/oubli et continuité suivent V10-03C ; modèles et coûts suivent la configuration retenue dans V10-03D.
- La dictée de V10-03E est éprouvée ; V10-04 établit ses limites natives. La voix continue n'est incluse que si son bénéfice et ses capacités matérielles ont été retenus.
- V10-04 fournit une stack retenue, un build matériel, les règles de synchronisation et une estimation mise à jour.
- L’environnement de test appartient à la bonne application ; l’environnement de production et ses migrations sont identifiés séparément.
- Les accès nécessaires à la signature, au compte développeur et à la distribution sont disponibles avant de fixer une date de livraison.

La documentation actuelle ne crée ni projet natif ni compte de distribution. La publication d’un binaire se prépare et s’effectue lors de la réalisation du lot, dans le périmètre alors autorisé.

## 3. Produit natif inclus

| Surface | Fonctions du pilote |
| --- | --- |
| Aujourd’hui | Prochaine action, produits à vérifier, suggestions justifiées et contexte du repas |
| Stock | Liste compacte, recherche, quantités et unités, corrections, zones, dates et scan |
| Cuisiner | Bibliothèque de toutes les origines avec aperçus, favoris, fiche cohérente avec le moteur, création simple et session pas à pas |
| Courses | Achats, cases à cocher, ajout rapide et rangement confirmé au stock |
| Profil | Préférences, exclusions, consentements, mémoire consultable/corrigeable/effaçable, confidentialité et statut du compte |
| Assistant contextuel | Expliquer, rechercher ou adapter ; texte et dictée au premier plan, contexte/mémoire et commandes partagés |
| Capture | Réception d’un lien, brouillon durable et reprise d’import |
| Synchronisation | File durable, états lisibles, reconnexion et résolution des conflits |
| Rappels | Notifications choisies et minuteurs selon les capacités réellement validées |

Les surfaces principales sont réalisées avec des composants natifs adaptés aux parcours validés. Le web et iOS utilisent la même base de vérité et les mêmes règles métier. Les anciennes pages de statistiques ou fonctions secondaires peuvent rester accessibles sur le web si leur intérêt ne justifie pas encore un portage.

Hors pilote : HealthKit, Apple Watch, widgets, Live Activities, OCR des dates, reconnaissance d’aliments par photo, communauté et gamification. Les évolutions vidéo de PRP-240 et menus complexes ne conditionnent pas le pilote.

La conversation vocale continue reste facultative. Son absence ne bloque pas le pilote ; sa présence exige les preuves V10-03E/V10-04, des limites de coût et un comportement réel documenté lors du verrouillage.

## 4. Expérience iPhone

Les quatre destinations restent stables. Le profil est accessible dans l’en-tête, l’assistant depuis le contexte utile et une conversation complète depuis son entrée dédiée.

Le design reprend les tokens et le vocabulaire validés sans supposer que les composants DOM sont portables. Les listes, dialogues, clavier, sélecteurs et confirmations sont adaptés au client choisi.

| Situation | Comportement attendu |
| --- | --- |
| Une main et grand téléphone | Actions courantes accessibles, aucune confirmation cachée en haut d’un long écran |
| Texte agrandi | Informations et actions conservées ; lignes et boutons peuvent se réorganiser |
| VoiceOver | Noms précis, ordre utile et annonce des changements importants |
| Clavier affiché | Saisie et validation visibles ; retour à la liste sans perdre le brouillon |
| Thème sombre ou clair | Quantités, disponibilités et erreurs lisibles |
| Permission refusée | Fonction manuelle disponible et réglage retrouvable |
| Retour dans l’application | Progression ou brouillon retrouvé, statut de synchronisation compréhensible |

Les cibles tactiles visent au moins 44 × 44 dans la conception native. Les zones sûres et les tailles de texte sont testées sur l’appareil ; une capture redimensionnée du web ne valide pas l’ergonomie native.

## 5. Matrice hors ligne

Le pilote expose ses capacités réelles plutôt qu’un indicateur général « connecté ».

| Opération | Hors ligne | Après retour du réseau |
| --- | --- | --- |
| Lire le stock déjà chargé | Cache du compte, date de dernière synchronisation visible | Réconciliation avec l’état serveur |
| Corriger ou ajouter un produit déjà identifiable | Commande durable et état provisoire distinct | Validation puis résultat confirmé ou conflit |
| Résoudre un code produit inconnu | Saisie manuelle ou brouillon conservé | Résolution et confirmation, sans ajout silencieux |
| Consulter une recette déjà disponible | Ingrédients et étapes conservés | Actualisation sans perdre la session |
| Confirmer une cuisine | Commande durable, résultat en attente | Une consommation et un journal confirmés |
| Créer ou modifier une recette | Brouillon conservé si l’écriture serveur est indisponible | Sauvegarde vérifiée avant badge « enregistrée » |
| Chercher de nouvelles recettes ou appeler l’assistant | Besoin réseau indiqué ; requête ou texte conservé si utile | Reprise explicite, sans dépense ou action répétée silencieuse |
| Importer un lien | Capture durable | Import vérifié et source conservée en cas d’erreur |

Une recommandation en cache indique sa date et son contexte. Elle n’annonce pas que le stock ou le profil est à jour quand une modification reste en attente. Le client peut proposer une action à vérifier, mais pas garantir une compatibilité calculée sur des contraintes dépassées.

La persistance et la file reprennent le modèle validé dans V10-04. Une mise à jour native migre les commandes non confirmées sans changer leur identité. Le traitement reprend au premier plan et ne dépend pas d’un réveil en arrière-plan pour garantir la conservation des intentions.

## 6. Synchronisation, comptes et compatibilité

Chaque commande garde son identité et sa version jusqu’à la confirmation ou à la résolution explicite. Un cache actualisé ne suffit pas à acquitter une intention dont le résultat est encore inconnu.

Les conflits de quantité, version ou unité donnent une action possible : relire le lot, corriger la quantité ou abandonner l’intention avec son effet clairement expliqué. Le client n’écrase pas le stock d’un autre appareil à partir d’un ancien total local.

La déconnexion, l’expiration et le changement de compte suivent la politique V10-04. Aucun brouillon, profil ou mouvement du compte A n’est présenté ni envoyé sous le compte B. Les réglages de confidentialité couvrent aussi les données locales et les intentions non confirmées.

### Versions du client et de l’API

Les migrations conservent une compatibilité définie avec le web et les versions natives distribuées. Le backend valide les versions de payload. Une version ancienne non prise en charge reçoit un résultat explicite ; ses commandes ne disparaissent pas pendant une obligation de mise à jour.

La conservation des résultats de commande reste compatible avec les délais de reprise locale. Une ancienne intention impossible à vérifier demande une réconciliation et n’est pas exécutée à nouveau automatiquement.

## 7. Cuisine native et stock

La session démarre sans consommer. Elle conserve sa recette, les portions, les étapes et les minuteurs. Le récapitulatif final montre les ingrédients réellement utilisés, les substitutions et les achats hors stock déclarés.

L’appui de confirmation utilise la commande commune. Une fermeture pendant l’envoi retrouve le résultat ; un second appui ne crée pas un nouveau repas. Stock, journal et recommandations sont actualisés ensemble après confirmation.

Une annulation utilise l’inverse vérifié de l’opération et respecte les corrections intervenues depuis. La présence d’un bouton d’annulation ne suffit pas : le résultat après modification concurrente doit être testé.

## 8. Rappels utiles et notifications

Les rappels sont proposés à un moment pertinent, avec un consentement facultatif. Le refus ne bloque ni le stock ni la cuisine. Les horaires, catégories activées et possibilité de suspension sont accessibles depuis le profil.

| Type | Condition et destination |
| --- | --- |
| Produit à vérifier | Date et stock encore pertinents ; ouvre le produit ou la liste filtrée |
| Rangement à reprendre | Achats réellement cochés et non transférés ; ouvre le récapitulatif |
| Minuteur | Session concernée ; ouvre l’étape ou le minuteur correspondant |

La réalisation choisit notifications locales ou serveur selon les preuves du prototype et les besoins multiappareils. Une préférence sauvegardée ou une permission acceptée n’est pas comptée comme rappel livré.

Les rappels sont dédupliqués, limités et retirés ou actualisés quand leur condition disparaît. Le fuseau, les dates calendaires et les horaires choisis sont traités explicitement. L’ouverture d’un ancien rappel rafraîchit l’état et explique si le produit a déjà été consommé.

Le lot traite M04. Pour M05, la distribution native et, si le service worker web est modifié, ses caches disposent d’une version et d’une stratégie de mise à jour testées. Une mise à jour ne réactive pas des écritures web hors ligne non vérifiées.

## 9. Exploitation et distribution du pilote

Une version pilote est préparée pour un canal de distribution iOS adapté, avec TestFlight comme proposition. La procédure comprend configuration, signature, numéro de version, environnement, notes de version et méthode de retour des bugs. Les identifiants et secrets restent dans les mécanismes appropriés, hors dépôt.

Les incidents ont un identifiant de commande, un état et un contexte technique minimal. Les journaux de produit ne collectent pas les allergies, le contenu de santé ou les conversations. Une trace de diagnostic ne doit pas transformer le pilote en collecte sensible générale.

Avant distribution, vérifier les migrations sur l’environnement cible et un scénario web existant. La mise à disposition d’un binaire n’est pas une preuve de bonne synchronisation ni de recette correctement persistée.

Pour une régression critique, suspendre les écritures concernées en conservant les intentions récupérables et distribuer la correction. Un rollback ne remet pas en service les chemins de consommation ou transfert dangereux de l’audit.

## 10. Découpage proposé en PRs

| PR | Changement | Preuve attendue |
| --- | --- | --- |
| 1 | Fondation native retenue, shell, session et stockage | Installation reproductible, comptes isolés et migrations locales |
| 2 | Stock, scan et file durable | Ajout, correction, refus caméra, réponse perdue et reprise |
| 3 | Recettes, session de cuisine et bibliothèque | Toutes les origines, aperçus, fiche commune, brouillons, portions et confirmation unique |
| 4 | Aujourd’hui, courses, profil, mémoire et assistant contextuel | Boucle complète, recommandations cohérentes, correction/oubli et dictée avec repli texte |
| 5 | Partage, rappels, accessibilité et mises à jour | Permissions, liens, minuteurs, VoiceOver et conservation des intentions |
| 6 | Qualification, distribution et préparation de l’observation | Version identifiée, scénarios réels et journal du pilote |

Les sous-lots sont ajustés après l’ADR. Chaque PR ajoute une capacité testable ; les fonctions déjà prouvées ne sont pas réécrites pour changer seulement leur apparence.

## 11. Protocole d’usage réel de 14 jours

### Avant le premier jour

Relever la version et le contexte. Comparer l’inventaire à vingt ingrédients physiques représentatifs : masses, volumes, pièces, plusieurs lots, quantités approximatives et produits absents. Noter les écarts plutôt que corriger les données avant de mesurer.

Chronométrer une correction courante, un choix de repas et un rangement d’achats. Le temps de référence est une mesure initiale ; les objectifs de la feuille de route ne sont pas des résultats préexistants.

### Jours 1 à 7

Utiliser l’application pendant les repas et courses réels. Noter brièvement la tâche, sa réussite, un éventuel abandon et sa cause. Inclure au moins un rangement, une cuisine avec confirmation et une reprise après perte de réseau ou interruption.

Faire un point intermédiaire sur le stock et les incidents. Les corrections P0 sont traitées immédiatement ; une mesure prise sur une version corrigée indique ce changement de version.

### Jours 8 à 14

Observer l’usage spontané avec moins de sollicitations. Refaire le contrôle des ingrédients physiques et les chronométrages. Demander ce qui a été accompli facilement, évité, ou fait ailleurs à cause d’un défaut.

Le journal d’usage est léger. Une tâche accomplie vaut davantage qu’une simple ouverture. Les jours sans besoin culinaire sont distingués des jours où l’application était nécessaire mais évitée.

## 12. Mesures et décision après pilote

| Mesure | Objectif proposé | Méthode |
| --- | --- | --- |
| Concordance du stock | Au moins 90 % de l’échantillon | Comparaison physique, avec tolérance adaptée aux quantités estimées |
| Perte ou double mouvement | Aucun incident | Résultats de commandes et vérification du stock |
| Correction courante | Environ cinq secondes | Même tâche de référence, plusieurs essais |
| Choix d’un repas | Moins d’une minute | Temps jusqu’à une recette retenue, données déjà disponibles |
| Fréquence utile | Cible de cinq jours par semaine si les besoins sont présents | Jours avec une tâche accomplie et motifs d’abandon |
| Reprise | Aucune intention perdue | Scénarios interruption, expiration et réponse perdue |
| Suggestions | Raisons comprises et correction possible | Retour sur les suggestions retenues ou rejetées |

Ces seuils sont des objectifs de pilote. Le rapport fournit résultats, taille de l’échantillon, version et limites ; il ne présente pas deux semaines comme la preuve définitive d’une habitude durable.

La décision est **GO extension**, **corrections puis nouvel essai**, ou **NO-GO**. Une perte de données, un accès entre comptes, une double consommation ou un faux succès critique interdit le GO tant que l’incident n’est pas corrigé et reproduit avec succès. Si l’usage ou les temps restent insuffisants, documenter les causes et modifier les parcours avant d’ajouter des fonctionnalités secondaires.

## 13. Critères de sortie

- [ ] AC01 — La version pilote est installée sur l’iPhone 17 Pro Max réel, avec build, environnement et backend identifiés.
- [ ] AC02 — Les quatre parcours principaux sont utilisables, avec profil et assistant accessibles.
- [ ] AC03 — Le stock, les achats et les recettes sont retrouvés après reconnexion ; toutes les origines de recettes fonctionnent.
- [ ] AC04 — Transfert et cuisine restent atomiques et idempotents dans le client natif.
- [ ] AC05 — Une intention hors ligne survit à l’arrêt du processus, à la reprise et à une mise à jour native testée.
- [ ] AC06 — Réponse perdue, session expirée, conflit et changement de compte sont éprouvés sans perte ni accès croisé.
- [ ] AC07 — Les portions, étapes, substitutions et annulations respectent les contrats partagés.
- [ ] AC08 — Les permissions refusées conservent un parcours utile ; les fonctions dépendantes ne prétendent pas être activées.
- [ ] AC09 — Au moins un rappel ou minuteur activé est réellement reçu et ouvre la bonne destination ; les cas supprimés et obsolètes sont testés.
- [ ] AC10 — VoiceOver, texte agrandi, clavier, thèmes et zones sûres sont vérifiés sur les tâches critiques.
- [ ] AC11 — La compatibilité API, la mise à jour et les intentions anciennes ont une stratégie testée ; aucun rollback dangereux n’est prévu.
- [ ] AC12 — Les 14 jours d’usage ont un rapport avec données de départ, mesures finales, incidents et décision.
- [ ] AC13 — Aucun incident critique de perte, répétition, accès croisé ou faux succès ne reste ouvert.
- [ ] AC14 — Aperçus, portions, contraintes et nutrition de fiche conservent les contrats V10-03A et la hiérarchie validée V10-03B.
- [ ] AC15 — Mémoire, correction, oubli et consentements produisent le même effet entre web et iOS ; aucun fait supprimé ne réapparaît par un résumé.
- [ ] AC16 — Dictée, refus du micro et interruptions sont éprouvés ; toute voix continue incluse respecte la décision matérielle et les budgets retenus.

## 14. Risques et définition de terminé

| Risque | Réponse prévue |
| --- | --- |
| Portage ajoute des écrans sans rendre la routine plus simple | Tester la boucle complète et mesurer les abandons |
| Application native diverge du web | Backend, références et commandes communs ; vérification des deux clients |
| Plusieurs appareils créent des conflits | Versions, mouvements et résolution explicite |
| Notification devient une promesse sans livraison | Tester réception, destination, déduplication et permission refusée |
| Pilote trop court ou trop accompagné | Distinguer apprentissage et usage spontané ; prolonger si les données sont insuffisantes |

Le lot est terminé après livraison qualifiée et rapport d’usage de 14 jours, avec ses critères vérifiés et une décision documentée. Les extensions vers l’application iOS complète sont priorisées sur les besoins encore observés : elles ne remplacent pas les corrections nécessaires à la confiance quotidienne.
