# PRP-240 - Social Video Recipe Import V2

> Statut : **DRAFT V2 - review Claude integree**
> Date : 2026-05-23
> Owner : @faizel
> Sources :
> - Audit local Codex 2026-05-23 sur `social_recipe_imports`, `video-processor`,
>   `ImportedRecipeDraft`, `save_imported_recipe`, UI import.
> - PRP-220 Social Recipe Imports.
> - PRP-239 Recipe Policy, Ingredient Quality & Chef Agent.
> - Google Gemini API Video Understanding docs :
>   https://ai.google.dev/gemini-api/docs/video-understanding
> - Google Gemini API Models docs :
>   https://ai.google.dev/gemini-api/docs/models
> - TikTok Display API docs :
>   https://developers.tiktok.com/doc/display-api-overview/
> - TikTok Video Object docs :
>   https://developers.tiktok.com/doc/tiktok-api-v2-video-object/
> - yt-dlp supported sites :
>   https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md
> - gallery-dl :
>   https://github.com/mikf/gallery-dl
>
> Objectif : rendre l'import de recettes depuis videos Instagram/TikTok
> beaucoup plus fiable en combinant download best-effort, fallback upload
> utilisateur, analyse multimodale Gemini, extraction structuree compatible
> avec le template recette existant, sanitizer PRP-239, et QA mesurable.

---

## 0. Decisions verrouillees

| Sujet | Decision |
|---|---|
| Definition de "systematique" | L'UX doit toujours offrir un chemin vers une recette exploitable. L'URL seule reste best-effort. Le fallback upload/video partagee est obligatoire. |
| Source de verite recette | Tout resultat doit produire un `ImportedRecipeDraft` valide (`packages/shared/src/recipe-import.ts`), pas un format video parallele. |
| Sauvegarde | Reutiliser `SocialImportService.save()` + `saveImportedDraftAsRecipe()` + RPC `public.save_imported_recipe`. |
| Template recette | La recette finale doit alimenter `recipes` + `recipe_ingredients` avec titre, description, ingredients quantifies, instructions, temps, portions, difficulte, cuisine, meal type, tags, image, source et metadata. |
| Analyse video | Gemini est le provider principal pour comprendre fichier video + audio + texte visuel. Le modele vient de `GEMINI_VIDEO_MODEL` et doit etre valide au demarrage via model-list/smoke test. |
| Recuperation video | `yt-dlp` est le downloader primaire. `gallery-dl` est le fallback social media V1. `instaloader` est reporte post-V1 si les metrics Instagram montrent un vrai gap. |
| APIs officielles | Instagram/TikTok oEmbed/Display servent a metadata/embed. Elles ne sont pas considerees comme un download universel fiable. |
| Upload fallback | Si download URL echoue ou confidence faible, l'utilisateur peut uploader le fichier video. Upload direct navigateur -> Supabase Storage signed URL, jamais multipart 500 MB via l'API. |
| Transport worker | V1 utilise une queue Postgres (`social_video_import_jobs`) + worker Render/background qui poll/claim via endpoints internes signes. Pas de Redis/Celery en V1. |
| Idempotence | Un job est identifie par `(import_id, revision)`. Re-run actif = `409` sauf `force=true`, qui annule l'ancien job et incremente `revision`. |
| Cookies/session | Pas de cookies plateforme par defaut en V1. Pas de tentative de contenu prive ou authentifie. |
| Services commerciaux | Apify/Bright Data sont optionnels derriere feature flag, uniquement apres mesure du taux d'echec open-source. |
| Stockage video | Ne pas stocker durablement la video source sauf origine `user_upload`, `personal_archive_upload` ou `permitted_download` avec attestation droits. |
| Image recette | Priorite : thumbnail snapshot existant, puis frame extraite uniquement si droits de stockage OK, sinon remote thumbnail/source thumbnail. |
| Policy recette | Passage obligatoire par sanitizer PRP-239 avant save. Zero porc/alcool reste applicable aux imports video. |
| QA | Ajouter une suite behavioral/golden-lite pour mesurer tools, confidence, violations policy, schema, temps/cout, et taux de fallback. |
| Legacy UI | `RecipeInbox` devient le seul chemin produit. Les anciens composants sont rewires vers la nouvelle API ou supprimes s'ils sont debug-only. |

---

## 1. Contexte

### 1.1 Besoin produit

L'utilisateur veut coller une URL Instagram/TikTok et obtenir une recette
complete :

- titre propre ;
- description courte ;
- ingredients avec quantite, unite, notes, essentialite ;
- instructions ordonnees ;
- temps de preparation/cuisson/repos ;
- portions ;
- difficulte ;
- cuisine / type de repas / tags ;
- image exploitable ;
- source URL + auteur + provenance ;
- confidence + warnings si la video est ambigue.

Le systeme actuel marche sur certaines videos, mais pas toutes. La cause n'est
pas seulement le modele IA : le plus gros facteur d'instabilite est l'obtention
fiable du media depuis Instagram/TikTok.

### 1.2 Etat actuel verifie

#### Pipeline social moderne

- `apps/api/src/services/imports/SocialImportService.ts`
  - capture URL ;
  - dedup via `source_hash` ;
  - lifecycle `captured -> extracting -> draft_ready | needs_review`;
  - save via `saveImportedDraftAsRecipe`.
- `supabase/migrations/20260507000000_create_social_recipe_imports.sql`
  - tables `social_recipe_imports` et `imported_recipe_drafts`.
- `packages/shared/src/recipe-import.ts`
  - source de verite `ImportedRecipeDraftSchema`.
- `apps/api/src/services/imports/saveImportedDraftAsRecipe.ts`
  - transforme un draft valide en payload RPC.
- `supabase/migrations/20260507120001_rpc_save_imported_recipe.sql`
  - persiste atomiquement `recipes` + `recipe_ingredients`.

#### Adapters Instagram/TikTok actuels

- `InstagramAdapter` :
  - oEmbed Graph si token ;
  - fallback Open Graph ;
  - jamais de lecture contenu non public.
- `TikTokAdapter` :
  - endpoint public oEmbed ;
  - title, auteur, thumbnail ;
  - ne telecharge pas la video.

Ces adapters fournissent surtout de la metadata. Le confidence ceiling actuel
plafonne correctement les extractions `oembed`/`metadata` a 0.6.

#### Video processor existant

