# PRP V11-02 — Rappels utiles, foyer partagé et usage hors ligne

> Statut : Brouillon — décisions proposées, non validées par l'utilisateur.
> Date : 2026-11-22.
> Relecture : Codex, 22 novembre 2026 ; constats vérifiés dans le code et intégrés.
> Priorité : P1 pour les alertes de péremption et la liste de courses hors ligne ; P1 pour la liste partagée ; P2 pour le stock et les menus partagés, l'installation et la première utilisation.
> Dépendances : commandes de [V10-01](../V10/PRP-V10-01-Fiabilite.md) (migrations `20261008151704_v10_reliability_commands.sql` et `20261108120000_menu_shopping_commands.sql`), profil de [V10-03](../V10/PRP-V10-03-Personnalisation.md), socle de sécurité (`20261105090000_security_baseline.sql`, `20261108160000_security_ownership.sql`), [contrats communs V10](../V10/README.md) ; contrat d'écriture de la liste de courses et préalable du nettoyage nocturne, tous deux portés par [V11-05](PRP-V11-05-Stock-Et-Courses.md).
> Coordination : [V11-01](PRP-V11-01-Boucle-Menus-Courses.md) (menus → courses), [V11-03](PRP-V11-03-Recettes-Recherche-Cuisson.md) (notes et minuteurs), [V11-04](PRP-V11-04-Assistant-Chef.md) (assistant, « brief du jour »), [V11-05](PRP-V11-05-Stock-Et-Courses.md) (stock et liste), [V11-06](PRP-V11-06-Consolidation-Design-Mesure.md) (inventaire des tables) ; [V10-04](../V10/PRP-V10-04-Prototype-iOS.md) et [V10-05](../V10/PRP-V10-05-Pilote-iOS.md) pour le natif.
> Source : audit fonctionnel du 22 novembre 2026, constats revérifiés dans le code le même jour (écarts en section 3).
> Estimation indicative : 7,5 à 10 semaines pour une personne à temps plein — rappels 1,5 à 2 semaines, hors-ligne 1,5 à 2 semaines, liste partagée 2,5 à 3 semaines, stock et menus partagés 1,5 à 2 semaines, installation et introduction 3 à 4 jours. Le contrat d'écriture de la liste est chiffré par V11-05. Hypothèses : environnement Supabase de test avec deux comptes, accès à `pg_cron` et `pg_net`, iPhone disponible pour les essais ; à recalibrer après E0, en particulier E5 à E7 d'après l'inventaire des voies d'écriture.

## 1. Problème et résultat attendu

L'application ne rappelle jamais rien à l'utilisateur, ne se partage pas et cesse de fonctionner sans réseau. Trois conséquences mesurables dans le code :

1. Les réglages « Alertes de péremption » sont enregistrés et la permission du navigateur est demandée, mais aucun appareil n'est abonné et aucun serveur n'envoie. Une préférence activée est aujourd'hui une promesse non tenue.
2. La liste de courses, le stock et les menus sont lus et écrits avec `user_id` comme seule clé d'accès. Deux personnes du même foyer ne peuvent pas partager une liste.
3. En magasin sans réseau, la liste ne s'affiche pas si elle n'était pas déjà à l'écran, et une coche échoue.

Résultat attendu : un rappel quotidien réellement envoyé ou, à défaut, visible à l'accueil ; une liste de courses lisible et cochable hors ligne, rejouée sans doublon ni écrasement ; une liste partagée en temps réel entre les membres d'un foyer, puis le stock et les menus ; une première utilisation et une installation cohérentes avec ce qui existe.

## 2. Périmètre et limites

Inclus : abonnement web push, préférences serveur, tâche d'envoi quotidienne, repli dans l'application ; lecture en cache de la liste et des recettes retenues, file de coches hors ligne ; foyer (création, invitation, rôles, départ, dissolution), partage de la liste puis du stock et des menus, extension au foyer du rangement et de son annulation ; choix des convives d'un repas ; décision sur le flux d'onboarding ; invite d'installation et manifeste.

Exclus, traités ailleurs : contrat d'écriture de la liste — ajout agrégé, cochage, modification, suppression, opérations groupées et inverses (V11-05, étape dédiée ; ce lot le consomme et y ajoute seulement l'extension au foyer) ; neutralisation de la tâche `cleanup-shopping-list` (préalable transverse détaillé en V11-05 E0) ; passage des menus aux courses, génération de semaine et scan de ticket (V11-01) ; recettes et mode cuisson (V11-03) ; contenu du « brief du jour » (V11-04, qui réutilise le canal de la section 4) ; design, analyses, analytique et suppression du code mort (V11-06).

Non-objectifs : profils enfants et contrôle parental (le stub [useFamilyMode](../../src/hooks/useFamilyMode.ts) reste neutre) ; plusieurs foyers par compte ; partage de la mémoire de l'assistant ; écritures hors ligne autres que les coches de la liste, donc ni notes ni collections de recettes (V11-03 garde sa saisie préservée) ; notification locale de fin de minuteur (V11-03 garde son signal au premier plan) ; notifications natives, synchronisation en arrière-plan et stockage natif, qui relèvent de V10-04 et V10-05.

Frontière avec iOS, sans dépendance circulaire : ce lot livre le web (Safari, application web installée) et des contrats serveur indépendants du client — commandes, autorisation par foyer, préférences et journal d'envoi. V10-04 et V10-05 peuvent les consommer s'ils existent ; ils ne les attendent pas et ce lot n'attend pas le choix de pile native. Le choix « notifications locales ou serveur » du pilote ([V10-05, section 8](../V10/PRP-V10-05-Pilote-iOS.md)) reste ouvert.

## 3. État de départ et surfaces actives

