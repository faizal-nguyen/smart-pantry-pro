/**
 * PRP-240 PR2 — Queue service for `social_video_import_jobs`.
 *
 * Owns the job lifecycle on the API side:
 *   - enqueueJob() — called by /extract in PR4 (PR2 ships service only)
 *   - claimNext()  — called by the worker via /api/internal/video-import/jobs/claim
 *   - recordProgress() — heartbeat + progress tick
 *   - recordCompletion() — terminal transition (success or failure)
 *   - scanStale() — janitor entrypoint
 *
 * Concurrency model — V1 single worker:
 *   Uses optimistic UPDATE via Supabase REST (.eq('status','queued') guard).
 *   This is race-safe enough for one worker process. Multi-worker requires
 *   FOR UPDATE SKIP LOCKED via a Postgres RPC — kept out of PR2 to avoid
 *   churning the migration set; revisit when deploying ≥2 workers.
 *
 * All DB writes go through `supabaseAdmin` (service-role, bypasses RLS).
 * The worker never receives a Supabase client; it talks HTTP to this
 * service via /api/internal/video-import/jobs/*.
 */
import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createLogger } from '../../config/logger.js';
import type {
  SocialVideoImportJobStatus,
  VideoAcquisitionErrorCode,
  VideoAcquisitionResult,
} from '@smart/shared';

const logger = createLogger({ service: 'SocialVideoImportQueue' });

// -----------------------------------------------------------------------------
// Domain errors. Routes map these to HTTP status codes (PR4 wires /extract).
// -----------------------------------------------------------------------------

export class JobAlreadyActiveError extends Error {
  readonly code = 'JOB_ALREADY_ACTIVE' as const;
  constructor(public readonly importId: string, public readonly activeJobId: string) {
    super(`Job already active for import ${importId} (active job ${activeJobId})`);
    this.name = 'JobAlreadyActiveError';
  }
}

export type BackpressureReason = 'QUEUE_FULL' | 'USER_LIMIT';