- `services/video-processor/video_processor.py`
  - utilise `yt_dlp` ;
  - identifie YouTube/Instagram/TikTok ;
  - download video vers disque local.
- `services/video-processor/audio_transcriber.py`
  - transcription audio via Whisper local.
- `services/video-processor/text_extractor.py`
  - OCR/vision sur frames via OpenAI Vision.
- `services/video-processor/app.py`
  - `/process/url`, `/process/upload`, `/status/:task_id`, `/result/:video_id`.

Mais ce worker n'est pas integre au pipeline social moderne, et la config
contient encore `gpt-4-vision-preview`, a remplacer.

#### UI actuelle

- `RecipeInbox` est la surface moderne pour imports sociaux.
- `VideoImportCard`, `InstagramVideoExtractor`, `InstagramRecipeImport` sont
  des surfaces plus anciennes/paralleles qui ne passent pas toujours par
  `ImportedRecipeDraft`.

### 1.3 Contraintes externes

Gemini peut analyser des videos via File API, Cloud Storage, inline data, et
YouTube URLs. Pour Instagram/TikTok, il faut fournir le fichier video ou des
donnees extraites ; ne pas compter sur Gemini pour telecharger directement ces
plateformes.

TikTok Display API fournit des metadonnees (`video_description`, `duration`,
`embed_html`, `embed_link`, stats) pour des videos de l'utilisateur autorise.
Elle ne remplace pas un download arbitraire depuis n'importe quelle URL.

yt-dlp supporte Instagram/TikTok mais precise que les sites changent et que le
support peut casser. Le design doit donc assumer les echecs et les mesurer.

---

## 2. Scope

### 2.1 Inclus

- Integration du video analysis dans le pipeline `social_recipe_imports`.
- Service provider Gemini pour analyse video multimodale.
- Downloader cascade V1 :
  - `yt-dlp` primary ;
  - `gallery-dl` fallback Instagram/TikTok ;
  - optional commercial provider derriere feature flag.
- `instaloader` explicitement hors V1, a reevaluer apres metrics.
- Upload fallback utilisateur quand URL download echoue.
- Upload direct signed URL vers Supabase Storage, pas proxy API.
- Extraction structuree vers `ImportedRecipeDraft`.
- Sauvegarde via pipeline existant `saveImportedDraftAsRecipe`.
- Image/thumbnail compatible avec droits media.
- Progression job observable dans l'inbox.
- Tests unitaires + integration + QA fixtures video.
- Metrics : taux download, fallback, confidence, cout, latence.

### 2.2 Exclus V1

- Login Instagram/TikTok utilisateur.
- Scraping contenu prive.
- Stockage permanent des videos telechargees depuis URL sans attestation.
- App mobile native share extension complete.
- Edition avancee frame par frame.
- Systeme de moderation copyright automatise complet.
- Refonte globale de RecipeDetail.

### 2.3 Non-objectifs

- Garantir 100% de succes depuis URL seule.
- Contourner les protections plateforme.
- Generer une recette si la video n'est pas culinaire.
- Sauver une recette sans validation humaine quand confidence faible.

---

## 3. Contrat de sortie recette

### 3.1 Source de verite

Toute extraction video doit produire exactement un `ImportedRecipeDraft` :

```ts
{
  title: string;
  description?: string;
  ingredients: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    notes?: string;
    isEssential?: boolean;
    rawText?: string;
  }>;
  instructions: Array<{
    step: number;
    description: string;
    durationSeconds?: number;
    rawText?: string;
  }>;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  restTimeMinutes?: number;
  servings?: number;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  cuisineCategory?: string;
  mealType?: string;
  tags: string[];
  imageUrl?: string;
  source: RecipeSourceSnapshot;
  confidence: number;
  extractionWarnings: string[];
}
```

### 3.2 Mapping vers `recipes`

Le mapping existant doit rester le chemin unique :

| Draft | DB cible | Notes |
|---|---|---|
| `title` | `recipes.name` | Titre nettoye, pas de "Recette TikTok #123". |
| `description` | `recipes.description` | 1-3 phrases max. |
| `instructions[]` | `recipes.instructions` | Texte numerote par `saveImportedDraftAsRecipe`. |
| `instructions[]` | `recipes.source_metadata.instructions` | Structure conservee pour futur affichage. |
| `prepTimeMinutes` | `recipes.prep_time` | NULL si inconnu. |
| `cookTimeMinutes` | `recipes.cook_time` | NULL si inconnu. |
| `restTimeMinutes` | `recipes.rest_time` | NULL si inconnu. |
| `servings` | `recipes.servings` | Defaut non force si incertain. |
| `cuisineCategory` | `recipes.cuisine_category` | Ex : Coreenne, Italienne, Fusion. |
| `mealType` | `recipes.meal_type` | dinner/lunch/snack/breakfast si clair. |
| `tags` | `recipes.tags` | Inclure plateforme + methodes + cuisine. |
| `imageUrl` | `recipes.image_url` | Thumbnail snapshot ou frame autorisee. |
| `source.platform` | `recipes.source_platform/source_type` | Instagram/TikTok/etc. |
| `source.sourceUrl` | `recipes.source_url` | URL originale. |
| `source.*` | `recipes.source_metadata` | Auteur, thumbnail, confidence, warnings. |
| `ingredients[]` | `recipe_ingredients` | `ingredient_name`, `quantity`, `unit`, `notes`, `is_essential`, `order_index`. |

### 3.3 Regles de qualite du draft

Un draft ne peut etre `draft_ready` que si :

- `title` non vide ;
- au moins 3 ingredients ;
- au moins 3 instructions ;
- au moins 50% des ingredients principaux ont quantite ou note utile ;
- `confidence >= 0.70` pour video multimodale ;
- aucune violation policy detectee dans ingredients apres sanitizer ;
- pas de warning bloquant (`not_a_recipe`, `download_metadata_only`, `schema_partial`).

Sinon statut `needs_review`.

Le seuil `0.70` est volontairement initial et doit etre recalibre en PR6 apres
les 10 premieres fixtures deterministes + les premieres observations canary.
Tout changement de seuil doit etre note dans le changelog du PR.

### 3.4 Image recette

Priorite :

1. thumbnail snapshot deja capturee par `ThumbnailSnapshotService` ;
2. frame extraite du fichier upload utilisateur, si droits de stockage OK ;
3. frame extraite d'un download `permitted_download`, si policy media OK ;
4. thumbnail remote source, si aucun asset stable disponible.

