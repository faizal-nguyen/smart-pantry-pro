# PRP-221 — Voice Action Agent

> Statut : **DRAFT**, contrat ouvert à critique avant code.
> Date : 2026-05-08.
> Owner : @faizel.
> Précédents : PRP-220 (vault recettes), PRP-220.24 (media + Whisper wired).

## 1. Contexte

Aujourd'hui Smart Pantry Pro a tout l'état perso (`inventory`, `shopping_list`,
`recipes`, `meal_plan_entries`, `media_assets`) mais pas d'interface vocale
agentique. La page `/api/assistant` fait du chat streamé sans tool calling.
Le hook `useWhisperGroceryInput.ts` enregistre de l'audio via `MediaRecorder`
mais la transcription est marquée TODO et `shoppingTranscribeService.ts`
retombe sur un fallback hardcodé `'2 kilos de tomates, 1 litre de lait, du
pain complet'`.

Whisper réel est wired depuis aujourd'hui (PRP-220.24 §5.13 / `WhisperTranscriber.ts`)
pour le pipeline `from-local-video`. Cette PRP étend ce primitif à un
**agent vocal qui modifie l'état persistant** via un catalogue d'outils strict.

## 2. Pourquoi maintenant

L'analyse compétitive (Paprika, AnyList, Mealime, Samsung Food, Grocy) montre
que **personne ne combine** :

- vault recettes vidéo/social (PRP-220),
- inventaire personnel persistant,
- agent vocal qui *exécute* des actions, pas juste qui *cherche*.

Le coût Whisper + GPT-4o-mini est tombé à ~$0,01/session active. Le marché
le permet. Le différenciateur tient dans **la fiabilité du changement
d'état**, pas dans la couche de chat — qui est commodité.

## 3. Décisions architecturales (locked-in avant la suite)

### 3.1 Tool-using assistant, pas agent récursif autonome

Le LLM **propose** des actions via function calling. Le serveur **exécute**.
Pas de boucle récursive du LLM qui re-planifie tout seul. Limite stricte de
**6 tool calls par session voix** pour borner la dérive.

### 3.2 Classification de risque côté serveur, pas LLM

Le LLM ne décide pas si une action est risquée. Il propose. Le serveur
classe selon une table fixe (cf. §6) et applique la policy : exec-direct,
exec-avec-undo-banner, ou exec-après-confirmation.

### 3.3 Idempotency par session

Chaque tool call porte `(session_id, step_seq)`. Le serveur dédupe sur cette
clé pendant 15 min. Rejouer un audio sur réseau flaky ne double pas
l'inventaire.

### 3.4 Undo first-class via endpoint serveur

`POST /api/assistant/actions/:actionId/undo` est un vrai endpoint. Chaque
action écrite produit une ligne `assistant_action_log` avec un payload
`reversible_action` (le SQL inverse à appliquer). L'undo n'est pas une
décision du LLM — c'est une primitive plate, vérifiée serveur, fenêtrée à
15 min après l'exécution.

### 3.5 Realtime API hors scope V1

OpenAI Realtime (speech-to-speech sub-seconde) reste pour la Phase 2.
V1 = audio court → Whisper → tool calls → réponse texte (avec TTS optionnel
plus tard).

## 4. Endpoints

```
POST   /api/assistant/voice              audio (multipart)  → plan + auto-exec low-risk
POST   /api/assistant/text               { utterance: string } → idem (pour l'inbox texte)
POST   /api/assistant/actions/execute    { session_id, confirmation_token } → exec medium/high-risk
POST   /api/assistant/actions/:id/undo   → ré-applique reversible_action
GET    /api/assistant/sessions/:id       → état d'une session (debug + UI history)
```

### Schéma de réponse `/voice` et `/text`

