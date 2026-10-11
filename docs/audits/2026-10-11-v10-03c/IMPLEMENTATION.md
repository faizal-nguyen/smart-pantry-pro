# V10-03C — livraison locale de la mémoire fiable

État relevé le 11 octobre 2026 au terme du contrôle local, avant publication Git. Branche `codex/v10-03c-memoire-fiable`, base `e158cee8adc213ea735f204efb770464494fd4d8`. C0 à C4 implémentés et validés localement ; C5 local réalisé, déploiement et homologation iPhone encore à faire. Le fichier `validation.json` conserve cet instantané antérieur au commit.

## Comportements livrés

- « Souviens-toi que je préfère les plats épicés » produit un seul goût structuré et confirmé. À stock et profil identiques, il favorise les recettes dont le caractère épicé est documenté ; les recettes sans information restent neutres. L'oubli retire cet effet.
- « Souviens-toi que je suis allergique aux cacahuètes » produit une proposition de profil, sans préférence sensible active. La confirmation utilise la version du profil et son consentement. Oublier la référence ne retire pas une allergie déjà confirmée dans le profil.
- Une formulation médicale composée ou ambiguë demande une édition du profil. « Ce soir, pas épicé » reste une envie temporaire ; « Finalement je préfère les plats doux » corrige le même sujet durable.
- Les retours sur une recette passent par les interactions et le journal, dans une transaction commune avec reçu. Sans recette possédée et vérifiée, aucun effet de classement n'est annoncé.
- La mémoire, l'historique et le partage du profil ont des autorisations distinctes. Une autorisation mémoire absente reste désactivée. Une erreur de lecture n'autorise aucun réemploi de données stockées.
- Le panneau permet recherche, consultation des sources/destinations/dates, correction réelle, confirmation, rejet et oubli. Un conflit conserve le texte d'édition et impose la relecture de la version actuelle. Une réponse perdue se vérifie par reçu, puis se rejoue avec la même enveloppe.
- L'aide poursuit une conversation par compte et tâche. « Nouvelle conversation » reste explicite. Lorsque l'historique est désactivé, le contexte récent est borné en mémoire vive ; aucune conversation complète n'est conservée dans le stockage du navigateur.
- Après vingt messages autorisés non couverts, un résumé est réellement appelé puis sauvegardé de manière attendue, avec réservation de couverture unique. Entrée de 6 000 caractères, sortie de 320 tokens et appel de 5 secondes maximum ; aucun retry fournisseur. Échec, révision modifiée et coût inconnu sont qualifiés.

La direction Cuisine personnelle de 03B est conservée. Les modèles existants restent en place ; leur renouvellement relève de 03D.

## Contrats et chemins actifs

La [matrice des contrats](CONTRATS.md) détaille objets, migrations, destinations et droits. Les schémas partagés sont dans `packages/shared/src/assistant-memory.ts`. Le module `MemoryPolicy` filtre propriétaire, autorisation, statut, source, sensibilité, expiration, destination structurée et révision avant les limites de contexte.

Cette politique est appliquée au contexte, aux tools mémoire, à l'historique réutilisé, aux résumés, à la synthèse des tools et aux recommandations. Chaque envoi fournisseur relit la politique. Une révocation pendant un appel rend son résultat et ses écritures dérivées inutilisables ; elle ne peut pas retirer les données d'une requête déjà envoyée.

Les commandes portent une UUID, la version attendue et la révision attendue. SQL est l'autorité de classification. Commandes mémoire, profil et confidentialité utilisent le même verrou de propriétaire. Les écritures directes de souvenirs sont retirées aux clients ; les helpers privilégiés sont dans `private`, avec `search_path` fermé et grants explicites. Les RPC d'artefacts sont réservées au serveur et contrôlent la conversation et les messages couverts.

Une correction, un oubli, un changement de profil ou une révocation invalide résumés, réservations, session et cache. Une écriture tardive du cache est rejetée. Les messages d'ancienne révision et les mentions historiques de faits durables ne deviennent pas une seconde source de préférences.

