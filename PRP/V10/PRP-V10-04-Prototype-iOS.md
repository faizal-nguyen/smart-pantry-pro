# PRP V10-04 — Prototype iOS et décision technique

> Statut : prototype à réaliser ; stack native non arrêtée.
> Création : 2026-10-08. Dépendances actualisées : 2026-10-09.
> Priorité : P1, validation préalable au pilote.
> Dépendances : contrats de [V10-01](PRP-V10-01-Fiabilite.md), parcours de [V10-02](PRP-V10-02-Routine-Mobile.md), moteur de [V10-03](PRP-V10-03-Personnalisation.md) et sorties de consolidation [03A](PRP-V10-03A-Recettes-Apercus.md), [03B](PRP-V10-03B-Design-Culinaire.md), [03C](PRP-V10-03C-Memoire-Fiable.md), [03D](PRP-V10-03D-Agent-Modeles.md) et [03E](PRP-V10-03E-Voix-Cuisine.md).
> Références : [feuille de route](README.md), [audit](../../docs/AUDIT-PRODUIT-MOBILE-IOS-2026-10-08.md), contrats partagés existants.
> Estimation indicative : environ une semaine ; accès, intégrations et questions audio transmises par V10-03E peuvent imposer une révision.

## 1. Objectif et décision à produire

Valider une application iOS sur les contraintes qui comptent au quotidien : scan d’un produit, connexion fiable, action hors ligne, synchronisation après interruption et cuisine avec reprise. Le résultat est une décision technique appuyée sur des essais matériels et une estimation du pilote.

Le prototype reprend les aperçus et l'évaluation de fiche V10-03A, la hiérarchie V10-03B, la politique mémoire V10-03C et le backend V10-03D. V10-03E fournit une dictée web homologuée et une décision sur la voix continue. Les questions natives encore ouvertes sont des essais de ce prototype ; elles ne sont pas exigées à l'avance pour terminer le lot web.

React Native avec Expo est l’hypothèse de départ, notamment pour les types et règles TypeScript réutilisables. SwiftUI reste une alternative. Aucun choix n’est réputé validé par la rédaction de cette PRP.

L’audit M02 montre que la file web existante ne constitue pas un moteur hors ligne opérationnel. Les essais du prototype utilisent les commandes atomiques et idempotentes de V10-01 ; un faux backend peut aider au développement, mais ne suffit pas à prouver la synchronisation.

## 2. Périmètre du prototype

| Parcours | Ce que le prototype doit prouver |
| --- | --- |
| Connexion et stock | Authentification sur le bon environnement et lecture des lots du compte |
| Scan vers ajout | Permission caméra, lecture d’un code-barres, résolution produit et confirmation manuelle |
| Hors ligne | Commande conservée, statut visible, reprise après fermeture de l’application |
| Retour réseau | Une seule exécution, même après réponse perdue ou envoi répété |
| Cuisine | Portions, progression sauvegardée et confirmation via le contrat commun |
| Voix au premier plan | Dictée corrigible, contexte et mêmes commandes que le texte, avec repli manuel |
| Cycle de vie audio | Verrouillage, suspension, Bluetooth et reprise ; conversation continue uniquement si retenue après V10-03E |
| Capture de partage | Faisabilité de réception d’une URL, conservation et reprise après connexion |
| Permissions et cycle de vie | Refus utilisable, verrouillage, suspension et relance testés |

Le prototype ne livre pas tout le design final, l’App Store, un nouveau moteur de recommandations, HealthKit ou une refonte du backend. Les notifications sont éprouvées sur leur capacité nécessaire aux minuteurs ; le produit complet des rappels appartient à V10-05.

La décision audio peut retenir seulement la dictée au premier plan. Si la voix continue est différée, documenter ce choix et les capacités manquantes ; ne pas construire les trois transports de V10-03E dans le prototype natif.

## 3. Comparaison technique

| Critère | React Native / Expo, hypothèse | SwiftUI, alternative | Preuve de décision |
| --- | --- | --- | --- |
| Réutilisation métier | Types et modules TypeScript indépendants du DOM | Contrat API à consommer depuis Swift | Inventaire des modules réellement portables |
| UI et accessibilité | Composants natifs à construire ; composants web non directement réutilisables | Composants iOS à construire | Essai des parcours avec texte agrandi et VoiceOver |
| Caméra et partage | Compatibilité des modules et extensions à vérifier | Intégrations iOS à réaliser | Construction et essai sur appareil |
| Persistance hors ligne | Stockage local durable et migrations à choisir | Stockage local durable et migrations à choisir | Commande retrouvée après arrêt du processus |
| Exploitation | Builds, mises à jour et compatibilité à établir | Builds, mises à jour et compatibilité à établir | Procédure reproductible et effort documenté |

Commencer par une tranche React Native/Expo si elle est compatible avec les contraintes constatées. Une intégration impossible ou trop coûteuse déclenche un essai ciblé de l’alternative ; il n’est pas nécessaire de développer deux applications complètes pour prendre la décision.

Les versions, modules et modes de build sont vérifiés dans leurs documentations officielles au moment de la réalisation. Un essai dans un environnement de prévisualisation ne prouve pas les fonctions qui exigent un binaire natif ou une extension.