| Élément | État établi (22 novembre 2026) | Travail prévu |
| --- | --- | --- |
| [NotificationsSection](../../src/components/settings/NotificationsSection.tsx), [appStore](../../src/store/appStore.ts) | Trois interrupteurs et `Notification.requestPermission()` ; réglages dans la clé locale `smart-grocery-app-state`, commune à tous les comptes de l'appareil | Préférences serveur par compte ; abonnement réel ; état honnête par appareil |
| [sw.js](../../public/sw.js) | Gestionnaire `push` avec texte par défaut codé en dur, qui affiche toute notification reçue sans lien avec la session ; `payload.data` fusionné sans contrôle dans l'URL ouverte ; `badge-72x72.png` absent ; un clic sur le corps n'ouvre rien ; `skipWaiting` puis purge des anciens caches à l'activation | Charge utile validée, association appareil-compte, clic et réabonnement |
| Abonnement et envoi | Aucun `pushManager.subscribe`, aucune clé VAPID, aucune table, aucune dépendance d'envoi ; la route admin existante attend un `POST` avec `X-Admin-Token` ([adminAuth](../../apps/api/src/middleware/adminAuth.middleware.ts)) | Section 4 |
| [useShoppingList](../../src/hooks/useShoppingList.ts) | État React sans cache persistant ; ajout (unité obligatoire), coche et suppression unitaires ou groupées, « vider les achats » et modification (produit, quantité, unité, prix estimé, rayon, contrôle de `stock_version`) écrits directement dans Supabase ; seule `transfer_shopping` est une commande V10 ; aucun canal temps réel | Raccordement au contrat de V11-05, cache local, canal temps réel |
| Autres écritures de la liste | L'assistant insère, coche, vide et réinsère des lignes directement avec le client de session ([write.ts](../../apps/api/src/services/assistant/handlers/write.ts), [high.ts](../../apps/api/src/services/assistant/handlers/high.ts), [internal.ts](../../apps/api/src/services/assistant/handlers/internal.ts)) ; `recipe_add_missing` agrège sur les lignes du seul compte | Toutes à faire passer par le contrat de liste avant F1 |
| `private.execute_stock_command` | `SECURITY DEFINER`, appelable par `authenticated` ; verrou consultatif par compte (`v10-stock:<compte>`) ; `transfer_shopping` verrouille et supprime les lignes `user_id = v_user` et copie la ligne dans `stock_movements.source_shopping` ; `undo_stock` réinsère cette copie | Verrou par foyer, rangement et annulation étendus au foyer |
| [stockCommands](../../src/services/stockCommands.ts), [schéma partagé](../../packages/shared/src/stock-commands.ts) | Intentions persistées sous `v10-command:<compte>:<intention>` ; premier résultat renvoyé pour un `command_id` déjà vu ; `payload_version` contraint à 1 ; aucune purge des reçus dans le dépôt, qui suppriment leurs mouvements en cascade | Fenêtre de rejeu et conservation des reçus fixées ensemble |
| Temps réel | Canaux `postgres_changes` filtrés par `user_id` pour le stock, les recettes et le profil ([useFoodGuidance](../../src/hooks/useFoodGuidance.ts), [useRoutineMealIdeas](../../src/hooks/useRoutineMealIdeas.ts), [useNutritionProfile](../../src/hooks/useNutritionProfile.ts)) ; `shopping_list` déjà ajoutée à la publication par la migration du 18 août 2025 | Canal de révision, section 7 |
| Tables de foyer | `families`, `family_members`, `shared_shopping_lists`, `shopping_list_collaborators`, `live_shopping_sessions` et `shopping_list.shared_list_id` (clé étrangère `ON DELETE CASCADE`) créées en août 2025 ; un déclencheur sur `auth.users` écrit dans `shared_shopping_lists` à chaque inscription ; aucun appel dans `src/` ni `apps/api/src` ; présence en production inconnue | Ne pas réutiliser ; section 6 |
| `/api/v1/shopping` | Monté avec `supabaseAdmin`, paramètre inutilisé : les handlers utilisent `req.supabaseClient`, soumis à la RLS ; le dépôt historique lit `is_checked` et `list_id`, que le hook actif n'utilise pas ; aucun appelant client trouvé | Sort décidé en E0 |
| [AuthSessionContext](../../src/contexts/AuthSessionContext.tsx), [AccountSection](../../src/components/settings/AccountSection.tsx) | La déconnexion appelle `signOut`, puis la transition vide le cache de requêtes, envoie `PURGE_PRIVATE_DATA` et supprime les clés `v10-draft:` et `v10-command:` des autres comptes à la connexion suivante ; les transitions d'un autre onglet arrivent par `onAuthStateChange` | Purge étendue au cache hors ligne et à l'abonnement push |
| Démarrage sans réseau | [AuthenticatedLayout](../../src/components/layout/AuthenticatedLayout.tsx) renvoie vers `/auth` sans utilisateur ; un jeton expiré déclenche un rafraîchissement réseau et `getSession` renvoie alors une session vide (auth-js 2.71.1) ; [useRecipeDetails](../../src/hooks/useRecipeDetails.ts) ne lit qu'en ligne | Mode local borné, section 5 |
| Suppression RGPD | `private.delete_user_rows` efface, en une transaction par demande, toute ligne portant le `user_id` du demandeur ; les fichiers sont effacés par l'API au dépôt de la demande, et un échec n'empêche pas le travailleur horaire de la marquer terminée ([settings.privacy.routes](../../apps/api/src/routes/settings.privacy.routes.ts)) | Procédure reprenable, section 6 |
| [OnboardingPage](../../src/pages/OnboardingPage.tsx), [useOnboarding](../../src/hooks/useOnboarding.ts), [usePersonalization](../../src/hooks/usePersonalization.ts) | Route publique `/onboarding`, atteinte seulement par « Refaire l'onboarding » ; brouillon sous `v10-draft:<compte ou anonymous>:onboarding` ; seules les réponses finalisées du compte sont proposées à l'import dans [NutritionProfileEditor](../../src/components/settings/NutritionProfileEditor.tsx) ; les brouillons anonymes sont effacés à la connexion suivante et l'ancien profil sans propriétaire n'est jamais attribué | Section 8 |
| [KitchenDashboard](../../src/pages/kitchen/KitchenDashboard.tsx) | Carte « Prendre tes repères » pilotée par `introduction`, préférence serveur ; « À utiliser bientôt » : trois lots de quantité positive à sept jours ou moins, dates dépassées comprises, fuseau `Europe/Paris` fixe | Support du repli des rappels |
| [manifest.json](../../public/manifest.json), invite d'installation | Deux captures référencées, dossier `public/screenshots` absent, pas de champ `id` ; `beforeinstallprompt` typé dans [vite-env.d.ts](../../src/vite-env.d.ts), `installPromptEvent` jamais alimenté, hook `usePWA` cité dans [main.tsx](../../src/main.tsx) inexistant | Section 8 |

Écarts avec la lecture d'audit : l'icône `icon-192x192.png` existe (seul le badge manque) ; des canaux temps réel existent hors liste de courses ; les réponses finalisées d'onboarding sont importables ; la coche n'est pas une commande idempotente, ce qui impose le contrat de V11-05 avant tout rejeu. Écart avec la première rédaction : `/api/v1/shopping` n'agit pas en rôle de service.

