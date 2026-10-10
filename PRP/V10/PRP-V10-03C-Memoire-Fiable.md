# PRP V10-03C — Mémoire fiable de l'assistant

> Statut : spécification rédigée ; réalisation non commencée.
> Date : 2026-10-09.
> Priorité : P1 pour classification, partage et gestion ; P2 pour les résumés entretenus.
> Dépendances : profil et feedback de [V10-03](PRP-V10-03-Personnalisation.md), commandes de [V10-01](PRP-V10-01-Fiabilite.md), interfaces de [V10-02](PRP-V10-02-Routine-Mobile.md).
> Coordination : vocabulaire et accès de [V10-03B](PRP-V10-03B-Design-Culinaire.md) ; politique utilisée par [V10-03D](PRP-V10-03D-Agent-Modeles.md) et [V10-03E](PRP-V10-03E-Voix-Cuisine.md).
> Source : [audit du 9 octobre](../../docs/AUDIT-DESIGN-MEMOIRE-VOIX-2026-10-09.md), M01 à M05 ; référence locale `dda2602`.
> Estimation indicative : 6 à 10 jours, à réviser après inventaire des droits, données historiques et réglages actifs.

## 1. Besoin confirmé et résultat attendu

La mémoire demandée est celle de l'assistant dans l'application : goûts, habitudes, retours sur les recettes et continuité des échanges. L'utilisateur doit pouvoir savoir ce qui a été retenu, le corriger et l'effacer.

La fondation existe, mais ses usages divergent. Le contexte automatique exclut les préférences culinaires lorsque le lecteur de profil est fourni ; un tool peut encore lire des souvenirs sans le même filtre de sensibilité. L'extraction peut créer deux entrées pour une phrase et activer une préférence ordinaire contenant une allergie. Le panneau masque les erreurs, et aucun appel à la production de résumés n'a été trouvé.

Le résultat est une mémoire reliée au produit, avec une source de vérité par information, une politique commune sur tous les chemins et un résultat de mémorisation vérifiable. La présence d'une table ou d'un souvenir affiché ne suffit pas à prouver son usage.

## 2. Périmètre et fondations

Réutiliser [la migration mémoire existante](../../supabase/migrations/20260513120000_create_assistant_memory_foundation.sql), conversations, messages, souvenirs, résumés, contexte temporaire et journal de cuisine. Réutiliser le profil versionné, les interactions et le moteur V10-03.

Inclus : classification et déduplication ; consentements ; règle de partage commune ; mémoire utile dans le contexte et le classement ; correction/oubli ; persistance fiable ; continuité des conversations ; résumés bornés ; export/suppression ; réparation contrôlée des incohérences historiques.

Ce lot ne crée pas un moteur vectoriel, un agent autonome de suivi médical ou une seconde base de profil. La mise à jour des modèles reste indépendante. Les exemples et tests sont fictifs.

## 3. Une destination par information

| Information | Destination de référence | Effet attendu |
| --- | --- | --- |
| Allergie, exclusion, régime, objectif confirmé | Profil alimentaire V10-03 | Filtrage déterministe ; changement explicite et versionné |
| Ingrédient aimé/évité, cuisine, matériel, temps ou portions habituels | Champ correspondant du profil lorsqu'il existe | Personnalisation existante, sans préférence concurrente |
| Préférence culinaire durable non représentée dans le profil | Souvenir confirmé et structuré | Contexte assistant ; classement seulement si un critère défini sait l'exploiter |
| « À refaire », « Trop long », recette appréciée | Interaction de recette et journal existants | Effet observable dans le moteur V10-03 |
| Envie de ce soir, temps de ce repas | Contexte temporaire | Utilisation pour ce repas, expiration explicite |
| Échange passé | Conversation et résumé entretenu | Continuité ; un résumé n'est pas une contrainte confirmée |

Une instruction durable comme « Souviens-toi que je préfère les plats épicés » produit une seule information, avec destination affichée. Si elle correspond à un champ de profil, utiliser sa commande plutôt que conserver deux valeurs actives.