Ne pas stocker une frame issue d'un download non atteste en tant qu'image
durable si `MediaRightsPolicy` le bloque.

Si Gemini retourne `suggestedImageTimestamp`, le worker extrait la frame via le
module frame extractor, l'upload vers le bucket prive, puis retourne un
`imageUrl` signe ou durable selon `MediaRightsPolicy`. Si la persistence est
interdite, `RecipeDraftComposer` retombe sur `source.thumbnailUrl`.

---

## 4. Architecture cible

### 4.1 Pipeline principal

```text
User paste/share URL
  -> POST /api/imports/social
  -> social_recipe_imports row captured
  -> POST /api/imports/social/:id/extract
  -> SocialVideoImportOrchestrator
      1. MetadataCollector (existing adapters)
      2. VideoAcquisitionService
         - yt-dlp
         - gallery-dl fallback
         - optional commercial provider
      3. If acquisition failed:
         - persist status needs_upload
         - UI asks user to upload/share video file
      4. VideoUnderstandingProvider (Gemini)
      5. RecipeDraftComposer
      6. ImportedRecipeDraftSchema validation
      7. RecipePolicySanitizer detect/fix
      8. confidence scoring
  -> imported_recipe_drafts current revision
  -> RecipeInbox review/save
  -> saveImportedDraftAsRecipe
  -> recipes + recipe_ingredients
```

### 4.2 New concepts

#### SocialVideoImportOrchestrator

Owns the end-to-end extraction for social video imports.

Responsibilities :

- decide whether URL is video-capable platform ;
- collect metadata ;
- request video acquisition ;
- choose Gemini vs metadata-only extraction ;
- merge multimodal signals ;
- emit a canonical draft ;
- update lifecycle and logs.

#### VideoAcquisitionService

Attempts to obtain a local video file or a remote signed file URL.

Return shape :

```ts
type VideoAcquisitionResult =
  | {
      ok: true;
      method: 'yt_dlp' | 'gallery_dl' | 'commercial_api' | 'user_upload';
      mediaOrigin: 'permitted_download' | 'user_upload' | 'personal_archive_upload';
      localPath?: string;
      storagePath?: string;
      mimeType: string;
      durationSeconds?: number;
      sizeBytes?: number;
      thumbnailUrl?: string;
      metadata: Record<string, unknown>;
    }
  | {
      ok: false;
      method: 'yt_dlp' | 'gallery_dl' | 'commercial_api';
      errorCode:
        | 'UNSUPPORTED_URL'
        | 'AUTH_REQUIRED'
        | 'GEO_BLOCKED'
        | 'PRIVATE_OR_REMOVED'
        | 'DOWNLOAD_FAILED'
        | 'TOO_LONG'
        | 'TOO_LARGE'
        | 'RATE_LIMITED';
      message: string;
      retryable: boolean;
    };
```

#### VideoUnderstandingProvider

Provider interface so Gemini is primary but replaceable.

```ts
interface VideoUnderstandingProvider {
  analyze(input: {
    videoUri: string;
    mimeType: string;
    metadata: SocialVideoMetadata;
    promptVersion: string;
    fps?: number;
    clip?: { startSeconds: number; endSeconds: number };
  }): Promise<VideoUnderstandingResult>;
}
```

Gemini provider should send the video through File API / upload. Do not send
Instagram/TikTok URL directly to Gemini and assume it can fetch it.

The provider must estimate input cost before the call. If estimated cost is
above `MAX_VIDEO_EXTRACTION_COST_USD`, it must first reduce work by clipping or
lowering FPS. If still above cap, return metadata-only `needs_review` with
warning `cost_cap_exceeded`.

#### RecipeDraftComposer

Turns `VideoUnderstandingResult + metadata + transcript + OCR` into an
`ImportedRecipeDraft`.

Responsibilities :

- enforce schema ;
- normalize units ;
- split ingredient notes ;
- infer timings conservatively ;
- preserve raw evidence in `source_metadata.video_analysis` ;
- attach extraction warnings.

#### Worker queue transport

V1 does not introduce Redis/Celery. The API owns the queue in Postgres via
`social_video_import_jobs`; the Python worker is a separate Render/background
service that claims jobs through internal API endpoints.

Flow :

1. API creates/updates `social_video_import_jobs` with unique
   `(import_id, revision)`.
2. Worker polls `POST /internal/video-import/jobs/claim`.
3. API verifies `Authorization: Bearer $VIDEO_WORKER_SHARED_SECRET`, locks one
   queued job, and returns a short-lived job payload.
4. Worker posts progress to `/internal/video-import/jobs/:job_id/progress`.
5. Worker posts result to `/internal/video-import/jobs/:job_id/complete`.
6. API validates the result, persists draft/status, and emits logs/metrics.

Backpressure :

- `SOCIAL_VIDEO_MAX_QUEUE_DEPTH` caps global queued jobs.
- `SOCIAL_VIDEO_MAX_ACTIVE_PER_USER` caps active jobs per user.
- If limits are exceeded, `/extract` returns `429` with a retry-after hint.

Crash recovery :

- worker heartbeat is stored on the job row ;
- jobs with no heartbeat for `SOCIAL_VIDEO_JOB_STALE_MINUTES` are marked
  `failed` + `retryable=true` by a janitor ;
- manual retry creates a new revision.

### 4.3 Lifecycle extension

Current statuses :

```text
captured, metadata_ready, extracting, draft_ready, needs_review,
saved, failed, archived
```

Add V2 statuses :

```text
needs_upload
video_processing
```

Semantics :

| Status | Meaning |
|---|---|
| `needs_upload` | URL captured, metadata maybe available, but video acquisition failed or is blocked. User action required. |
| `video_processing` | Video file acquired/uploaded and worker is analyzing audio/frames/Gemini. |

Existing UIs can treat unknown in-progress statuses defensively, but PR1 must
update types and filters explicitly.

### 4.4 Metadata persistence

Extend `social_recipe_imports.metadata` JSONB, no new table for V1 :