## 4. Architecture proposée

Emplacement de travail envisagé : `apps/mobile`, à confirmer selon l’organisation du monorepo. Les contrats restent dans les packages partagés et la logique serveur demeure dans l’API existante.

| Couche | Responsabilité |
| --- | --- |
| Client iOS | UI, permissions, lecture locale, progression de cuisine et statut de synchronisation |
| Persistance locale | Cache par compte, brouillons, sessions et file de commandes durable |
| Authentification | Stockage adapté aux secrets, renouvellement et déconnexion contrôlée |
| API commune | Autorisation, validation, commandes et recommandations |
| Base serveur | Stock de référence, mouvements et résultats de commande atomiques |

Les secrets serveur et clés privilégiées ne sont pas embarqués. Les journaux ne contiennent pas les jetons de session. La configuration pointe explicitement vers l’application et l’environnement de test concernés.

Les endpoints et accès Supabase retenus sont inventoriés avant intégration : une lecture directe éventuelle doit avoir les mêmes protections vérifiées que ses équivalents web. Un accès natif ne contourne pas les règles du backend.

## 5. Persistance et file de commandes

Le stockage local doit survivre à un arrêt du processus et à un redémarrage. SQLite est un candidat à évaluer ; son choix, ses migrations et la protection des données doivent figurer dans la décision technique.

Une intention métier est persistée avant envoi. Elle comprend `command_id`, type, version de payload, propriétaire local, paramètres et statut. Le serveur déduit l’identité autorisée de la session, conformément à V10-01.

| État local | Signification |
| --- | --- |
| En attente | Intention conservée ; aucun succès serveur annoncé |
| En cours d’envoi | Tentative engagée, réponse pas encore vérifiée |
| Synchronisée | Résultat serveur confirmé et cache réconcilié |
| Connexion nécessaire | Commande conservée, traitement suspendu |
| En conflit | Version ou stock incompatibles ; décision utilisateur requise |
| À corriger | Payload ou unité invalides ; aucune répétition aveugle |

Un état local provisoire peut aider l’utilisateur, mais sa confirmation serveur reste distincte. Deux intentions ne partagent pas artificiellement une clé ; les reprises d’une même intention gardent sa clé et son payload.

### Reprise, ordre et conflits

Après une réponse perdue, consulter ou renvoyer la même commande selon le contrat serveur. Le résultat déjà confirmé est retourné sans appliquer de nouveau le mouvement.

Les commandes dépendantes sont ordonnées. Deux consommations ne sont pas fusionnées en une correction absolue. Les conflits de versions et de quantité demandent une relecture ; le client ne règle pas les désaccords par le dernier horodatage local.

La durée de conservation des résultats serveur et celle de la file locale sont définies ensemble. Une intention plus ancienne que la fenêtre de vérification ne doit pas être rejouée automatiquement avec un risque de répétition : elle passe en état à réconcilier.

### Comptes et confidentialité

Le cache et la file sont partitionnés par compte. Une commande de A ne part jamais avec la session de B. La déconnexion suspend les intentions non confirmées et les rend inaccessibles au compte suivant.

La politique de conservation des intentions non confirmées est explicite : stockage protégé, reprise uniquement par leur propriétaire et suppression contrôlée. Le cache de lecture et les secrets suivent les règles de déconnexion ; effacer une intention non confirmée ne doit pas être une conséquence invisible.

## 6. Tranche scan → stock

1. Demander la caméra à l’action de scanner.
2. Lire un code-barres et proposer le produit résolu, avec source et informations connues.
3. Permettre de corriger le produit, la quantité, l’unité et la zone.
4. En cas de produit inconnu, continuer par saisie manuelle et conserver le code si utile.
5. Confirmer l’ajout avec la commande partagée et afficher son statut.

Le scan ne crée pas un lot avant confirmation. Il ne déduit pas une date de péremption absente et ne déclenche pas plusieurs ajouts quand la caméra lit plusieurs fois le même code. Le refus de caméra conserve le parcours manuel.

L’OCR des dates, la reconnaissance de photo alimentaire et la vidéo avancée sont hors tranche obligatoire. Ils ne conditionnent pas le maintien fiable du stock.

## 7. Tranche cuisine et partage

La session de cuisine reprend le contrat V10-02 : référence de recette, portions de base, étape, minuteurs et confirmation séparée. Les ingrédients de bibliothèque personnalisés ne sont pas remplacés par ceux du catalogue lors de la reprise.

La progression survit à la navigation, au verrouillage et à la fermeture. La consommation n’intervient qu’au récapitulatif final confirmé. Une interruption pendant cette confirmation retrouve l’état de la même commande.

Le partage iOS est une preuve de faisabilité, pas une promesse de traitement immédiat en arrière-plan. Le prototype démontre la conservation d’une URL, son attribution au bon compte et sa reprise dans l’application. L’architecture précise ce que réalise l’extension, le client au premier plan et le worker serveur éventuel.

Une capture reçue sans connexion n’est ni perdue ni importée sous une ancienne session. Son traitement peut attendre l’authentification et la disponibilité du réseau.

