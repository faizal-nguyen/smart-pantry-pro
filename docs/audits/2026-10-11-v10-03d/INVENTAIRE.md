# V10-03D — Inventaire des modèles et des transports

Inventaire local réalisé les 11–12 octobre 2026, depuis `0670340cc62f1cc671301cf5209503bf2178bd8a`, sur `codex/v10-03d-agent-modeles`. Le dossier porte la date de début du travail. Les appels réels du [benchmark](BENCHMARK.md) portent uniquement sur des données fictives ; ils ne prouvent pas la configuration de l'application déployée.

## Chemins et contrats

| Chemin / appelant | Modèle et paramètres | Transport et portée de 03D |
| --- | --- | --- |
| `app.ts` → `assistant.agent.ts` ; `AssistantComposer`, `useAssistantVoice`, `MenusPage` | Rôles figés de `ModelConfig` ; preset `baseline` par défaut | `/api/assistant/text`, `/voice`, `/text/stream` et aliases `/api/v1/assistant`. Authentification et propriétaire serveur conservés. Nouveau reçu par invocation. |
| `VoiceAgentService` : sélection des tools et texte courant | Baseline `gpt-4o-mini` ; candidat `gpt-6-luna`, effort `none` | `AGENT_SYSTEM_PROMPT`, catalogue `ToolRegistry`, validation Zod, risque serveur, confirmations 5 minutes. Chat conservé ; Responses ajouté explicitement. |
| `VoiceAgentService` : synthèse culinaire et réparation | Baseline `gpt-4o` ; Luna ou Sol effort `low` selon le preset | `chefSystemPrompt` / `CHEF_ROUND2_INSTRUCTION`. Baseline conserve la synthèse chef des résultats de recette. Les candidats réservent le rôle culinaire aux demandes de menu/batch cooking et à la réparation d'arguments, avec un maximum d'une réparation. |
| `ConversationSummaryService` | Baseline mini ; candidat Luna ; sortie 320 tokens, entrée 20 messages / 6 000 caractères | Instructions de résumé dédiées, sans tools. Même registre d'appels et budget que la demande ; résumé attendu avant la persistance du reçu final. Politique mémoire revérifiée. |
| `RecipeExtractionService` → `SocialImportService` → imports sociaux | Par défaut `gpt-4o-mini`, température 0,2, sortie 2 048 tokens ; overrides serveur existants | Ancien contrat Chat et JSON conservé. Client partagé déplacé vers `OpenAITransport` ; aucune bascule globale vers Responses. Coût/modèle manquants restent inconnus. |
| `routes/assistant.ts` → `StreamingAIService` | `OPENAI_MODEL` ou `gpt-4o-mini`, température 0,7, sortie 1 200 tokens | Route distincte `/api/assistant/stream`, compatibilité `/api/ai-assistant-enhanced` et aliases v1. Fetch Chat historique non modifié : pas de nouveau reçu 03D ni de garantie de délai/stateless dérivée de l'agent. |
| `EnhancedSocialMediaParser` / `useSocialRecipeParser` / import de recette et scanners | Le constructeur client indique `gpt-4`, mais ne transmet pas ce choix au proxy | Le modèle est choisi par la route serveur précédente. `apiKey` et `this.model` du wrapper frontend ne constituent pas une configuration fournisseur effective. |
| `NutritionalAIService`, `SmartMealPlannerService` | Wrappers de `StreamingAIService` | Même dépendance au proxy historique. Leur présence ne signifie pas que chaque surface les utilise ; aucune adoption des rôles 03D dans ces services. |
| `shoppingParseTextService` | `OPENAI_PARSE_TEXT_MODEL` ou mini | Chat, extraction JSON des courses, configuration indépendante conservée. |
| `gptVisionService` / analyse de ticket | Mini | Chat avec images, configuration et calcul local historique conservés. Pas de validation vision dans le benchmark textuel. |
| `EmbeddingService` / `ProductResolver` | `text-embedding-3-small`, 1 536 dimensions, cache LRU, lots de 100 | Embeddings conservés. Leur coût n'est pas inclus dans le reçu textuel 03D. |
| `WhisperTranscriber` / entrée vocale de l'agent | `whisper-1`, coût historique 0,006 USD/minute | Transcription conservée. Le coût audio existant reste distinct ; aucun audio réel dans 03D. Migration des modèles et transports audio réservée à 03E. |
| `AdvancedVisionService` et `FastVideoParser` anciens | Identifiants historiques `gpt-4-vision-preview` / `gpt-4-turbo-preview` | Constructeurs qui lèvent une erreur de migration : ces chaînes ne prouvent pas des appels fournisseur actifs. Le parser vidéo serveur appelle ses endpoints backend ; pas de remplacement par recherche textuelle. |
| `supabase/functions/recipe-assistant` et `ai-assistant-enhanced` | Code source utilisant `gpt-4` | Source présente ; déploiement et activité distante non vérifiés. Aucun appelant frontend actif établi dans la trace ciblée, aucune Edge Function modifiée ou déployée. |

