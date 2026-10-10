# PRP V10-03D — Agent, modèles et coût vérifiable

> Statut : spécification rédigée ; réalisation non commencée ; candidats à évaluer.
> Date : 2026-10-09.
> Priorité : P1 pour compatibilité et coûts ; amélioration de qualité soumise au benchmark.
> Dépendances : commandes et confirmations V10-01/V10-02, moteur [V10-03](PRP-V10-03-Personnalisation.md), politique de [V10-03C](PRP-V10-03C-Memoire-Fiable.md).
> Coordination : évaluation de fiche [V10-03A](PRP-V10-03A-Recettes-Apercus.md) et transports de [V10-03E](PRP-V10-03E-Voix-Cuisine.md).
> Source : [audit du 9 octobre](../../docs/AUDIT-DESIGN-MEMOIRE-VOIX-2026-10-09.md), A01 et inventaire des chemins actifs ; référence locale `dda2602`.
> Estimation indicative : 4 à 7 jours, hors attente d'accès aux modèles et observation du déploiement.

## 1. Problème et résultat attendu

L'agent utilise des identifiants et tarifs codés en dur. Le transport partagé repose sur Chat Completions ; remplacer seulement le nom du modèle ne garantit pas la compatibilité des tools, paramètres, sorties structurées ou coûts.

Le lot doit rendre les rôles configurables, vérifier des candidats récents sur les tâches de cuisine et conserver les garanties métier. Un modèle plus récent n'est adopté que si son comportement et son coût par tâche réussie sont acceptables.

L'utilisateur doit pouvoir consulter les modèles configurés et celui réellement utilisé pour une réponse, sans devoir lire le code. La réalisation ne prétend pas que les modèles audités sont ceux effectivement déployés avant vérification de l'environnement.

## 2. Inventaire de départ

| Chemin | Configuration établie dans le code | Conséquence |
| --- | --- | --- |
| [VoiceAgentService](../../apps/api/src/services/assistant/VoiceAgentService.ts) | `gpt-4o-mini` principal ; `gpt-4o` en repli | Mesurer toute la boucle, pas seulement le premier appel |
| Synthèse chef | Escalade explicite vers `gpt-4o` | Distinguer choix de qualité et récupération après échec |
| Client partagé de [RecipeExtractionService](../../apps/api/src/services/imports/RecipeExtractionService.ts) | `chat.completions.create`, température, `max_tokens`, `response_format` | Préserver extraction/import lors de l'ajout d'un transport |
| [assistant.ts](../../apps/api/src/routes/assistant.ts) | `OPENAI_MODEL` ou `gpt-4o-mini` | Route de streaming distincte de l'agent métier |
| Calcul des coûts | Modèle inconnu tarifé comme le mini | Coût potentiellement faux après changement d'identifiant |
| SDK local | `openai` installé en 4.104.0 lors de l'audit | Vérifier les méthodes et types requis ; ne pas inventer une version minimale |

L'inventaire D0 couvre aussi prompts, aliases, fallbacks, limites, usages de streaming et appels des scanners/imports. Les embeddings et autres workloads restent sur leur configuration tant qu'ils n'ont pas leur évaluation propre.

## 3. Rôles et candidats

Les documents officiels consultés le 9 octobre 2026 donnent les candidats suivants. Leur disponibilité sur le compte et leurs performances réelles restent à vérifier.

| Rôle | Candidat | Contrat de transport / effort | Décision attendue |
| --- | --- | --- | --- |
| Dialogue courant et choix de tools | `gpt-6-luna` | Responses ; effort `none` ou `low` explicitement évalué | Remplacer le principal si les critères sont atteints |
| Synthèse culinaire complexe | `gpt-6.1-sol` | Responses pour les tools ; effort `low` au départ | Escalade limitée à des cas définis où elle apporte un gain |
| Résumé de conversation | Rôle économique séparé, Luna candidat | Entrée bornée, sortie contrainte, aucun tool métier | Qualité de continuité et coût évalués avec V10-03C |
| Ancienne configuration | `gpt-4o-mini` / `gpt-4o` | Adaptateur Chat Completions conservé | Baseline et retour arrière temporaire |