## Preuves de validation

| Vérification | Résultat au contrôle local | Portée |
| --- | --- | --- |
| `npm run test:v10:client` | 39 suites, **138 tests passés** | Composants, pagination, commandes figées/reçus, conflits, erreur vs liste vide, changement de compte, continuité et statuts affichés |
| `npm run test:v10:api` | 29 suites, **362 tests passés** | Politique, classification, intent d'oubli et négations, routes HTTP, recommandations, orchestration, fournisseur simulé, résumé attendu/timeout/révocation |
| `npm run test:v10:03c:db` | **12 groupes passés** | PostgreSQL 16 réel, base locale jetable, deux propriétaires et rôles `anon`/`authenticated`/`service_role` |
| `npm run build` | **Passé** | Compilation shared/API et bundle Vite de production |
| ESLint sur les 15 fichiers de cœur nouveaux/refondus | **Passé, aucune erreur ni warning ESLint** | Schémas, politique, sortie modèle, résumé, RPC, handlers mémoire, signal de goût, panneau/notice/sections, hooks mémoire/confidentialité, commandes navigateur, simulateur |
| `git diff --check` | **Passé** | Espaces et conflits de patch |
| `npm run security:secrets` | **Passé** | Sources déjà suivies par Git |
| Même scanner étendu aux nouveaux fichiers 03C | **Passé** | Aucune détection de motif secret ; note utilisateur hors lot exclue |
| `npm run audit:v10:memory` | **Passé** | Simulation hors ligne ; aucune écriture, promotion ou modification de profil |
| Navigateur local | **Passé sur les scénarios ciblés**, 375 px sombre / 440 px clair | Fixtures fictives et contrôles réels de l'interface ; aucun appel fournisseur |

Le harnais SQL charge les véritables migrations de commandes, routine, profil et mémoire dans une base neuve. Il vérifie notamment les permissions effectives, l'isolation de deux comptes, deux commandes simultanées identiques, deux corrections concurrentes, l'atomicité de confirmation/feedback, la reprise par reçu, les résumés uniques, les écritures tardives refusées, l'expiration, les traces d'oubli, l'export des dix objets mémoire/journal et la suppression terminée sans effet sur l'autre compte.

Les tests API de résumé couvrent aussi son appel depuis l'orchestrateur : un test isolé de service n'est pas la seule preuve. Tous les fournisseurs sont simulés ; aucun appel payant n'a été réalisé. La formule de coût du résumé utilise les tokens observés et les tarifs entrée/sortie de `gpt-4o-mini` (0,15 / 0,60 USD par million), vérifiés dans la [documentation officielle](https://developers.openai.com/api/docs/models/gpt-4o-mini). Sans usage observable, le coût reste inconnu.

Les [mesures navigateur](browser-checks.json) consignent les scénarios. À 375 px, le bouton long du dialogue de conflit débordait : il a été corrigé et revérifié dans un dialogue de 337 px, entièrement contenu. Le texte d'édition survit au conflit ; une relecture explicite permet une nouvelle commande. Une réponse perdue d'oubli affiche la vérification en attente, puis le reçu confirme l'oubli. À 440 px, rejet, désactivation indépendante de l'historique et panne de lecture sont distincts ; aucun débordement horizontal observé.

![Conflit de correction, banc local à 375 px](memory-conflict-375.png)

Autres preuves : [liste 375 px sombre](memory-375-dark.png), [vérification après réponse perdue](memory-verification-375.png), [liste 440 px claire](memory-440-light.png), [erreur de lecture](memory-read-error-440.png).

## Contrôles globaux encore rouges

`npm run security:check` échoue avec **neuf alertes** : motif de clé dans l'ancien test `performance-validation.test.ts`, validateur recherché à l'ancien chemin `api/security/env-validator.js`, CORS générique dans deux fonctions Edge et cinq alertes de concaténation SQL. Tous les fichiers signalés, ainsi que le scanner, sont identiques à la base Git ; le validateur recherché est également absent de cette base. Le validateur API actuel existe dans `apps/api/src/config/env.ts`. Ces diagnostics n'ont pas été déclarés résolus ou certifiés comme faux positifs dans ce lot.

