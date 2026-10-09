# Publication Git de V10-01 et V10-02

Date : 9 octobre 2026. Le commit de réalisation est [`5ffaf3928c15273054103793ec2f9eed7a087b2b`](https://github.com/faizal-nguyen/smart-pantry-pro/commit/5ffaf3928c15273054103793ec2f9eed7a087b2b), construit depuis `main` à `818ce526`. La [PR #39](https://github.com/faizal-nguyen/smart-pantry-pro/pull/39) regroupe les deux lots ; son historique indique le résultat de la CI et de la fusion.

Les rapports [V10-01](V10-01.md) et [V10-02](V10-02.md), leurs fichiers de validation et les captures décrivent les contrôles locaux effectués avant publication. Ils sont conservés comme preuves datées.

Recontrôles sur le code publié :

- `npm run build` : réussi.
- `npm run test:v10:client` : 59 tests dans 18 suites réussis.
- `npm run test:v10:api` : 233 tests dans 15 suites réussis.
- Scans de secrets et hook de commit : réussis.
- 17 groupes PostgreSQL locaux déjà validés sur les deux migrations ; aucune modification SQL pendant la publication.

Le contrôle des routes a dépassé son délai de démarrage local de 8 secondes sous Node 26, sans log de démarrage. Il a réussi dans la CI Node 20 sur le commit de réalisation. Cette différence locale reste à diagnostiquer ; elle ne constitue pas une validation du runtime Node 26.

La première exécution du workflow de politique recette échouait avant les tests : la configuration d’intégration démarrait un bundle API absent. Le workflow utilise désormais la configuration unitaire partageant les mêmes transformations Jest et les mêmes suites, sans serveur. Les 32 tests concernés passent localement. L’audit des 26 fichiers de seeds (308 recettes) et son contrôle passent avec les règles existantes : aucun changement automatique proposé, 200 mentions dans les descriptions/instructions signalées pour revue et non bloquantes. Les règles et les seeds n’ont pas été modifiés.

La publication Git n’applique aucune migration distante. Avant la mise en service complète, vérifier le schéma du bon projet Supabase puis appliquer `20261008151704_v10_reliability_commands.sql` et `20261008210917_v10_mobile_routine.sql` dans cet ordre. L’homologation Safari/iPhone 17 Pro Max et le contrôle TypeScript global du frontend restent ouverts. Un déploiement automatique éventuel après fusion ne prouve pas la compatibilité de la base distante.