export class BackpressureError extends Error {
  readonly code: BackpressureReason;
  readonly retryAfterSeconds: number;
  constructor(reason: BackpressureReason, retryAfterSeconds = 30) {
    super(`Backpressure: ${reason}`);
    this.name = 'BackpressureError';
    this.code = reason;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class JobNotFoundError extends Error {
  readonly code = 'JOB_NOT_FOUND' as const;
  constructor(public readonly jobId: string) {
    super(`Job ${jobId} not found`);
    this.name = 'JobNotFoundError';
  }
}

export class JobAlreadyTerminalError extends Error {
  readonly code = 'JOB_ALREADY_TERMINAL' as const;
  constructor(public readonly jobId: string, public readonly status: string) {
    super(`Job ${jobId} is already terminal (status=${status})`);
    this.name = 'JobAlreadyTerminalError';
  }
}

// -----------------------------------------------------------------------------
// Public payload types
// -----------------------------------------------------------------------------

export interface ClaimedJobPayload {
  jobId: string;
  importId: string;
  userId: string;
  revision: number;
  attemptCount: number;
  sourceUrl: string;
  platform: string;
  // PR4: extend with a short-lived signed URL when the import is from a
  // user upload (bucket-resident input) so the worker can fetch it.
}

export type CompletionResult =
  | {
      ok: true;
      acquisition: Extract<VideoAcquisitionResult, { ok: true }>;
      // PR3 will populate `understanding`. PR2 leaves it absent, signalling
      // "acquisition done, no analyzer yet → mark job analyzing and stop".
      understanding?: { isRecipe: boolean; draftId?: string };
    }
  | {
      ok: false;
      errorCode: VideoAcquisitionErrorCode | 'STALE' | 'INTERNAL';
      message: string;
      retryable: boolean;
    };

export interface QueueOptions {
  maxQueueDepth?: number;
  maxActivePerUser?: number;
}

const ACTIVE_STATUSES: SocialVideoImportJobStatus[] = ['queued', 'downloading', 'analyzing'];

// -----------------------------------------------------------------------------
// Service
// -----------------------------------------------------------------------------

export class SocialVideoImportQueue {
  private readonly maxQueueDepth: number;
  private readonly maxActivePerUser: number;

  constructor(
    private readonly client: SupabaseClient,
    options: QueueOptions = {},
  ) {
    this.maxQueueDepth =
      options.maxQueueDepth ?? Number(process.env.SOCIAL_VIDEO_MAX_QUEUE_DEPTH ?? 100);
    this.maxActivePerUser =
      options.maxActivePerUser ?? Number(process.env.SOCIAL_VIDEO_MAX_ACTIVE_PER_USER ?? 3);
  }

  // ---------------------------------------------------------------------------
  // enqueueJob — called by PR4's /extract route (PR2 ships service only).
  // ---------------------------------------------------------------------------

  async enqueueJob(input: {
    importId: string;
    userId: string;
    force?: boolean;
    idempotencyKey?: string;
  }): Promise<{ jobId: string; revision: number }> {
    const { importId, userId, force = false } = input;

    // 1) Backpressure — global queue depth + per-user concurrency.
    await this.assertCanEnqueue(userId);

    // 2) Look for an existing active job for this import.
    const { data: activeJobs, error: activeErr } = await this.client
      .from('social_video_import_jobs')
      .select('id, revision, status')
      .eq('import_id', importId)
      .in('status', ACTIVE_STATUSES)
      .order('revision', { ascending: false })
      .limit(1);
    if (activeErr) throw activeErr;

    const active = activeJobs?.[0];
    if (active && !force) {
      throw new JobAlreadyActiveError(importId, active.id);
    }

    if (active && force) {
      const { error: cancelErr } = await this.client
        .from('social_video_import_jobs')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
        })
        .eq('id', active.id)
        .in('status', ACTIVE_STATUSES); // optimistic guard
      if (cancelErr) throw cancelErr;
    }

    // 3) Compute next revision (max+1 across all jobs for this import).
    const { data: maxRows, error: maxErr } = await this.client
      .from('social_video_import_jobs')
      .select('revision')
      .eq('import_id', importId)
      .order('revision', { ascending: false })
      .limit(1);
    if (maxErr) throw maxErr;
    const nextRevision = (maxRows?.[0]?.revision ?? 0) + 1;

    const idempotencyKey =
      input.idempotencyKey ?? deriveIdempotencyKey(importId, nextRevision, 'enqueue');

    // 4) Insert the new job row.
    const { data: inserted, error: insertErr } = await this.client
      .from('social_video_import_jobs')
      .insert({
        import_id: importId,
        user_id: userId,
        revision: nextRevision,
        idempotency_key: idempotencyKey,
        status: 'queued',
      })
      .select('id, revision')
      .single();
    if (insertErr) throw insertErr;
    if (!inserted) throw new Error('enqueueJob: insert returned no row');

    logger.info(
      { importId, userId, jobId: inserted.id, revision: inserted.revision, force },
      'job.enqueued',
    );
    return { jobId: inserted.id, revision: inserted.revision };
  }

