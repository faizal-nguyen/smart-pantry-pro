/**
 * PRP-240 PR1 — Shared video-import contracts.
 *
 * Pure Zod round-trip tests. No DB, no HTTP. The schemas drive PR2
 * (downloader), PR3 (Gemini provider) and PR4 (orchestrator) so any
 * shape regression here breaks the contract every later PR depends on.
 */
import {
  ExtractionMethodSchema,
  ExtractionWarningCodeSchema,
  SocialVideoImportJobStatusSchema,
  VideoAcquisitionResultSchema,
  VideoUnderstandingResultSchema,
  type ExtractionMethod,
  type ExtractionWarningCode,
  type VideoAcquisitionResult,
  type VideoUnderstandingResult,
} from '@smart/shared';

describe('ExtractionMethodSchema — PRP-240 V2 addition', () => {
  it('accepts the new video_multimodal member', () => {
    const method: ExtractionMethod = 'video_multimodal';
    expect(ExtractionMethodSchema.parse(method)).toBe('video_multimodal');
  });

  it('still accepts the pre-existing members (no regression)', () => {
    for (const m of [
      'oembed',
      'metadata',
      'transcript',
      'manual_text',
      'screenshot_ocr',
      'voice_dictation',
      'ai_inference',
    ] as const) {
      expect(ExtractionMethodSchema.parse(m)).toBe(m);
    }
  });

  it('rejects unknown methods', () => {
    expect(() => ExtractionMethodSchema.parse('telepathy')).toThrow();
  });
});

describe('ExtractionWarningCodeSchema — PRP-240 §9.4', () => {
  it('accepts every PRP-240 warning code', () => {
    const codes: ExtractionWarningCode[] = [
      'not_a_recipe',
      'download_metadata_only',
      'schema_partial',
      'missing_quantities',
      'cost_cap_exceeded',
      'policy_rewritten',
      'low_confidence',
      'frame_persistence_blocked',
    ];
    for (const c of codes) {
      expect(ExtractionWarningCodeSchema.parse(c)).toBe(c);
    }
  });

  it('rejects unknown codes (forces enum extension when new ones appear)', () => {
    expect(() => ExtractionWarningCodeSchema.parse('hallucinated')).toThrow();
  });
});

describe('VideoAcquisitionResultSchema — discriminated union on `ok`', () => {
  it('parses a yt-dlp success payload', () => {
    const success: VideoAcquisitionResult = {
      ok: true,
      method: 'yt_dlp',
      mediaOrigin: 'permitted_download',
      localPath: '/tmp/recipe-import/abc.mp4',
      mimeType: 'video/mp4',
      durationSeconds: 42,
      sizeBytes: 12_345_678,
      metadata: { creator: '@chef', sourcePlatform: 'instagram' },
    };
    expect(VideoAcquisitionResultSchema.parse(success)).toEqual(success);
  });

  it('parses a user-upload success payload', () => {
    const success: VideoAcquisitionResult = {
      ok: true,
      method: 'user_upload',
      mediaOrigin: 'user_upload',
      storagePath: 'users/abc-uuid/imports/imp-uuid/video.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 7_000_000,
      metadata: {},
    };
    expect(VideoAcquisitionResultSchema.parse(success).ok).toBe(true);
  });

  it('parses a downloader failure with stable error code', () => {
    const failure: VideoAcquisitionResult = {
      ok: false,
      method: 'gallery_dl',
      errorCode: 'PRIVATE_OR_REMOVED',
      message: 'Video is private or has been removed.',
      retryable: false,
    };
    expect(VideoAcquisitionResultSchema.parse(failure)).toEqual(failure);
  });

  it('rejects a failure that names user_upload (failures only come from URL downloaders)', () => {
    const bad = {
      ok: false,
      method: 'user_upload',
      errorCode: 'DOWNLOAD_FAILED',
      message: 'nope',
      retryable: true,
    };
    expect(() => VideoAcquisitionResultSchema.parse(bad)).toThrow();
  });

  it('rejects an unknown errorCode', () => {
    const bad = {
      ok: false,
      method: 'yt_dlp',
      errorCode: 'CAPTCHA_REQUIRED',
      message: 'nope',
      retryable: true,
    };
    expect(() => VideoAcquisitionResultSchema.parse(bad)).toThrow();
  });
});

describe('VideoUnderstandingResultSchema — provider raw output', () => {
  const baseConfidence = { overall: 0.84 };
  const baseEvidence = {
    audioUsed: true,
    visualUsed: true,
    onscreenTextUsed: false,
    captionUsed: false,
  };

  it('parses a minimal is_recipe=true result with defaults filled', () => {
    const minimal = {
      isRecipe: true,
      confidence: baseConfidence,
      evidence: baseEvidence,
    };
    const parsed: VideoUnderstandingResult = VideoUnderstandingResultSchema.parse(minimal);
    expect(parsed.ingredients).toEqual([]);
    expect(parsed.instructions).toEqual([]);
    expect(parsed.tags).toEqual([]);
    expect(parsed.warnings).toEqual([]);
    expect(parsed.warningCodes).toEqual([]);
  });

  it('parses an is_recipe=false result without forcing draft fields', () => {
    const notRecipe = {
      isRecipe: false,
      confidence: { overall: 0.92 },
      evidence: { audioUsed: false, visualUsed: true, onscreenTextUsed: false, captionUsed: true },
      warnings: ['Pas une recette : haul de courses détecté'],
      warningCodes: ['not_a_recipe'],
    };
    const parsed = VideoUnderstandingResultSchema.parse(notRecipe);
    expect(parsed.isRecipe).toBe(false);
    expect(parsed.warningCodes).toEqual(['not_a_recipe']);
  });

  it('rejects confidence > 1', () => {
    expect(() =>
      VideoUnderstandingResultSchema.parse({
        isRecipe: true,
        confidence: { overall: 1.5 },
        evidence: baseEvidence,
      }),
    ).toThrow();
  });

  it('rejects an unknown warningCode (forces ExtractionWarningCode enum extension)', () => {
    expect(() =>
      VideoUnderstandingResultSchema.parse({
        isRecipe: true,
        confidence: baseConfidence,
        evidence: baseEvidence,
        warningCodes: ['mystery_code'],
      }),
    ).toThrow();
  });
});

describe('SocialVideoImportJobStatusSchema — mirrors DB CHECK on social_video_import_jobs', () => {
  it('accepts every worker status', () => {
    for (const s of [
      'queued',
      'downloading',
      'needs_upload',
      'analyzing',
      'draft_ready',
      'failed',
      'cancelled',
    ] as const) {
      expect(SocialVideoImportJobStatusSchema.parse(s)).toBe(s);
    }
  });

  it('rejects an unknown status (forces DB + schema to evolve together)', () => {
    expect(() => SocialVideoImportJobStatusSchema.parse('paused')).toThrow();
  });
});
