# PRP-223 — Assistant Memory Foundation

> Statut : **DRAFT — remis a jour apres audit terrain**
> Date : 2026-05-13
> Source : vision "assistant cuisine personnel avec memoire"
> Objectif : donner a l'assistant une memoire longue duree fiable, editable et
> auditable, sans confondre historique de chat, etat produit et preferences.

## 1. Contexte

PRP-221 a livre la base agent vocal/action :

- `apps/api/src/services/assistant/VoiceAgentService.ts`
- `ToolRegistry`, `RiskClassifier`, `ProductResolver`
- routes `/api/assistant/voice`, `/text`, `/actions/execute`, `/actions/:id/undo`
- `assistant_action_log`
- frontend `AssistantProvider`, `AssistantFAB`, `AssistantResultDialog`,
  `src/services/assistantApi.ts`

Mais l'assistant reste stateless cote memoire personnelle :

- pas de table conversations/messages assistant ;
- pas de table memories utilisateur ;
- pas de hook `assistant_history` ;
- `src/pages/assistant/AssistantDashboard.tsx` mentionne explicitement que
  l'historique reel n'existe pas encore ;
- `/assistant/chat` utilise encore une experience legacy `AssistantAI` /
  `AIAssistantChat`, qui sera reprise par PRP-224.

PRP-223 ajoute la fondation memoire sur laquelle PRP-224, PRP-225, PRP-226,
PRP-227 et PRP-235 pourront s'appuyer.

## 1.1 Etat verifie 2026-05-13

| Surface | Etat actuel | Implication PRP-223 |
| --- | --- | --- |
| `assistant_action_log` | existe | reutiliser `action_log_ids`, ne pas dupliquer |
| `VoiceAgentService` | synchrone, retourne plan/actions | ajouter persistence conversation sans casser le flow |
| `/api/assistant/text` | existe | peut recevoir `conversation_id` en V1 |
| `/api/assistant/voice` | existe | peut attacher transcript + actions a une conversation |
| `AssistantDashboard` | pas d'historique reel | creer hooks/API avant d'afficher l'historique |
| `/assistant/chat` | legacy chat UI | PRP-224 refondra l'UX, PRP-223 fournit les donnees |
| `src/lib/agentEvents.ts` | invalidation apres actions | garder, ne pas en faire une memoire |

## 2. Probleme

L'utilisateur veut pouvoir dire :

- "Souviens-toi que je prefere les recettes indiennes legeres."
- "Ne me repropose pas cette recette."
- "La derniere fois le butter chicken etait trop sale."
- "Je veux perdre du poids, mais je veux rester rassasie."
- "Rappelle-toi que je cuisine souvent avec l'air fryer."
- "Qu'est-ce que tu m'avais conseille hier ?"

Sans memoire :

- l'agent redemande les memes preferences ;
- les recommandations ne progressent pas ;
- les conversations ne sont pas reprises ;
- le futur coach nutrition ne peut pas devenir personnel ;
- l'utilisateur ne sait pas ce que l'agent croit savoir de lui.

## 3. Principes produit

### 3.1 Memoire explicable

Chaque souvenir doit pouvoir etre affiche avec :

- contenu ;
- origine ;
- date ;
- confiance ;
- derniere utilisation ;
- bouton supprimer/corriger.

### 3.2 Memoire editable

L'utilisateur peut dire :

- "Ce n'est pas vrai."
- "Oublie ca."
- "Remplace par..."
- "Garde ca seulement pour ce soir."

### 3.3 Memoire prudente

Ne pas transformer une phrase vague en fait permanent.

| Phrase utilisateur | Traitement |
| --- | --- |
| "Je suis fatigue aujourd'hui" | contexte temporaire |
| "Je suis souvent fatigue apres les repas lourds" | candidate memory |
| "Je suis intolerant au lactose" | candidate sensible + confirmation |
| "Souviens-toi que je n'aime pas la coriandre" | memory active directe |

### 3.4 Memoire separee de l'etat metier

Ne pas stocker "il reste 4 oeufs" en memoire. C'est dans `inventory`.

La memoire peut stocker :

- "l'utilisateur achete souvent des oeufs pour meal prep" ;
- "l'utilisateur prefere les recettes high-protein" ;
- "ne pas reproposer cette recette".

## 4. Taxonomie V1