```json
{
  "video": {
    "acquisition": {
      "status": "success|failed|needs_upload",
      "method": "yt_dlp",
      "error_code": null,
      "duration_seconds": 42,
      "size_bytes": 12345678,
      "media_origin": "permitted_download"
    },
    "analysis": {
      "provider": "gemini",
      "model": "$GEMINI_VIDEO_MODEL",
      "prompt_version": "social-video-recipe-v1",
      "duration_ms": 21000,
      "input_tokens": 13000,
      "output_tokens": 1200,
      "cost_usd_estimate": 0.04
    },
    "quality": {
      "visual_evidence": true,
      "audio_evidence": true,
      "onscreen_text_evidence": true,
      "confidence_breakdown": {
        "ingredients": 0.82,
        "steps": 0.78,
        "timings": 0.44
      }
    }
  }
}
```

Do not store full transcript in `social_recipe_imports.metadata` if it becomes
large. Store compact excerpts/evidence and keep full provider output in
`imported_recipe_drafts.draft_json.source` / source metadata only when needed.

---

## 5. Provider strategy

### 5.1 Gemini primary

Use Gemini for video understanding because it processes audio + visual streams
together and supports timestamps. It can detect :

- spoken ingredients ;
- on-screen ingredient captions ;
- visual cooking steps ;
- relative timing/order ;
- visible final dish ;
- ambiguities, e.g. "quantity never shown".

Expected prompt output must be JSON only, then validated by Zod.

Model selection :

- `GEMINI_VIDEO_MODEL` is required in production.
- Default local/dev value may track the current fast multimodal Flash model
  from the official Gemini docs.
- At PR implementation time, run a model-list or smoke-test check on startup.
- If the configured model returns 404/unsupported video input, fail fast with a
  clear config error and do not silently downgrade to text-only extraction.

Do not hard-code a model forever. This API changes quickly. As of the
2026-05-23 PRP verification, official Gemini docs list `gemini-3.5-flash` for
video examples and also list newer Gemini Flash families; implementation must
trust runtime validation over stale PRP text.

Cost guardrail :

- `MAX_VIDEO_EXTRACTION_COST_USD=0.20` initial hard cap.
- Preflight estimates input tokens from duration/FPS/resolution plus output cap.
- If over cap, try lower FPS/clip. If still over cap, use metadata-only fallback
  and surface warning `cost_cap_exceeded`.
- Record estimated and actual cost in job metrics.

Retry policy :

- One automatic retry for Gemini timeout/5xx/rate-limit, with 30s backoff.
- After retry failure, mark job `failed`, `retryable=true`.
- User can trigger manual retry from the inbox.

### 5.2 OpenAI fallback

Keep OpenAI path as fallback only if Gemini fails or is disabled :

- transcribe audio via existing Whisper/local path or OpenAI transcription ;
- sample frames ;
- use current OpenAI vision model, not `gpt-4-vision-preview`.

This fallback should produce the same `VideoUnderstandingResult`.

### 5.3 Metadata-only fallback

If no video file is available and user refuses upload :

- keep current oEmbed/metadata extraction ;
- cap confidence at 0.6 ;
- status `needs_review` by default ;
- warning `Extraction basee sur metadonnees seulement`.

---

## 6. Download strategy

### 6.1 Downloader cascade

For public URL extraction :

1. `yt-dlp`
   - primary ;
   - current `services/video-processor` already uses it ;
   - update regularly.
2. `gallery-dl`
   - fallback for Instagram/TikTok media extraction.
3. Optional commercial provider
   - Apify/Bright Data/other ;
   - feature flag ;
   - only for production failure reduction after measurement.

`instaloader` is intentionally not part of V1. It adds another Python
dependency for a marginal Instagram coverage gain while `yt-dlp` already covers
many public Reels. Reevaluate after PR2 metrics, not before.

### 6.2 Error taxonomy

Every failed acquisition must produce a stable error code :

| Error | User message | Retry? |
|---|---|---|
| `AUTH_REQUIRED` | Cette video demande une session ou n'est pas publique. Upload la video pour continuer. | Non |
| `PRIVATE_OR_REMOVED` | Video privee, supprimee ou inaccessible. | Non |
| `GEO_BLOCKED` | Video bloquee depuis notre serveur. Upload possible. | Peut-etre |
| `RATE_LIMITED` | Plateforme limite temporairement les requetes. Reessaye plus tard ou upload. | Oui |
| `TOO_LONG` | Video trop longue. Coupe-la ou upload une version courte. | Non |
| `TOO_LARGE` | Fichier trop volumineux. | Non |
| `DOWNLOAD_FAILED` | Download impossible. Upload recommande. | Oui |

### 6.3 Limits V1

- Max duration URL/download : 5 minutes.
- Max duration user upload : 10 minutes.
- Max file : 500 MB initially (align existing worker).
- Analyse recommended : low/medium resolution unless OCR needs higher.
- Gemini default FPS : 1 FPS ; raise only for fast videos with small text.

### 6.4 No cookies in V1

Reasons :

- security ;
- legal/compliance ;
- risk of account lock ;
- support burden.

If future PR introduces cookies, it must be a separate PRP with explicit
credential storage, revocation, encryption, platform ToS review, and user
consent UX.

### 6.5 Platform ToS posture

Public download via `yt-dlp`/`gallery-dl` is best-effort and may be restricted
by Instagram/TikTok platform terms or technical countermeasures. If a platform
blocks or legally challenges this behavior, disable URL download quickly via
feature flag without breaking the product: user upload remains the canonical,
controlled path.

---

## 7. UX cible

### 7.1 Inbox-first

Unifier les anciens composants video autour de l'inbox moderne.

Flow :

1. User colle URL dans `CaptureUrlBar`.
2. Card apparait dans `RecipeInbox`.
3. Bouton `Analyser`.
4. Card affiche etapes :
   - metadata ;
   - download video ;
   - analyse audio/video ;
   - extraction recette ;
   - review.
5. Si URL download echoue :
   - status `needs_upload` ;
   - CTA `Uploader la video`.
6. Apres upload :
   - status `video_processing` ;
   - analyse Gemini ;
   - draft.
7. User clique `Verifier`.
8. `ExtractedRecipeModal` affiche draft complet.
9. User sauvegarde.

### 7.2 UI upload fallback

Ajouter un upload dans l'inbox, pas une surface parallele :

- `ImportCard` affiche un CTA upload si `status=needs_upload`.
- L'upload passe par signed URL Supabase Storage, puis notification API.
- Apres upload, extraction redemarre automatiquement.

### 7.3 Not-a-recipe UI

If extraction returns `NOT_A_RECIPE`, `ImportCard` must show :

- badge `Pas une recette detectee` ;
- short reason if available ;
- CTA `Archiver` ;
- CTA `Uploader une autre video` if user still wants to retry.

