# Audit préparatoire — design, recettes, mémoire, agent et voix

Date : 9 octobre 2026. Référence : `main`, `dda2602e450066309e5cf99525a8fa1b5bbad392`.

Statut : analyse et propositions ; les cinq PRP dédiés ont été rédigés le 9 octobre dans `PRP/V10`. Aucun changement de fonctionnalité, de modèle, de base distante ou de déploiement n'a été réalisé. La rédaction ne valide ni ne corrige les constats.

## 1. Décision proposée

Faire précéder V10-04 / V10-05 d'une consolidation du produit web : restaurer l'envie de cuisiner, simplifier les écrans quotidiens, rendre la mémoire cohérente et préparer l'évolution de l'agent et de la voix. Le client iOS pourra reprendre une expérience validée et des contrats stables.

Les corrections V10-01 à V10-03 restent utiles : commandes de stock, récupération des intentions, quatre destinations, cuisine pas à pas, profil explicite et moteur commun. La régression des aperçus est apparue lors du remplacement de la bibliothèque en V10-02. Le filtre de mémoire ajouté en V10-03 protège la priorité du profil, mais laisse une rupture entre préférences mémorisées et personnalisation effective.

La direction proposée est une application de cuisine personnelle : des plats visibles, le stock concret, une décision simple et une aide adaptée à la tâche. L'interface actuelle est déjà sobre en couleurs ; le problème restant tient beaucoup à la hiérarchie, aux formulaires permanents, aux cartes répétitives et au langage.

## 2. Méthode et limites

- Lecture des routes, composants actifs, lecteurs et producteurs de données, historique Git et modèles configurés.
- Observation dans Chrome à 440 × 956 et 375 × 812, avec données fictives, API et Supabase simulés. Accueil observé en clair et sombre ; bibliothèque, fiche, stock, courses et paramètres observés ; dialogue d'ajout observé en sombre.
- Deux reproductions déterministes de l'extracteur de mémoire et une du constructeur de contexte, sans appel à OpenAI.
- Vérification des documents officiels OpenAI cités ci-dessous au 9 octobre 2026.
- Le bandeau du banc de test ajoute 88 px à 440 px de large et 116 px à 375 px. Les repères de position ci-dessous le soustraient. Ils restent indicatifs, propres aux données du test.
- La page complète de conversation a été analysée dans le code ; elle n'a pas été testée visuellement dans ce banc. Les états de recommandations remplis ont été analysés dans le renderer ; le banc observé présentait un état sans suggestions.
- Aucun test matériel sur l'iPhone 17 Pro Max, aucune mesure de qualité audio ou de latence fournisseur, aucun appel OpenAI facturé n'a été effectué.
- Le connecteur Supabase a refusé la lecture des métadonnées du projet. La commande de lecture `supabase migration list --linked` n'a pas pu continuer : ce checkout n'est pas lié à un projet CLI. L'application effective des migrations, les souvenirs réels et les URL d'images de production restent à vérifier. Aucun lien CLI ni accès n'a été modifié.
- Le modèle servi en production, les variables de déploiement et l'accès du compte aux nouveaux modèles n'ont pas été vérifiés.

Les observations locales structurées et reproductions sont conservées dans [observations.json](audits/2026-10-09-design-memoire-voix/observations.json). Les captures ont été consultées pendant l'audit ; aucun nouveau PNG n'est livré avec ce rapport.

## 3. Constats prioritaires

P1 : corriger avant de considérer ces usages quotidiens comme fiables. P2 : amélioration d'ergonomie ou de maintenabilité. Les priorités expriment un impact produit ; elles ne prétendent pas mesurer la fréquence du problème en production.

