/**
 * PRP-240 PR2 — SocialVideoImportQueue unit tests.
 *
 * Mocks the Supabase chain (same pattern as
 * SocialImportRepository.counts.test.ts). Real DB interaction is
 * covered by the manual smoke test documented in the plan.
 */
import {
  SocialVideoImportQueue,
  JobAlreadyActiveError,
  JobAlreadyTerminalError,
  JobNotFoundError,
  BackpressureError,
} from '../services/imports/SocialVideoImportQueue';
import type { VideoAcquisitionResult } from '@smart/shared';

// ---------------------------------------------------------------------------
// Mock client builder. Each `from(table)` returns a builder whose methods
// are jest.Mock chains; tests override the terminal Promise resolution.
// ---------------------------------------------------------------------------

type AnyMock = jest.Mock<any, any>;

function makeBuilder(): Record<string, AnyMock> {
  const builder: Record<string, AnyMock> = {};
  const chainable = [
    'select', 'insert', 'update', 'delete',
    'eq', 'in', 'lt', 'order', 'limit',
  ];
  for (const m of chainable) {
    builder[m] = jest.fn(() => builder);
  }
  // Terminal helpers — tests stub these directly per call.
  builder.maybeSingle = jest.fn();
  builder.single = jest.fn();
  // `await builder` resolves to whatever `then` returns (default no-op).
  (builder as any).then = undefined;
  return builder;
}

function makeClient(tables: Record<string, ReturnType<typeof makeBuilder>>) {
  return {
    from: jest.fn((table: string) => {
      if (!tables[table]) tables[table] = makeBuilder();
      return tables[table];
    }),
  } as any;
}

// ---------------------------------------------------------------------------
// enqueueJob
// ---------------------------------------------------------------------------