Pour les préférences complémentaires, définir un payload structuré et un effet avant activation. Premier cas proposé : préférence de plats épicés, utilisée comme signal de goût sur des recettes dont les tags ou ingrédients normalisés documentent ce caractère. Les recettes non documentées restent neutres ; ce signal ne devient jamais une contrainte d'allergie. Le test compare le classement à profil, stock et contexte identiques, puis vérifie sa disparition après oubli. Un souvenir sans critère de classement compatible peut servir au dialogue, mais l'UI n'annonce pas qu'il influence les suggestions.

Une préférence inférée reste candidate. Une envie ponctuelle ne devient pas permanente. Un retour négatif sur une recette ne devient pas automatiquement une exclusion d'ingrédient.

Une contrainte sensible exprimée en conversation ouvre une proposition de changement du profil ; elle ne devient pas une préférence ordinaire active. Appliquer immédiatement la demande explicite à la réponse courante, avec qualification, sans annoncer une sauvegarde durable avant confirmation.

Le profil confirmé gouverne toujours les exclusions. Une mémoire contradictoire ne l'assouplit pas. Oublier un souvenir ne retire pas silencieusement une allergie du profil : montrer le lien vers le réglage concerné.

## 4. Consentement, usage et partage

Étendre les réglages existants de [privacyApi](../../src/services/privacyApi.ts) et [settings.privacy.routes](../../apps/api/src/routes/settings.privacy.routes.ts), après inventaire de leur stockage. Proposition : `assistantMemoryEnabled`, distinct de `saveHistory`, du consentement du profil et de `shareWithAssistant`.

| Réglage / état | Comportement |
| --- | --- |
| Mémoire durable activée | Extraction et sauvegarde selon la destination, la provenance et la sensibilité |
| Mémoire durable désactivée | Pas de nouveaux souvenirs ni de réemploi automatique des anciens ; proposer consultation et suppression |
| Historique désactivé | Pas de nouvel historique durable ni résumé ; contexte de la session courante seulement, selon le contrat existant vérifié |
| Profil partagé avec l'assistant | Champs autorisés utilisables par le modèle selon la politique commune |
| Profil non partagé | Le moteur déterministe garde ses contraintes ; ne pas transmettre les détails stockés au modèle via un autre chemin |
| Lecture de réglages impossible | Ne pas envoyer ni sauvegarder automatiquement des données persistantes dont l'autorisation est inconnue |
| Révocation pendant une requête | Recontrôler avant envoi au fournisseur et avant sauvegarde ; invalider contexte, résumés utilisables et caches concernés |

Une question courante volontairement envoyée à l'assistant constitue son entrée. Cela n'autorise pas automatiquement le partage d'autres données stockées ni leur conservation durable.

Une demande « souviens-toi » avec la mémoire désactivée propose son activation sans prétendre avoir mémorisé. Un changement destiné au profil suit le consentement et les commandes du profil, sans détour par une mémoire ordinaire.

À la migration, une autorisation absente ne devient pas un consentement implicite : le nouveau réglage reste désactivé jusqu'au choix explicite. Les anciens souvenirs restent consultables et supprimables ; ils ne sont ni effacés ni transmis automatiquement. Documenter la transition et vérifier les anciens clients.

Les choix de désactivation et de suppression restent distincts. L'UI explique leur effet et respecte la durée de conservation existante. Aucun réglage n'est remplacé par un second interrupteur contradictoire.

## 5. Politique commune de lecture

Créer un module serveur de politique partagé, emplacement à confirmer à l'étape C0. Il reçoit compte, finalité, consentements, version du profil, statut, sensibilité, provenance et expiration ; il produit un ensemble de faits autorisés avec leurs références.

Les finalités distinguent consultation personnelle dans l'UI, moteur déterministe, contexte du modèle et résultat de tool envoyé au modèle. Pouvoir lire ses souvenirs dans l'application ne vaut pas autorisation de tous les transmettre au fournisseur.