No fake draft should be rendered for this state.

### 7.4 Review modal

Le modal de review doit afficher :

- title ;
- image ;
- description ;
- ingredients editables avec quantite/unite/notes ;
- instructions editables ;
- prep/cook/rest/servings/difficulty/cuisine/meal type/tags ;
- source URL + auteur ;
- confidence ;
- warnings ;
- badge "Analyse video" ou "Metadata only".

### 7.5 Progression temps reel

Expose extraction progress through SSE so the inbox does not depend only on
polling :

```http
GET /api/imports/social/:id/events
```

Events :

- `metadata_ready`
- `download_progress`
- `needs_upload`
- `upload_received`
- `analysis_progress`
- `draft_ready`
- `needs_review`
- `failed`

If SSE is unavailable, `GET /video-status` remains the fallback.

### 7.6 Messages utilisateur

Exemples :

- Download success :
  `Video recuperee. Analyse audio et visuelle en cours.`
- Needs upload :
  `Impossible de recuperer la video depuis cette URL. Tu peux uploader la video pour lancer la meme analyse.`
- Low confidence :
  `J'ai trouve une recette probable, mais certaines quantites ou etapes manquent. Verifie avant de sauvegarder.`
- Not a recipe :
  `Je n'ai pas detecte de recette exploitable dans cette video.`

---

## 8. API design

### 8.1 Existing endpoints kept

- `POST /api/imports/social`
- `POST /api/imports/social/:id/extract`
- `POST /api/imports/social/:id/save`
- `GET /api/imports/social/:id/current-draft`

### 8.2 New endpoints

#### Mint upload URL for an existing import

```http
POST /api/imports/social/:id/video-upload-url
```

Body :

- `file_name` required ;
- `content_type` required (`video/mp4`, `video/quicktime`, etc.) ;
- `size_bytes` required ;
- `rights_basis` required for storage :
  - `created_by_user`
  - `user_has_permission`
  - `platform_native_download`
  - `personal_backup`
  - `licensed`
- `attestation_accepted=true` required.

Response :

```json
{
  "success": true,
  "data": {
    "storage_key": "recipe-import-media/user/import/video.mp4",
    "upload_url": "signed-upload-url",
    "max_size_bytes": 524288000,
    "expires_at": "2026-05-23T12:00:00Z"
  }
}
```

The browser uploads directly to Supabase Storage using the signed URL. Do not
proxy 500 MB multipart uploads through the API; this would fail on common API
hosts such as Vercel/Render and would tie up API workers.

#### Notify uploaded video

```http
POST /api/imports/social/:id/video-uploaded
```

Body :

```json
{
  "storage_key": "recipe-import-media/user/import/video.mp4",
  "size_bytes": 12345678,
  "content_type": "video/mp4",
  "rights_basis": "personal_backup",
  "attestation_accepted": true
}
```

Response :

```json
{
  "success": true,
  "data": {
    "import": { "...": "..." },
    "job_id": "video-job-uuid"
  }
}
```

API validates ownership, object metadata, size, mime type, and rights
attestation before enqueueing the worker job.

#### Poll video analysis status

Prefer reusing import row status. If worker task status is needed :

```http
GET /api/imports/social/:id/video-status
```

Response includes :

- import status ;
- job step ;
- progress ;
- current draft if ready ;
- stable error code if failed.

#### Subscribe to extraction events

```http
GET /api/imports/social/:id/events
Accept: text/event-stream
```

Streams the same job progress used by the inbox. This is UX sugar over the job
row and does not create a second source of truth.

### 8.3 Worker API

Internal only :

```http
POST /internal/video-import/jobs/claim
POST /internal/video-import/jobs/:job_id/progress
POST /internal/video-import/jobs/:job_id/complete
GET /internal/video-import/jobs/:job_id
```

Auth :

- `Authorization: Bearer $VIDEO_WORKER_SHARED_SECRET` required.
- Worker never receives a user JWT.
- Worker receives only the minimum payload needed for acquisition/analysis.
- Signed media URLs returned to the worker must be short-lived.

The API app owns auth/user/RLS, idempotency, status transitions, and persistence.
Worker owns CPU/video/Gemini calls.

### 8.4 Idempotency and re-entry

Rules :

- `/extract` on `captured`, `metadata_ready`, `needs_review`, `failed` may
  enqueue a job.
- `/extract` on `extracting`/`video_processing` returns `409 job_already_active`.
- `/extract?force=true` cancels active job, increments `revision`, and enqueues
  a new job.
- `/video-uploaded` always enqueues using the current import revision unless an
  active upload job exists, then returns `409`.
- Unique `(import_id, revision)` prevents duplicate worker jobs from double
  clicks or network retries.
- API requests should accept `Idempotency-Key`; if absent, derive one from
  `import_id + revision + action`.

---

## 9. Data model changes

### 9.1 Migration : statuses

Update `social_recipe_imports.status` CHECK to include :

- `needs_upload`
- `video_processing`

Migration must be idempotent and preserve existing rows.

### 9.2 Required table : video import jobs

Required V1 table for queueing, idempotency, observability, and stale-job
recovery :

```sql
CREATE TABLE public.social_video_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.social_recipe_imports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL DEFAULT 1,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'queued', 'downloading', 'needs_upload', 'analyzing',
    'draft_ready', 'failed', 'cancelled'
  )),
  provider TEXT,
  acquisition_method TEXT,
  media_origin TEXT,
  error_code TEXT,
  error_message TEXT,
  retryable BOOLEAN NOT NULL DEFAULT false,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 2,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  heartbeat_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(import_id, revision),
  UNIQUE(idempotency_key)
);
```

RLS :

```sql
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)
```

Indexes :

- `(user_id, created_at DESC)`
- `(import_id)`
- `(status, heartbeat_at)`
- `(status, created_at DESC)` for worker/admin dashboards.

Worker claims must use a transaction with row-level locking, e.g.
`FOR UPDATE SKIP LOCKED`, so multiple workers cannot process the same job.
The API should own that SQL; the worker calls internal endpoints rather than
issuing ad hoc DB updates.

### 9.3 Media storage

Do not add new public bucket without review.

Use existing media storage patterns if available, otherwise add :

- bucket `recipe-import-media` private ;
- signed URLs only ;
- short retention for downloaded temp files ;
- durable storage only when `MediaRightsPolicy.canPersistMedia()` allows.