## 4. Rappels : abonnement, envoi et repli

### Données

| Table proposée | Contenu | Accès |
| --- | --- | --- |
| `notification_preferences` | Par compte : activation, types (`expiry`, puis `daily_brief` pour V11-04), heure locale d'envoi, fuseau IANA explicite (proposé depuis le navigateur à l'activation), heures calmes, version | Lecture et écriture par le propriétaire, valeurs validées en SQL ; référence serveur (contrat 5) |
| `push_subscriptions` | Par appareil : compte, point de terminaison unique, clés `p256dh` et `auth`, transport (`webpush` ; `apns` réservé), libellé, dernier succès, échecs, révocation | Aucun droit pour `authenticated` : l'API renvoie au propriétaire une projection (identifiant, libellé, dates, état) ; point de terminaison et clés ne sortent pas du serveur |
| `notification_deliveries` | Compte, type, date locale, contenu calculé, unicité sur (compte, type, date locale) | Lecture par le propriétaire ; écriture par le rôle de service |
| `notification_attempts` | Une ligne par (envoi du jour, abonnement), unique : `reserved`, `accepted` (réponse 2xx du service de push), `failed`, `unknown` (issue incertaine), `displayed_at` signalé par le service worker | Écriture par le rôle de service ; affichage signalé par une route authentifiée |

Les quatre tables portent `user_id` : elles sont couvertes par `private.delete_user_rows` et ajoutées à l'export.

### API

```text
GET    /api/v1/notifications/config          clé publique VAPID
GET    /api/v1/notifications/preferences     préférences du compte
PUT    /api/v1/notifications/preferences     écriture versionnée
PUT    /api/v1/notifications/subscriptions   enregistre l'appareil courant
DELETE /api/v1/notifications/subscriptions/:id
POST   /api/v1/notifications/test            envoi d'essai, débit limité
POST   /api/v1/notifications/displayed       affichage constaté par le service worker
GET    /api/v1/notifications/today           rappel du jour, pour le repli
POST   /api/admin/notifications/run          envoi des rappels préparés (jeton admin)
```

Le compte vient de la session ; un `user_id` dans le corps est ignoré. Schémas zod dans `packages/shared`, enveloppe de réponse existante. Le serveur écrit vers l'adresse fournie par le client : elle doit être en HTTPS, son hôte figurer dans une liste fermée de services de push arrêtée en E0, et passer [isAllowedFetchUrl](../../apps/api/src/services/imports/platforms/ssrfGuard.ts) ; tailles des clés et du libellé bornées. Un point de terminaison déjà associé à un autre compte n'est jamais réattribué en silence : l'ancienne association est révoquée. La clé privée VAPID est une variable d'environnement serveur, validée au démarrage.

### Tâche quotidienne

Précédent : la tâche `pg_cron` horaire de `20261106140000_process_deletion_requests_hourly.sql`, doublée d'une route admin manuelle. Même schéma en deux temps :

1. Une fonction SQL horaire prépare, pour chaque compte dont l'heure locale d'envoi est atteinte dans son fuseau, la ligne du jour. Elle compte les lots de quantité positive dont la date tombe entre aujourd'hui et sept jours ; une date dépassée n'est pas un produit « à finir » : elle est comptée à part, « à vérifier », et une date limite de consommation (`date_kind = 'use_by'`) dépassée n'est jamais présentée comme consommable. Aucun lot concerné : aucune ligne, donc aucun rappel vide.
2. L'envoi demande du chiffrement web push, donc du Node. La route admin réserve chaque tentative de façon atomique (`FOR UPDATE SKIP LOCKED`, comme le travailleur RGPD), revérifie préférences, heures calmes et abonnement au moment d'envoyer, puis marque `accepted`, `failed` ou, si la réponse est perdue, `unknown`. Une tentative `unknown` n'est pas renvoyée le même jour. Une tentative restée `reserved` au-delà d'un délai fixé en E0 passe à `unknown`. Les réponses 404 et 410 révoquent l'abonnement.