```typescript
interface AssistantPlanResponse {
  session_id: string;
  transcript: string;                   // texte reconnu (vide si /text)
  detected_language?: string;
  message: string;                      // réponse en langage naturel à afficher
  actions_executed: ExecutedAction[];   // les low-risk déjà exécutées
  actions_pending: PendingAction[];     // les medium/high en attente de confirm
  confirmation_token?: string;          // signe avec HMAC, expire à 5 min
  cost: {
    whisperUsd: number;
    llmUsd: number;
    totalUsd: number;
  };
  modelUsed: string;
  durationMs: number;
}

interface ExecutedAction {
  id: string;             // assistant_action_log.id
  tool: string;           // 'add_inventory_items', etc.
  args: Record<string, unknown>;
  result: unknown;        // ce que le tool a renvoyé
  reversible: boolean;
  undo_expires_at: string; // ISO; 15 min plus tard
}

interface PendingAction {
  step_seq: number;
  tool: string;
  args: Record<string, unknown>;
  risk_tier: 'low' | 'medium' | 'high';
  reason_for_confirmation: string;  // "operation destructive", "ingredient ambigu", etc.
  preview: string;                  // texte humain : "Supprimer recette 'Butter Chicken'"
}
```

## 5. Catalogue d'outils

### 5.1 Read tools (no side effect, no confirmation, free)

| Tool | Args | Returns |
|---|---|---|
| `read_inventory` | `{ search?: string, category?: string, near_expiry_days?: number }` | `{ items: InventoryItem[] }` |
| `read_shopping_list` | `{ purchased?: boolean }` | `{ items: ShoppingItem[] }` |
| `read_recent_recipes` | `{ limit?: number, search?: string }` | `{ recipes: RecipeSummary[] }` |
| `read_meal_plan` | `{ week_start: string }` | `{ entries: MealPlanEntry[] }` |
| `find_cookable_recipes` | `{ max_missing_ingredients?: number, max_prep_time?: number }` | `{ recipes: CookableRecipe[] }` — recettes triées par taux d'ingrédients déjà en stock |
| `search_recipes` | `{ query: string, limit?: number }` | `{ recipes: RecipeSummary[] }` |

Les read tools sont **toujours appelables**, sans rate limit dédié (déjà
couvert par celui de la session). Ils servent au **grounding** : sans eux
l'agent hallucine ce que tu as.

### 5.2 Write tools — par tier de risque

#### Tier LOW — exec direct, undo-banner 15 min

| Tool | Args | Side effect |
|---|---|---|
| `add_inventory_items` | `{ items: ResolvedItem[] }` | INSERT inventory rows |
| `add_shopping_items` | `{ items: ResolvedItem[] }` | INSERT shopping_list rows |
| `mark_shopping_items_bought` | `{ shopping_item_ids: string[] }` | UPDATE is_purchased = true |
| `unmark_shopping_items_bought` | `{ shopping_item_ids: string[] }` | UPDATE is_purchased = false |
| `add_recipe_to_meal_plan` | `{ recipe_id, day_of_week, meal_type }` | INSERT meal_plan_entries |

`ResolvedItem` est le résultat de la résolution produit (cf. §7) :
```typescript
interface ResolvedItem {
  product_id?: string;        // si trouvé via fuzzy match
  product_name: string;       // toujours présent
  category?: string;
  unit?: string;              // 'kg', 'L', 'unit', etc.
  quantity: number;
  expiry_date?: string;       // ISO date, optionnel
  notes?: string;
}
```

#### Tier MEDIUM — exec direct si non-ambigu, sinon ask_clarification

| Tool | Args | Côté ambigu |
|---|---|---|
| `consume_inventory_items` | `{ items: { inventory_id: string, quantity: number }[] }` | "j'ai mangé du yaourt" → quel yaourt ? lequel des 4 inventory rows ? Si plusieurs candidats matchent, le serveur force `ask_clarification`. |
| `update_inventory_item` | `{ inventory_id, quantity?, expiry_date?, location? }` | Toujours OK si inventory_id résolu. |
| `remove_shopping_items` | `{ shopping_item_ids: string[] }` | OK direct (low impact, undo facile). |

