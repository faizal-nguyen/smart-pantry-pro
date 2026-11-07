# Kitchen OS — Livraison de Découvrir

## État du 7 novembre 2026

L’intégration reprend le main récent et conserve ses correctifs de sécurité, de suppression des données et la refonte Kitchen OS. Elle ajoute le pilote manuel de Découvrir et un éditeur canonique commun aux imports. Aucun scheduler, scraping ou fournisseur IA payant n’est activé par Découvrir. Les appels d’extraction historiques restent distincts.

Le projet de production est `jwoxacnflphclslpqfzs`. Le propriétaire a exporté les définitions avant modification puis appliqué les deux migrations dans une seule transaction via SQL Editor. Il a transmis les dix contrôles post-migration, tous à true, notamment RLS, permissions, triggers et historique des deux migrations. Une vérification indépendante en lecture seule via l’API du projet confirme les cinq tables, la vue et les trois RPC publiques attendues ; les lectures anonymes des six relations sont refusées (401). Aucun SQL distant n’a été exécuté par l’agent. Les accès de gestion de l’agent restent limités à d’autres projets.

Le lot reprend aussi le correctif Instagram fusionné dans main (PR #72) : suppression de l’ancien extracteur et utilisation de l’API d’imports sociaux. La page Importer conserve son inbox et son éditeur canonique, qui maintiennent l’identité et la révision de l’import. Le dialogue personnel monté depuis Recettes conserve ses onglets d’import de liens désactivés, pour empêcher une copie sans provenance dans une recette manuelle.

## Migrations requises et ordre

1. `supabase/migrations/20261106154631_kitchen_discovery_import_review.sql`
2. `supabase/migrations/20261106154633_kitchen_recipe_discovery.sql`

Ces deux fichiers reprennent le lot local V10-03F, avec des noms générés par le CLI après les migrations récentes. Les tests SQL utilisent ces fichiers de livraison. Ils ne suppriment pas de recettes. Les quantités, portions et durées inconnues restent NULL.

Avant application : confirmer le projet, lire l’historique de migrations et les définitions actuelles des fonctions/triggers d’import, puis sauvegarder le schéma concerné. Faire une répétition transactionnelle sur une base de test du même schéma. Ne pas lancer `db push --include-all` sans examiner la liste : le dépôt contient d’autres migrations historiques. Ne pas utiliser un accès d’un autre projet.

Le lot modifie le contrat de sauvegarde des imports : révision du brouillon et confirmations explicites de source, d’inconnues et d’adaptations. Il requiert une bascule coordonnée SQL/API/client. Une ancienne page restée ouverte peut recevoir un refus de relecture et doit être actualisée ; aucun consentement humain n’est inventé pour accepter son ancien payload.

Après application : vérifier les tables, les fonctions `replace_social_import_draft` et `execute_recipe_discovery`, les permissions anon/authenticated et l’isolation réelle à deux comptes. Les tables de découverte sont privées au propriétaire ; les commandes tirent l’identité du JWT. Vérifier ensuite Garder → brouillon → ajout unique → fiche commune.

## Publication et reprise

Une fois le schéma distant vérifié, rendre la PR prête, attendre ses contrôles, fusionner et suivre le déploiement Vercel du commit main exact. Contrôler l’API publique, les refus sans authentification et le parcours connecté.

`RECIPE_DISCOVERY_ENABLED=false` interrompt les lectures/actions de découverte et conserve les données. Il ne restaure pas l’ancien contrat d’import. Un retour à un ancien serveur d’import demande la restauration contrôlée des fonctions/triggers sauvegardés avant migration ; ne pas supprimer les tables ni les recettes ajoutées.

## Preuves locales exécutées

- Build complet partagé/API/frontend : PASS.
- Tests API ciblés : 129 tests puis test de raccordement stable/v1 réussi après adaptation au main récent, soit 130 tests ; fournisseurs simulés.
- Tests client V10 après intégration du main récent : 236 tests dans 63 suites, tous réussis dans un même passage.
- PostgreSQL réel jetable, socket local : 13 groupes passent, dont RLS à deux comptes, reprises, révisions, sauvegardes concurrentes, quotas, intégrité de provenance et rollback d’échec. Aucune base distante sollicitée par ces tests.
- Navigateur fictif : six largeurs 320/390/440/768/1024/1280, aperçu expiré, garder, relecture, inconnues non inventées, réponse perdue et ajout unique, fiche commune, retour après cuisine, pause conservant les recettes, aide de premier lancement puis onglet Importer.
- Lint ciblé des nouveaux modules et du parcours canonique : PASS ; le lint historique de tous les fichiers backend touchés contient aussi des types any préexistants.

Le lot SQL manuel a également passé les 13 groupes PostgreSQL avec ses contrôles intégrés, un test d’annulation après erreur tardive et un refus de rejeu sans modification. La base de test est reconstruite depuis les migrations du dépôt, pas copiée de production. Le schéma cloud est maintenant confirmé comme décrit plus haut. Le parcours navigateur authentifié avec les données réelles reste à distinguer des fixtures et des vérifications publiques après publication.