describe('SocialVideoImportQueue — enqueueJob', () => {
  it('inserts revision 1 on the happy path (no active, no history)', async () => {
    const jobs = makeBuilder();
    const client = makeClient({ social_video_import_jobs: jobs });

    // 1. global backpressure count = 0
    // 2. user backpressure count = 0
    // 3. active jobs lookup → []
    // 4. max revision lookup → []
    // 5. insert → returns row
    // Each .select() call resolves; we orchestrate via thenable on the chain.
    const resolutions = [
      { count: 0, error: null }, // global
      { count: 0, error: null }, // user
    ];
    jobs.select.mockImplementation(function (this: any, _cols: string, opts?: any) {
      if (opts?.count === 'exact') {
        const next = resolutions.shift()!;
        // Awaiting the builder should resolve to the count payload —
        // emulate by returning a thenable.
        return {
          ...jobs,
          in: jest.fn().mockReturnValue({
            ...jobs,
            eq: jest.fn().mockReturnValue({
              ...jobs,
              in: jest.fn().mockResolvedValue(next),
              then: (cb: any) => Promise.resolve(next).then(cb),
            }),
            then: (cb: any) => Promise.resolve(next).then(cb),
          }),
          eq: jest.fn().mockReturnValue({
            ...jobs,
            in: jest.fn().mockResolvedValue(next),
          }),
          then: (cb: any) => Promise.resolve(next).then(cb),
        };
      }
      return jobs;
    });
    // active-jobs query: .select(...).eq(...).in(...).order(...).limit(1)
    jobs.limit.mockResolvedValueOnce({ data: [], error: null }); // active
    jobs.limit.mockResolvedValueOnce({ data: [], error: null }); // max revision
    jobs.single.mockResolvedValueOnce({
      data: { id: 'job-uuid', revision: 1 },
      error: null,
    });

    const q = new SocialVideoImportQueue(client, { maxQueueDepth: 100, maxActivePerUser: 3 });
    const out = await q.enqueueJob({ importId: 'imp-1', userId: 'user-a' });

    expect(out).toEqual({ jobId: 'job-uuid', revision: 1 });
    expect(jobs.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        import_id: 'imp-1',
        user_id: 'user-a',
        revision: 1,
        status: 'queued',
        idempotency_key: expect.any(String),
      }),
    );
  });

  it('throws BackpressureError(QUEUE_FULL) when global active = limit', async () => {
    const jobs = makeBuilder();
    const client = makeClient({ social_video_import_jobs: jobs });
    jobs.select.mockImplementation(function (this: any, _cols: string, opts?: any) {
      if (opts?.count === 'exact') {
        return {
          ...jobs,
          in: jest.fn().mockResolvedValue({ count: 5, error: null }),
          eq: jest.fn().mockReturnValue({
            ...jobs,
            in: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        };
      }
      return jobs;
    });

    const q = new SocialVideoImportQueue(client, { maxQueueDepth: 5, maxActivePerUser: 3 });
    await expect(q.enqueueJob({ importId: 'imp-1', userId: 'user-a' })).rejects.toBeInstanceOf(
      BackpressureError,
    );
    await expect(
      q.enqueueJob({ importId: 'imp-1', userId: 'user-a' }),
    ).rejects.toMatchObject({ code: 'QUEUE_FULL' });
  });

  it('throws BackpressureError(USER_LIMIT) when user active = limit', async () => {
    const jobs = makeBuilder();
    const client = makeClient({ social_video_import_jobs: jobs });
    jobs.select.mockImplementation(function (this: any, _cols: string, opts?: any) {
      if (opts?.count === 'exact') {
        return {
          ...jobs,
          in: jest.fn().mockResolvedValue({ count: 0, error: null }),
          eq: jest.fn().mockReturnValue({
            ...jobs,
            in: jest.fn().mockResolvedValue({ count: 3, error: null }),
          }),
        };
      }
      return jobs;
    });

    const q = new SocialVideoImportQueue(client, { maxQueueDepth: 100, maxActivePerUser: 3 });
    await expect(q.enqueueJob({ importId: 'imp-1', userId: 'user-a' })).rejects.toMatchObject({
      code: 'USER_LIMIT',
    });
  });

  it('throws JobAlreadyActiveError when an active job exists and !force', async () => {
    const jobs = makeBuilder();
    const client = makeClient({ social_video_import_jobs: jobs });
    jobs.select.mockImplementation(function (this: any, _cols: string, opts?: any) {
      if (opts?.count === 'exact') {
        return {
          ...jobs,
          in: jest.fn().mockResolvedValue({ count: 0, error: null }),
          eq: jest.fn().mockReturnValue({
            ...jobs,
            in: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        };
      }
      return jobs;
    });
    jobs.limit.mockResolvedValueOnce({
      data: [{ id: 'existing-job', revision: 1, status: 'downloading' }],
      error: null,
    });

    const q = new SocialVideoImportQueue(client, { maxQueueDepth: 100, maxActivePerUser: 3 });
    await expect(
      q.enqueueJob({ importId: 'imp-1', userId: 'user-a', force: false }),
    ).rejects.toBeInstanceOf(JobAlreadyActiveError);
  });

  it('cancels active + inserts revision 2 when force=true', async () => {
    const jobs = makeBuilder();
    const client = makeClient({ social_video_import_jobs: jobs });
    jobs.select.mockImplementation(function (this: any, _cols: string, opts?: any) {
      if (opts?.count === 'exact') {
        return {
          ...jobs,
          in: jest.fn().mockResolvedValue({ count: 0, error: null }),
          eq: jest.fn().mockReturnValue({
            ...jobs,
            in: jest.fn().mockResolvedValue({ count: 0, error: null }),
          }),
        };
      }
      return jobs;
    });
    // 1st .limit: active-jobs lookup → existing revision 1
    jobs.limit.mockResolvedValueOnce({
      data: [{ id: 'old-job', revision: 1, status: 'downloading' }],
      error: null,
    });
    // The cancel UPDATE: .update().eq().in() — returns a thenable
    // resolving to { error: null }. Default builder.in returns builder,
    // and awaiting builder returns undefined → null error. Good enough
    // for this assertion: we verify .update() was called with cancelled.
    // 2nd .limit: max-revision lookup → returns revision 1
    jobs.limit.mockResolvedValueOnce({
      data: [{ revision: 1 }],
      error: null,
    });
    jobs.single.mockResolvedValueOnce({
      data: { id: 'new-job', revision: 2 },
      error: null,
    });

    const q = new SocialVideoImportQueue(client, { maxQueueDepth: 100, maxActivePerUser: 3 });
    const out = await q.enqueueJob({ importId: 'imp-1', userId: 'user-a', force: true });

    expect(out).toEqual({ jobId: 'new-job', revision: 2 });
    expect(jobs.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
    expect(jobs.insert).toHaveBeenCalledWith(
      expect.objectContaining({ revision: 2, status: 'queued' }),
    );
  });
});

// ---------------------------------------------------------------------------
// claimNext
// ---------------------------------------------------------------------------

describe('SocialVideoImportQueue — claimNext', () => {
  it('returns null on empty queue', async () => {
    const jobs = makeBuilder();
    const client = makeClient({ social_video_import_jobs: jobs });
    jobs.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const q = new SocialVideoImportQueue(client);
    const out = await q.claimNext({ workerId: 'worker-1' });
    expect(out).toBeNull();
  });

  it('claims a queued job and hydrates with import metadata', async () => {
    const jobs = makeBuilder();
    const imports = makeBuilder();
    const client = makeClient({
      social_video_import_jobs: jobs,
      social_recipe_imports: imports,
    });

    // candidate pick
    jobs.maybeSingle
      .mockResolvedValueOnce({ data: { id: 'job-1', attempt_count: 0 }, error: null })
      // claim update result
      .mockResolvedValueOnce({
        data: {
          id: 'job-1',
          import_id: 'imp-1',
          user_id: 'user-a',
          revision: 1,
          attempt_count: 1,
        },
        error: null,
      });
    imports.single.mockResolvedValueOnce({
      data: { source_url: 'https://www.instagram.com/reel/X/', platform: 'instagram' },
      error: null,
    });

    const q = new SocialVideoImportQueue(client);
    const out = await q.claimNext({ workerId: 'worker-1' });
    expect(out).toEqual({
      jobId: 'job-1',
      importId: 'imp-1',
      userId: 'user-a',
      revision: 1,
      attemptCount: 1,
      sourceUrl: 'https://www.instagram.com/reel/X/',
      platform: 'instagram',
    });
    expect(jobs.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'downloading',
        locked_by: 'worker-1',
        attempt_count: 1,
      }),
    );
  });

  it('retries when optimistic claim loses the race', async () => {
    const jobs = makeBuilder();
    const imports = makeBuilder();
    const client = makeClient({
      social_video_import_jobs: jobs,
      social_recipe_imports: imports,
    });

    // Attempt 1: candidate found, claim returns null (race lost)
    jobs.maybeSingle
      .mockResolvedValueOnce({ data: { id: 'job-1', attempt_count: 0 }, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
      // Attempt 2: candidate found, claim succeeds
      .mockResolvedValueOnce({ data: { id: 'job-2', attempt_count: 0 }, error: null })
      .mockResolvedValueOnce({
        data: { id: 'job-2', import_id: 'imp-2', user_id: 'user-b', revision: 1, attempt_count: 1 },
        error: null,
      });
    imports.single.mockResolvedValueOnce({
      data: { source_url: 'https://tiktok.com/@x/video/1', platform: 'tiktok' },
      error: null,
    });

    const q = new SocialVideoImportQueue(client);
    const out = await q.claimNext({ workerId: 'worker-1' });
    expect(out?.jobId).toBe('job-2');
  });
});

// ---------------------------------------------------------------------------
// recordProgress
// ---------------------------------------------------------------------------

describe('SocialVideoImportQueue — recordProgress', () => {
  it('updates heartbeat + progress on an active job', async () => {
    const jobs = makeBuilder();
    const client = makeClient({ social_video_import_jobs: jobs });
    jobs.maybeSingle.mockResolvedValueOnce({ data: { id: 'job-1' }, error: null });

    const q = new SocialVideoImportQueue(client);
    await expect(
      q.recordProgress({ jobId: 'job-1', progress: 42, status: 'downloading' }),
    ).resolves.toBeUndefined();

    expect(jobs.update).toHaveBeenCalledWith(
      expect.objectContaining({
        heartbeat_at: expect.any(String),
        progress: 42,
        status: 'downloading',
      }),
    );
  });

  it('clamps progress to [0, 100]', async () => {
    const jobs = makeBuilder();
    const client = makeClient({ social_video_import_jobs: jobs });
    jobs.maybeSingle.mockResolvedValueOnce({ data: { id: 'job-1' }, error: null });

    const q = new SocialVideoImportQueue(client);
    await q.recordProgress({ jobId: 'job-1', progress: 250 });
    expect(jobs.update).toHaveBeenCalledWith(expect.objectContaining({ progress: 100 }));
  });

  it('throws JobNotFoundError when the job is missing or already terminal', async () => {
    const jobs = makeBuilder();
    const client = makeClient({ social_video_import_jobs: jobs });
    jobs.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const q = new SocialVideoImportQueue(client);
    await expect(q.recordProgress({ jobId: 'missing', progress: 10 })).rejects.toBeInstanceOf(
      JobNotFoundError,
    );
  });
});

// ---------------------------------------------------------------------------
// recordCompletion
// ---------------------------------------------------------------------------

describe('SocialVideoImportQueue — recordCompletion', () => {
  const acquisition: VideoAcquisitionResult = {
    ok: true,
    method: 'yt_dlp',
    mediaOrigin: 'permitted_download',
    mimeType: 'video/mp4',
    durationSeconds: 42,
    sizeBytes: 7_000_000,
    metadata: {},
  };

  it('PR2 path: ok=true without understanding → job analyzing + import video_processing', async () => {
    const jobs = makeBuilder();
    const imports = makeBuilder();
    const client = makeClient({
      social_video_import_jobs: jobs,
      social_recipe_imports: imports,
    });
    jobs.maybeSingle.mockResolvedValueOnce({
      data: { id: 'job-1', import_id: 'imp-1', status: 'downloading' },
      error: null,
    });

    const q = new SocialVideoImportQueue(client);
    await q.recordCompletion({ jobId: 'job-1', result: { ok: true, acquisition } });

    expect(jobs.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'analyzing',
        acquisition_method: 'yt_dlp',
        media_origin: 'permitted_download',
        completed_at: null,
      }),
    );
    expect(imports.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'video_processing' }),
    );
  });

  it('PR3 forward-compat: ok=true with understanding → job draft_ready + import draft_ready', async () => {
    const jobs = makeBuilder();
    const imports = makeBuilder();
    const client = makeClient({
      social_video_import_jobs: jobs,
      social_recipe_imports: imports,
    });
    jobs.maybeSingle.mockResolvedValueOnce({
      data: { id: 'job-1', import_id: 'imp-1', status: 'analyzing' },
      error: null,
    });

    const q = new SocialVideoImportQueue(client);
    await q.recordCompletion({
      jobId: 'job-1',
      result: { ok: true, acquisition, understanding: { isRecipe: true, draftId: 'd-1' } },
    });

    expect(jobs.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'draft_ready', completed_at: expect.any(String) }),
    );
    expect(imports.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'draft_ready' }),
    );
  });

  it('failure with PRIVATE_OR_REMOVED → job failed, import needs_upload', async () => {
    const jobs = makeBuilder();
    const imports = makeBuilder();
    const client = makeClient({
      social_video_import_jobs: jobs,
      social_recipe_imports: imports,
    });
    jobs.maybeSingle.mockResolvedValueOnce({
      data: { id: 'job-1', import_id: 'imp-1', status: 'downloading' },
      error: null,
    });

    const q = new SocialVideoImportQueue(client);
    await q.recordCompletion({
      jobId: 'job-1',
      result: { ok: false, errorCode: 'PRIVATE_OR_REMOVED', message: 'gone', retryable: false },
    });

    expect(jobs.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', error_code: 'PRIVATE_OR_REMOVED', retryable: false }),
    );
    expect(imports.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'needs_upload', error_code: 'PRIVATE_OR_REMOVED' }),
    );
  });

  it('failure with TOO_LONG → import failed (not needs_upload — user cannot fix by uploading)', async () => {
    const jobs = makeBuilder();
    const imports = makeBuilder();
    const client = makeClient({
      social_video_import_jobs: jobs,
      social_recipe_imports: imports,
    });
    jobs.maybeSingle.mockResolvedValueOnce({
      data: { id: 'job-1', import_id: 'imp-1', status: 'downloading' },
      error: null,
    });

    const q = new SocialVideoImportQueue(client);
    await q.recordCompletion({
      jobId: 'job-1',
      result: { ok: false, errorCode: 'TOO_LONG', message: 'video > 5min', retryable: false },
    });

    expect(imports.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
  });

  it('throws JobNotFoundError when job missing', async () => {
    const jobs = makeBuilder();
    const client = makeClient({ social_video_import_jobs: jobs });
    jobs.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const q = new SocialVideoImportQueue(client);
    await expect(
      q.recordCompletion({ jobId: 'ghost', result: { ok: true, acquisition } }),
    ).rejects.toBeInstanceOf(JobNotFoundError);
  });

  it('throws JobAlreadyTerminalError on second completion attempt', async () => {
    const jobs = makeBuilder();
    const client = makeClient({ social_video_import_jobs: jobs });
    jobs.maybeSingle.mockResolvedValueOnce({
      data: { id: 'job-1', import_id: 'imp-1', status: 'failed' },
      error: null,
    });

    const q = new SocialVideoImportQueue(client);
    await expect(
      q.recordCompletion({ jobId: 'job-1', result: { ok: true, acquisition } }),
    ).rejects.toBeInstanceOf(JobAlreadyTerminalError);
  });
});