#### Tier HIGH — confirmation explicite obligatoire

| Tool | Args | Pourquoi |
|---|---|---|
| `delete_recipe` | `{ recipe_id }` | Cascade ingredients + media_assets désindexés |
| `clear_shopping_list` | `{ purchased_only?: boolean }` | Vidange massive |
| `clear_inventory_category` | `{ category }` | Vidange large |
| `import_recipe_from_url` | `{ url, caption? }` | Coût IA + side-effect persistant |
| `bulk_add_inventory` | `{ items[] }` (count > 10) | Volume — confirmation nécessaire |

> **Hors scope V1 :** `save_recipe_from_local_video` était initialement
> proposé. Retiré : l'endpoint actuel `/api/recipes/from-local-video`
> attend un multipart, pas un `video_storage_key`. Le rebrancher comme
> tool agent demanderait : (a) que l'utilisateur upload d'abord le
> fichier via une autre UI, (b) que l'extraction tourne en mode
> asynchrone via `media_jobs`. En V1, l'upload local reste pilotable
> via la tab dédiée (PRP-220.24 Sprint D, à venir). En V1.1, on
> introduira `save_recipe_from_media_asset({ media_asset_id })` une
> fois `MediaJobWorker` opérationnel.

### 5.3 Meta tools

| Tool | Args | Effet |
|---|---|---|
| `ask_clarification` | `{ question: string, options?: string[] }` | Renvoie au client une question; aucune action exécutée |
| `summarize_session` | `{}` | Renvoie un récapitulatif des actions de la session |
| `undo_action` | `{ action_id: string }` | Wrapper interne sur l'endpoint `/actions/:id/undo` |

## 6. Classification de risque (table source de vérité)

```typescript
const RISK_BY_TOOL: Record<string, 'low' | 'medium' | 'high'> = {
  // read = N/A
  add_inventory_items: 'low',
  add_shopping_items: 'low',
  mark_shopping_items_bought: 'low',
  unmark_shopping_items_bought: 'low',
  add_recipe_to_meal_plan: 'low',

  consume_inventory_items: 'medium',
  update_inventory_item: 'medium',
  remove_shopping_items: 'medium',

  delete_recipe: 'high',
  clear_shopping_list: 'high',
  clear_inventory_category: 'high',
  import_recipe_from_url: 'high',
  save_recipe_from_local_video: 'high',
  bulk_add_inventory: 'high',

  ask_clarification: 'low',
  summarize_session: 'low',
  undo_action: 'low',
};
```

Le serveur peut **escalader** un tier à la volée :
- `add_inventory_items` avec `items.length > 10` → escalade en `high` (`bulk_add_inventory`).
- `consume_inventory_items` avec un product ambigu (>1 inventory match) → `ask_clarification` forcé.
- Toute action sur une recette importée d'un autre user (RLS catch après-coup).

Le LLM ne voit pas la classification. Il propose; le serveur applique.

## 7. Product resolution (étape obligatoire avant tout write)

Toute écriture inventory / shopping / recipe_ingredients passe par une FK
vers `products(id)`. L'agent reçoit du LLM des noms libres (`"tomates"`,
`"yaourts grecs"`). Le serveur résout :

```
ResolveProduct(name, category?, unit?) {
  1. Normaliser : lowercase, NFKD, strip accents, collapse whitespace, singulariser.
  2. Lookup exact sur products.normalized_name
     → si match unique : retourne {product_id, ...}
  3. Fuzzy match (pg_trgm similarity > 0.7) sur products.normalized_name
     → si 1 match : retourne avec confidence
     → si N matches : retourne { ambiguous: true, candidates: ProductSummary[] }
       → le serveur force ask_clarification("Tu parles de X ou Y ?")
  4. Pas de match
     → CREATE product avec :
       - name (préserve la casse user pour l'affichage)
       - normalized_name (pour matchings futurs)
       - category=catégorisé par GPT (ou 'autres')
       - unit_type=déduit (ou 'unit' par défaut)
       - source = 'assistant_auto'
       - created_by = auth.uid()
}
```