| Chemin à intégrer | Règle |
| --- | --- |
| [ContextBuilder](../../apps/api/src/services/assistant/ContextBuilder.ts) | Filtrer avant sélection des huit souvenirs pertinents ; garder les préférences autorisées sans contredire le profil |
| [handlers/memory](../../apps/api/src/services/assistant/handlers/memory.ts) | `read_user_memories` suit la même politique, y compris sensibilité et finalité |
| Historique et recherche | Pas de réintroduction d'un fait effacé ou non partageable par un ancien message |
| Résumés | Même politique et révision ; jamais un canal de contournement des consentements |
| Résultats de recommandations vers le modèle | Retirer les détails de profil non autorisés ; garder seulement les résultats nécessaires autorisés |
| Synthèse de [VoiceAgentService](../../apps/api/src/services/assistant/VoiceAgentService.ts) | Ne pas sérialiser aveuglément un résultat de tool complet |

Ne pas supprimer simplement le filtre V10-03 pour rendre toutes les mémoires actives. Vérifier aussi les anciens readers et leurs callers, dont les scores historiques, pour ne pas réactiver une logique concurrente.

Chaque fait utilisé conserve provenance et destination. Le modèle peut expliquer ces faits ; il ne transforme pas sa propre hypothèse en information confirmée.

## 6. Extraction, déduplication et preuve d'écriture

Modifier [MemoryExtractor](../../apps/api/src/services/assistant/MemoryExtractor.ts) : classifier la phrase avant la règle générique « souviens-toi », traiter les contraintes sensibles en priorité et produire des informations distinctes sans doublons sémantiques.

Exemples fictifs obligatoires :

- « Souviens-toi que je préfère les plats épicés » : une préférence durable, une destination.
- « Souviens-toi que je suis allergique aux cacahuètes » : proposition sensible à confirmer dans le profil ; aucune préférence ordinaire active contenant cette allergie.
- « Ce soir, pas épicé » : contexte du repas ; pas de remplacement du goût durable.
- « Finalement je préfère les plats doux » : correction explicite de la préférence correspondante, avec provenance.

La clé sémantique combine propriétaire, type de fait, sujet et destination. La normalisation du texte seule n'est pas une identité suffisante. Deux requêtes simultanées doivent aboutir à un seul état actif cohérent, avec une contrainte ou une commande atomique en base.

Contrat de commande proposé pour créer, confirmer, corriger ou oublier : `command_id`, version attendue, opération et payload validé. Réutiliser les conventions V10 de reçus, avec un domaine mémoire distinct ; ne pas détourner la table des commandes de stock.

Le résultat distingue `saved`, `awaiting_confirmation`, `disabled`, `not_saved` et `verification_required`. Une réponse perdue se vérifie avec la même identité, sans refaire aveuglément l'effet.

Attendre l'extraction et l'écriture nécessaires à une promesse « retenu ». L'actuel lancement non attendu ne constitue pas une preuve durable en environnement serverless. Une erreur de mémoire peut laisser la conversation utilisable, mais son statut reste visible et réessayable.

Pour un fait destiné au profil, la commande de profil est la preuve principale. Une éventuelle référence dans la mémoire est dérivée de la version confirmée ; son échec ne doit ni annuler silencieusement la contrainte ni annoncer une référence inexistante.

## 7. Consultation, correction et oubli

Relier [MemoryPanel](../../src/components/assistant/MemoryPanel.tsx), [AssistantMemorySection](../../src/components/settings/AssistantMemorySection.tsx) et [useAssistantMemories](../../src/hooks/useAssistantMemories.ts). Réutiliser les routes de [assistantApi](../../src/services/assistantApi.ts) et [assistant.memory](../../apps/api/src/routes/assistant.memory.ts), avec extension explicite des contrats si nécessaire.

Chaque entrée affiche : contenu compréhensible, destination, origine, confirmé/proposé, date et éventuelle expiration. Prévoir recherche simple et accès court depuis l'assistant.

| Action | Résultat |
| --- | --- |
| Confirmer | Activation ou mise à jour du profil selon destination ; reçu et version |
| Corriger | Édition réelle, classification réévaluée, ancien fait remplacé sans deux valeurs actives |
| Oublier | Retrait du réemploi, invalidation des contextes et traitement des résumés/historiques dérivés |
| Rejeter | Une suggestion ne se repropose pas immédiatement sans nouvel élément |
| Réessayer | Reprise avec le même identifiant si le résultat précédent est incertain |

Erreur de lecture, chargement et liste réellement vide ont des états distincts. Un conflit entre deux clients conserve l'édition et expose l'état actuel.