| Type | Exemple | Stockage |
| --- | --- | --- |
| Etat produit | inventaire, courses, recettes | tables metier + read tools PRP-221 |
| Preference | "j'aime indien leger" | `assistant_memory_items` |
| Negative preference | "ne me repropose pas X" | `assistant_memory_items` |
| Habit | "je meal prep le dimanche" | `assistant_memory_items` |
| Response style | "reponds court" | `assistant_memory_items` |
| Conversation | messages, transcripts, actions | `assistant_conversations`, `assistant_messages` |
| Resume | resume compact d'une conversation | `assistant_conversation_summaries` |
| Recette feedback | "trop sale", "a refaire" | `cooking_journal_entries` + memory liee |
| Temporaire | "ce soir j'ai 20 min" | `assistant_session_context` |

## 5. Scope

### Inclus

- Schema DB conversations/messages/memories/summaries/session context.
- Cooking journal minimal pour feedback recette.
- `MemoryService` backend.
- `ContextBuilder` branche sur `VoiceAgentService`.
- Extraction de memory candidates V1.
- Read/write tools memoire.
- Endpoints CRUD memories/conversations.
- Hooks frontend typed pour PRP-224.
- UI minimale settings/assistant pour voir et supprimer les memories.

### Exclus

- Vector search obligatoire.
- Realtime voice.
- Coach nutrition complet.
- Recommendation engine complet.
- Suppression totale compte/privacy automation.
- Migration des vieux chats legacy.
- Nouvelle UX ChatGPT-like complete : PRP-224.
- OpenFoodFacts/product enrichment : PRP-225.

## 6. Schema V1

Créer une migration Supabase dediee, idempotente.

### 6.1 `assistant_conversations`