### Augmentation du schéma `products` (migration J1)

`products` n'est pas user-scoped — c'est un référentiel global. **Mais
laisser le LLM créer librement risque la pollution** (créer "nourriture
pour licorne" silencieusement à chaque hallucination). On ajoute trois
colonnes pour rendre l'origine traçable et empêcher les doublons :

```sql
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS normalized_name TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'unknown'
    CHECK (source IN ('unknown','user_manual','assistant_auto','imported','seeded')),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill normalized_name pour les rows existantes
UPDATE public.products
SET normalized_name = lower(unaccent(trim(name)))
WHERE normalized_name IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_normalized_name_unique
  ON public.products(normalized_name);
CREATE INDEX IF NOT EXISTS idx_products_source
  ON public.products(source);
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_products_normalized_trgm
  ON public.products USING gin (normalized_name gin_trgm_ops);
```

Effets :
- Les products auto-créés par l'assistant sont auditable via `WHERE
  source = 'assistant_auto'` — purge périodique possible si abus.
- `UNIQUE(normalized_name)` empêche que "Tomate" / "tomate" / "tomates"
  créent 3 rows séparées.
- Le RLS reste inchangé (lecture/écriture libres sur products),
  l'isolation joue sur `inventory.user_id` / `shopping_list.user_id`.

## 8. Idempotency

Une requête vocale produit **N tool_calls = N lignes** dans
`assistant_action_log`. Donc l'idempotency ne peut PAS être
`UNIQUE(user_id, client_request_id)` — sinon la 2e ligne d'une
même requête plante (catch lors de la review J3, fix dans
migration `20260508130000`).

Le bon modèle :

```
client_request_id : uuid (généré par le client AVANT envoi, stable
                    sur les retries — header X-Client-Request-Id)
audio_sha256      : sha256 du blob audio (pour /voice uniquement)
session_id        : uuid (un par requête, équivalent fonctionnel
                    de client_request_id mais côté serveur)
step_seq          : int  (ordre dans la session, 0..N-1)
```

`assistant_action_log` a **deux** UNIQUE constraints, complémentaires :

1. `UNIQUE(user_id, client_request_id, step_seq)` — un retry du même
   payload audio recrée step_seq=0,1,...,N-1, **chaque ligne dédup
   individuellement** via 23505. Le code resolve(error.code === '23505')
   re-fetch le set existant et retourne comme "déjà-exécuté".
2. `UNIQUE(user_id, session_id, step_seq)` — garde-fou interne
   (session_id et client_request_id sont 1:1 mais on garde les deux
   pour découpler audit et idempotency).

Pour `/voice`, en plus, le serveur indexe `audio_sha256` :
`SELECT session_id FROM assistant_action_log WHERE user_id = ? AND
audio_sha256 = ? AND created_at > now() - interval '10 minutes'
ORDER BY created_at DESC LIMIT 1`. Si trouvé, on retourne la session
précédente (protection ceinture-bretelles contre le retry naïf qui
régénère un client_request_id neuf).

**Note de design alternatif (V1.1) :** une vraie table
`assistant_sessions(id, user_id, client_request_id, audio_sha256,
transcript, total_cost_usd, status)` avec FK depuis action_log
serait plus normalisée — l'audio_sha256 et le transcript ne se
répètent pas sur chaque tool_call. À envisager quand on aura besoin
d'agréger les sessions (UI history, analytics). Pour V1, la
dénormalisation reste acceptable.

## 9. Undo

Chaque tool LOW ou MEDIUM produit une ligne `assistant_action_log` avec :
```
reversible: true
reversible_action: jsonb
  -- pour add_inventory_items:  { tool: 'remove_inventory_items', args: { ids: [...] } }
  -- pour mark_shopping_items_bought: { tool: 'unmark_shopping_items_bought', args: {...} }
  -- pour consume_inventory_items: { tool: 'restore_inventory_quantities', args: {...} }
undo_expires_at: created_at + 15 min
```

`POST /api/assistant/actions/:id/undo` :
1. Vérifie ownership (RLS).
2. Vérifie `now() < undo_expires_at` et `status = 'executed'`.
3. Exécute le `reversible_action`.
4. Marque l'action `status = 'undone'`.

Tier HIGH : `reversible = false` par défaut (delete_recipe ne se ré-écrit
pas trivialement, l'utilisateur a confirmé sciemment). Cas par cas :
`clear_shopping_list` peut être réversible si on snapshot la liste avant.
À écrire en V1.1.

## 10. Schéma SQL — nouvelle table

```sql
-- migration : 20260508120000_create_assistant_action_log.sql
CREATE TABLE IF NOT EXISTS public.assistant_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  step_seq INTEGER NOT NULL,

  tool TEXT NOT NULL,
  tool_args JSONB NOT NULL,
  risk_tier TEXT NOT NULL CHECK (risk_tier IN ('low','medium','high')),

  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','executed','failed','undone','cancelled')),
  result JSONB,
  error_code TEXT,
  error_message TEXT,

  reversible BOOLEAN NOT NULL DEFAULT FALSE,
  reversible_action JSONB,
  undo_expires_at TIMESTAMPTZ,
  undone_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, session_id, step_seq)
);