This bucket and its Storage policies must be part of PR1 migration, not a
runtime assumption. Required policies :

- authenticated users can upload only under their own user/import prefix via
  API-minted signed URLs ;
- authenticated users can read only their own import media via signed URLs ;
- service role/worker can read temporary inputs and write extracted frames ;
- no public read policy.

Retention :

- downloaded URL temp files : delete after analysis or <= 24h ;
- user-upload source files : retain only if product wants re-analysis ;
- extracted frames : delete after analysis unless selected as recipe image and allowed.

### 9.4 Shared warning and provenance types

Add typed warning codes in `packages/shared/src/recipe-import.ts` :

```ts
export type ExtractionWarningCode =
  | 'not_a_recipe'
  | 'download_metadata_only'
  | 'schema_partial'
  | 'missing_quantities'
  | 'cost_cap_exceeded'
  | 'policy_rewritten'
  | 'low_confidence'
  | 'frame_persistence_blocked';
```

Keep human-readable `extractionWarnings`, but store machine-readable warning
codes in source metadata so UI does not rely on typo-prone string matching.

Add extraction method variant :

```ts
ExtractionMethodSchema += 'video_multimodal'
```

Use `video_multimodal` only when the provider actually analyzed video/audio
frames. Keep `ai_inference` for metadata/oEmbed/caption inference that did not
inspect the video.

---

## 10. Prompt / extraction contract

### 10.1 Gemini system instruction

The model must behave as an extractor, not a creative chef.

Key rules :

- Extract only what is supported by video/audio/caption evidence.
- Do not invent ingredients not visible, spoken, written, or strongly implied.
- If quantity is unknown, omit `quantity` and add a note/warning.
- Keep recipe in French unless source is clearly intended otherwise.
- Respect PRP-239 policy : no pork, no alcohol in output ingredients.
- Return JSON only.

### 10.2 Expected JSON from provider

Provider output should be close to `ImportedRecipeDraft`, but composer owns
final validation.

```json
{
  "is_recipe": true,
  "title": "string",
  "description": "string",
  "ingredients": [
    {
      "name": "string",
      "quantity": 200,
      "unit": "g",
      "notes": "string",
      "isEssential": true,
      "rawText": "visible/spoken evidence"
    }
  ],
  "instructions": [
    {
      "step": 1,
      "description": "string",
      "durationSeconds": 300,
      "rawText": "timestamp/evidence"
    }
  ],
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 20,
  "restTimeMinutes": 0,
  "servings": 4,
  "difficulty": 2,
  "cuisineCategory": "Coreenne",
  "mealType": "dinner",
  "tags": ["instagram", "video", "poulet"],
  "suggestedImageTimestamp": "00:24",
  "confidence": {
    "overall": 0.84,
    "ingredients": 0.86,
    "instructions": 0.82,
    "timings": 0.55
  },
  "warnings": [
    "Quantite de sel non precisee"
  ],
  "evidence": {
    "audio_used": true,
    "visual_used": true,
    "onscreen_text_used": true,
    "caption_used": true
  }
}
```

### 10.3 Composer output

`RecipeDraftComposer` converts the provider output into :

- `ImportedRecipeDraftSchema` ;
- `source.extractionMethod = 'video_multimodal'` for full video/audio analysis ;
- `source.extractionMethod = 'ai_inference'` only for metadata/caption inference
  that did not inspect the video ;
- `source.originalTitle`, `source.originalDescription` from oEmbed/metadata ;
- `source.thumbnailUrl` from metadata/snapshot ;
- `confidence` numeric ;
- `extractionWarnings` stable user-readable warnings.

The composer must also persist machine-readable warning codes under
`source_metadata.video.warning_codes` using the shared enum from §9.4.

### 10.4 Not a recipe

If provider returns `is_recipe=false` :

- do not create a fake draft ;
- update import `failed` or `needs_review` with `error_code=NOT_A_RECIPE` ;
- user can archive or retry with hint/upload.

### 10.5 Frame extraction wiring

If provider returns `suggestedImageTimestamp` :

1. worker seeks the source video at that timestamp ;
2. worker extracts a JPEG/WEBP frame ;
3. worker uploads it to `recipe-import-media` under the import prefix ;
4. API checks `MediaRightsPolicy` for the frame origin ;
5. composer sets `draft.imageUrl` only if persistence/serving is allowed ;
6. otherwise composer keeps `source.thumbnailUrl` and adds warning code
   `frame_persistence_blocked`.

This wiring is part of PR3.5/PR4, not an optional nice-to-have: without it,
`suggestedImageTimestamp` is orphaned.

---

## 11. Policy and safety

### 11.1 Recipe policy

Every imported draft must pass PRP-239 sanitizer before save.

At extraction time :

- provider prompt asks zero pork/zero alcohol ;
- composer runs sanitizer/detect ;
- ingredient violations may be rewritten by sanitizer ;
- prose violations become warnings / needs review.

At draft persistence time :

- run `RecipePolicySanitizer` in detect/fix mode on ingredients and
  instructions before saving `imported_recipe_drafts` ;
- if sanitizer changes fields, add `policy_rewritten` warning code and preserve
  correction metadata from PRP-239 ;
- if detect-only still finds blocked terms after fix, status becomes
  `needs_review`, never `draft_ready`.

At save time :

- existing `SocialImportService.save()` sanitizer remains the final gate.

### 11.2 Media rights

Use existing `MediaRightsPolicy`.

Rules :

- `source_link` -> link only ;
- `official_embed` -> embed only ;
- `thumbnail_snapshot` -> store allowed ;
- `user_upload`, `personal_archive_upload` -> store only with attestation ;
- `permitted_download` -> store only when explicitly allowed.

### 11.3 No private scraping

V1 must never :

- ask for Instagram/TikTok password ;
- store platform cookies ;
- bypass private/auth-only videos ;
- fetch non-public content ;
- pretend commercial scraper output has official provenance.

### 11.4 Platform terms posture

URL download from public Instagram/TikTok pages is a best-effort convenience,
not a guaranteed platform contract. It may stop working or need to be disabled
if platform terms, technical blocking, or legal notices require it. The product
promise is therefore the upload fallback: user supplies the video they are
allowed to use, and the app analyzes that file.

### 11.5 Privacy

Uploads may contain personal footage. Requirements :

