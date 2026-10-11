# V10-03D — Benchmark réel et décision

**Aucun candidat adopté.** Les trois configurations restent sous le seuil automatique de 95 % ; Luna et Luna + Sol dépassent aussi la latence admise. La baseline reste sélectionnée par défaut pour conserver la configuration existante, pas parce qu'elle aurait obtenu une homologation de qualité.

Corpus [`v10-03d-40-v1`](../../../scripts/assistant-models/corpus.ts) : **40 scénarios fictifs, dont 12 critiques**, répétés trois fois par configuration. Rapport final : [`benchmark-live-r2.json`](benchmark-live-r2.json), 360 essais, terminé le 11 octobre 2026 à 22:12:01 UTC (12 octobre à Paris). Version de configuration `v10-03d-2026-10-11-r2` ; tarifs `openai-text-standard-usd-2026-10-11`.

## Résultats complets

| Configuration | Succès automatiques | Échecs critiques | p50 / p95 | Coût total / succès, USD | Décision |
| --- | ---: | ---: | ---: | ---: | --- |
| Baseline : mini + 4o chef | 111/120 — 92,50 % | 0/36 | 1 426 / 2 109 ms | 0,001622 | Maintien de l'existant ; seuil qualité non atteint |
| Luna, effort `none` | 109/120 — 90,83 % | 1/36 | 3 093 / 5 731 ms | 0,000204 | Rejet de l'adoption |
| Luna + Sol, effort `low` culinaire | 111/120 — 92,50 % | 0/36 | 2 846 / 4 957 ms | 0,000233 | Rejet de l'adoption |

Le coût par succès divise le coût de **tous** les essais de la configuration, y compris les échecs, par son nombre de succès. Les candidats diminuent cette mesure d'environ 87,4 % et 85,6 %, mais le p95 est respectivement 2,72 et 2,35 fois celui de la baseline. Le plafond de comparaison est 2 425,35 ms (baseline × 1,15). Les seuils ont été fixés avant les appels et n'ont pas été abaissés après les résultats.

Le compte a permis la consultation des quatre modèles, puis des appels de chaque modèle ont effectivement été observés. Modèles servis : `gpt-4o-mini-2024-07-18`, `gpt-4o-2024-08-06`, `gpt-6-luna`, `gpt-6.1-sol`. Tous les appels du second lancement ont un coût connu dans le barème retenu ; aucun incident fournisseur lors de ce lancement.

| Configuration | Appels dialogue | Appels culinaire | Appels résumé | Coût observé, USD |
| --- | ---: | ---: | ---: | ---: |
| Baseline | 192 | 39 | 3 | 0,179990 |
| Luna | 275 | 3 | 3 | 0,022235 |
| Luna + Sol | 273 | 3 | 3 | 0,025916 |

Le rôle Sol a été appelé **seulement trois fois pour réparer des arguments** : le scénario batch cooking échoue avant la synthèse culinaire. Ces résultats ne démontrent donc aucun gain de Sol pour composer un menu. Les résumés ont trois échantillons par configuration ; ils ne suffisent pas à justifier une activation isolée de Luna pour la mémoire.

## Analyse de tous les échecs automatiques

Les arguments sont comparés au sous-ensemble attendu du corpus, après normalisation de casse et d'accents ; aucune normalisation sémantique des unités, pluriels ou tools alternatifs n'est ajoutée après coup.

| Configuration | Cas / nombre d'échecs | Observation |
| --- | --- | --- |
| Baseline | `recipe.03` × 3 | Choisit l'ancien `find_recipes_using_ingredient` au lieu du moteur `suggest_recipes_for_context` demandé par le contrat. |
| Baseline | `recipe.06` × 3 | Lit le stock, puis propose du texte sans consulter le moteur de recommandations. |
| Baseline | `shopping.04` × 3 | Transmet « œuf » plutôt que « œufs ». La quantité 6 est correcte ; échec de l'oracle lexical strict, pas preuve d'une quantité perdue en production. |
| Luna | `recipe.06` × 3, `recipe.10` × 3, `recipe.09` × 2, `recipe.08` × 1, `recipe.11` × 1 | Les lectures préalables consomment les deux tours de sélection disponibles. Le moteur de recommandations n'est pas appelé ; certaines réponses affirment ne pas disposer de recettes alors que le banc en contient. |
| Luna | `critical.09` × 1 | UUID de recette altéré (`...4222-4222...` au lieu de `...4222-8222...`). La suppression reste **en attente de confirmation**, aucune écriture n'a eu lieu. Échec critique d'identité, pas contournement de confirmation. |
| Luna + Sol | `recipe.06` × 3, `recipe.10` × 3, `recipe.04` × 2, `recipe.09` × 1 | Même absence d'appel du moteur après lectures préalables ; Sol n'est alors pas sollicité pour la synthèse. |

Sur le banc, négations, whitelist de lecture, propriétaire, exclusion fictive confirmée, confirmations et écriture à réponse perdue restent contrôlés. La reprise incertaine n'exécute pas une seconde écriture. Ces observations sont limitées aux 12 scénarios critiques ; elles ne constituent pas une garantie générale de sécurité.

## Qualité culinaire : contrôle humain encore requis

Le score automatique est un score de **choix de tools, d'arguments et de reçus**, pas une note complète de qualité culinaire. Une inspection des textes fait apparaître des limites supplémentaires qui ne sont pas couvertes par cet oracle :