```sql
CREATE TABLE IF NOT EXISTS public.assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  mode TEXT NOT NULL DEFAULT 'general'
    CHECK (mode IN ('general','kitchen','shopping','inventory','recipes','nutrition','cooking')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','archived','deleted')),
  last_message_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 6.2 `assistant_messages`

```sql
CREATE TABLE IF NOT EXISTS public.assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.assistant_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content TEXT NOT NULL,
  content_format TEXT NOT NULL DEFAULT 'text'
    CHECK (content_format IN ('text','transcript','tool_result','summary')),
  audio_transcript TEXT,
  tool_calls JSONB NOT NULL DEFAULT '[]',
  action_log_ids UUID[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 6.3 `assistant_memory_items`

```sql
CREATE TABLE IF NOT EXISTS public.assistant_memory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN (
    'preference',
    'negative_preference',
    'habit',
    'cooking_style',
    'diet_goal',
    'constraint',
    'recipe_feedback',
    'shopping_pattern',
    'response_style'
  )),
  scope TEXT NOT NULL DEFAULT 'global'
    CHECK (scope IN ('global','recipe','ingredient','product','conversation','temporary')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('candidate','active','rejected','deleted')),
  subject_type TEXT,
  subject_id UUID,
  content TEXT NOT NULL,
  normalized_content TEXT,
  confidence NUMERIC NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  sensitivity TEXT NOT NULL DEFAULT 'normal'
    CHECK (sensitivity IN ('normal','personal','health_sensitive')),
  source TEXT NOT NULL DEFAULT 'assistant_inferred'
    CHECK (source IN ('user_explicit','assistant_inferred','recipe_feedback','imported','system')),
  evidence JSONB NOT NULL DEFAULT '{}',
  approved_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Regles :

- `status='candidate'` pour inference faible ou sensible ;
- `status='active'` pour explicit non sensible ;
- `deleted_at` + `status='deleted'` pour oubli utilisateur ;
- `health_sensitive` ne passe jamais active sans confirmation.
- `subject_id` n'a volontairement pas de FK : `subject_type` peut pointer vers
  une recette, un produit, un ingredient ou une conversation. Le cleanup des
  references orphelines est applicatif, pas une cascade DB.

### 6.4 `assistant_conversation_summaries`

```sql
CREATE TABLE IF NOT EXISTS public.assistant_conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.assistant_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  covered_message_ids UUID[] NOT NULL DEFAULT '{}',
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 6.5 `assistant_session_context`

```sql
CREATE TABLE IF NOT EXISTS public.assistant_session_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.assistant_conversations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 6.6 `cooking_journal_entries`

```sql
CREATE TABLE IF NOT EXISTS public.cooking_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID,
  recipe_title TEXT NOT NULL,
  cooked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  outcome TEXT CHECK (outcome IN ('loved','liked','ok','disliked','failed')),
  notes TEXT,
  substitutions JSONB NOT NULL DEFAULT '[]',
  adjustments JSONB NOT NULL DEFAULT '{}',
  would_cook_again BOOLEAN,
  created_from_message_id UUID REFERENCES public.assistant_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 6.7 Triggers `updated_at`

Le repo expose deja `public.update_updated_at_column()` et l'utilise sur
`assistant_action_log`. La migration PRP-223 doit reutiliser ce helper.

```sql
DROP TRIGGER IF EXISTS update_assistant_conversations_updated_at
  ON public.assistant_conversations;
CREATE TRIGGER update_assistant_conversations_updated_at
  BEFORE UPDATE ON public.assistant_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_assistant_memory_items_updated_at
  ON public.assistant_memory_items;
CREATE TRIGGER update_assistant_memory_items_updated_at
  BEFORE UPDATE ON public.assistant_memory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cooking_journal_entries_updated_at
  ON public.cooking_journal_entries;
CREATE TRIGGER update_cooking_journal_entries_updated_at
  BEFORE UPDATE ON public.cooking_journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

## 7. Indexes, RLS, Supabase rules

Indexes minimum :

```sql
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_user_recent
  ON public.assistant_conversations(user_id, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_assistant_messages_conversation_created
  ON public.assistant_messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_assistant_memory_user_kind
  ON public.assistant_memory_items(user_id, kind, status);

CREATE INDEX IF NOT EXISTS idx_assistant_memory_response_style
  ON public.assistant_memory_items(user_id)
  WHERE kind = 'response_style' AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_assistant_memory_user_subject
  ON public.assistant_memory_items(user_id, subject_type, subject_id)
  WHERE subject_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assistant_session_context_expiry
  ON public.assistant_session_context(user_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_cooking_journal_user_recent
  ON public.cooking_journal_entries(user_id, cooked_at DESC);
```

RLS :

- activer RLS sur toutes les tables ;
- users peuvent `SELECT/INSERT/UPDATE` leurs lignes ;
- pas de `DELETE` direct cote client, soft delete via `status/deleted_at` ;
- service-role uniquement pour jobs internes, avec filtre `user_id` explicite ;
- ne jamais baser une policy sur `user_metadata`.

Option recherche V1 :

- activer `pg_trgm` si absent ;
- index trigram sur `assistant_memory_items.normalized_content` si les tests
  montrent un besoin ;
- pas de vector search en V1.

## 8. Backend services

### 8.1 `MemoryService`

Fichier cible :

- `apps/api/src/services/assistant/memory/MemoryService.ts`

Responsabilites :

- creer/lister/archiver conversations ;
- enregistrer messages user/assistant/tool ;
- lier messages a `assistant_action_log` via `action_log_ids` ;
- CRUD memories ;
- promouvoir/rejeter candidate ;
- soft-delete memory ;
- refuser ou consolider les doublons par `normalized_content` ;
- limiter a 200 memories actives par user en V1 ;
- CRUD cooking journal minimal ;
- marquer `last_used_at`.

### 8.2 `MemoryExtractor`

Fichier cible :

- `apps/api/src/services/assistant/memory/MemoryExtractor.ts`

Input :

```ts
interface MemoryExtractionInput {
  userId: string;
  conversationId: string;
  messageId: string;
  text: string;
  source: 'voice' | 'text' | 'recipe_feedback';
}
```

Output :

```ts
interface MemoryCandidate {
  kind:
    | 'preference'
    | 'negative_preference'
    | 'habit'
    | 'cooking_style'
    | 'diet_goal'
    | 'constraint'
    | 'recipe_feedback'
    | 'shopping_pattern'
    | 'response_style';
  scope: 'global' | 'recipe' | 'ingredient' | 'product' | 'conversation' | 'temporary';
  content: string;
  normalized_content: string;
  confidence: number;
  sensitivity: 'normal' | 'personal' | 'health_sensitive';
  needs_confirmation: boolean;
  evidence: {
    message_id: string;
    quote: string;
    source: string;
  };
}
```

Regles V1 :

- phrase "souviens-toi" => candidate forte ou active directe si non sensible ;
- phrase "ne me repropose pas" => `negative_preference` ;
- symptomes, allergies, objectifs poids => `health_sensitive` + confirmation ;
- contexte "ce soir", "aujourd'hui", "maintenant" => session context par defaut ;
- extraction regex/rules synchrone en V1 ;
- extraction LLM optionnelle et async best-effort si elle arrive plus tard.

Patterns rules V1 :

| Pattern utilisateur | Kind | Scope | Sensitivity | Status |
| --- | --- | --- | --- | --- |
| `souviens-toi que ...` | `preference` ou `response_style` selon contenu | `global` | `normal` | `active` |
| `rappelle-toi que ...` | `preference` | `global` | `normal` | `active` |
| `ne me repropose pas ...` | `negative_preference` | `recipe` ou `global` | `normal` | `active` |
| `je prefere ...` | `preference` | `global` | `normal` | `candidate` |
| `je n'aime pas ...` | `negative_preference` | `ingredient` ou `global` | `normal` | `candidate` |
| `je suis allergique a/au/aux ...` | `constraint` | `ingredient` | `health_sensitive` | `candidate` |
| `je suis intolerant a/au/a la ...` | `constraint` | `ingredient` | `health_sensitive` | `candidate` |
| `je veux perdre du poids` | `diet_goal` | `global` | `health_sensitive` | `candidate` |
| `ce soir`, `aujourd'hui`, `maintenant` | session context | `temporary` | `normal` | expire |

Decision sync/async :

- PR5 phase rules : sync, car cheap et deterministe.
- PR5 phase LLM : async best-effort, jamais bloquant pour la reponse assistant.
- Si l'extraction async echoue, la conversation/action principale reste valide.

### 8.3 `ContextBuilder`

Fichier cible :

- `apps/api/src/services/assistant/memory/ContextBuilder.ts`

Responsabilites :

- recuperer top memories pertinentes ;
- recuperer resume conversation ;
- recuperer derniers messages ;
- recuperer session context non expire ;
- produire un bloc court injecte dans `VoiceAgentService`.

Budget V1 :

- max 8 memories actives ;
- max 1 summary ;
- max 10 derniers messages ;
- max 1200 tokens environ pour le bloc memoire ;
- jamais injecter toute la table memory.

### 8.4 `ConversationSummarizer`

Fichier cible :

- `apps/api/src/services/assistant/memory/ConversationSummarizer.ts`

Declencheurs V1 :

- endpoint manuel apres conversation ;
- ou quand une conversation depasse 20 messages ;
- job cron plus tard, hors PRP-223 si non necessaire.

## 9. Integration PRP-221

Modifier `VoiceAgentService` sans casser le contrat response existant :

- `VoiceAgentRequestInput` accepte `conversationId?: string`.
- `/api/assistant/text` et `/voice` acceptent `conversation_id?: uuid`.
- Si absent, `MemoryService` cree une conversation.
- Enregistrer message user/transcript avant tool dispatch.
- Enregistrer message assistant apres plan/execution.
- Associer `action_log_ids` aux messages assistant/tool.
- `ContextBuilder` injecte memories + resume avant appel LLM.
- `AssistantPlanResponse` peut retourner `conversation_id`.

Important :

- `client_request_id` reste l'idempotency PRP-221, ne pas le remplacer par
  `conversation_id`.
- `assistant_action_log` reste source de verite des actions et undo.
- La memoire ne doit pas executer d'action sans passer par les tools PRP-221.

## 10. Tools assistant a ajouter

### Read tools

| Tool | Args | Retour |
| --- | --- | --- |
| `read_user_memories` | `{ kind?: string, query?: string, limit?: number }` | memories actives pertinentes |
| `read_cooking_journal` | `{ recipe_id?: string, limit?: number }` | entries recentes |
| `search_conversation_history` | `{ query: string, limit?: number }` | messages/summaries |

### Write/meta tools

| Tool | Tier | Args | Effet |
| --- | --- | --- | --- |
| `remember_preference` | low/medium | `{ kind, content, sensitivity }` | cree memory/candidate |
| `forget_memory` | medium | `{ memory_id }` | soft-delete |
| `record_recipe_feedback` | low | `{ recipe_id?, title, outcome, notes, adjustments }` | journal |
| `update_response_style` | low | `{ preference }` | memory response_style |

Escalade serveur :

- `health_sensitive` => confirmation obligatoire ;
- "j'ai une allergie" => confirmation obligatoire ;
- "oublie toutes mes donnees" => refuser tool, route privacy dediee PRP-235 ;
- suppression memory individuelle => medium ;
- suppression massive => high ou hors scope.

### 10.5 Integration ToolRegistry

Fichiers cibles :

- `apps/api/src/services/assistant/schemas/tools.ts`
- `apps/api/src/services/assistant/RiskClassifier.ts`
- `apps/api/src/services/assistant/handlers/memory.ts`
- `apps/api/src/routes/assistant.agent.ts`

Plan :

- ajouter les 7 tool specs dans `TOOL_SPECS` ;
- enregistrer les read/write handlers via `registerMemoryHandlers(registry, deps)`;
- appeler `registerMemoryHandlers` dans `createAssistantAgentRouter` apres
  `registerMetaHandlers` ;
- `read_*` tools => `defaultRiskTier='read'`, `reversible=false` ;
- `remember_preference`, `record_recipe_feedback`, `update_response_style`
  => `defaultRiskTier='low'`, `reversible=true` si une action inverse est
  simple ;
- `forget_memory` => `defaultRiskTier='medium'`, `reversible=true` tant que
  la ligne est soft-deleted ;
- `RiskClassifier` escalade :
  - toute memory `health_sensitive` => `medium` minimum ;
  - tout oubli massif ou wildcard => `high` ou refus si hors scope ;
  - toute suppression d'une memory inconnue/user-mismatch => fail handler, pas
    escalation silencieuse.

## 11. API routes V1

Ajouter sous `/api/assistant` :

| Methode | Route | Usage |
| --- | --- | --- |
| `GET` | `/conversations` | liste conversations |
| `POST` | `/conversations` | creer conversation |
| `GET` | `/conversations/:id` | lire une conversation |
| `GET` | `/conversations/:id/messages` | lire messages |
| `POST` | `/conversations/:id/archive` | archiver |
| `GET` | `/memories` | liste memories actives/candidates |
| `PATCH` | `/memories/:id` | corriger/approuver/rejeter |
| `POST` | `/memories/:id/forget` | soft-delete |
| `GET` | `/cooking-journal` | lire journal |
| `POST` | `/cooking-journal` | ajouter feedback recette |

Pagination :

- `GET /conversations?cursor=&limit=20`
- `GET /conversations/:id/messages?cursor=&limit=50`
- `GET /memories?cursor=&limit=50`
- cursor stable = tuple encode `created_at` + `id` ;
- jamais utiliser offset pour l'historique, pour eviter doublons si insertion
  concurrente.

Frontend typed client :

- etendre `src/services/assistantApi.ts` ;
- ne pas creer un second client assistant ;
- exposer types `AssistantConversation`, `AssistantMessage`,
  `AssistantMemoryItem`, `CookingJournalEntry`.
- exports cibles :
  - `getAssistantConversations`
  - `createAssistantConversation`
  - `getAssistantConversation`
  - `getAssistantMessages`
  - `archiveAssistantConversation`
  - `getAssistantMemories`
  - `patchAssistantMemory`
  - `forgetAssistantMemory`
  - `getCookingJournal`
  - `postCookingJournalEntry`

## 12. Frontend V1

PRP-223 ne construit pas l'UX ChatGPT-like complete. Il fournit :

- hooks data ;
- panneau minimal memoire ;
- historique basique exploitable par PRP-224.

Fichiers cibles :

- `src/hooks/useAssistantConversations.ts`
- `src/hooks/useAssistantMessages.ts`
- `src/hooks/useAssistantMemories.ts`
- `src/hooks/useCookingJournal.ts`
- `src/components/assistant/MemoryPanel.tsx`
- `src/components/assistant/ConversationHistoryList.tsx`

Rendu minimal :

- dans `/assistant`, afficher "Memoire" uniquement si vraie data ;
- bouton supprimer/corriger une memory ;
- candidates sensibles clairement marquees "A confirmer" ;
- pas de mock data.

PRP-224 reprendra :

- fil conversation type ChatGPT ;
- reprise conversation ;
- recherche dans conversations ;
- affichage riche actions/messages.

## 13. Donnees sensibles

Categories sensibles :

- allergies ;
- regimes medicaux ;
- objectifs de poids ;
- symptomes ;
- fatigue/digestion/sommeil ;
- troubles alimentaires.

Regles :

- stocker `sensitivity='health_sensitive'` ;
- creer `status='candidate'` ;
- confirmation explicite avant `active` ;
- afficher dans une section claire ;
- suppression simple ;
- ne jamais presenter l'assistant comme medecin ;
- en cas de symptome grave/persistant, recommander de consulter un
  professionnel de sante.

Tooltip confirmation sensible :

> Cette information sera utilisee pour adapter mes suggestions. Pour un
> diagnostic ou un avis medical, consulte un professionnel de sante.

## 14. Strategie PR splitting

PRP-223 ne doit pas etre une PR geante.

| PR | Scope | Verification principale |
| --- | --- | --- |
| PR1 | Schema + RLS + types | migrations appliquees, RLS cross-user |
| PR2 | `MemoryService` + CRUD API | tests service + routes |
| PR3 | Conversation persistence dans PRP-221 | `/text` retourne `conversation_id` |
| PR4 | `ContextBuilder` + read tools | memories injectees avec budget |
| PR5 | `MemoryExtractor` + candidates | sensible => candidate/confirmation |
| PR6 | Frontend hooks + panel minimal | memories visibles/supprimables |
| PR7 | Cooking journal minimal | feedback recette persiste |

Chaque PR doit etre revertable independamment.

Compat PR3 :

- `conversation_id` est optionnel dans `AssistantPlanResponse` pendant PR3 ;
- aucun client frontend ne doit le rendre obligatoire avant PR6 ;
- `client_request_id`, `assistant_action_log` et undo sont testes a chaque PR3
  pour eviter une regression PRP-221.

## 15. Tests et verification

Commandes :

- `npm run build`
- `npx tsc --noEmit -p tsconfig.json`
- `npm run lint`
- `npm run test:api -- assistant`

Tests DB/RLS :

- user A ne voit pas conversations user B ;
- user A ne voit pas memories user B ;
- soft delete masque une memory ;
- service-role job filtre explicitement par `user_id`.

Tests backend :

- `MemoryService.createConversation` cree une conversation user-scoped ;
- `recordMessage` stocke transcript + `action_log_ids` ;
- `forgetMemory` soft-delete ;
- duplicate `normalized_content` actif ne cree pas 2 memories identiques ;
- 201e memory active retourne 409 ou consolide selon strategie choisie ;
- `ContextBuilder` limite a 8 memories ;
- `health_sensitive` reste candidate ;
- `remember_preference` non sensible peut devenir active.

Tests integration PRP-221 :

- `POST /api/assistant/text` sans `conversation_id` cree une conversation ;
- `POST /api/assistant/text` avec `conversation_id` ajoute les messages ;
- `GET /api/assistant/conversations/:id` retourne titre/mode/status ;
- pagination conversations/messages ne duplique pas apres insertion concurrente ;
- les actions executees restent dans `assistant_action_log` ;
- undo continue de fonctionner ;
- `client_request_id` continue de deduper les retries.

Smoke frontend :

- `/assistant` affiche le panneau memoire si memories existent ;
- supprimer une memory la masque ;
- candidate sensible affiche "A confirmer" ;
- pas de mock history.

## 16. Definition of Done

- Conversations et messages assistant sont persistants.
- `/api/assistant/text` et `/voice` peuvent etre lies a une conversation.
- `AssistantPlanResponse` expose `conversation_id` sans casser les clients.
- Memories longues durees existent, sont user-scoped et auditables.
- L'utilisateur peut voir et oublier une memory.
- Memories sensibles demandent confirmation avant activation.
- Triggers `updated_at` actifs sur conversations, memories et cooking journal.
- Pagination cursor-based presente sur conversations/messages/memories.
- `ContextBuilder` injecte un contexte court et budgete dans PRP-221.
- Les tools memoire sont enregistres dans `ToolRegistry` + handlers dedies.
- `assistant_action_log` reste source de verite des actions/undo.
- Cooking journal minimal enregistre un feedback recette.
- RLS empeche tout acces cross-user.
- Build frontend et API passent.

## 17. Non-objectifs V1

- Pas de vector search obligatoire.
- Pas de Realtime API.
- Pas de coach nutrition complet.
- Pas de recommandations avancees.
- Pas de suppression totale compte/data privacy automatisee.
- Pas de migration des anciens historiques demo.
- Pas d'UI chat complete avant PRP-224.

## 18. Questions tranchees

| Question | Decision V1 |
| --- | --- |
| Vector search maintenant ? | Non, trigram/recence suffit en V1 |
| Memories sensibles actives direct ? | Non, candidate + confirmation |
| Cooking journal dans assistant ou recipes ? | Table dediee, liee optionnellement a `recipe_id` |
| Historique chat avant PRP-224 ? | Oui cote donnees/API, UI minimale seulement |
| Memoire du stock actuel ? | Non, read tools + tables metier |
| Quota memories V1 ? | 200 memories actives par user, dedup par `normalized_content` |
| Extraction memory sync ou async ? | Rules sync ; LLM extraction async best-effort plus tard |