// ---------------------------------------------------------------------------
// importStatusFromFailure (static helper)
// ---------------------------------------------------------------------------

describe('SocialVideoImportQueue.importStatusFromFailure', () => {
  it('maps recoverable-with-upload codes to needs_upload', () => {
    for (const code of [
      'AUTH_REQUIRED',
      'PRIVATE_OR_REMOVED',
      'GEO_BLOCKED',
      'RATE_LIMITED',
      'DOWNLOAD_FAILED',
    ] as const) {
      expect(SocialVideoImportQueue.importStatusFromFailure(code)).toBe('needs_upload');
    }
  });

  it('maps terminal-no-recovery codes to failed', () => {
    for (const code of ['UNSUPPORTED_URL', 'TOO_LONG', 'TOO_LARGE', 'STALE', 'INTERNAL'] as const) {
      expect(SocialVideoImportQueue.importStatusFromFailure(code)).toBe('failed');
    }
  });
});

// ---------------------------------------------------------------------------
// scanStale
// ---------------------------------------------------------------------------

describe('SocialVideoImportQueue — scanStale', () => {
  it('returns count of marked jobs', async () => {
    const jobs = makeBuilder();
    const client = makeClient({ social_video_import_jobs: jobs });
    // .update().in().lt().select() chain — the terminal `.select()` resolves.
    // Default builder methods return builder; override the last select.
    jobs.select.mockReturnValueOnce(
      Promise.resolve({ data: [{ id: 'j1' }, { id: 'j2' }], error: null }) as any,
    );

    const q = new SocialVideoImportQueue(client);
    const out = await q.scanStale({ staleAfterMinutes: 10 });
    expect(out).toEqual({ marked: 2 });
    expect(jobs.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', error_code: 'STALE', retryable: true }),
    );
  });

  it('returns 0 when nothing stale', async () => {
    const jobs = makeBuilder();
    const client = makeClient({ social_video_import_jobs: jobs });
    jobs.select.mockReturnValueOnce(Promise.resolve({ data: [], error: null }) as any);

    const q = new SocialVideoImportQueue(client);
    const out = await q.scanStale({ staleAfterMinutes: 10 });
    expect(out).toEqual({ marked: 0 });
  });
});