Déclencheur à choisir en E0, et vérifié authentifié avant d'ouvrir E2 : appel `pg_net` depuis la même tâche, avec l'en-tête `X-Admin-Token` stocké côté base (emplacement sécurisé à confirmer), ou tâche planifiée de l'hébergeur. Pour Vercel, l'appel planifié serait un `GET` portant un secret dans `Authorization` (à confirmer sur la documentation et l'offre), ce qui demande une entrée dédiée distincte de la route admin actuelle ; `vercel.json` ne déclare aujourd'hui aucune tâche.

### Contenu et règles d'envoi

- Titre : le nombre de produits à utiliser bientôt. Corps : jusqu'à trois noms, puis, s'il y en a, le nombre de dates à vérifier. Pas d'idée de recette : le moteur lit le profil et la mémoire par un client de session que la tâche n'a pas. L'idée reste à l'accueil, authentifiée. Aucun appel au modèle pour un rappel de péremption.
- Aucune donnée de santé, de profil ni de mémoire dans la charge utile, qui s'affiche sur un écran verrouillé.
- Un rappel au plus par type et par jour ; rien pendant les heures calmes ; `tag` par jour pour remplacer plutôt qu'empiler.
- Le clic, sur le corps comme sur l'action, ouvre l'accueil sur « À utiliser bientôt ». L'URL est un chemin interne validé par le service worker.
- « Rappels de courses » n'a aujourd'hui aucun déclencheur défini : l'interrupteur est retiré jusqu'à ce qu'un cas précis soit décidé.

### Association appareil-compte

À l'abonnement, le service worker enregistre localement l'identifiant opaque de l'abonnement et du compte. La charge utile porte le même identifiant : sans correspondance, ou si l'association est absente, le service worker affiche un texte générique sans nom de produit (« Ouvre Smart Grocery pour voir tes rappels »). À la déconnexion et au changement de compte, l'association locale est effacée avant `signOut`, puis `unsubscribe()` est appelé et la ligne serveur supprimée, ou au prochain contact si l'appareil est hors ligne. Un push déjà accepté par le service avant la révocation ne montre donc que le texte générique. `pushsubscriptionchange` réenregistre l'appareil pour le compte de l'association, après vérification de la session.

### Parcours et états

| État de l'appareil | Ce que l'utilisateur voit |
| --- | --- |
| Push disponible, non abonné | Bouton « Recevoir les rappels sur cet appareil » ; la permission est demandée sur ce geste |
| Abonné | Appareil listé, heure d'envoi, heures calmes, « Envoyer un essai », « Arrêter sur cet appareil » |
| Permission refusée | Explication et marche à suivre dans les réglages du système ; le repli reste actif |
| iPhone ou iPad, hors écran d'accueil | Instructions d'installation à la place du bouton |
| Push indisponible | Mention claire ; rappel dans l'application uniquement |

Sur iOS et iPadOS, le push web n'existe que pour une application web ajoutée à l'écran d'accueil, à partir de la version 16.4, et la permission doit suivre un geste direct de l'utilisateur : [WebKit, « Web Push for Web Apps on iOS and iPadOS »](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), relu le 22 novembre 2026. À confirmer sur l'iPhone de test en E0. Le push déclaratif, sans service worker ([WebKit](https://webkit.org/blog/16535/meet-declarative-web-push/)), n'est pas retenu ici.

Repli : `/notifications/today` calcule le rappel du jour à la lecture, à partir du stock courant, sans dépendre de la préparation ni de l'envoi. La carte d'action de l'accueil le présente tant qu'aucun appareil n'a signalé son affichage ce jour-là. Une préférence enregistrée, une permission accordée ou une acceptation par le service de push ne sont jamais comptées comme un rappel vu.

## 5. Hors ligne : lire, cocher, rejouer

Cas d'usage, dans l'ordre : lire et cocher la liste en magasin ; consulter une recette en cuisine.

### Lecture

- Le service worker continue de ne stocker aucune réponse privée : la règle de V10-01 et son test [sw-isolation](../../src/lib/__tests__/sw-isolation.v10.test.ts) sont conservés. Il précharge en revanche le code des deux écrans hors ligne ; aujourd'hui seuls les fichiers déjà chargés une fois sont en cache.
- Les données vont dans un magasin IndexedDB nommé par compte : dernière liste lue (articles, produits, versions, date de lecture) et recettes retenues — menu de la semaine, recettes gardées explicitement, session de cuisine en cours ([cookingSessions](../../src/services/cookingSessions.ts)). Les détails (ingrédients, étapes) y sont copiés, et la fiche les lit depuis cette source quand le réseau manque.
- Démarrage à froid : sans réseau et sans session valide (jeton expiré, rafraîchissement impossible), l'application ouvre un mode local en lecture pour le seul compte marqué « dernier vérifié » sur cet appareil, limité à la liste et aux recettes retenues, avec les coches mises en file. Ce mode a une durée maximale à fixer en E0 ; la déconnexion volontaire efface le marqueur. Il demande une exception explicite dans `AuthenticatedLayout`, testée.
- L'écran affiche la date de dernière lecture et l'état « hors ligne ». Une recommandation ou une disponibilité de stock en cache n'est pas présentée comme à jour.

### File d'écritures

Préalable : le contrat d'écriture de la liste livré par V11-05 et le préalable du nettoyage nocturne levé. Ce lot ne définit pas de commande de liste ; il exige du contrat, pour le rejeu :

- un cochage à état explicite (coché ou non), portant la version de la ligne telle qu'affichée au moment du geste ;
- une ligne déjà dans l'état voulu confirme la commande sans écriture ;
- une version changée entre-temps (quantité modifiée, décochée par un autre membre) renvoie un conflit, jamais un écrasement ;
- une commande par geste et par ligne, pour qu'un conflit ne bloque pas les autres coches.

Hors ligne, seul le cochage est accepté. Chaque geste crée son `command_id`, est écrit dans la file avant que l'écran n'affiche « en attente », puis rejoué dans l'ordre au retour du réseau ou à la reprise de l'application. La synchronisation en arrière-plan n'est pas utilisée : sa disponibilité dans Safari est à vérifier en E0, et le rejeu au premier plan suffit au cas d'usage.

| Réponse au rejeu | Suite |
| --- | --- |
| Confirmée, même `command_id` déjà traité, ou ligne déjà dans l'état voulu | Retirée de la file ; cache réconcilié |
| Réseau ou erreur 5xx | Conservée, nouvel essai |
| 401, session expirée du même compte | File suspendue jusqu'à la reconnexion de ce compte |
| Version changée | « À vérifier », avec l'état actuel ; l'auteur décide |
| Article supprimé ou accès au foyer retiré | « À corriger », avec l'explication ; jamais rejouée seule |
| Intention plus ancienne que la fenêtre de rejeu | « À vérifier », pas de rejeu automatique (règle de [V10-04](../V10/PRP-V10-04-Prototype-iOS.md)) |

Fenêtre de rejeu : elle n'existe pas encore, aucun reçu n'étant purgé. E0 la fixe avec la conservation des reçus, qui doit au moins la couvrir ; purger des reçus supprimerait leurs mouvements en cascade, donc aucune purge sans décision distincte. La capacité serveur est déployée avant la file cliente, et ses types de commande et la consultation de leurs résultats restent lisibles pendant toute la fenêtre, retour arrière compris.

Les quatre états du contrat 6 — en attente, synchronisé, en conflit, à corriger — sont distincts à l'écran. Ranger les achats, consommer une recette et modifier le stock restent en ligne.

### Purge et comptes

- Session expirée du même compte : cache et file conservés ; rejeu suspendu jusqu'à la reconnexion de ce compte.
- Déconnexion volontaire : avec des coches en attente, l'application demande d'abord de les envoyer ou de les abandonner en connaissance de cause ; puis cache, file, marqueur local et association push sont effacés.
- Bascule vers un autre compte, y compris depuis un autre onglet : le cache du compte précédent est purgé aussitôt. Sa file, réduite aux identifiants de ligne, états voulus et versions, sans nom ni quantité, reste hors de portée de l'interface du nouveau compte ; elle est présentée à son auteur à sa prochaine connexion vérifiée, ou abandonnée à la fin de la fenêtre de rejeu.
- Lectures tardives : chaque lecture porte son compte et une époque ; une réponse arrivée après une bascule est écartée et ne recrée jamais un cache purgé.
- Le nom du cache statique du service worker change pour que `purgeOldCaches` retire l'ancien ; un onglet encore sur l'ancien build pendant l'activation est testé.

## 6. Foyer : modèle d'autorisation

### Pourquoi un nouveau modèle

Les tables d'août 2025 mêlent deux conceptions (famille avec rôles parent et enfant, liste partagée avec collaborateurs), leurs politiques n'ont pas été revues par le socle de sécurité de novembre 2026 et leur présence en production n'est pas établie. Proposition : trois tables neuves — `households`, `household_members`, `household_invitations`. L'inventaire des anciennes, déclencheurs et contraintes compris, est produit par V11-06 ; leur retrait est une décision distincte, avec sauvegarde vérifiée. Il commence par le déclencheur sur `auth.users`, sans quoi supprimer `shared_shopping_lists` ferait échouer les inscriptions, et par la contrainte `shopping_list.shared_list_id`, dont la cascade effacerait des articles si des lignes de `shared_shopping_lists` étaient supprimées.

### Règle d'accès

- Chaque table partagée reçoit une colonne `household_id` nullable ; `user_id` reste l'auteur.
- Ligne sans foyer : `household_id IS NULL AND user_id = auth.uid()`, inchangé. Un compte sans foyer ne voit aucun changement.
- Ligne de foyer : `household_id IS NOT NULL AND private.is_household_member(household_id)`, appartenance active, quel que soit l'auteur. Un ancien membre ne garde aucun accès, même aux lignes qu'il a créées.
- `household_id` et `user_id` ne changent que par les fonctions serveur d'arrivée, de départ, de dissolution et de suppression ; une écriture directe qui les modifie est refusée.
- `private.is_household_member` est stable, à `search_path` vide et non exécutable par `anon`.
- La RPC de commandes étant appelable directement par `authenticated`, chaque branche vérifie dans la transaction l'appartenance et que la ligne, le produit et le foyer cités relèvent du même périmètre ; zod côté Express ne suffit pas.
- Le verrou consultatif par compte ne sérialise pas deux membres : toute commande sur une ligne de foyer prend un verrou par foyer, que prennent aussi l'arrivée, le départ et le retrait d'un membre.

### Coût de migration

| Surface | Constat | Conséquence |
| --- | --- | --- |
| Politiques RLS | [SECURITY-RLS-CHECKLIST](../../docs/SECURITY-RLS-CHECKLIST.md) pose l'isolation par `user_id` comme objectif | Checklist, `supabase/checks/*.sql` et scripts `test-security-*-db.py` à réécrire table par table |
| `private.execute_stock_command` | Filtre `user_id=v_user` sur le stock, la liste, les mouvements et le journal | Chaque branche accepte l'appartenance active, sans jamais lire l'identité dans la charge utile |
| Rangement et annulation | `transfer_shopping` ne voit que les lignes du compte qui range ; `undo_stock` réinsère la copie de la ligne | Dès F1 : rangement d'un achat du foyer dans le stock personnel de la personne qui range, en une transaction ; annulation qui revérifie l'appartenance, la ligne et les versions, et ne restaure jamais dans un foyer quitté (« à corriger ») |
| Voies d'écriture de la liste | Hook (unitaires et groupées), outils de l'assistant, `recipe_add_missing`, `menu_add_missing` (V11-01), route historique | Toutes par le contrat de V11-05, étendu au foyer ; les écritures directes de `authenticated` sur `shopping_list` sont retirées avant d'activer F1 |
| API | `/api/v1/shopping` passe par le client de session ; son dépôt lit des colonnes inutilisées | E0 vérifie ses appelants et décide de la retirer ou de l'aligner ; toute route en rôle de service vérifie l'appartenance dans le code |
| Lectures du client | `.eq('user_id', …)` et canaux filtrés `user_id=eq.` | Filtre par foyer lorsqu'il existe ; canal de révision (section 7) |
| Suppression RGPD | Toute ligne au `user_id` du demandeur est effacée ; ses lignes rangées par d'autres restent en copie dans leurs mouvements | Procédure ci-dessous |
| Caches et moteur | Déclencheurs de cache et recommandations calculés par compte ; `loadInventory` filtre par compte | À reprendre en F2, pas avant |
| Journaux | `stock_commands` et `stock_movements` sont par auteur | Inchangés ; l'annulation reste celle de l'auteur, après revérification de l'accès |

### Paliers

| Palier | Partagé | Reste personnel |
| --- | --- | --- |
| F1 | `shopping_list`, avec rangement et annulation étendus | Stock, menus, recettes, profil, mémoire, journal de cuisine |
| F2 | `inventory`, ses commandes, les lectures du moteur et les caches | Menus, recettes, profil, mémoire |
| F3 | `weekly_meal_plans`, `meal_plan_entries` (avec V11-01) | Profil, mémoire, conversations, journal, retours sur recettes |

Conséquence de F1 seul : des achats cochés par une personne et rangés par une autre entrent dans le stock de celle qui range. À dire dans l'interface tant que F2 n'est pas livré. F2 se valide de bout en bout avec deux membres : lecture, recommandations, caches, commandes et annulation. F3 garde un seul plan par semaine et par périmètre, propose à l'arrivée de verser ou garder les menus existants comme pour la liste, et commence par les recettes déjà lisibles par tous (catalogue, recettes publiques) ; le droit de lecture des recettes privées planifiées reste à décider. Les entrées de menu n'ont pas d'auteur propre : elles suivent leur plan.

Objets des autres lots à couvrir par palier. F1 reprend aussi ce que V11-01 attache à la liste et rattache aujourd'hui au seul `user_id` : les contributions du menu (`menu_shopping_contributions`) et les scans de ticket (`receipt_scans`). Il dit qui peut réduire la contribution d'un menu dont il n'est pas l'auteur et qui peut ranger un achat rapproché depuis le ticket d'un autre membre. F2 suppose que les emplacements de V11-05 passent au foyer : la clé `(user_id, location_id)` est à reprendre avant d'ouvrir le stock partagé. F3 reprend les gestionnaires de l'assistant qui filtrent les menus par `user_id` ([read.ts](../../apps/api/src/services/assistant/handlers/read.ts), lecture du plan de la semaine).

### Invitations, rôles, départ

- Rôles : un `owner` et des `member`. Tous lisent et écrivent les données partagées ; seul le propriétaire invite, retire un membre, transmet son rôle ou dissout le foyer.
- Invitation : jeton aléatoire placé dans le fragment de l'URL (`#`), jamais dans le chemin, la requête ni `returnTo`, pour qu'il n'atteigne ni les journaux du serveur ni l'adresse de confirmation de courriel. Avant connexion ou inscription, il est gardé en `sessionStorage` ; la route d'acceptation est ajoutée à [routineDestination](../../src/lib/routineRoutes.ts), qui la réécrirait sinon en `/kitchen`. Il est effacé après acceptation, refus ou expiration. Stocké haché, à usage unique, expirant, révocable.
- Acceptation : session exigée, nom du foyer et de l'invitant affichés avant confirmation. En base : un seul foyer par compte (unicité sur le membre), un seul propriétaire par foyer (index unique partiel), consommation atomique de l'invitation par mise à jour conditionnelle. Limite de débit, réponse identique pour un jeton inconnu, expiré ou déjà utilisé.
- Arrivée : le nouveau membre choisit de verser sa liste en cours dans celle du foyer ou de la garder de côté ; rien n'est fusionné sans ce choix.
- Départ ou retrait : l'accès cesse à la requête suivante. Sous le verrou du foyer, les lignes créées par le partant restent au foyer et sont réattribuées au propriétaire. Le canal est fermé ; le cache local du foyer et les coches en attente sur ses lignes sont purgés au prochain contact. Un appareil resté hors ligne garde sa copie jusqu'à la reconnexion, au plus la durée maximale du mode local.
- Dissolution : chaque ligne revient à son auteur, toujours membre actuel puisque les lignes des partants ont été réattribuées. Le propriétaire ne peut pas partir sans transmettre son rôle ou dissoudre.
- Journal : invitations, arrivées, retraits et transmissions sont tracés, lisibles par les membres.

### RGPD et mémoire

- Export ([DataPrivacySection](../../src/components/settings/DataPrivacySection.tsx), RPC `export_user_data`) : les données personnelles, l'appartenance au foyer et les lignes partagées dont le compte est l'auteur. Pas les adresses ni les profils des autres membres.
- Suppression, procédure reprenable : sous le verrou du foyer, sortie du foyer et réattribution des lignes partagées au propriétaire ; s'il est lui-même propriétaire, le rôle passe au membre le plus ancien, ou le foyer est dissous s'il est seul. Les références à l'auteur dans les copies conservées chez d'autres membres (`stock_movements.source_shopping`, charges utiles et résultats de `stock_commands`) sont remplacées par le compte de réattribution ; l'annulation d'un rangement restaure alors la ligne à ce nom. Puis `private.delete_user_rows` efface le reste, toujours en une transaction par demande. La demande n'est marquée terminée qu'après succès de la base et de l'effacement des fichiers, ce qui corrige un écart existant.
- La mémoire de l'assistant, les conversations, le profil alimentaire et le journal de cuisine restent personnels. L'assistant agit sur les données partagées avec les droits de la personne qui lui parle, par les mêmes commandes ; il ne reçoit ni le profil ni la mémoire d'un autre membre. Les réglages de partage existants entre le profil et l'assistant ne valent pas consentement au partage avec le foyer.

## 7. Liste en temps réel et convives

Temps réel : Postgres Changes n'applique pas la RLS aux suppressions et ne permet pas de les filtrer ([Supabase, « Postgres Changes »](https://supabase.com/docs/guides/realtime/postgres-changes), relu le 22 novembre 2026). Or les suppressions de la liste sont courantes, rangement compris : un canal sur `shopping_list` ne peut pas garantir qu'un ancien membre ne reçoit plus rien. Proposition : une table `shopping_list_revisions`, une ligne par foyer ou par compte sans foyer, dont un déclencheur incrémente le compteur dans la transaction de toute écriture de la liste. Le client s'abonne aux mises à jour de sa seule ligne, soumises à la RLS (appartenance active), puis relit la liste avec sa session. Alternative à évaluer en E0 : canaux privés de diffusion autorisés par RLS. Une coche locale en attente reste affichée par-dessus l'état relu jusqu'à sa confirmation. [agentEvents](../../src/lib/agentEvents.ts) reste le pont d'invalidation après une action de l'assistant.

Convives (« ce soir on est 2 ») : [MealContextPanel](../../src/components/recipes/MealContextPanel.tsx) porte déjà un nombre de portions, prérempli par `usualServings`. Ajout proposé : choisir qui mange parmi les membres. Chaque membre décide s'il partage avec le foyer ses allergies, ses régimes et ses exclusions — trois champs distincts du profil ; objectifs et cibles ne sont jamais partagés. Le client envoie des identifiants de membres ; le serveur vérifie leur appartenance et calcule l'union des contraintes consenties. Un membre qui n'a rien partagé apparaît comme « contraintes inconnues », et la suggestion n'affirme pas de compatibilité pour lui (contrat 8). Les convives sans compte — enfant, invité — sont une extension à décider.

## 8. Première utilisation et installation

Onboarding. Deux parcours coexistent : le flux `/onboarding`, qui écrit ses réponses en local et ne rejoint le profil que par un import manuel, et la carte « Prendre tes repères » de l'accueil, pilotée par une préférence serveur. Recommandation : garder la carte et retirer le flux, dans cet ordre :

- L'éditeur de profil propose d'abord l'import des réponses attribuables au compte, finalisées ou encore en brouillon, en conservant les exclusions du profil serveur. Les données sans propriétaire ne sont jamais attribuées automatiquement ; les brouillons anonymes, déjà effacés à la connexion, ne sont pas récupérables.
- La carte gagne une étape facultative — nombre de convives habituel et exclusions — écrite directement dans le profil par [useNutritionProfile](../../src/hooks/useNutritionProfile.ts).
- Ensuite seulement, `/onboarding` redirige vers l'accueil ; « Refaire l'onboarding » devient « Revoir l'introduction » et remet `introduction` à `new`, sans effacer de personnalisation. La suppression des composants `src/components/onboarding` inutilisés est transmise à V11-06.

Installation.

- Manifeste : produire les deux captures à partir de l'application réelle ou retirer leurs entrées ; ajouter `id`.
- Navigateurs qui émettent `beforeinstallprompt` : conserver l'événement et proposer l'installation après une action réussie, jamais au chargement ; un refus est mémorisé par appareil.
- Safari sur iPhone n'émet pas cet événement ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event), à confirmer en E0) : afficher les instructions « Partager, puis Sur l'écran d'accueil », dans le parcours d'activation des rappels, puisque l'installation y est la condition du push.

## 9. Décisions proposées

| Sujet | Proposition | Alternative écartée |
| --- | --- | --- |
| Référence des préférences de rappel | Table serveur par compte, fuseau explicite | Magasin local actuel, commun à tous les comptes de l'appareil |
| Préparation des rappels | Fonction SQL sous `pg_cron`, envoi par route admin avec tentatives réservées | Calcul et envoi entièrement dans une tâche de l'hébergeur |
| Absence de produit à utiliser bientôt | Aucun rappel | Message quotidien systématique |
| Contenu du rappel | Noms et nombres seulement, aucune idée de recette, aucun appel au modèle | Idée personnalisée calculée sans session |
| Issue incertaine d'un envoi | `unknown`, pas de second envoi le jour même | Nouvel essai automatique |
| Abonnements push | Lus par le serveur seul ; projection pour le propriétaire ; hôtes autorisés en liste fermée | Lecture directe par le propriétaire |
| Push reçu sans association locale | Texte générique | Contenu nominatif dans tous les cas |
| « Rappels de courses » | Interrupteur retiré jusqu'à définition d'un déclencheur | Le conserver sans effet |
| Stockage hors ligne | IndexedDB par compte ; service worker sans donnée privée | Réponses privées dans le cache du service worker |
| Service worker | Fichier actuel étendu, liste de préchargement produite au build | Remplacement par une bibliothèque de PWA |
| Démarrage hors ligne | Mode local en lecture, borné au dernier compte vérifié et à une durée maximale | Session valide exigée, donc liste inaccessible après expiration du jeton |
| Écritures hors ligne | Coches seulement | Ajout, rangement ou consommation hors ligne |
| Conflit sur une coche | Version attendue ; état déjà atteint confirmé sans écriture ; sinon « à vérifier » | Dernier état écrit, qui écrase la décision d'un autre membre |
| File d'un compte remplacé sur l'appareil | Réduite aux identifiants, gardée pour son seul auteur jusqu'à la fin de la fenêtre | Supprimée à la bascule, comme les intentions V10 |
| Tables de foyer | Nouvelles tables ; retrait des anciennes par décision distincte | Réutiliser `families` et `shared_shopping_lists` |
| Modèle d'accès | `household_id` nullable, `user_id` auteur, appartenance active seule pour une ligne de foyer | « Auteur ou membre », qui laisse l'accès à un ancien membre |
| Lignes d'un partant | **Validée le 22 novembre 2026.** Réattribuées au propriétaire | Laissées à leur auteur |
| Canal temps réel | Ligne de révision par périmètre, puis relecture | Postgres Changes sur `shopping_list` |
| Jeton d'invitation | Fragment d'URL, `sessionStorage` avant connexion | Paramètre de requête ou `returnTo` |
| Foyers par compte | Un seul | Plusieurs foyers et bascule |
| Rôles | Propriétaire et membre | Droits fins par membre, profils enfants |
| Premier palier | Liste de courses, rangement et annulation compris | Stock, liste et menus livrés ensemble |
| Suppression du compte d'un membre | Lignes et copies réattribuées, foyer conservé, fin après fichiers effacés | Effacement des lignes partagées de l'auteur |
| Contraintes des convives | Partage consenti des allergies, régimes et exclusions | Lecture du profil complet des membres |
| Onboarding | Import des réponses attribuables, puis carte conservée et flux retiré | Relier le flux au profil et l'imposer à l'inscription |
| Retour arrière du foyer | Arrêt réversible du partage, sans redistribution | Dissolution générale des foyers |

Restent à fixer par l'utilisateur, aucune valeur n'étant arrêtée ici : durée de validité d'une invitation, fenêtre de rejeu et conservation des reçus, durée maximale du mode local, délai de bascule d'une tentative `reserved` en `unknown`, liste des services de push autorisés, heure d'envoi et heures calmes par défaut.

## 10. Cas limites

- Deux appareils du même compte : un seul contenu par jour ; le repli disparaît dès qu'un appareil a signalé l'affichage.
- Changement de fuseau ou d'heure : la date locale du journal d'envoi empêche un second rappel le même jour.
- Deux exécutions simultanées de l'envoi : une seule tentative par abonnement.
- Réponse perdue après envoi : tentative `unknown`, pas de second envoi ; repli affiché.
- Abonnement expiré : révoqué au premier refus du service de push ; l'appareil repasse en « non abonné ».
- Push arrivé après une déconnexion : texte générique, aucun nom de produit.
- Même coche faite hors ligne par deux membres : même état final ; la seconde est confirmée sans écriture.
- Coche hors ligne sur un article dont la quantité a changé ou qu'un autre membre a décoché : « à vérifier », rien n'est écrasé.
- Coche hors ligne sur un article supprimé entre-temps : « à corriger », l'article n'est pas recréé.
- Stockage local refusé ou plein : la coche n'est pas acceptée hors ligne et le message le dit, comme le fait déjà `commandForIntent`.
- Jeton expiré en magasin sans réseau : la liste s'ouvre en mode local pour le dernier compte vérifié, dans la durée maximale.
- Invitation ouverte par un compte déjà membre d'un foyer : refus expliqué, aucun changement. Deux acceptations simultanées : une seule réussit.
- Membre retiré pendant qu'il fait les courses hors ligne : ses coches sont rejetées au rejeu ; sa copie locale est purgée à la reconnexion.
- Achat créé par A, rangé par B, puis B quitte le foyer : l'annulation du rangement ne restaure pas la ligne dans le foyer quitté.
- Demande de suppression d'un propriétaire avec d'autres membres : rôle transmis, données du foyer intactes, aucune référence restante à son compte.

## 11. Découpage de réalisation

| Étape | Livrable | Indépendance |
| --- | --- | --- |
| E0 — Inventaire | Préalable transverse du nettoyage nocturne levé (V11-05 E0) ; schéma réel de l'environnement cible (anciennes tables, déclencheurs, contraintes, publication, `pg_cron`, `pg_net`) ; toutes les voies d'écriture de la liste et leurs appelants, dont `/api/v1/shopping` ; essai push sur iPhone installé ; services de push autorisés ; déclencheur authentifié ; fenêtre de rejeu, conservation des reçus et durée du mode local proposées | Aucune modification de production |
| E1 — Rappels serveur et repli | Tables, préférences, `/notifications/today` calculé à la lecture, carte de l'accueil | Utile seule |
| E2 — Envoi et appareil | Préparation, tentatives réservées, route d'envoi, abonnement, service worker, association appareil-compte, désabonnement | Dépend de E1 et d'un déclencheur authentifié vérifié en E0 |
| E3 — Raccordement de la liste | `useShoppingList` sur le contrat de V11-05, exigences du rejeu vérifiées | Dépend de l'étape dédiée de V11-05 ; sans foyer ni hors-ligne |
| E4 — Hors ligne, liste personnelle | Préchargement, IndexedDB, mode local borné, file de coches, purge, source locale des recettes | Dépend de E3 |
| E5 — Foyer F1 | Tables, règle d'accès, invitations, verrou par foyer, rangement et annulation étendus, fermeture des écritures directes, canal de révision, suppression reprenable, copie hors ligne du foyer bornée | Dépend de E3 et E4 ; revue de sécurité dédiée avant fusion |
| E6 — Foyer F2 | Stock partagé, commandes, moteur et caches | Dépend de E5 ; coordination V11-05 |
| E7 — Foyer F3 et convives | Menus partagés, choix des convives | Dépend de E6 ; coordination V11-01 |
| E8 — Introduction et installation | Import des réponses, carte d'accueil, puis redirection ; manifeste, invite | Indépendante |

E1–E2, E3–E4 et E8 peuvent être livrées sans foyer. E5 est le premier changement du modèle d'autorisation.

## 12. Vérification et critères de sortie

Tests écrits d'abord, selon les conventions du dépôt : suites `.v11.test` côté client et API, scripts `scripts/test-v11-household-db.py` et `scripts/test-v11-notifications-db.py` sur PostgreSQL local, requêtes de contrôle dans `supabase/checks/`, puis `npm run build`.

- Base, deux comptes puis trois : sans foyer, A ne lit ni n'écrit la liste de B ; après acceptation, les deux lisent et écrivent ; après retrait, B ne lit plus rien, y compris ses propres lignes ; une écriture directe qui change `household_id` ou `user_id` est refusée ; un appel direct à la RPC avec une ligne d'un autre périmètre est refusé sous deux comptes et pour `anon` ; deux acceptations simultanées d'une invitation, une seule réussit.
- Concurrence : coche et décoche simultanées de deux membres ; rangement par B d'un achat créé par A ; annulation après départ refusée ; départ pendant une commande en cours.
- Temps réel : un ancien membre resté connecté ne reçoit aucune révision après une insertion, une modification ou une suppression.
- Suppression : aucune référence au compte supprimé ne reste dans les lignes partagées ni dans les copies d'autres membres ; demande terminée seulement après effacement des fichiers.
- Commandes : un même `command_id` rejoué deux fois ne produit qu'un effet ; charge utile différente sous le même identifiant : `IDEMPOTENCY_CONFLICT`.
- Client : coche hors ligne conservée après rechargement, rejouée une fois, réponse perdue sans double effet ; démarrage à froid sans réseau avec jeton expiré ; changement de build avec un ancien onglet ouvert ; bascule de compte sans donnée de l'ancien et sans recréation de cache par une lecture tardive ; le test d'isolation du service worker reste vert.
- Rappels : deux exécutions simultanées, une tentative par abonnement ; issue incertaine sans renvoi ; aucun envoi pendant les heures calmes ; adresse hors liste refusée ; push après déconnexion affiché en texte générique ; repli affiché quand aucun affichage n'a été signalé.
- Paliers : pour F1, F2 et F3, un test de passage et un test de retour arrière sur un jeu de données préexistant, avec un foyer ayant déjà connu un départ.

Critères de sortie :

- [ ] Un rappel de péremption est reçu sur un iPhone installé et sur un navigateur de bureau, et son clic ouvre le bon écran.
- [ ] Sans abonnement, le même rappel apparaît à l'accueil le jour même.
- [ ] Aucun rappel n'est émis sans produit à utiliser bientôt, ni deux fois le même jour, ni avec un contenu nominatif après déconnexion.
- [ ] Mode avion : la liste s'ouvre à froid, y compris jeton expiré, dix coches sont acceptées, puis confirmées une seule fois au retour du réseau, sans écraser un changement d'un autre membre.
- [ ] Une recette du menu de la semaine s'ouvre sans réseau.
- [ ] Deux comptes d'un foyer voient la coche de l'autre sans recharger ; un ancien membre ne reçoit plus rien.
- [ ] Les scripts de base prouvent l'isolation avant, pendant et après l'appartenance à un foyer, appels directs à la RPC compris.
- [ ] Export et suppression sont vérifiés pour un membre et pour un propriétaire.
- [ ] Aucune charge utile de notification, aucun cache et aucune file ne contient de donnée d'un autre compte, ni d'un foyer quitté au-delà de la reconnexion ou de la durée maximale du mode local, ni de donnée de santé.
- [ ] F2 et F3 ont passé leurs tests de passage et de retour arrière.
- [ ] L'installation est proposée sur un navigateur compatible et expliquée sur iPhone ; le manifeste ne référence aucun fichier absent.

Une validation locale ne vaut pas une validation sur l'environnement Supabase cible ni un essai sur iPhone ; un contrôle bloqué est noté non validé.

## 13. Retour arrière et transmission

- Rappels : un réglage serveur coupe la préparation et l'envoi sans retirer les préférences ; le repli, calculé à la lecture, reste disponible. La tâche planifiée porte un nom fixe et se retire par ce nom.
- Hors ligne : un réglage désactive la file ; les coches en attente sont présentées à leur auteur pour envoi en ligne ou abandon, jamais effacées en silence. Les types de commande serveur et la lecture de leurs résultats restent en place pendant la fenêtre de rejeu. Un nouveau nom de cache retire le préchargement.
- Foyer : un réglage suspend invitations et écritures partagées ; les lignes de foyer restent lisibles par leurs membres actifs ; les commandes en attente sont rejouées ou présentées « à corriger ». Aucune redistribution automatique : rendre les lignes aux comptes serait une migration distincte, testée sur des foyers ayant connu des départs et des annulations en cours. La migration inverse des politiques, écrite et testée avant E5, ne s'applique que si aucun foyer n'existe. Aucune migration de foyer ne supprime de donnée.
- Introduction : la redirection de `/onboarding` se retire sans perte, les réponses locales n'étant pas effacées.

Transmission : à V11-04, le canal de notification (type `daily_brief`, plafond quotidien, heures calmes, journal communs, aucune donnée de profil dans la charge utile ; le brief exige un déclenchement quotidien même sans lot à échéance, à la date locale du compte, avec reprise par appareil, ce que la tâche des alertes de péremption ne fait pas) ; à V11-01, le palier F3, le plan unique par semaine et par périmètre, le droit de lecture des recettes planifiées ; à V11-05, les exigences du rejeu sur le contrat de liste et l'incompatibilité d'un repli par insertion directe une fois F1 actif ; à V11-03, le maintien hors de ce lot des notes et collections hors ligne et de la notification locale de minuteur ; à V11-06, l'inventaire des anciennes tables avec leur déclencheur et leur contrainte en cascade, le retrait du flux d'onboarding et du stub de mode famille ; à V10-04 et V10-05, les contrats serveur (commandes, appartenance au foyer, préférences, journal d'envoi, colonne de transport réservée) et ce que le web ne couvre pas : synchronisation en arrière-plan, notifications natives, stockage durable hors du navigateur.
