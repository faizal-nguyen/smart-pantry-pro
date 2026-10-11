# V10-03C — contrats et état des environnements

Date : 11 octobre 2026. Données de validation fictives. Direction graphique conservée : Cuisine personnelle.

## Destinations

| Information | Référence | Écriture | Réemploi |
| --- | --- | --- | --- |
| Allergie, exclusion, régime, objectif, ingrédient aimé/évité, cuisine, matériel, durée/portions habituelles | `nutrition_profiles` | Proposition candidate puis `write_nutrition_profile`, version et consentement attendus | Contraintes déterministes ; détail transmis au modèle seulement si partage confirmé |
| Goût épicé/doux | `assistant_memory_items.payload.type=taste` | Commande mémoire ; un seul sujet `spiciness` | Dialogue et signal de goût ±0,45, pondéré par le score existant ; tags/ingrédients documentés seulement, inconnus neutres |
| Style de réponse et autres notes non sensibles | Souvenir confirmé | Commande mémoire ; inférences candidates | Dialogue seulement |
| Recette appréciée, à refaire, trop longue | `recipe_interactions` et `cooking_journal_entries` | `record_assistant_recipe_feedback`, transaction et identité communes | Classement V10-03 ; sans référence recette vérifiée, journal seulement |
| Envie de ce repas | Entrée volontaire et contexte temporaire | Session ≤24 h si historique autorisé ; sinon mémoire vive du navigateur | Pas de préférence permanente ; pas de cache de classement issu de cette envie |
| Échange passé | Conversation et messages | RPC serveur avec propriétaire et révision | Messages autorisés de la révision courante, filtrés avant limite |
| Résumé | Couverture de messages et révision | Réservation de couverture puis appel et écriture attendus | Continuité ; jamais source d'une contrainte confirmée |

Une instruction explicite permet de confirmer un goût non sensible. Une allergie n'est jamais activée dans une préférence ordinaire. Une correction reclasse le texte ; une correction de profil attend une confirmation distincte.

Une formulation médicale composée ou trop longue reste une proposition à éditer dans le profil ; le système ne fabrique pas un ingrédient composite à confirmer.

## Migration → objets → chemins → droits

| Migration | Objets utiles | Lecteurs / écrivains actifs | Droits effectifs | Preuve actuelle |
| --- | --- | --- | --- | --- |
| `20260513120000_create_assistant_memory_foundation.sql` | Conversations, messages, souvenirs, résumés, session, journal | `MemoryService`, panneaux assistant, journal | RLS du compte ; droits mémoire resserrés par 03C | Fondation réelle chargée dans PostgreSQL local jetable |
| `20261008151704_v10_reliability_commands.sql` | Commandes stock et mouvements | Commandes stock ; aucune réutilisation de leurs reçus pour la mémoire | RPC authentifiées et contrat existant | Dépendance chargée dans le harnais 03C |
| `20261008210917_v10_mobile_routine.sql` | Routine, historique de cuisine | Interface mobile et journal | Contrat V10-02 conservé | Dépendance chargée dans le harnais 03C |
| `20261009095426_v10_personalization.sql` | Profil versionné, interactions, cache, consentement | `NutritionProfileService`, moteur, feedback | Profil et commandes par compte | Dépendance chargée ; confirmation et effacement du profil retestés après 03C |
| `20261011184535_v10_assistant_memory.sql` | Version/destination/payload/révision des souvenirs ; état, reçus, tombstones opaques, réservations de résumés ; révision des messages et résumés ; identité des retours journal | `MemoryPolicy`, `ContextBuilder`, outils mémoire, moteur, `VoiceAgentService`, routes mémoire/confidentialité et export | SELECT personnel sur les objets exposés ; aucune mutation directe des souvenirs par client ; RPC authentifiées pour commandes et confidentialité ; artefacts d'historique réservés au serveur ; helpers privilégiés dans `private`, `search_path=''`, grants explicites | Migration exécutée et testée localement ; application distante non vérifiée |

Le wrapper de profil devient invoker et appelle le corps existant dans `private` afin que l'effacement de profil garde son contrat après retrait des droits DELETE directs sur les souvenirs. La logique de validation/version/reprise du profil est conservée.

Le rôle serveur n'est jamais livré au navigateur. Les lectures serveur imposent systématiquement `user_id`. La RPC d'artefacts contrôle le propriétaire de la conversation et de chaque message couvert ; la commande contrôle la provenance liée à un message. UPDATE direct sur les souvenirs est retiré : déplacer un souvenir ou contourner sa classification n'est pas possible pour un client authentifié.

## Autorisations et politique commune

`assistantMemoryEnabled`, `saveHistory`, consentement du profil et `shareWithAssistant` sont indépendants. Une clé mémoire ou historique absente est désactivée. La migration ne réécrit pas les réglages existants et ne crée aucun consentement.