Les commandes par texte et par voix appellent les mêmes opérations. Le changement de compte ferme les données précédentes et les réponses tardives ne mettent pas à jour le nouveau compte.

## 8. Continuité et résumés entretenus

L'aide contextuelle conserve un `conversationId` par compte et contexte de tâche lorsqu'elle poursuit un échange. « Nouvelle conversation » reste explicite ; un identifiant de requête différent ne signifie pas systématiquement une nouvelle conversation.

Mettre réellement en service `recordSummary`, après validation du partage et de l'historique. Déclencheur proposé : vingt messages non couverts ou dépassement du budget de contexte, configurable après mesure.

Processus : figer les IDs et la révision de confidentialité, construire une entrée autorisée et bornée, générer un résumé avec budget limité, recontrôler les révisions, puis enregistrer une seule couverture de ces messages. Les contraintes confirmées restent lues depuis le profil, pas depuis un texte résumé.

L'appel et la persistance sont attendus avec un délai et un coût bornés. Un échec garde les messages récents et est qualifié ; aucun job « en cours » n'est annoncé sans tâche durable réellement enregistrée. Une file persistante ne sera ajoutée que si les mesures montrent que le traitement attendu dépasse le budget de l'API.

Le résumé conserve sujets, décisions et tâches non résolues, avec références de provenance. Ne pas sauvegarder de raisonnement interne du modèle. Une suppression, correction ou révocation rend les résumés concernés inutilisables jusqu'à purge ou régénération autorisée.

Augmenter le budget actuel d'environ 1 200 tokens ou dix messages uniquement après mesure. Les filtres de confidentialité précèdent les limites ; aucune inclusion illimitée de l'historique.

## 9. Schéma, migrations et données historiques

C0 produit une matrice migration → table/champ → lecteur/écrivain → droits → environnement. Vérifier la fondation mémoire et les trois migrations V10 déjà réalisées ; leur présence locale ne prouve pas leur application distante.

Extensions proposées à confirmer dans cette matrice : version et clé sémantique des souvenirs, destination structurée, référence au profil, reçus de commandes mémoire, réglage mémoire distinct et révision des résumés. Réutiliser les colonnes de provenance, statut, sensibilité, expiration et couverture déjà présentes.

Créer les migrations nécessaires avec `supabase migration new v10_assistant_memory` après vérification de `supabase --help` et des documents courants. Le nom ci-dessus est une intention de création, pas une migration existante à appliquer.

Exigences de base :

- RLS et grants explicites par compte sur chaque objet exposé ; UPDATE vérifie ancien et nouveau propriétaire.
- Une écriture directe autorisée ne contourne pas classification, validation ou confirmation. Inventorier les chemins client avant d'ajuster les droits.
- Une route utilisant un rôle privilégié impose son propre contrôle propriétaire ; ce rôle n'est jamais livré au client.
- Les fonctions privilégiées ont un `search_path` maîtrisé et des droits d'exécution précis.
- Unicité/version atomiques, migrations rejouables selon les conventions du dépôt et export/suppression couvrant chaque nouvel objet.

Réparation historique : inventorier sans exposer le contenu privé, reclasser les préférences ordinaires contenant une contrainte sensible comme candidates, regrouper les vrais doublons avec provenance et détecter les conflits avec le profil. Ne pas promouvoir une allergie ancienne sans confirmation, ni écraser le profil.

Produire d'abord un rapport fictif et un mode de simulation. Une transformation de données réelles exige un périmètre identifié, une procédure récupérable et les autorisations du contexte de réalisation.

## 10. Confidentialité et conservation

L'oubli empêche la réapparition d'un fait depuis extraction, résumé ou ancien contexte. Une trace minimale de suppression peut utiliser une clé opaque ; elle ne conserve pas le contenu sensible qu'elle est censée effacer.

Export et suppression couvrent profil selon son contrat, souvenirs, conversations, résumés, contexte temporaire, références et payloads des reçus. Les durées et suppressions existantes sont respectées ; les sauvegardes et la rétention du fournisseur sont documentées séparément sans promettre une purge instantanée non prouvée.

Les logs ordinaires contiennent identifiants techniques, statuts et latence, sans conversation, allergie, contenu de souvenir ou audio. Les exports de test utilisent uniquement des données fictives.