| ID | Priorité | Constat vérifié | Conséquence | Preuve principale |
| --- | --- | --- | --- | --- |
| R01 | P1 | La bibliothèque active ne conserve pas l'URL d'image dans ses lignes et ne rend aucun aperçu. | Les recettes deviennent des fiches textuelles ; il faut ouvrir la recette pour retrouver la photo. | [RoutineRecipeLibrary.tsx](../src/components/recipes/RoutineRecipeLibrary.tsx), lignes 27–33 ; [Recipes.tsx](../src/pages/Recipes.tsx), ligne 213. |
| R02 | P1 | Les suggestions reçoivent `image_url`, mais leur renderer ne l'affiche pas. | Même perte d'envie sur Aujourd'hui et les recommandations de la bibliothèque. | [RecommendationEngine.ts](../apps/api/src/services/recommendations/RecommendationEngine.ts), ligne 99 ; [PersonalizedRecipeSuggestions.tsx](../src/components/recipes/PersonalizedRecipeSuggestions.tsx), lignes 49–54. |
| D01 | P1 | Cinq sélecteurs et une réinitialisation précèdent les idées sur Aujourd'hui. La bibliothèque commence par un second bloc de recommandations. | L'utilisateur configure avant de voir ce qu'il pourrait cuisiner ; la recherche et les recettes passent au second plan. | [KitchenDashboard.tsx](../src/pages/kitchen/KitchenDashboard.tsx), lignes 44–47 ; [RoutineRecipeLibrary.tsx](../src/components/recipes/RoutineRecipeLibrary.tsx), ligne 30 ; observation mobile. |
| D02 | P2 | Chaque idée affiche quatre boutons de retour avant toute cuisine ; l'état vide de la bibliothèque propose un lien vers cette même bibliothèque. | Trop d'actions simultanées, boucle de navigation et feedback demandé au mauvais moment. | [PersonalizedRecipeSuggestions.tsx](../src/components/recipes/PersonalizedRecipeSuggestions.tsx), lignes 53 et 57. |
| D03 | P2 | Le stock expose recherche, catégorie, zone, quatre états et deux présentations avant les produits. Les courses commencent par un formulaire complet. | Les actions récurrentes de consultation et de coche rivalisent avec la configuration. | Observation des routes `/pantry/inventory` et `/shopping/list` à 375 px. |
| D04 | P2 | Le pied sticky du dialogue utilise `hsl(var(--background))` alors que les tokens sont OKLCH. | Fond transparent involontaire ; risque de superposition visuelle pendant le défilement. | [index.css](../src/index.css), lignes 32 et 636 ; [QuickStockDialog.tsx](../src/components/inventory/QuickStockDialog.tsx), ligne 61 ; fond calculé `rgba(0, 0, 0, 0)` et `CSS.supports` négatif pour HSL. |
| D05 | P2 | Textes mixtes « ta », « votre », « mon » ; pluriels `lot(s)` / `portion(s)` ; placeholder affichant littéralement `Tomates\nRiz`. | L'application paraît assemblée et conserve du langage d'implémentation dans les actions quotidiennes. | [Recipes.tsx](../src/pages/Recipes.tsx), [KitchenDashboard.tsx](../src/pages/kitchen/KitchenDashboard.tsx), [QuickStockDialog.tsx](../src/components/inventory/QuickStockDialog.tsx), ligne 57 ; observation du dialogue. |
| M01 | P1 | Avec le lecteur de profil fourni en production, le contexte exclut les mémoires culinaires, dont les préférences explicitement retenues. Le nouveau moteur utilise le profil, les retours et l'historique plutôt que ces anciennes inférences. | Une préférence visible dans la mémoire peut n'avoir aucun effet automatique sur la réponse ou le classement. | [ContextBuilder.ts](../apps/api/src/services/assistant/ContextBuilder.ts), lignes 94–104 ; [assistant.agent.ts](../apps/api/src/routes/assistant.agent.ts), ligne 232 ; [RecommendationEngine.ts](../apps/api/src/services/recommendations/RecommendationEngine.ts), lignes 24–29 et 52 ; reproduction locale. |
| M02 | P1 | « Souviens-toi que je suis allergique aux cacahuètes » produit une préférence ordinaire active et une contrainte sensible candidate. Une préférence explicite simple produit également deux entrées. | Classification sensible et déduplication incohérentes ; validation et usage difficiles à comprendre. | [MemoryExtractor.ts](../apps/api/src/services/assistant/MemoryExtractor.ts), lignes 87–102 et 268–295 ; reproductions fictives. |
| M03 | P1 | Le filtrage du contexte initial n'est pas repris dans `read_user_memories`. Ce tool lit les mémoires actives sans filtre de sensibilité ; les résultats peuvent être sérialisés pour la synthèse. | Les règles d'usage et de partage varient suivant la voie de lecture. Un filtrage initial ne suffit pas à définir la politique globale. | [handlers/memory.ts](../apps/api/src/services/assistant/handlers/memory.ts), lignes 61–77 ; [VoiceAgentService.ts](../apps/api/src/services/assistant/VoiceAgentService.ts), lignes 619–624 ; tool autorisé dans [RoutineHeader.tsx](../src/components/navigation/RoutineHeader.tsx), ligne 29. |
| M04 | P1 | Le panneau ignore l'erreur du hook et traite une liste absente comme une mémoire vide. Il promet la correction mais propose seulement confirmation et oubli. | Une panne peut ressembler à une perte des souvenirs ; modifier un souvenir n'est pas possible depuis ce panneau. | [MemoryPanel.tsx](../src/components/assistant/MemoryPanel.tsx), lignes 35–112 et 129–135 ; [useAssistantMemories.ts](../src/hooks/useAssistantMemories.ts), lignes 64–86 ; [AssistantMemorySection.tsx](../src/components/settings/AssistantMemorySection.tsx), ligne 43. |
| M05 | P2 | `recordSummary` n'a aucun appel trouvé dans le dépôt. Le contexte récent est plafonné à 10 messages et environ 1 200 tokens ; l'extraction est lancée en tâche non attendue. | Les tables et lecteurs de résumé ne prouvent pas une synthèse entretenue. La promesse de continuité d'une longue conversation reste incomplète. | [MemoryService.ts](../apps/api/src/services/assistant/MemoryService.ts), ligne 644 ; recherche `recordSummary(` ; [ContextBuilder.ts](../apps/api/src/services/assistant/ContextBuilder.ts), lignes 25–28 ; [VoiceAgentService.ts](../apps/api/src/services/assistant/VoiceAgentService.ts), lignes 383–398. |
| N01 | P1 | La fiche garde un calcul nutritionnel client distinct : les valeurs absentes peuvent devenir zéro, un badge « Nutri-Score » vient d'une heuristique locale et la source affichée est toujours Open Food Facts. | La fiche peut communiquer une certitude ou une provenance différente de celle des suggestions V10-03. | [RecipeDetail.tsx](../src/pages/RecipeDetail.tsx), ligne 651 ; [RecipeNutrition.tsx](../src/components/recipes/RecipeNutrition.tsx), lignes 229–275, 320–324 et 506. |
| A01 | P1 pour la migration | Les modèles et barèmes de l'agent sont codés en dur. Un modèle inconnu est tarifé comme `gpt-4o-mini`. | Remplacer seulement l'identifiant peut casser les tools ou rendre le coût annoncé faux. | [VoiceAgentService.ts](../apps/api/src/services/assistant/VoiceAgentService.ts), lignes 72–79 et 1033 ; [RecipeExtractionService.ts](../apps/api/src/services/imports/RecipeExtractionService.ts), ligne 489. |
| V01 | P1 à planifier | La dictée utilise `whisper-1`, dont l'arrêt est annoncé pour février 2027. L'aide contextuelle expose seulement une question texte ; la conversation complète contient le micro. | Mise à jour nécessaire de la transcription et parcours vocal encore fragmenté. | [WhisperTranscriber.ts](../apps/api/src/services/media/WhisperTranscriber.ts), lignes 58–71 ; [RoutineHeader.tsx](../src/components/navigation/RoutineHeader.tsx), lignes 28–48 ; [dépréciations OpenAI](https://developers.openai.com/api/docs/deprecations). |

Le cas M03 est établi sur les chemins de code. Aucun souvenir sensible réel n'a été lu ou envoyé pour le reproduire. Les protections du moteur V10-03 doivent être conservées : les contraintes confirmées restent prioritaires sur les mémoires et les demandes ponctuelles.

## 4. Restaurer les aperçus de recettes

### Chaîne de données établie

| Origine | Champ disponible | Lecture actuelle | Rupture |
| --- | --- | --- | --- |
| Recette `recipes` | `image_url` | `useRecipes` sélectionne les colonnes de la recette. | La projection de `RoutineRecipeLibrary` omet ce champ. |
| Bibliothèque `user_recipes` | `custom_photo_url`, sinon `catalog_recipe.photo_url` | Le mapper partagé produit `image_url` avec cette priorité. | La même projection omet le résultat. |
| Catalogue `recipes_catalog` | `photo_url` | `useRoutineCatalog` sélectionne la ligne ; le moteur la convertit en `image_url`. | La carte de catalogue courante et le renderer des suggestions ne rendent pas de photo. |
| Fiche recette | `image_url` | `RecipeDetail` transmet encore le champ à `RecipeMediaFrame`. | Le détail conserve la fonction, ce qui explique la différence perçue. |

Preuves : [useRecipes.ts](../src/hooks/useRecipes.ts), lignes 88–104 et 118–119 ; [recipe-model.ts](../packages/shared/src/recipe-model.ts), ligne 49 ; [useRoutineCatalog.ts](../src/hooks/useRoutineCatalog.ts) ; [RecipeDetail.tsx](../src/pages/RecipeDetail.tsx), ligne 515. Les anciennes [LibraryRecipeCard.tsx](../src/components/recipes/LibraryRecipeCard.tsx), lignes 69–71, affichent encore une image, mais ne sont plus les cartes montées par cette route.

La correction doit enrichir les cartes actuelles et préserver les références de recettes, le stock, les filtres et le moteur commun. Réactiver toute l'ancienne bibliothèque ferait revenir des chemins de données concurrents.

Proposition : composant d'aperçu partagé, photo visible avant le titre, format 4:3 à éprouver sur téléphone, espace réservé pendant le chargement, bon cadrage, variante compacte pour les listes. Préserver la photo personnelle avant la photo du catalogue. Prévoir l'image absente, l'URL cassée ou expirée et la faible connexion. Un aperçu manquant garde le titre et les actions ; éviter un grand cadre vide. Les photos existantes et leurs sources doivent être privilégiées.

Critères : un aperçu valide apparaît sans ouvrir le détail pour les trois origines ; les cartes de suggestions le montrent aussi ; une image défaillante ne casse pas la hauteur ni l'action ; les images différées ne bloquent pas les premières cartes. Un contrôle en production devra ensuite distinguer ce bug de rendu des éventuels problèmes d'URL ou de stockage.

## 5. Direction design et UX à éprouver

### Identité

Adopter une palette chaude et discrète, une famille typographique lisible, des espacements réguliers et une utilisation limitée des bordures. Donner aux photos une vraie place. Les icônes servent à reconnaître une action. Les couleurs de statut restent compréhensibles en clair et sombre, avec un texte associé.

Les tokens et primitives issus de PRP-237 offrent une base. Ses anciennes captures et constats sur les dégradés ne décrivent plus tous les écrans actuels. Sa prescription « assistant-first » doit être réexaminée face au besoin exprimé : garder le stock à jour et choisir quoi cuisiner. La navigation V10 à quatre destinations reste un bon point de départ.

### Parcours cibles

| Écran | Première chose utile | Simplification proposée |
| --- | --- | --- |
| Aujourd'hui | Un plat appétissant et une prochaine action liée à la situation réelle. | Contexte compact « Ce soir · 20 min · 2 personnes », modifiable à la demande ; éviter le grand bloc « choisir » lorsqu'il répète les idées. Stock urgent ou session en cours conserve sa priorité lorsque nécessaire. |
| Cuisiner / bibliothèque | Recherche, sélection personnelle et aperçus. | Bibliothèque directement parcourable ; section de suggestions distincte, compacte ou dans une vue dédiée. Import et création restent accessibles sans dominer. |
| Fiche recette | Photo, durée réelle, ingrédients nécessaires, action de cuisine. | Nutrition en estimation secondaire avec couverture et source ; supprimer la terminologie de cache ; disponibilité et contraintes présentées de façon cohérente avec le moteur commun. |
| Stock | Ingrédients, quantité et correction rapide. | Ajout clair, filtres secondaires repliables ; actions rares dans un menu ; présentation des dates conservée. La qualification détaillée apparaît lorsque l'action en a besoin. |
| Courses | Les lignes à cocher pendant les courses. | Ajout compact, quantité/unité à la demande ; groupe acheté et rangement dans le stock évidents ; édition moins envahissante. |
| Assistant | Une aide rattachée à la recette, au stock ou à la tâche. | Exemples utiles et précis ; accès court aux préférences retenues ; états d'écoute, transcription et résultat compréhensibles. Unifier la présentation entre aide contextuelle et conversation complète. |
| Paramètres | Des choix faciles à retrouver. | Sur mobile, tester une liste de rubriques face aux sept onglets horizontaux. Clarifier profil alimentaire, mémoire et nutrition bien-être pour éviter des réglages contradictoires. |

Sur le banc à 440 px, en état sans suggestions, la recherche de bibliothèque commence vers 683 px et le titre de la première recette vers 820 px, après soustraction du bandeau. À 375 px, le premier titre d'ingrédient commence vers 610 px. Ces observations confortent la nécessité de revoir les éléments placés avant le contenu ; elles ne constituent pas une mesure de production.

### Langage et actions

Proposition de ton : tutoiement simple et constant, actions concrètes (« Ajouter », « Corriger », « Cuisiner »), intitulés culinaires. Supprimer les pluriels techniques, promesses vagues et métaphores de cerveau dans les états vides. Une idée présente une photo, un titre, la durée et une raison courte vérifiable. Les exclusions ou incertitudes nécessaires à la décision restent visibles ; les versions, sources détaillées et critères de calcul restent accessibles dans « Pourquoi cette recette ? ».

Déplacer le retour « à refaire / trop long » après la cuisine. Garder un refus rapide « pas ce soir » avant le choix. Respecter la différence entre une préférence durable et une envie ponctuelle.

### Validation du design

Comparer deux variantes simples de Aujourd'hui et de la bibliothèque avant généralisation. Vérifier clair/sombre, petit et grand téléphone, texte agrandi, clavier ouvert, absence d'image, nom long, stock vide, erreur et connexion lente. Mesurer temps pour choisir une recette, quantité de défilement avant le premier plat, taps pour corriger le stock, retours arrière et capacité à distinguer confirmation d'une écriture et attente de réseau. La validation finale doit se faire sur l'iPhone du quotidien.

## 6. Une mémoire utile et contrôlable

Périmètre confirmé par l'utilisateur : la mémoire concerne l'assistant dans l'application. Elle doit conserver les goûts, habitudes et retours sur les recettes, ainsi que la continuité des échanges. Les souvenirs doivent être consultables, corrigeables et effaçables ; les contraintes alimentaires explicitement confirmées restent prioritaires.

La fondation existe déjà : [migration mémoire](../supabase/migrations/20260513120000_create_assistant_memory_foundation.sql), services, historique, contexte temporaire, réglages et journal de cuisine. V10-03 ajoute le profil explicite et des retours structurés. La priorité est de faire fonctionner ces éléments ensemble.

| Type d'information | Référence proposée | Usage et contrôle |
| --- | --- | --- |
| Allergies, exclusions, régimes et objectifs confirmés | Profil alimentaire versionné V10-03 | Priorité forte ; changement explicite ; règles d'usage et de partage uniformes sur contexte et tools. |
| Goûts, habitudes, matériel, niveau | Champs du profil lorsqu'ils existent ; souvenirs confirmés pour les informations complémentaires | Une préférence reconnue doit avoir une destination et un effet identifiables. Proposer la reprise des anciennes mémoires sans écraser automatiquement le profil. |
| Recettes appréciées, « à refaire », trop longues | Retours structurés et journal de cuisine | Réutilisation observable dans le classement ; conserver les références des différentes origines de recettes. |
| Envie et temps de ce repas | Contexte temporaire | Expiration ; aucune transformation automatique en préférence permanente. |
| Continuité d'une discussion | Conversation et résumé entretenu | Résumer avec provenance et messages couverts ; conserver la possibilité de corriger une erreur ; évaluer l'utilité avant d'ajouter une recherche sémantique. |

Exemple attendu : « Retenir que j'aime les plats épicés » produit une seule préférence confirmée et visible ; une nouvelle conversation ou un autre client peut la reprendre selon la politique de partage. « Pas de pâtes ce soir » affecte ce repas. « Je n'aime plus les plats épicés » corrige ou remplace la préférence précédente.

Correctifs nécessaires : classification sensible avant activation, déduplication des règles, gestion des contradictions, erreur distincte d'une mémoire vide, modification disponible dans l'UI, accusé de mémorisation après persistance, filtrage avant sélection des huit souvenirs pertinents, politique commune aux lectures automatiques et explicites. L'outil `read_user_memories` existe : M01 décrit la perte d'utilisation automatique, pas l'impossibilité de toute récupération explicite.

L'aide contextuelle [RoutineHeader.tsx](../src/components/navigation/RoutineHeader.tsx), lignes 28–29, ne transmet pas d'identifiant de conversation. Le service peut donc ouvrir un nouvel échange à chaque demande. Il faut préciser la continuité attendue pour une question de suivi et rendre la mémoire accessible sans la repousser après tout le fil mobile.

Critères : une information retenue survit à la relance et au changement de client ; sa correction modifie l'usage suivant ; l'oubli l'en retire ; une panne ne devient pas « pas encore de mémoire » ; les inférences ne modifient pas silencieusement une exclusion confirmée ; le même choix de partage est respecté quelle que soit la voie de lecture. Les tests de santé sont fictifs et distincts des données des utilisateurs.

## 7. Stack IA et voix réellement configurée

| Usage | Configuration locale vérifiée | Point à traiter |
| --- | --- | --- |
| Choix des tools et tâches ordinaires | `gpt-4o-mini` | Identifiant et coût dans `VoiceAgentService`, lignes 72–79. |
| Reprise après arguments invalides et synthèse orientée recettes | `gpt-4o` | Le modèle sert aussi de modèle de qualité, pas seulement de secours ; ligne 634. |
| Transcription de la conversation principale | `whisper-1`, `verbose_json` | Fichier envoyé après arrêt de `MediaRecorder`, limite par défaut de 60 secondes ; formats WebM et MP4 prévus. |
| Import / extraction de recettes | `gpt-4o-mini` par défaut | Client de completion partagé avec l'agent ; vérifier l'effet de tout changement d'adaptateur. |
| Endpoint de chat streaming générique | `OPENAI_MODEL`, sinon `gpt-4o-mini` | Configuration différente de celle de l'agent ; [routes/assistant.ts](../apps/api/src/routes/assistant.ts), ligne 74. |
| Sortie vocale inventaire | `window.speechSynthesis`, feedback facultatif | Appels dans `useInventory`, lignes 265 et 351. Aucune sortie vocale équivalente trouvée dans le compositeur principal de l'assistant. |
| Mémoire extraite | Règles françaises locales | Aucun modèle d'extraction sémantique dans `MemoryExtractor`. |
| SDK OpenAI installé | `4.104.0`, dépendance déclarée `^4.68.0` | Examiner les contrats de l'API choisie, les paramètres et le SDK avant migration. |

Le transport de l'agent reste `chat.completions.create`, y compris pour la synthèse streamée. La conversation vocale actuelle suit « enregistrer → envoyer → transcrire → agent → texte ». Elle ne fournit pas de conversation audio continue ni de réponse parlée dans cette surface.

Des anciens composants contiennent SpeechRecognition ou une transcription simulée. La recherche de leurs appelants ne les relie pas aux pages Stock/Courses actives V10. Ils ne doivent pas être pris pour preuve du comportement courant. Le service de synthèse navigateur, lui, a des appelants dans le hook d'inventaire lorsque le feedback est activé.

Les modèles auxiliaires de scan de ticket ou de parsing des courses restent des tâches distinctes. Une migration globale de tous les appels IA n'est pas nécessaire pour améliorer la conversation.

## 8. Options OpenAI vérifiées le 9 octobre 2026

Ces modèles forment une liste à évaluer. Leur disponibilité sur le compte et leur qualité sur les tâches de l'application restent à tester.

| Besoin | Candidat | Tarif public standard relevé | Compatibilité et rôle proposé |
| --- | --- | --- | --- |
| Agent quotidien économe | `gpt-6-luna` | 0,10 $ entrée / 0,50 $ sortie par million de tokens texte | Responses recommandé avec tools et raisonnement. Chat Completions permet le function calling avec `reasoning_effort: none`. Comparer aux tâches simples actuelles. [Fiche officielle](https://developers.openai.com/api/docs/models/gpt-6-luna). |
| Réponse culinaire plus exigeante | `gpt-6.1-sol` | 2 $ entrée / 10 $ sortie par million de tokens texte | Les tools exigent Responses ; ne pas substituer le nom dans le client Chat Completions actuel. [Fiche officielle](https://developers.openai.com/api/docs/models/gpt-6.1-sol). |
| Dictée enregistrée | `gpt-transcribe` | 0,0045 $ par minute | Premier candidat pour remplacer la transcription de fichier ; adapter la réponse et les indications linguistiques. [Fiche officielle](https://developers.openai.com/api/docs/models/gpt-transcribe). |
| Audio arrivant en continu | `gpt-live-transcribe` | À relever dans le benchmark | Transcription live seulement ; ne suffit pas à produire une réponse parlée. [Guide transcription](https://developers.openai.com/api/docs/guides/transcription). |
| Conversation vocale avec le backend métier existant | `gpt-live-1` | 0,05 $ / minute de session, plus backend et tools | Écoute et parole simultanées ; délégation au backend. Candidat pour la cuisine mains libres. [Fiche officielle](https://developers.openai.com/api/docs/models/gpt-live-1). |
| Conversation audio avec raisonnement et tools dans la session | `gpt-realtime-2.1-mini` | Audio : 10 $ entrée / 20 $ sortie par million de tokens audio ; barème texte distinct | Alternative à comparer en prototype, avec transport WebRTC/WebSocket et mêmes règles métier serveur. [Fiche officielle](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini). |

Le catalogue recommande aussi GPT-6 Astra comme modèle phare. Pour cet usage quotidien, les coûts et la complexité justifient d'évaluer Luna et Sol en premier. Le meilleur choix dépend du coût de la tâche réussie, de la qualité et de la latence mesurées. [Catalogue officiel](https://developers.openai.com/api/docs/models).

### Migration de l'agent

Créer une configuration explicite par rôle et un adaptateur Responses. Conserver le contrôle serveur des outils, leurs schémas, les confirmations requises, les références de recettes et les reçus de commandes. Adapter messages, sorties des tools, streaming, budget de sortie et raisonnement. Le changement de fournisseur de contexte ne doit pas introduire une seconde mémoire alimentaire concurrente. La [documentation du function calling](https://developers.openai.com/api/docs/guides/function-calling) confirme l'exigence Responses pour Sol.

Mettre à jour la mesure des coûts avec le modèle réellement retourné, les différents tours, le raisonnement, le cache lorsqu'il est utilisé et l'audio. Un modèle sans barème ne doit pas annoncer silencieusement le prix de `gpt-4o-mini`. Le service actuel calcule le coût de Whisper sur un prix constant et une durée fournie par le client ; cela reste une estimation.

Définir explicitement la conservation des réponses côté fournisseur lors de l'adaptation. `store: false` permet de désactiver le stockage des réponses de cette API ; cette option ne remplace pas la politique complète de données du fournisseur ni celle de l'application. [Guide de migration Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses).

### Migration de la voix

Étape utile à court terme : améliorer la dictée actuelle, offrir une transcription corrigeable lorsque nécessaire, un état de progression et une reprise compréhensible. La forme `verbose_json`, les champs langue/durée et le calcul de coût sont des contrats à adapter, pas uniquement l'identifiant du modèle. Le nouveau guide utilise `languages` pour les indications linguistiques des modèles Transcribe. [Guide transcription](https://developers.openai.com/api/docs/guides/transcription), [transcription de fichier](https://developers.openai.com/api/docs/guides/speech-to-text).

OpenAI annonce l'arrêt de `whisper-1` le **26 février 2027**. Remplacer Whisper par une autre ancienne famille de transcription également concernée ne serait pas une migration durable. [Calendrier officiel](https://developers.openai.com/api/docs/deprecations).

Étape suivante à éprouver : session mains libres en cuisine, réponse parlée courte, interruption, répétition d'une étape, minuteur et perte de connexion. Comparer GPT-Live avec backend existant à Realtime Mini plutôt que décider du transport à partir du seul nom d'un modèle. La documentation distingue ces architectures d'un pipeline transcription → agent → synthèse. [Guide des agents vocaux](https://developers.openai.com/api/docs/guides/voice-agents).

## 9. Benchmark avant changement de modèle

Le dépôt possède déjà une base de 20 scénarios dans [assistant-qa/fixtures.ts](../scripts/assistant-qa/fixtures.ts). La compléter pour les données et garanties V10, avec jeux fictifs reproductibles. Les scénarios existants ne constituent pas une évaluation audio.

| Axe | Exemples | Mesure / condition de sortie |
| --- | --- | --- |
| Intention et tools | Ajouter deux litres, corriger une quantité, rechercher une recette, demander un remplacement. | Bonne intention, arguments exploitables et référence correcte ; aucune écriture hors demande explicite ou confirmation requise par la politique existante. |
| Contraintes et incertitudes | Exclusion confirmée, composition inconnue, instruction contradictoire, profil changé pendant la réponse. | Aucun scénario critique ne contourne le profil ; raisons et états du moteur conservés. |
| Mémoire | Retenir, corriger, oublier, goût opposé, envie temporaire, panne de lecture, passage à un autre client. | Une destination et un effet vérifiables ; aucune activation sensible implicite ni duplication du cas reproduit. |
| Audio français | « Deux cent cinquante grammes », « un demi-litre », « n'ajoute pas », autocorrection, marques et noms culinaires, hotte en fond. | Erreurs sur produit, unité, quantité et négation mesurées séparément ; écoute humaine sur les cas ambigus. |
| Reprises | Réponse perdue, double envoi, passage hors ligne, annulation, retour dans la session. | Respect de l'idempotence et des reçus V10 ; aucun succès annoncé avant confirmation effective. |
| Vitesse et coût | Même jeu pour baseline et candidats, tous les tours inclus. | Temps de transcription, premier texte utile, première parole, p50/p95, coût par tâche réussie. Objectifs chiffrés fixés après mesure de la baseline. |
| Confiance et usage réel | Choisir un plat, le cuisiner, mettre le stock à jour plusieurs jours. | Mesurer la répétition spontanée de la boucle, les corrections et l'abandon. Un modèle plus récent doit apporter un gain visible. |

Conserver un retour arrière vers la configuration précédente pendant la comparaison. Mettre à jour l'agent et l'audio séparément pour pouvoir attribuer les écarts. Les coûts par token plus faibles ne garantissent pas un coût total par tâche plus faible.

## 10. PRP de consolidation créés

Les cinq PRP ci-dessous sont rédigés, avec périmètre, contrats, étapes et critères de sortie. Le suffixe conserve les références V10-04 et V10-05 déjà utilisées. La [feuille de route V10](../PRP/V10/README.md) et les dépendances iOS ont été actualisées ; les réalisations restent à mener.

| Ordre | Document dans `PRP/V10/` | Résultat attendu | Condition de sortie |
| --- | --- | --- | --- |
| 1 | [PRP-V10-03A-Recettes-Apercus.md](../PRP/V10/PRP-V10-03A-Recettes-Apercus.md) | Photos rétablies sur bibliothèque et suggestions ; chaîne de médias unifiée ; informations de fiche cohérentes avec V10-03. | Trois origines de recettes, image absente/cassée, nutrition inconnue et sources vérifiées. |
| 2 | [PRP-V10-03B-Design-Culinaire.md](../PRP/V10/PRP-V10-03B-Design-Culinaire.md) | Direction visuelle et hiérarchie de Aujourd'hui, Cuisiner, Stock, Courses, fiche et paramètres. | Deux variantes comparées ; choix validé sur le téléphone quotidien ; parcours et états d'erreur conservés. |
| 3 | [PRP-V10-03C-Memoire-Fiable.md](../PRP/V10/PRP-V10-03C-Memoire-Fiable.md) | Politique commune profil/souvenirs/conversations, correction, oubli, continuité et preuve de mémorisation. | Cas M01–M05 couverts ; comportement cohérent sur deux clients et deux comptes de test. |
| 4 | [PRP-V10-03D-Agent-Modeles.md](../PRP/V10/PRP-V10-03D-Agent-Modeles.md) | Configuration par rôle, adaptateur Responses, coût fidèle, benchmark Luna/Sol contre baseline. | Qualité et latence mesurées, tools/confirmations inchangés dans leur politique, retour arrière éprouvé. |
| 5 | [PRP-V10-03E-Voix-Cuisine.md](../PRP/V10/PRP-V10-03E-Voix-Cuisine.md) | Migration de la dictée ; continuité avec l'aide contextuelle ; prototype comparatif de cuisine mains libres. | Dictée et comparaison sur iPhone, permissions, interruption, Bluetooth et réseau documentés. Limites web au verrouillage/arrière-plan transmises à V10-04 pour preuve native, sans bloquer la sortie web. |

La définition produit et les cas de test de mémoire peuvent avancer pendant le design. La migration de transcription doit être planifiée en tenant compte de la date d'arrêt de Whisper. Le transport vocal continu reste une décision de prototype ; les contraintes iOS d'arrière-plan et de verrouillage nécessitent la preuve matérielle prévue par V10-04.

V10-04 pourra ensuite comparer les stacks sur les parcours stabilisés ; V10-05 restera le pilote d'usage quotidien. Leur réalisation ne doit pas servir à emporter les défauts actuels dans un nouveau client.

## 11. Vérifications encore nécessaires

1. Contrôler le SHA effectivement déployé et les trois migrations V10 sur le projet utilisé.
2. Vérifier des URL de photos réelles sur recettes personnelles, catalogue et imports ; mesurer le chargement sur connexion mobile.
3. Vérifier la fondation mémoire déjà déployée et ses lectures, sans confondre erreurs d'accès et absence de souvenirs.
4. Mesurer la baseline agent/voix avec des données de test et vérifier les modèles accessibles sur le compte.
5. Valider la direction proposée sur l'iPhone 17 Pro Max, puis réviser les dépendances des PRP iOS en fonction des résultats.

Les choix visuels et les nouveaux modèles sont des propositions. Les suppressions d'aperçus, règles de mémoire, voies de lecture, calcul nutritionnel ancien et incompatibilité HSL/OKLCH sont des constats établis sur le code courant ou les reproductions locales décrites.