CREATE INDEX idx_action_log_user_session
  ON public.assistant_action_log(user_id, session_id, step_seq);
CREATE INDEX idx_action_log_user_undo_window
  ON public.assistant_action_log(user_id, undo_expires_at)
  WHERE status = 'executed' AND reversible = TRUE;

ALTER TABLE public.assistant_action_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY action_log_select_own ON public.assistant_action_log
  FOR SELECT USING (auth.uid() = user_id);
-- INSERT/UPDATE via service-role uniquement (depuis l'API).
```

## 11. UX flow (frontend MVP)

```
[ user maintient le bouton mic flottant ]
  ↓ MediaRecorder enregistre
[ relâche le bouton ]
  ↓ POST /api/assistant/voice (multipart audio + session_id)
  ← spinner "J'écoute…"
  ← (15-25s) AssistantPlanResponse
[ Carte unifiée s'ouvre : ]
  ┌──────────────────────────────────────────────┐
  │ 🎤 « 2 kilos de tomates, du saumon… »        │
  │                                              │
  │ ✅ Tomates × 2 kg  → ajoutées à l'inventaire │
  │ ✅ Saumon × 1     → ajouté à l'inventaire    │
  │ ✅ Coriandre      → ajoutée à la liste       │
  │                                              │
  │ ⏳ À confirmer :                             │
  │   [ ] Supprimer recette "Curry rouge"        │
  │   [ Confirmer ]  [ Annuler ]                 │
  │                                              │
  │ Coût session : $0,012 · 22s                 │
  │ ↶ Annuler les 3 dernières actions (15 min)  │
  └──────────────────────────────────────────────┘
```

## 12. Migration shopping voice (Sprint 2)

Le hook `useWhisperGroceryInput.ts` actuel :
```typescript
// TODO: Implémenter la vraie transcription Whisper
```

Devient simplement un client de `/api/assistant/voice` avec une
`tool_whitelist: ['add_shopping_items']` côté requête (limitation du
scope à la liste de courses dans le contexte de la page Shopping).

Bénéfice : un seul pipeline audio→action, plus de fallback hardcodé.

## 13. Coûts & quotas

| Composant | Coût unit | Session typique (3 actions, 30s audio) |
|---|---|---|
| Whisper | $0,006/min | $0,003 |
| GPT-4o avec tool calls | ~$0,01/session | $0,01 |
| TTS (Phase 2) | $0,001/réponse | (n/a en V1) |
| **Total V1** | | **~$0,013** |

Rate limits par utilisateur :
- free : 30 sessions vocales / jour
- premium : 300 / jour

## 14. Hors scope V1 (explicite)

- TTS (réponse vocale parlée) → Phase 2
- Realtime API speech-to-speech → Phase 2
- Push notif pro-active ("yaourts expirent demain") → Phase 3
- Multi-langue automatique au-delà de FR/EN → Phase 2
- Apprentissage des préférences (cuisine asiatique le mardi) → Phase 3
- Intégration enceinte connectée → Phase 4

## 15. Plan d'implémentation (Sprint 1)

```
J0 — Schema contract freeze (NON-NÉGOCIABLE — bloquant pour tout le reste)
   Diagnostic vérifié 2026-05-08 : ShoppingService écrit
   {is_checked, shopping_list_id, name, category} dans from('shopping_list')
   alors que la migration définit (product_id, is_purchased, quantity).
   InventoryService lit `expiration_date` au lieu de `expiry_date`.
   → Décider la source de vérité réelle (DB prod actuelle).
   → Régénérer apps/api/src/types/supabase.ts via `supabase gen types`.
   → Aligner ShoppingService / InventoryService sur le schéma réel
     (ou écrire une migration `ALTER TABLE` qui formalise le drift
     constaté en prod).
   → Aucun tool ne peut écrire tant que ce J0 n'est pas clos.
   → Si la dérive prod ↔ migration est trop large pour V1 :
     créer des `AssistantInventoryRepository` / `AssistantShoppingRepository`
     dédiés, qui écrivent contre le schéma effectivement utilisé en
     prod, et laisser les autres services tranquilles.

Sprint 1 — backend (après J0)
J1 — migration assistant_action_log + products augmentation
     (created_by, source, normalized_name UNIQUE — cf §7 mis à jour)
J2 — ProductResolver (pg_trgm + auto-create avec source='assistant')
J3 — Tool registry + risk classifier + Zod schemas
J4 — VoiceAgentService (orchestrateur)
J5 — Routes /voice /text /actions/execute /actions/:id/undo
J6 — Tests unitaires (mocked Whisper + LLM)
J7 — Migration useWhisperGroceryInput

Sprint 1 — frontend
J5 — Bouton mic flottant global
J6 — Carte AssistantResultCard (unifiée plan/exec/confirm/undo)
J7 — Hook useAssistantVoice + intégration

J8 — test e2e manuel sur les 12 tools
```

## 16. Critères de succès V1

- [ ] Une session vocale type "j'ai acheté X, Y, Z, ajoute W à la liste"
      exécute 4 actions LOW en une seule passe, < 25s, < $0,02.
- [ ] Une session ambiguë ("j'ai mangé du yaourt" avec 3 yaourts en stock)
      déclenche `ask_clarification` au lieu d'une consume hasardeuse.
- [ ] Une action HIGH ("supprime cette recette") ne s'exécute jamais
      sans le confirmation_token.
- [ ] L'undo restaure exactement l'état précédent en < 1s.
- [ ] Idempotency : envoyer 2× le même audio ne double aucune ligne.
- [ ] `useWhisperGroceryInput.ts` est rebranché sur le nouveau pipeline,
      le fallback `'2 kilos de tomates, 1 litre de lait'` est mort.

## 17. Risques + mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| LLM invente des product_id qui n'existent pas | Action ratée | ProductResolver autoritaire — le LLM passe des **noms**, jamais des UUID |
| LLM appelle 50 tools en cascade (boucle) | Coût + UX cassée | Hard cap 6 tool_calls / session |
| Tool de suppression appelé par erreur | Perte de données | Tier HIGH + confirmation_token signé (HMAC, 5 min) |
| Audio trop bruyant → transcript pollué | Actions absurdes | Whisper renvoie un score, < 0.5 → renvoie au user "j'ai pas compris, redis ?" |
| Coût qui dérape | Budget | Rate limit serveur + cap 6 tools/session + monitoring quotidien |
| RLS bypass via service-role | Isolation perdue | Toutes les écritures user passent par le user-scoped client. Service-role uniquement pour l'admin overrides (ex: lien recipe→media après save). |

## 18. Questions ouvertes — réponses verrouillées (round critique 2026-05-08)

1. **Le bouton mic** : flottant global (FAB visible partout) ou page `/assistant` dédiée ?
   → **Décidé : FAB global.** Cuisine = contexte transverse.

2. **confirmation_token** : HMAC signé ou ligne en DB qui expire ?
   → **Décidé : HMAC, mais signé sur des `action_log_ids` déjà
   persistés** (status='planned'). Payload =
   `{action_log_ids[], args_hash, user_id, expires_at}`. Le serveur
   au moment de l'execute vérifie : (a) HMAC valide, (b) chaque
   action_log_id existe en DB et appartient au user, (c) `args_hash`
   correspond aux args persistés (pas de tampering), (d) expires_at
   pas dépassé. Pas de round-trip pour signer, mais la confirmation
   ne peut référencer que des actions que le serveur a déjà vues.

3. **LLM hallucine un product fantaisiste** : on crée ?
   → **Décidé : on crée**, MAIS avec `source='assistant_auto'` et
   `created_by=user_id`. Audit trail propre, purge possible.

4. **Modèle** : gpt-4o-mini ou gpt-4o ?
   → **Décidé : gpt-4o-mini d'abord, escalade dynamique si Zod
   rejette le tool plan.** Pattern : on tente mini → on parse →
   si Zod échoue, on retry une fois sur gpt-4o avec le même prompt
   plus une note "Previous response failed validation: <issues>".
   Si la 2e tentative échoue aussi, on renvoie au user
   "Désolé je n'ai pas compris, peux-tu reformuler ?".

5. **Idempotency window** : 15 min suffisant ?
   → **Décidé : 15 min pour l'undo. La dedup elle-même est
   permanente** via `UNIQUE(user_id, client_request_id)` —
   un client_request_id ne peut jamais être réutilisé. Le
   `audio_sha256` est une protection 10 min seulement (au cas où
   l'utilisateur récite la même phrase une heure plus tard
   intentionnellement, ce n'est pas un retry).

---

## Statut validation pipeline Whisper/GPT (Butter Chicken curl)

Test partiel 2026-05-08 (Codex) :
- API démarre proprement (port local 3030).
- Endpoint `POST /api/recipes/from-local-video` joignable.
- Multer + auth middleware répondent `401 No authorization token provided`
  → wiring serveur OK, blocage uniquement sur Bearer Supabase.
- Restant : test e2e avec un Bearer valide pour exercer Whisper +
  GPT-4o-mini + saveImportedDraftAsRecipe.

→ Quand le test e2e passe, on aura validé le **primitif AI sur
l'environnement réel**. Cette PRP-221 réutilise le même primitif via
`WhisperTranscriber` + `createOpenAICompletionClient`, donc le test
est une garantie de rampe avant Sprint 1.

## Prochaine étape

1. **J0 d'abord** : décider la source de vérité du schéma
   (DB prod actuelle vs migrations trackées) et aligner les services.
   Sans ça, l'agent appelle `add_shopping_items` et le service écrit
   dans le vide.
2. **En parallèle** : test curl Butter Chicken avec un Bearer valide
   pour boucler la validation OpenAI.
3. **Critique finale** de cette PRP-221 v2 (signatures de tools,
   contraintes que j'ai encore loupées).
4. Une fois (1)+(3) clos, j'implémente Sprint 1 dans l'ordre §15.