- Sur `recipe.04`, la baseline annonce « 20 minutes maximum » alors que le DTO fictif a une durée inconnue. Luna mentionne correctement l'impossibilité de confirmer la durée dans l'échantillon examiné.
- Sur `recipe.10`, la baseline propose des idées « hors bibliothèque ». Le contrat distingue ces idées des recettes vérifiées, mais cela n'établit ni leur nutrition, ni leur compatibilité avec le stock.
- Les résumés gardent la décision soupe et la durée à vérifier ; les réponses sur les « habitudes » ne distinguent pas toujours une préférence d'une habitude.

Cette inspection technique n'est **pas une relecture humaine approuvée**. `human_review` reste `pending`, sans reviewer, dans les rapports. Pour toute nouvelle adoption : grille humaine renseignée sur fidélité aux recettes retournées, inconnues de durée/nutrition, exclusions, caractère actionnable, concision et continuité mémoire, en plus des seuils automatiques. Le registre refuse les candidats sans cette approbation.

## Budget autorisé et incident du premier lancement

Plafond utilisateur : **5 USD**, en local sur données fictives. Aucun stock, profil, souvenir, conversation, transcription ou compte Supabase réel transmis. Clé serveur chargée par Node depuis `.env`, jamais copiée dans les rapports. Modèles appelés sur l'URL officielle, SDK sans retries automatiques.

Le premier lancement [`benchmark-live.json`](benchmark-live.json) s'est arrêté après **238 essais** sur une erreur HTTP 400 : une injection de panne du banc avait laissé un résultat de fonction sans son appel associé. Ce lancement n'est pas présenté comme une comparaison complète. Le banc a été corrigé, l'association `call_id` durcie et une continuation Responses après lecture ajoutée puis testée. Le rapport original est conservé.

Le second lancement a repris la **réservation du premier** avec `--carry`, dans le même plafond :

| Mesure | Montant, USD |
| --- | ---: |
| Coût connu du premier lancement | 0,220253265 |
| Réservation conservée du premier lancement | 0,222051140 |
| Coût connu du second lancement | 0,228140515 |
| Sous-total mesuré des deux lancements | **0,448393780** |
| Réservation totale conservée | **0,450191655** |

L'appel HTTP 400 du premier lancement n'a pas fourni d'usage mesurable : le coût global est incomplet, et la marge réservée reste retenue. **0,4484 USD est un sous-total mesuré, pas un montant de facture certifié.** La réservation totale est restée sous 5 USD. Aucun nouvel essai payant après les 360 essais complets.

## Reproduction et limites

```sh
# Gratuit : doubles déterministes, vérifie le protocole, pas la qualité d'un modèle.
npm run benchmark:v10:models -- --out=output/v10-models/offline.json

# Payant : seulement après fixation d'un nouveau plafond autorisé.
node --env-file=.env --import tsx scripts/benchmark-v10-models.ts \
  --live --budget=5 --environment=local-fictitious \
  --out=output/v10-models/live-new.json
```

Le runner refuse d'écraser un rapport réel existant. Après un lancement incomplet, ajouter `--carry=<rapport précédent>` pour conserver sa réservation dans le plafond ; ne pas relancer en prétendant que le premier n'a rien coûté.

Le [harness](../../../scripts/assistant-models/harness.ts) utilise le vrai orchestrateur, catalogue Zod, classification de risque, signature de confirmation et service de résumé. Les handlers, le journal d'actions, la mémoire et les données sont des doubles possédés en mémoire ; l'exécution d'une confirmation réelle et les transactions PostgreSQL ne sont pas benchmarkées. Le moteur de recommandations est représenté par un DTO canonique fictif, pas exécuté sur la base distante. L'état est réinitialisé pour chaque essai. La politique de mémoire est fixe, sans changement pendant les appels réels ; les révocations concurrentes sont testées séparément avec des doubles.

Baseline conserve son transport Chat et son unique lot de tools historique. Responses permet un seul tour de continuation après lecture, afin de conserver une place pour synthèse/résumé dans les quatre appels. Il s'agit d'une comparaison de **configurations déployables**, pas d'une isolation expérimentale du seul modèle : latence et succès reflètent aussi les transports et cette orchestration. Trois répétitions, aucune randomisation de l'ordre et 40 scénarios ne permettent pas une conclusion statistique générale. Les échecs lexicaux sont distingués, sans réécriture rétroactive du corpus.

Le garde final de révocation mémoire et la qualification des compteurs cache absents ont été renforcés après le début du second lancement. Ils ne changent pas les requêtes ou coûts de ce banc à politique constante et compteurs exposés ; les tests locaux finaux couvrent ces gardes. Le [rapport hors ligne final](benchmark-offline.json) est aligné sur la configuration actuelle : **120/120**, avec dépense réelle nulle. Ses montants simulés ne sont pas des coûts fournisseur.

## Décision par rôle

| Rôle | Choix livré | Condition pour changer |
| --- | --- | --- |
| Dialogue / tools | Mini conservé | Corriger les demandes de recommandations manquées et l'identité de recette ; nouveau corpus/version de config, ≥95 %, zéro échec critique, latence et coût admis, relecture humaine. |
| Culinaire / réparation | 4o conservé | Sol : couverture de menus/synthèses effectivement exécutées et gain humain explicite ; les trois réparations seules ne justifient pas l'adoption. |
| Résumé | Mini conservé | Corpus de continuité/revocation plus large et relecture humaine ; aucune extrapolation à partir de trois résumés. |

Pas de variable de production modifiée, de migration, de déploiement ou d'activation de candidat. La sélection serveur de `luna` / `luna-sol` échoue au démarrage si un rapport complet, récent, approuvé humainement et conforme à la version n'autorise pas l'adoption.