Une lecture personnelle autorise la consultation et l'oubli même lorsque la mémoire est désactivée. Un fait utilisable par le modèle doit appartenir au compte, être explicite, confirmé, non sensible, non expiré, structuré et lié à une révision autorisée. Les souvenirs historiques version 0 non expirés restent consultables, sans promotion ni transmission automatique. La liste est paginée et permet de charger les pages suivantes ; la recherche porte sur les souvenirs chargés.

La politique est utilisée par le contexte, les lecteurs mémoire, la recherche d'historique, les résumés, le moteur et la synthèse des résultats de tools. Les contraintes persistantes restent lues depuis le profil. Les mentions de faits durables dans l'ancien historique sont exclues de la réutilisation : elles ne remplacent pas les sources structurées.

Le contexte reste borné à huit souvenirs, dix messages, environ 1 200 tokens. Le filtrage précède ces limites. Chaque envoi fournisseur relit les réglages ; chaque écriture dérivée vérifie la révision sous le même verrou transactionnel que les changements de profil/confidentialité. Une course d'écriture du cache est rejetée en base.

## Commandes et résultats

Enveloppe : `command_id`, `operation`, `expected_version`, `expected_revision`, référence et payload stricts ; confirmation de profil avec `expected_profile_version`. Reçu minimal sans contenu : identité, statut, destination, versions et motif. Réutiliser une identité avec une enveloppe différente échoue.

Statuts : `saved`, `awaiting_confirmation`, `disabled`, `not_saved`, `verification_required`. L'extraction est attendue avant toute promesse. Les commandes manuelles incertaines restent figées en sessionStorage, isolées par compte, avec expiration 24 h ; on vérifie le reçu avant de rejouer exactement la même enveloppe. Le texte d'édition reste affiché lors d'un conflit, avec relecture explicite avant une nouvelle commande.

L'oubli/rejet retire contenu, payload et preuve du souvenir ; une clé opaque bloque sa réextraction inférée. Une nouvelle demande explicite peut constituer un nouvel élément. L'oubli incrémente la révision et purge résumés, réservations, session et cache. L'historique personnel peut rester consultable selon son consentement indépendant, mais l'ancienne révision ne peut plus servir de contexte.

## Résumés et conservation

Vingt messages autorisés non couverts déclenchent un résumé. Couverture unique, entrée ≤6 000 caractères, sortie ≤320 tokens et ≤1 600 caractères, appel ≤5 s, aucun retry fournisseur. L'appel est attendu, `store:false`, annulation par AbortSignal ; un résultat tardif n'est pas sauvegardé. Une couverture déjà tentée ne déclenche pas un second appel payant. Coût observé ajouté à la réponse ; échec et coût inconnu qualifiés séparément. Aucun job durable n'est annoncé.

Le nom de modèle reste celui du dépôt pour ce lot ; sa mise à jour relève de 03D. Les tests fournisseur sont simulés : ils prouvent les gardes, la borne et la persistance, pas la qualité d'un résumé en production.

Les nouveaux souvenirs, conversations et messages portent une échéance : `minimal` = 7 jours, `standard` ou choix absent = 30 jours, `full` = aucune échéance ; `autoDeleteAfter` entre 1 et 365 jours est prioritaire. Une correction ou confirmation explicite renouvelle l'échéance du fait. Une réduction de la durée raccourcit les échéances sans prolonger les précédentes. Le contexte de repas expire sous 24 h.

Les lectures excluent immédiatement les échéances dépassées. La RPC de politique et l'export purgent les nouvelles données expirées, sous verrou du compte, et invalident les contextes dérivés. Aucun cron distant n'a été activé : pour un compte inactif, la purge physique attend sa prochaine lecture de politique ou son export. Les anciennes lignes version 0 ne sont pas effacées par ce mécanisme. Profil et journal gardent leurs contrats distincts. Les reçus minimaux, clés opaques et compteur de révision restent jusqu'à suppression du compte pour préserver l'idempotence et empêcher une résurrection ; ils ne contiennent pas le texte effacé.

L'export mémoire comprend les dix objets mémoire/journal, y compris reçus et clés opaques ; l'export de personnalisation conserve son contrat séparé. La suppression terminée purge ces objets et ne touche pas les autres comptes. Les logs ordinaires ne contiennent pas de texte de souvenir ni de conversation. Les politiques de sauvegarde Supabase et de rétention fournisseur restent celles de ces services : ce lot ne prouve aucune purge instantanée de sauvegardes externes.

## Historique et environnements

Le simulateur `scripts/audit-v10-memory.ts` travaille sur des fixtures locales et ne possède aucun accès DB. Il propose des reclassements candidats, des regroupements de provenance et des conflits à arbitrer, sans modifier le profil ni activer une allergie. Le rapport ne copie pas les contenus. Aucune donnée réelle n'a été réparée ; toute future réparation demande un périmètre et une procédure récupérable.

Les preuves locales, l'application distante des migrations, le déploiement et l'usage sur iPhone sont des états distincts. Le harnais utilise des rôles PostgreSQL réels et deux propriétaires fictifs dans une base jetable ; il ne constitue pas une vérification du projet Supabase distant. L'émulation responsive ne vaut pas un test physique Safari/VoiceOver.