- private bucket ;
- signed URLs ;
- retention policy ;
- delete-on-archive option in future ;
- logs must not include signed URLs or raw transcripts.

---

## 12. QA strategy

### 12.1 Fixture matrix

Create a V1 fixture manifest with at least 10 deterministic cases. Scale to 30
after the first canary/production observations, because sourcing stable social
video ground truth is a sub-project by itself.

| Category | Count | Examples |
|---|---:|---|
| Instagram recipe clear caption | 2 | Ingredients in caption, video simple. |
| Instagram voice/visual mixed | 1 | Spoken quantities + visual steps. |
| TikTok recipe clear caption | 2 | Title/caption has ingredients. |
| TikTok fast montage | 1 | Quick cuts, OCR important. |
| Ambiguous recipe | 1 | Missing quantities/steps. |
| Not a recipe | 1 | Restaurant review, meme, grocery haul. |
| Policy violations | 1 | Pork/alcohol mention, must sanitize or warn. |
| Frame extraction | 1 | Final dish visible at expected timestamp. |

Do not depend only on live URLs in CI. Use local stored fixture videos for
deterministic tests, plus optional nightly live canary.

Each fixture must include expected structured facts where possible :

- expected recipe title keywords ;
- expected key ingredients ;
- expected minimum instruction count ;
- expected `draft_ready` vs `needs_review` vs `NOT_A_RECIPE` ;
- expected warning codes ;
- expected image behavior.

### 12.2 Behavioral assertions

For every fixture :

- schema validates as `ImportedRecipeDraft` or expected `NOT_A_RECIPE` ;
- no pork/alcohol violations in ingredients post-sanitizer ;
- title present ;
- ingredients count threshold ;
- instructions ordered and non-empty ;
- imageUrl/source thumbnail behavior matches media rights ;
- confidence range expected ;
- warnings expected for missing data ;
- save path inserts `recipes` and `recipe_ingredients` in test DB.

### 12.3 Golden-lite snapshots

Snapshot structure, not exact prose :

```json
{
  "status": "draft_ready",
  "provider": "gemini",
  "acquisition_method": "user_upload",
  "ingredient_count": 8,
  "instruction_count": 6,
  "has_quantities_ratio": 0.75,
  "has_image": true,
  "policy_flags": [],
  "confidence_bucket": "high"
}
```

### 12.4 LLM-as-judge optional

Weekly/manual only, not daily CI :

- judge relevance ;
- missing ingredients ;
- hallucinated steps ;
- recipe usability ;
- policy compliance ;
- French clarity.

### 12.5 Live canary

Nightly or manual :

- 5 public Instagram URLs ;
- 5 public TikTok URLs ;
- report downloader success/failure ;
- never fail main CI unless configured ;
- output trend report.

Live URLs are volatile. Prefer long-lived verified/brand accounts where
possible and rotate the canary manifest monthly. A deleted creator post should
be reported as canary drift, not as a product regression.

---

## 13. Metrics and observability

Counters :

- `social_video_import_capture_total{platform}`
- `social_video_import_download_total{platform, method, outcome, error_code}`
- `social_video_import_upload_total{platform}`
- `social_video_import_analysis_total{provider, model, outcome}`
- `social_video_import_draft_total{status, confidence_bucket}`
- `social_video_import_policy_violation_total{rule_id, field}`

Histograms :

- download duration ;
- analysis duration ;
- end-to-end extraction duration ;
- video duration ;
- file size ;
- Gemini/OpenAI cost.

Guardrail metrics :

- `social_video_import_cost_cap_total{provider, outcome}`
- `social_video_import_retry_total{provider, error_code}`
- `social_video_import_job_stale_total{stage}`
- `social_video_import_queue_depth`

Hard cap :

- `MAX_VIDEO_EXTRACTION_COST_USD=0.20` initial value.
- If preflight estimate exceeds cap after FPS/clip reduction, do not call the
  expensive provider. Return metadata-only/needs_review with warning
  `cost_cap_exceeded`.

Structured logs must include :

- `userId` hashed or internal ;
- `importId` ;
- platform ;
- acquisition method ;
- provider/model ;
- status ;
- stable error code.

Never log :

- full access tokens ;
- signed media URLs ;
- raw transcript ;
- raw AI response beyond small debug samples in local dev.

---

## 14. PR split

### PR1 - Schema + status + contracts

Scope :

- Add statuses `needs_upload`, `video_processing`.
- Add `social_video_import_jobs` table.
- Add private `recipe-import-media` bucket + Storage policies.
- Extend shared API types.
- Add `video_multimodal` extraction method.
- Add typed `ExtractionWarningCode`.
- Add `VideoAcquisitionResult`, `VideoUnderstandingResult`,
  `SocialVideoImportOrchestrator` interfaces.
- No Gemini/download implementation yet.

Acceptance criteria :

- Migrations idempotent.
- RLS policies tested.
- Storage policies tested.
- Existing imports still work.
- Routes-mounted tests updated.

Estimate : 1-2 days.

### PR2 - Worker cleanup + downloader cascade

Scope :

- Refactor `services/video-processor` into a production-friendly worker.
- Update stale vision model config.
- Add `yt-dlp` primary acquisition wrapper.
- Add `gallery-dl` fallback.
- Add stable error taxonomy.
- Add job claim/progress/complete internal endpoints.
- Add heartbeat, stale-job janitor, and retryable failure states.
- Add local temp cleanup and retention.

Acceptance criteria :

- Unit tests for URL classification and error mapping.
- Integration test with local/static video file.
- Download failures produce stable `needs_upload`.
- No fake recipe fallback.
- Duplicate `/extract` during active job returns `409`; `force=true` creates new revision.
- Backpressure returns `429` when queue limits are exceeded.

Estimate : 4-6 days.

### PR3 - Gemini video understanding provider

Scope :

- Add `GEMINI_API_KEY`, `GEMINI_VIDEO_MODEL`.
- Implement Gemini File API upload/analyze path.
- Validate configured Gemini model at startup/smoke test.
- Add preflight cost cap and 1 retry with 30s backoff.
- Add prompt version `social-video-recipe-v1`.
- Add `RecipeDraftComposer`.
- Validate output with `ImportedRecipeDraftSchema`.
- Store compact evidence in metadata.

Acceptance criteria :

- Local fixture video -> valid `ImportedRecipeDraft`.
- Not-a-recipe fixture -> `NOT_A_RECIPE`, no draft.
- Missing quantities produce warnings.
- Provider output never bypasses Zod validation.
- Over-cost fixture downgrades to metadata-only with `cost_cap_exceeded`.