Si l'historique est désactivé mais la mémoire autorisée, conserver seulement le fait et la provenance minimale nécessaires ; ne pas recopier la conversation complète dans le champ de preuve.

## 11. Découpage de réalisation

| Étape / PR | Livrable | Condition |
| --- | --- | --- |
| C0 — Contrats | Matrice, politique de destination et droits, consentements | Source de vérité de chaque fait et état de l'environnement connus |
| C1 — Politique | Filtre commun sur contexte, tools, historique, résumés et synthèse | Aucun chemin alternatif ne transmet un fait interdit |
| C2 — Écritures | Classification, déduplication, versions et reçus | Exemples M02, concurrence et réponse perdue couverts |
| C3 — Gestion | Consultation, correction, oubli et liaison au profil | Deux clients cohérents ; panne distincte d'une mémoire vide |
| C4 — Continuité | Conversation contextuelle et résumés entretenus | Persistance bornée, révocation et oubli pris en compte |
| C5 — Homologation | Réparation simulée, tests DB, deux comptes/deux clients et iPhone | Preuves locales et distantes séparées |

C0/C1 peuvent avancer pendant V10-03B. C1/C2 précèdent le benchmark de nouveaux modèles et la voix ; la qualité de la mémoire ne dépend pas d'un modèle plus récent.

## 12. Validation et critères de sortie

Tests déterministes : classification française, destination, expiration, conflit profil/mémoire, correction, oubli, réextraction après oubli et persistance incertaine. Tests de politique pour chaque chemin, avec partage désactivé, erreur de réglage et révocation pendant l'appel.

Tests DB : deux propriétaires, accès anonyme, privilèges réels des clients, double commande, deux mises à jour concurrentes et suppression/export. Ajouter un harnais mémoire dédié ; les tests stock ou profil existants ne prouvent pas ces nouvelles protections.

Commandes locales de départ :

```sh
npm run shared:build
npx --no-install jest -c apps/api/jest.unit.config.cjs --runInBand --testPathPattern 'MemoryExtractor|MemoryService|ContextBuilder|VoiceAgentService|handlers/__tests__/memory' --no-coverage
npm run test:v10:client
npm run build
```

Étendre les sélections de tests avec les nouveaux modules. Les tests de résumé utilisent un fournisseur simulé ; les essais facturés éventuels sont séparés, bornés et consignés.

- [ ] Une préférence explicite a une destination et un effet démontrable.
- [ ] Les deux phrases de reproduction M02 ne produisent ni doublon actif ni contrainte sensible ordinaire.
- [ ] Profil, souvenirs, contexte temporaire et feedback restent distincts et cohérents.
- [ ] Contexte, tools, historique, résumés et synthèse appliquent la même politique.
- [ ] Désactivation, révocation et panne de réglages ont les effets documentés.
- [ ] « Retenu », « corrigé » et « oublié » correspondent à des résultats persistés vérifiables.
- [ ] Correction, conflit, erreur et oubli sont utilisables sur deux clients.
- [ ] Une longue conversation utilise un résumé réellement entretenu, avec couverture et budget.
- [ ] Un fait oublié ne réapparaît pas par un ancien résumé ou une nouvelle extraction de l'historique.
- [ ] Isolation, grants, concurrence, export/suppression et migration sont éprouvés sur un environnement identifié.
- [ ] SHA, tests, migrations appliquées et essai matériel sont consignés séparément.

## 13. Retour arrière et références

Un retour arrière peut désactiver extraction et résumés, tout en conservant consultation, oubli, profil confirmé et protections de partage. Ne jamais réactiver une lecture non filtrée pour restaurer une fonctionnalité.

Livrer rapport d'implémentation, politique, matrice des sources de vérité, résultats de réparation simulée et preuves. Les lots D/E et iOS réutilisent ces contrats.

Références : [PRP-223 Mémoire](../PRP-223-Assistant-Memory-Foundation.md), [PRP-235 Paramètres](../PRP-235-Settings-Memory-Nutrition-Data.md), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) et [changelog Supabase](https://supabase.com/changelog). Vérifier les versions et notes applicables au démarrage de la réalisation.