Luna supporte Chat Completions avec effort `none` selon sa fiche ; Sol exige Responses pour le function calling. Les niveaux par défaut ne sont pas supposés équivalents aux anciens appels. Ne pas choisir implicitement un effort plus élevé.

Tarifs textuels standard indicatifs au 9 octobre : Luna 0,10 USD par million de tokens d'entrée et 0,50 de sortie ; Sol 2 et 10. Ces chiffres ne constituent pas un coût par requête : cache, raisonnement, outils, résumés et escalades doivent être comptés selon l'usage réel.

Sources : [Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [guide de migration courant](https://developers.openai.com/api/docs/guides/latest-model). Les tarifs de cache et modes supplémentaires sont intégrés au registre seulement après vérification du mode utilisé.

## 4. Configuration et visibilité

Créer une configuration serveur typée par rôle : modèle, transport, effort, budget de sortie, délai, coût maximal et éventuel rôle d'escalade. Valider les combinaisons au démarrage et produire une erreur exploitable si elles sont incompatibles.

Une invocation fige sa configuration ; un changement pendant la requête ne mélange pas deux politiques. Une escalade est explicitement tracée et bornée. Le mode chef n'impose pas automatiquement un modèle plus coûteux avant comparaison de qualité.

Ajouter une vue secondaire « Modèles de l'assistant » dans les paramètres, ou un détail équivalent compatible avec V10-03B :

- Rôle et modèle configuré, avec mention de configuration non vérifiée si l'environnement ne fournit pas cette preuve.
- Modèle réellement servi pour la réponse et éventuelle escalade, dans le détail de cette réponse.
- Dernière vérification et limites pertinentes ; pas de clé, URL interne privilégiée ou secret.
- Coût connu, estimé ou indisponible selon le contrat ci-dessous.

La lecture du catalogue de modèles ne donne pas au client le droit de modifier arbitrairement la configuration serveur. Une route de lecture dédiée est proposée ; son chemin exact est fixé dans D0 suivant les conventions existantes.

## 5. Adaptateur Responses

Ajouter un transport explicite au client partagé, avec types discriminants ou adaptateur séparé. Ne pas modifier silencieusement tous les callers de l'extraction de recettes.

| Élément | Traitement requis |
| --- | --- |
| Entrée et sortie | Messages et items typés ; parser tous les items utiles, pas seulement le premier texte |
| Appel de fonction | Nom, arguments et `call_id` associés au résultat correspondant |
| Sortie de fonction | Item de résultat lié à l'appel ; erreur métier structurée et non présentée comme succès |
| Format structuré | `text.format` pour Responses ; `response_format` reste spécifique au transport ancien |
| Paramètres | Adapter budget de sortie ; retirer température/`top_p`/`top_logprobs` lorsque le mode choisi les rend incompatibles |
| Schémas | Vérifier mode strict, champs requis, nullables et objets fermés ; ne pas rendre toutes les anciennes options obligatoires par accident |
| Tours successifs | Rejouer les items nécessaires dans une limite de contexte maîtrisée |
| Confidentialité | `store: false` explicite ; pas de dépendance à un état serveur conservé par défaut |

Si le modèle exige des items de raisonnement pour poursuivre la boucle sans stockage fournisseur, conserver seulement les items de transport nécessaires, y compris contenu chiffré selon la documentation. Ne pas afficher, résumer ou logger un raisonnement interne.

Les mêmes Zod/validateurs, handlers et contrôles serveur gouvernent les tools. Une capacité annoncée par le modèle ne remplace pas validation et autorisation.

Le SDK retenu est vérifié contre la documentation et les méthodes réellement utilisées. Une mise à jour est ciblée, versionnée et testée sur agent, imports et route de streaming ; aucun upgrade React, Tailwind ou Vite n'accompagne ce lot.

Références : [migration Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses), [function calling](https://developers.openai.com/api/docs/guides/function-calling).

## 6. Garanties métier conservées

Les politiques existantes de risque, confirmation, portée des tools et idempotence restent applicables. Le lot ne rajoute pas une confirmation à chaque lecture ou opération courante.

- Le serveur déduit le propriétaire ; un argument fourni par le modèle ne choisit pas un autre compte.
- Les références et unités sont validées avant exécution.
- Les tools de recommandation réutilisent le moteur V10-03 ; une prose n'invente pas la compatibilité ou le stock.
- Les réponses finales utilisent les reçus : action confirmée, en attente, refusée ou à corriger.
- Les scopes de l'aide contextuelle restent en lecture lorsqu'ils le sont aujourd'hui.
- La limite actuelle de six appels de tools et la confirmation de cinq minutes sont inventoriées et conservées sauf modification justifiée et testée.
- Timeout, réponse perdue ou fallback ne relancent pas une écriture incertaine avec une nouvelle identité.
- La politique de mémoire V10-03C s'applique avant chaque envoi de contexte et de résultat de tool.

Pour une panne fournisseur, un repli peut reprendre une lecture ou une synthèse déjà calculée. Après une écriture, il doit vérifier le reçu et réutiliser le résultat ; aucune répétition complète aveugle de la tâche.

## 7. Coût et limites d'une invocation

Remplacer les tarifs dispersés par un registre versionné : modèle/snapshot reconnu, date d'effet, mode tarifaire, devise et unités. Le modèle réellement retourné fait foi pour la correspondance ; un alias inconnu n'est pas automatiquement tarifé comme un mini.

Reçu de coût proposé : rôle, transport, modèle demandé et servi, appels, usage documenté, coût, qualité de mesure `known|estimated|unknown`, version des tarifs et raison d'incertitude.

Règles :

- Sommer tous les tours, résumés associés, escalades et synthèses nécessaires à la tâche.
- Les tokens de raisonnement inclus dans la sortie ne sont pas facturés deux fois ; même règle pour les tokens en cache inclus dans l'entrée.
- Les compteurs de lecture/écriture de cache sont interprétés selon le contrat fournisseur réellement disponible ; ne pas inventer des champs d'usage.
- Une estimation locale est marquée estimée ; une absence de barème ou d'usage donne coût `null`, jamais zéro.
- Exposer un sous-total connu si le total est incomplet, en l'indiquant.
- Fixer durée totale, nombre d'appels et budget par invocation ; vérifier le budget avant chaque nouvel appel avec une marge pour les appels déjà engagés.

Un reçu applicatif n'est pas une facture OpenAI. Si le coût exact ne peut être garanti, garder des limites de travail déterministes et afficher l'incertitude. Les logs de coût ne contiennent pas prompts, informations de santé ou transcriptions.

Les coûts de transcription, de session vocale et de restitution sont ajoutés par V10-03E selon leurs unités propres ; pas de conversion arbitraire de minutes en tokens.

## 8. Benchmark et décision

Constituer au moins quarante scénarios fictifs avec résultat attendu vérifiable : stock/unités, choix de recette, contraintes/inconnues, mémoire et reprise/confirmation. Inclure au moins douze cas critiques, dont négation, mauvais propriétaire, exclusion confirmée et écriture à résultat incertain.

Comparer baseline, Luna et Luna avec escalade Sol sur le même état. Pour les mesures fournisseur, répéter chaque scénario trois fois si le budget fixé le permet ; consigner les essais manquants et éviter une conclusion statistique excessive sur un petit échantillon.

Mesures : intention, tool choisi, arguments, conformité du reçu final, fidélité au moteur, qualité culinaire relue, appels, escalades, latence p50/p95 et coût par tâche réussie.

Critères proposés à figer avant les essais :

| Dimension | Condition de décision |
| --- | --- |
| Critique | Aucun contournement des exclusions, du propriétaire, des confirmations ou des reçus dans le corpus |
| Tools courants | Au moins 95 % de tâches avec arguments et résultat corrects ; analyser tous les échecs |
| Qualité culinaire | Pas de régression sur la grille relue ; gain explicite pour les cas qui justifient Sol |
| Latence | p95 ne dépassant pas la baseline de plus de 15 %, ou compromis documenté sur un gain utile |
| Coût | Coût par tâche réussie au plus égal à la baseline pour le rôle courant, ou décision explicite fondée sur le gain |
| Repli | Retour à l'ancien adaptateur testé sans doubler les actions |

Les seuils sont des critères de ce benchmark, pas une garantie de sécurité générale. Une évaluation par un modèle juge peut compléter la lecture humaine ; elle ne valide pas seule une écriture ou une contrainte.

Les tests automatiques utilisent des doubles de fournisseur. Les appels réels se font uniquement dans un environnement nommé, avec clés serveur et plafond monétaire fixé avant lancement. La commande existante `npm run assistant:qa` est examinée pour ses effets et son environnement avant utilisation ; ce n'est pas un test présumé gratuit et sans écriture.

## 9. Découpage de réalisation

| Étape / PR | Livrable | Condition |
| --- | --- | --- |
| D0 — Inventaire | Carte des appels/configurations, corpus et baseline, accès aux candidats | Aucun workload caché dans un remplacement global |
| D1 — Transport | Adaptateur Responses et compatibilité SDK | Tests des items, tools, streaming et anciens callers |
| D2 — Configuration/coût | Rôles, limites, tarifs et reçus | Modèle inconnu et usage incomplet représentés honnêtement |
| D3 — Benchmark | Rapport comparatif et décision par rôle | Mémoire/politique stable ; budget et critères fixés avant appels réels |
| D4 — Produit | Vue secondaire des modèles et détail par réponse | Configuration et modèle servi distingués |
| D5 — Activation | Déploiement progressif, observation et retour arrière | SHA, variables, coûts et garanties métier vérifiés |

D0/D1 peuvent être préparés après les contrats de C0/C1. D3 utilise les comportements validés de mémoire, pour attribuer les écarts au modèle plutôt qu'à une politique différente.

## 10. Vérification et sortie

Tests de transport : texte seul, plusieurs items, plusieurs tools, JSON invalide, appel refusé, sortie interrompue, paramètres incompatibles, résultat de fonction correctement lié et repli après timeout. Tests coût : tours multiples, cache, raisonnement, alias inconnu et usage absent.

Exécuter `npm run shared:build`, `npm run test:v10:api`, les tests ciblés de `RecipeExtractionService` et des nouveaux adaptateurs, puis `npm run build`. Couvrir la route de streaming distincte si elle est modifiée.

- [ ] Tous les chemins de modèles actifs sont inventoriés avec leurs valeurs serveur.
- [ ] Rôles et paramètres sont typés, validés et figés par invocation.
- [ ] Responses fonctionne avec les tools et l'ancienne extraction reste compatible.
- [ ] Aucun changement de transport n'assouplit les politiques métier ou de mémoire.
- [ ] Coût connu/estimé/inconnu et modèle réellement servi sont exacts dans les cas testés.
- [ ] Le benchmark publie corpus, conditions, limites et décision pour chaque rôle.
- [ ] La configuration rejetée reste rejetée ; un candidat non accessible n'est pas présenté comme activé.
- [ ] La vue des modèles ne divulgue aucun secret et correspond à la configuration observée.
- [ ] Retour arrière et absence de double écriture sont éprouvés.
- [ ] Déploiement, essais fournisseur et tests locaux disposent de preuves distinctes.

## 11. Retour arrière et transmission

Conserver l'adaptateur et la configuration baseline pendant l'observation, avec une sélection contrôlée côté serveur. Le retour arrière maintient les corrections de confidentialité et le coût inconnu correctement représenté.

Livrer matrice des appels, rapport de benchmark, registre tarifaire daté, décisions et limites. V10-03E conserve ce backend et ses reçus ; iOS ne reçoit ni clé OpenAI ni autorité d'exécution supplémentaire.