Les fichiers `.env`, `.env.local` et `apps/api/.env` ont été contrôlés uniquement pour la présence des variables nécessaires : clé serveur disponible ; aucun override `OPENAI_MODEL`, `OPENAI_PARSE_TEXT_MODEL` ou `ASSISTANT_MODEL_PRESET` constaté dans ces fichiers. Leur contenu n'est pas enregistré. Le chargement réel dépend du processus et de son environnement ; cela ne valide pas les variables de production.

Le proxy historique peut produire un texte de secours lorsque la clé manque ; ce texte n'est pas une réponse fournisseur vérifiée. Il ne reçoit pas les garanties ou le catalogue du nouvel agent par le seul ajout de 03D. Cette incohérence adjacente reste identifiée, sans modification silencieuse de ses callers pendant ce lot.

`npm run assistant:qa` a été examiné et **n'a pas été exécuté** : il authentifie un compte Supabase et appelle les vrais handlers de `/api/assistant/text`, avec de nouvelles identités de commande et des appels potentiellement payants. Le nouveau banc remplace ces effets par un stockage en mémoire fictif.

## Configuration contrôlée

Version : `v10-03d-2026-10-11-r2:<preset>`. Les modèles autorisés sont mini, 4o, Luna et Sol ; transports, effort, délais et budgets sont validés puis les objets sont gelés. Le catalogue authentifié `GET /api/assistant/models` (alias v1) est en lecture seule.

| Limite | Valeur | Application |
| --- | ---: | --- |
| Appels de modèle | 4 | Sélection, continuation, synthèse, réparation/repli et résumé partagent le compteur. |
| Appels de tools | 6 | Catalogue et whitelist serveur ; résultats supplémentaires ignorés. |
| Échéance | 45 s | Vérification avant un nouvel appel de modèle ou une nouvelle étape de tool ; appels fournisseur abortés à leur échéance. |
| Délai fournisseur | 20 s / 5 s | Dialogue et culinaire / résumé. SDK sans retry automatique. |
| Sortie | 1 500 / 320 tokens | Dialogue et culinaire / résumé. |
| Réservation monétaire | 0,15 USD | Réservation conservatrice avant chaque appel ; conservée pour les appels déjà engagés. Surcoût de tool inconnu : aucun nouvel appel payant. |
| Continuation Responses | 48 000 caractères | Appels et résultats associés par `call_id`, raisonnement chiffré opaque uniquement, aucun raisonnement interne en clair conservé. |

L'échéance interdit d'engager de nouvelles opérations après 45 s ; elle **n'annule pas les requêtes de base de données ou de préparation déjà en cours** et ne constitue pas une limite dure de durée HTTP globale. Le calcul de réservation textuelle ne prétend pas couvrir embeddings, audio, vision ou imports déclenchés plus tard par une confirmation indépendante.

Responses utilise `store:false`, `service_tier:default` et `strict:false` pour les schémas historiques : leurs champs optionnels ne deviennent pas obligatoires. La validation métier Zod reste obligatoire. Les paramètres d'échantillonnage incompatibles sont retirés en effort `low`. L'adaptateur Chat conserve `response_format`, `max_tokens` et les anciens callers. SDK installé : `openai` **4.104.0** ; `responses.create` et les événements de streaming ont été exercés sans upgrade de dépendance. L'effort `none` utilise une adaptation de type locale, car les anciens types ne le déclarent pas encore.

## Registre tarifaire

Version `openai-text-standard-usd-2026-10-11`, USD par million de tokens, mode **Standard à contexte court**, documentation consultée le 11 octobre 2026. Les snapshots sont reconnus uniquement s'ils sont explicitement répertoriés ; aucune approximation par préfixe de nom.

| Modèle | Entrée ordinaire | Lecture cache | Écriture cache | Sortie |
| --- | ---: | ---: | ---: | ---: |
| `gpt-4o-mini` | 0,15 | 0,075 | Tarif entrée | 0,60 |
| `gpt-4o` | 2,50 | 1,25 | Tarif entrée | 10,00 |
| `gpt-6-luna` | 0,10 | 0,01 | 0,125 | 0,50 |
| `gpt-6.1-sol` | 2,00 | 0,10 | 2,50 | 10,00 |

Sources primaires : [mini](https://developers.openai.com/api/docs/models/gpt-4o-mini), [4o](https://developers.openai.com/api/docs/models/gpt-4o), [Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [compteurs de cache](https://developers.openai.com/api/docs/guides/prompt-caching), [migration Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses), [function calling](https://developers.openai.com/api/docs/guides/function-calling), [paramètres et efforts](https://developers.openai.com/api/docs/guides/latest-model).

L'entrée ordinaire est l'entrée totale moins lecture et écriture de cache. Les tokens de raisonnement sont déjà inclus dans la sortie : pas de seconde facturation. Usage absent/incohérent, modèle servi non reconnu, autre tier ou contexte dépassant la plage tarifée : coût `null`. Compteur cache non exposé : estimation signalée, jamais présentée comme un coût connu. Les détails contiennent les appels échoués et leur éventuel usage mesurable, un sous-total **connu** et les surcoûts de tools estimés/inconnus séparément. Le reçu applicatif n'est pas une facture.