  private async assertCanEnqueue(userId: string): Promise<void> {
    const { count: globalActive, error: globalErr } = await this.client
      .from('social_video_import_jobs')
      .select('id', { count: 'exact', head: true })
      .in('status', ACTIVE_STATUSES);
    if (globalErr) throw globalErr;
    if ((globalActive ?? 0) >= this.maxQueueDepth) {
      throw new BackpressureError('QUEUE_FULL', 60);
    }

    const { count: userActive, error: userErr } = await this.client
      .from('social_video_import_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ACTIVE_STATUSES);
    if (userErr) throw userErr;
    if ((userActive ?? 0) >= this.maxActivePerUser) {
      throw new BackpressureError('USER_LIMIT', 30);
    }
  }

  // ---------------------------------------------------------------------------
  // claimNext — called by the worker via the internal /claim endpoint.
  // ---------------------------------------------------------------------------

  async claimNext(input: { workerId: string }): Promise<ClaimedJobPayload | null> {
    const { workerId } = input;
    // Retry handful of times in case another worker claims the same candidate.
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: candidate, error: pickErr } = await this.client
        .from('social_video_import_jobs')
        .select('id, attempt_count')
        .eq('status', 'queued')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (pickErr) throw pickErr;
      if (!candidate) return null;

      const now = new Date().toISOString();
      const { data: claimed, error: claimErr } = await this.client
        .from('social_video_import_jobs')
        .update({
          status: 'downloading',
          locked_at: now,
          locked_by: workerId,
          heartbeat_at: now,
          started_at: now,
          attempt_count: (candidate.attempt_count ?? 0) + 1,
        })
        .eq('id', candidate.id)
        .eq('status', 'queued') // optimistic — loses to whoever updated first
        .select('id, import_id, user_id, revision, attempt_count')
        .maybeSingle();
      if (claimErr) throw claimErr;
      if (!claimed) continue; // someone else got it; retry

      // Hydrate with import metadata the worker needs to start downloading.
      const { data: importRow, error: importErr } = await this.client
        .from('social_recipe_imports')
        .select('source_url, platform')
        .eq('id', claimed.import_id)
        .single();
      if (importErr) throw importErr;

      logger.info(
        { jobId: claimed.id, importId: claimed.import_id, workerId, attempt: claimed.attempt_count },
        'job.claimed',
      );
      return {
        jobId: claimed.id,
        importId: claimed.import_id,
        userId: claimed.user_id,
        revision: claimed.revision,
        attemptCount: claimed.attempt_count,
        sourceUrl: importRow.source_url,
        platform: importRow.platform,
      };
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // recordProgress — heartbeat + optional progress bump.
  // ---------------------------------------------------------------------------

  async recordProgress(input: {
    jobId: string;
    progress: number;
    status?: 'downloading' | 'analyzing';
  }): Promise<void> {
    const { jobId, progress, status } = input;
    const patch: Record<string, unknown> = {
      heartbeat_at: new Date().toISOString(),
      progress: clamp(progress, 0, 100),
    };
    if (status) patch.status = status;

    const { data, error } = await this.client
      .from('social_video_import_jobs')
      .update(patch)
      .eq('id', jobId)
      .in('status', ['downloading', 'analyzing']) // only active jobs heartbeat
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      // Either the job doesn't exist or it's already terminal. Treat as 404 —
      // routes turn this into an HTTP 404 so the worker can stop heartbeating.
      throw new JobNotFoundError(jobId);
    }
  }

  // ---------------------------------------------------------------------------
  // recordCompletion — terminal transition. PR2 path:
  //   ok=true  + acquisition (no understanding) → job 'analyzing', import 'video_processing'
  //   ok=false → job 'failed', import status mapped via importStatusFromFailure()
  //
  // PR3 will swap the no-op analysis: worker calls /complete with
  // understanding present → job 'draft_ready', import 'draft_ready' or
  // 'needs_review' depending on confidence.
  // ---------------------------------------------------------------------------

  async recordCompletion(input: {
    jobId: string;
    result: CompletionResult;
  }): Promise<void> {
    const { jobId, result } = input;

    // Load current job to know its import_id + verify lockable state.
    const { data: job, error: loadErr } = await this.client
      .from('social_video_import_jobs')
      .select('id, import_id, status')
      .eq('id', jobId)
      .maybeSingle();
    if (loadErr) throw loadErr;
    if (!job) throw new JobNotFoundError(jobId);
    if (!ACTIVE_STATUSES.includes(job.status as SocialVideoImportJobStatus)) {
      throw new JobAlreadyTerminalError(jobId, job.status);
    }

    if (result.ok === true) {
      await this.completeSuccess(jobId, job.import_id, result);
    } else {
      await this.completeFailure(jobId, job.import_id, result);
    }
  }