`npx tsc -p tsconfig.app.json` reste bloqué par des séquences littérales `\n` à la ligne 163 de `src/design-system/index.ts`, identiques à la base Git. Le build Vite passé ne constitue donc pas un succès du contrôle TypeScript global du client. L'ESLint élargi aux fichiers anciens modifiés reste également rouge sur les `any` historiques ; seul le périmètre de cœur ci-dessus est déclaré vert.

## Conservation, réparation et suppression

Les nouvelles données d'assistant portent une échéance selon le réglage : 7 jours, 30 jours, aucune échéance en mode complet, ou `autoDeleteAfter` explicitement configuré. Elles sont exclues des lectures à expiration puis purgées à la prochaine lecture de politique ou à l'export. Réduire la durée ne prolonge aucune échéance précédente. Le contexte temporaire expire sous 24 h.

Aucun cron distant n'a été activé : pour un compte inactif, la purge physique attend une prochaine utilisation. Les anciennes lignes version 0 non expirées restent consultables et supprimables, sans requalification ni partage automatique. La pagination permet de retrouver les pages anciennes, y compris au-delà de 200 entrées historiques ; la recherche porte sur les pages chargées. Le profil confirmé et le journal suivent leurs contrats distincts. Les reçus et clés opaques sans texte effacé restent jusqu'à suppression du compte afin de préserver reprise et non-résurrection. Les sauvegardes Supabase et la rétention du fournisseur ne sont pas purgées ni homologuées par les tests locaux.

Le [rapport de réparation simulée](repair-dry-run.json) contient uniquement références, regroupements opaques, destinations proposées et conflits. `scripts/audit-v10-memory.ts` n'a aucun client DB ni chemin de mutation et refuse des entrées non déclarées fictives. Aucune donnée historique réelle n'a été réparée.

Une demande de suppression reste une demande. La migration couvre la transition effectivement terminée et supprime les dix objets mémoire/journal du propriétaire. Le traitement opérationnel des demandes et la suppression distante doivent être vérifiés dans l'environnement de livraison.

## Migration et livraison

Nouvelle migration : [`20261011184535_v10_assistant_memory.sql`](../../../supabase/migrations/20261011184535_v10_assistant_memory.sql). Elle dépend de la fondation mémoire ainsi que des migrations V10-01, V10-02 et V10-03 listées dans la matrice. Elle a été appliquée uniquement aux bases jetables du harnais ; **elle n'a pas été appliquée au projet Supabase distant**.

Ordre de livraison :

1. Vérifier les migrations déjà appliquées et le diff SQL sur le projet ciblé, puis appliquer 03C.
2. Déployer ensemble l'API et le client qui utilisent le protocole versionné. Les anciens endpoints de mutation mémoire répondent `426 COMMAND_REQUIRED` ; un ancien client doit être actualisé.
3. Vérifier avec deux comptes et deux clients les réglages réellement persistés, les reçus, la confirmation de profil, les conflits et la suppression/export dans cet environnement.
4. Valider Safari sur l'iPhone 17 Pro Max : clavier et zone sûre, correction, recherche, panne réseau/réponse perdue, changement de compte, focus et VoiceOver.

Le SHA de livraison et les checks GitHub sont consignés dans la pull request de `codex/v10-03c-memoire-fiable`. Cet instantané de validation précède la publication Git ; il ne certifie ni l'application distante de la migration ni le déploiement de l'API/client. Les opérations d'homologation ci-dessus restent à réaliser dans l'environnement cible.

En cas de retour arrière, désactiver extraction et résumés tout en gardant lecture personnelle, oubli, profil canonique et filtres de partage. Ne pas rétablir une lecture non filtrée ni les anciennes mutations directes.