## 8. Livrables du prototype

- Binaire de développement reproductible et procédure de configuration, avec versions et environnement indiqués.
- Rapport des essais sur iPhone 17 Pro Max réel, distinguant simulateur, appareil, fixtures et backend réel.
- Exemples de commandes et résultats, anonymisés, montrant leur identité conservée lors des reprises.
- Modèle de file locale, politique de comptes et règles de réconciliation.
- Décision technique dans `PRP/V10/ADR-V10-iOS.md`, à créer à l’issue du prototype, avec alternatives, limites, coût et risques.
- Estimation révisée et éventuelles adaptations de [V10-05](PRP-V10-05-Pilote-iOS.md).

Le fichier ADR est un livrable futur. Il ne doit pas être rempli aujourd’hui comme si les essais étaient faits.

## 9. Découpage proposé en PRs

| PR | Changement | Preuve |
| --- | --- | --- |
| 1 | Projet natif minimal, authentification et contrats | Build installé, lecture du bon compte, configuration reproductible |
| 2 | Stock local, commande hors ligne et réconciliation | Arrêt forcé et réponse perdue sans perte ni double effet |
| 3 | Scan, session de cuisine, dictée et partage ciblé | Essais matériels, permissions, reprise et limites audio |
| 4 | Rapport et décision de stack | GO ou NO-GO motivé, écarts et estimation du pilote |

Ces PRs restent expérimentales tant que la décision n’est pas produite. Le code retenu est nettoyé avant de servir de fondation au pilote.

## 10. Matrice d’essai et critères de sortie

| Essai | Résultat requis |
| --- | --- |
| Caméra refusée | Ajout manuel complet et demande de permission compréhensible |
| Code connu puis inconnu | Produit vérifiable ou saisie manuelle, sans doublon automatique |
| Création d’une intention hors ligne | Intention persistée et indiquée en attente |
| Arrêt du processus puis relance | Intention et progression retrouvées |
| Réseau rétabli après confirmation serveur sans réponse client | Une seule écriture, résultat retrouvé |
| Session expirée | Connexion demandée, intention conservée et propriétaire contrôlé |
| A déconnecté, puis B connecté | Aucun accès ni envoi des commandes de A par B |
| Stock modifié par un autre client | Conflit explicite ou résultat valide sur l’état actuel |
| Recette personnelle et portions modifiées | Même recette et mêmes quantités lors de la reprise |
| Verrouillage pendant la cuisine | Progression retrouvée ; minuteur conforme à la capacité annoncée |
| Micro refusé ou transcription interrompue | Texte disponible, aucune exécution avant envoi de la demande corrigée |
| Bluetooth, verrouillage ou suspension pendant l'audio | État et reprise conformes à la capacité retenue ; aucune double commande |
| URL partagée avant connexion | Brouillon repris après connexion sans perte de source |

- [ ] AC01 — Les fonctions natives déterminantes sont essayées dans un binaire sur l’appareil cible.
- [ ] AC02 — Les commandes survivent à l’arrêt du processus ; l’essai couvre un transfert ou une consommation, pas seulement une lecture.
- [ ] AC03 — La réponse perdue est reproduite après confirmation serveur ; aucun double effet n’apparaît.
- [ ] AC04 — L’expiration de session et le changement de compte ne perdent ni ne mélangent les intentions.
- [ ] AC05 — Le scan reste utile en cas de refus ou de produit inconnu ; les essais consignent les conditions de lecture.
- [ ] AC06 — Une recette se cuisine avec reprise des étapes et une seule confirmation de consommation.
- [ ] AC07 — La faisabilité du partage et des minuteurs est établie, avec les limites relevées.
- [ ] AC08 — Le rapport identifie les fonctions testées, les échecs et les contrôles encore bloqués.
- [ ] AC09 — Une stack est retenue dans l’ADR sur les preuves ; l’estimation du pilote est recalibrée.
- [ ] AC10 — Les questions audio de V10-03E ont une réponse matérielle : dictée, refus, interruption, Bluetooth et comportement au verrouillage ; le statut de la voix continue est explicite.

Un accès matériel, de signature ou de backend manquant reste une validation bloquée. Un prototype uniquement simulé ne suffit pas à prononcer le GO du pilote natif.

## 11. Risques et définition de terminé

| Risque | Réponse prévue |
| --- | --- |
| Réutilisation web surestimée | Inventorier DOM, bibliothèques et logique portable dès la première PR |
| Intégrations exigent davantage de natif | Construire le binaire tôt, vérifier les modules et isoler l’essai difficile |
| File locale persiste mais répète un effet | Prouver le scénario de réponse perdue contre V10-01 |
| Fenêtres de conservation incompatibles | Définir les règles de reprise ancienne avec le backend |
| Une semaine insuffisante | Documenter la cause, réduire les essais secondaires et revoir l’estimation sans inventer de validation |

Le lot est terminé lorsque la décision de stack, les preuves matérielles et les contrats de synchronisation sont disponibles. Le [pilote iOS](PRP-V10-05-Pilote-iOS.md) peut alors être engagé avec les risques connus et des critères mesurables.