Estimate : 3-5 days.

### PR3.5 - Frame extractor wiring

Scope :

- Wire existing frame extractor to `suggestedImageTimestamp`.
- Upload selected frame to `recipe-import-media`.
- Apply `MediaRightsPolicy` before setting `draft.imageUrl`.
- Add warning `frame_persistence_blocked` when policy denies persistence.

Acceptance criteria :

- Fixture with final dish timestamp produces imageUrl when rights allow.
- Same fixture with blocked media origin falls back to source thumbnail.
- No orphan `suggestedImageTimestamp` in provider output.

Estimate : 1-2 days.

### PR4 - API integration into SocialImportService

Scope :

- Wire orchestrator into `/api/imports/social/:id/extract`.
- Add `/video-upload-url` and `/video-uploaded`.
- Add `/events` SSE and `/video-status` fallback.
- Update lifecycle transitions.
- Persist `imported_recipe_drafts`.
- Keep metadata-only fallback.
- Ensure save path still runs PRP-239 sanitizer.

Acceptance criteria :

- URL download success -> `draft_ready` or `needs_review`.
- URL download fail -> `needs_upload`.
- Upload fallback -> `video_processing` -> draft.
- Save creates rows in `recipes` and `recipe_ingredients`.
- Source metadata contains platform/source/provider/confidence.
- API never accepts 500 MB multipart video payload directly.

Estimate : 4-6 days.

### PR5 - Inbox UX unification

Scope :

- Update `RecipeInbox` / `ImportCard`.
- Update `CaptureUrlBar`, `ExtractedRecipeModal`, and the assistant/import
  result surface that displays imported drafts.
- Add progress states.
- Add upload CTA for `needs_upload`.
- Add `NOT_A_RECIPE` card state with Archive / Upload another video CTAs.
- Deprecate or route old `VideoImportCard`, `InstagramVideoExtractor`,
  `InstagramRecipeImport` through new API.
- Remove or gate debug-only `InstagramDebugExtractor` and
  `InstagramThumbnailExtractor`; no production path may save outside inbox.
- Review modal shows all template fields.

Acceptance criteria :

- User can paste URL, analyze, review, save.
- If download fails, user can upload and continue.
- Low confidence requires review.
- No parallel legacy save path remains for Instagram/TikTok imports.
- Off-path legacy components either redirect to RecipeInbox or are removed.

Estimate : 3-5 days.

### PR6 - QA harness + live canary

Scope :

- Fixture manifest with 10 deterministic V1 cases.
- Behavioral assertions.
- Golden-lite snapshots.
- Optional live canary script.
- Cost/latency report.

Acceptance criteria :

- `npm run test:api` includes deterministic fixture tests.
- `pnpm tsx scripts/run-social-video-import-qa.ts` outputs JSON/MD report.
- CI blocks schema/policy regressions.
- Live canary is opt-in, not required for PR merge.
- Canary URL manifest has owner/rotation notes.

Estimate : 2-3 days.

---

## 15. Definition of Done

- A TikTok or Instagram URL that can be downloaded produces a validated
  `ImportedRecipeDraft`.
- A URL that cannot be downloaded moves to `needs_upload` with a clear CTA.
- A user-uploaded video can produce the same draft shape.
- Save uses the existing `saveImportedDraftAsRecipe` path.
- Saved recipe appears in `RecipeDetail` with :
  - title ;
  - image ;
  - description ;
  - ingredients ;
  - instructions ;
  - source URL ;
  - tags ;
  - times/servings where available.
- No extracted recipe can bypass PRP-239 sanitizer.
- No fake/demo recipe fallback.
- Metrics show success/failure/fallback rates.
- At least 10 deterministic fixture cases exist in V1, with a path to 30 after
  canary observations.
- Documentation explains that URL import is best-effort and upload fallback is
  the reliable path.
- Upload fallback uses signed Storage upload, not API multipart proxy.
- `video_multimodal` provenance distinguishes true video analysis from
  metadata-only `ai_inference`.
- Worker jobs are idempotent and stale jobs become retryable failures.

---

## 16. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Instagram/TikTok downloader breaks | URL import fails | Fallback upload, metrics, canary, update downloader separately. |
| Gemini hallucinates ingredients | Bad recipe | Strict JSON prompt, Zod validation, confidence scoring, review for low confidence. |
| Missing quantities | Weak recipe | Allow optional quantity, add warnings, require user review. |
| Policy violation in video source | Pork/alcohol enters app | Prompt policy + sanitizer at extraction + sanitizer at save. |
| Media rights issue | Legal/product risk | Use `MediaRightsPolicy`, no durable storage unless allowed. |
| Worker cost too high | Expensive imports | Duration caps, fps caps, model config, caching, cost metrics. |
| Worker cost runaway before metrics | Unexpected spend | Preflight estimate + `MAX_VIDEO_EXTRACTION_COST_USD` hard cap. |
| API upload limit exceeded | Uploads fail | Browser uploads directly to Supabase Storage signed URL. |
| Worker crash leaves import stuck | User blocked | Heartbeat + stale-job janitor + retryable failure. |
| Upload contains personal content | Privacy risk | Private bucket, signed URLs, retention, no raw transcript logs. |
| Legacy UI saves around new path | Data inconsistency | PR5 deprecates old paths or rewires them to inbox API. |
| Commercial scraper dependency | Cost/compliance | Feature flag only, measure before adopting. |

---

## 17. Open questions before implementation

1. Do we want to keep user-uploaded source videos after save, or delete after
   extraction by default?
2. Should commercial scraper providers be evaluated in PR2 or postponed until
   after measuring open-source failure rates?
3. Should upload fallback accept only video files, or also screenshots +
   pasted captions in V1?

Recommendation :

- Delete downloaded URL files after extraction.
- Keep user uploads only if user explicitly accepts storage, otherwise delete
  after draft creation.
- Start without commercial scraper in PR2, but keep interface ready.
- Accept video upload in V1; screenshots/pasted captions can be V1.1.
- Gemini model is not an open question: use `GEMINI_VIDEO_MODEL` and runtime
  validation. Update the env default when official Gemini docs/model list
  changes.
- Legacy UI decision is locked: no legacy save path. Rewire to RecipeInbox or
  remove debug-only components in PR5.