  private async completeSuccess(
    jobId: string,
    importId: string,
    result: Extract<CompletionResult, { ok: true }>,
  ): Promise<void> {
    const completedAt = new Date().toISOString();
    // PR2: worker only does acquisition → understanding absent → 'analyzing'.
    // PR3+: worker also analyzes → understanding present → 'draft_ready'.
    const hasUnderstanding = !!result.understanding;
    const newJobStatus: SocialVideoImportJobStatus = hasUnderstanding ? 'draft_ready' : 'analyzing';
    const newImportStatus = hasUnderstanding ? 'draft_ready' : 'video_processing';

    const { error: jobErr } = await this.client
      .from('social_video_import_jobs')
      .update({
        status: newJobStatus,
        acquisition_method: result.acquisition.method,
        media_origin: result.acquisition.mediaOrigin,
        progress: hasUnderstanding ? 100 : 60,
        completed_at: hasUnderstanding ? completedAt : null,
        metrics: {
          duration_seconds: result.acquisition.durationSeconds ?? null,
          size_bytes: result.acquisition.sizeBytes ?? null,
          mime_type: result.acquisition.mimeType,
        },
      })
      .eq('id', jobId);
    if (jobErr) throw jobErr;

    const { error: importErr } = await this.client
      .from('social_recipe_imports')
      .update({ status: newImportStatus })
      .eq('id', importId);
    if (importErr) throw importErr;

    logger.info(
      { jobId, importId, jobStatus: newJobStatus, importStatus: newImportStatus },
      'job.completed.ok',
    );
  }

  private async completeFailure(
    jobId: string,
    importId: string,
    result: Extract<CompletionResult, { ok: false }>,
  ): Promise<void> {
    const completedAt = new Date().toISOString();
    const importStatus = SocialVideoImportQueue.importStatusFromFailure(result.errorCode);

    const { error: jobErr } = await this.client
      .from('social_video_import_jobs')
      .update({
        status: 'failed',
        error_code: result.errorCode,
        error_message: truncate(result.message, 500),
        retryable: result.retryable,
        completed_at: completedAt,
      })
      .eq('id', jobId);
    if (jobErr) throw jobErr;

    const { error: importErr } = await this.client
      .from('social_recipe_imports')
      .update({
        status: importStatus,
        error_code: result.errorCode,
        error_message: truncate(result.message, 500),
      })
      .eq('id', importId);
    if (importErr) throw importErr;

    logger.info(
      { jobId, importId, errorCode: result.errorCode, importStatus, retryable: result.retryable },
      'job.completed.failed',
    );
  }

  /**
   * Map an acquisition failure to the right end-user-facing import status.
   * `needs_upload` lets the inbox surface a "Upload the video" CTA;
   * `failed` is for terminal-and-no-user-action.
   */
  static importStatusFromFailure(
    code: VideoAcquisitionErrorCode | 'STALE' | 'INTERNAL',
  ): 'needs_upload' | 'failed' {
    switch (code) {
      case 'AUTH_REQUIRED':
      case 'PRIVATE_OR_REMOVED':
      case 'GEO_BLOCKED':
      case 'RATE_LIMITED':
      case 'DOWNLOAD_FAILED':
        return 'needs_upload';
      case 'UNSUPPORTED_URL':
      case 'TOO_LONG':
      case 'TOO_LARGE':
      case 'STALE':
      case 'INTERNAL':
        return 'failed';
    }
  }

  // ---------------------------------------------------------------------------
  // scanStale — janitor. Marks jobs whose worker stopped heartbeating.
  // ---------------------------------------------------------------------------

  async scanStale(input: { staleAfterMinutes: number }): Promise<{ marked: number }> {
    const cutoff = new Date(Date.now() - input.staleAfterMinutes * 60_000).toISOString();
    const { data, error } = await this.client
      .from('social_video_import_jobs')
      .update({
        status: 'failed',
        error_code: 'STALE',
        error_message: 'Worker stopped heartbeating',
        retryable: true,
        completed_at: new Date().toISOString(),
      })
      .in('status', ['downloading', 'analyzing'])
      .lt('heartbeat_at', cutoff)
      .select('id');
    if (error) throw error;
    const marked = data?.length ?? 0;
    if (marked > 0) logger.warn({ marked, staleAfterMinutes: input.staleAfterMinutes }, 'janitor.marked_stale');
    return { marked };
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function deriveIdempotencyKey(importId: string, revision: number, action: string): string {
  return crypto.createHash('sha256').update(`${importId}:${revision}:${action}`).digest('hex');
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max);
}
