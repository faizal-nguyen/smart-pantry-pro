import { SocialImportService } from '../services/imports/SocialImportService';
import {
  ExtractionFailedError,
  ImportInvalidStateError,
  ImportNotFoundError,
} from '../services/imports/importErrors';

const baseRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'imp-1',
  user_id: 'user-a',
  platform: 'instagram',
  source_url: 'https://www.instagram.com/reel/abc/',
  canonical_url: 'https://instagram.com/reel/abc',
  source_hash: 'h',
  status: 'captured',
  title: null,
  author_name: null,
  author_handle: null,
  thumbnail_url: null,
  metadata: {},
  error_code: null,
  error_message: null,
  confidence: null,
  recipe_id: null,
  created_at: '2026-05-07T00:00:00.000Z',
  updated_at: '2026-05-07T00:00:00.000Z',
  ...overrides,
});

const validDraft = () => ({
  title: 'Pates carbonara',
  ingredients: [{ name: 'pates', quantity: 200, unit: 'g' }],
  instructions: [{ step: 1, description: 'cuire' }],
  tags: [],
  source: {
    platform: 'instagram',
    sourceUrl: 'https://www.instagram.com/reel/abc/',
    importedAt: new Date().toISOString(),
    extractionMethod: 'ai_inference',
  },
  confidence: 0.85,
  extractionWarnings: [],
});

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    findById: jest.fn().mockResolvedValue(baseRow()),
    transitionToExtracting: jest.fn().mockResolvedValue(baseRow({ status: 'extracting' })),
    insertNewDraft: jest.fn().mockResolvedValue({
      id: 'draft-1',
      import_id: 'imp-1',
      user_id: 'user-a',
      draft_json: {},
      version: 1,
      is_current: true,
      source_extraction_method: 'ai_inference',
      ai_model: null,
      ai_input_tokens: null,
      ai_output_tokens: null,
      cost_usd_estimate: null,
      created_at: '2026-05-07T00:00:00.000Z',
    }),
    updateLifecycle: jest.fn((_userId: string, _id: string, fields: Record<string, unknown>) =>
      Promise.resolve(baseRow({ status: fields.status, ...fields }))
    ),
    findCurrentDraft: jest.fn(),
    list: jest.fn(),
    insertCaptured: jest.fn(),
    findByHash: jest.fn(),
    patch: jest.fn(),
    ...overrides,
  } as any;
}

describe('SocialImportService.extract (PRP-220.11)', () => {
  it('throws ImportNotFoundError when the row does not exist', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const svc = new SocialImportService(repo, {
      extractionService: { extract: jest.fn() },
    });
    await expect(svc.extract('user-a', 'imp-1')).rejects.toBeInstanceOf(ImportNotFoundError);
    expect(repo.transitionToExtracting).not.toHaveBeenCalled();
  });

  it('throws ImportInvalidStateError when transitionToExtracting returns null', async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(baseRow({ status: 'saved' })),
      transitionToExtracting: jest.fn().mockResolvedValue(null),
    });
    const svc = new SocialImportService(repo, {
      extractionService: { extract: jest.fn() },
    });
    await expect(svc.extract('user-a', 'imp-1')).rejects.toBeInstanceOf(ImportInvalidStateError);
  });

  it('happy path: persists draft + flips status to draft_ready when confidence >= 0.6', async () => {
    const repo = makeRepo();
    const extract = jest.fn().mockResolvedValue({
      draft: validDraft(),
      modelUsed: 'gpt-4o-mini',
      durationMs: 234,
      cost: { inputTokens: 100, outputTokens: 50, usd: 0.001 },
    });
    const svc = new SocialImportService(repo, { extractionService: { extract } });

    const result = await svc.extract('user-a', 'imp-1', { hint: 'use the description' });

    expect(extract).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'imp-1' }),
      { hint: 'use the description' }
    );
    expect(repo.insertNewDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        importId: 'imp-1',
        userId: 'user-a',
        sourceExtractionMethod: 'ai_inference',
        aiModel: 'gpt-4o-mini',
      })
    );
    const lastUpdate = repo.updateLifecycle.mock.calls.at(-1)![2];
    expect(lastUpdate.status).toBe('draft_ready');
    expect(lastUpdate.title).toBe('Pates carbonara');
    expect(lastUpdate.confidence).toBeCloseTo(0.85);
    expect(result.modelUsed).toBe('gpt-4o-mini');
  });

  it('flips status to needs_review when confidence < 0.6', async () => {
    const repo = makeRepo();
    const lowConfidenceDraft = { ...validDraft(), confidence: 0.4 };
    const svc = new SocialImportService(repo, {
      extractionService: { extract: jest.fn().mockResolvedValue({ draft: lowConfidenceDraft }) },
    });
    await svc.extract('user-a', 'imp-1');
    const lastUpdate = repo.updateLifecycle.mock.calls.at(-1)![2];
    expect(lastUpdate.status).toBe('needs_review');
  });

  it('marks the row failed and surfaces ExtractionFailedError when the extractor throws', async () => {
    const repo = makeRepo();
    const svc = new SocialImportService(repo, {
      extractionService: {
        extract: jest.fn().mockRejectedValue(new Error('upstream OpenAI timeout')),
      },
    });
    await expect(svc.extract('user-a', 'imp-1')).rejects.toMatchObject({
      name: 'ExtractionFailedError',
      platform: 'instagram',
    });
    const lastUpdate = repo.updateLifecycle.mock.calls.at(-1)![2];
    expect(lastUpdate.status).toBe('failed');
    expect(lastUpdate.error_code).toBe('EXTRACTION_FAILED');
    expect(lastUpdate.error_message).toContain('upstream OpenAI timeout');
  });

  it('rejects an extractor that returns an invalid draft and marks the row failed', async () => {
    const repo = makeRepo();
    const svc = new SocialImportService(repo, {
      extractionService: {
        extract: jest.fn().mockResolvedValue({ draft: { title: '' /* invalid */ } }),
      },
    });
    await expect(svc.extract('user-a', 'imp-1')).rejects.toBeInstanceOf(ExtractionFailedError);
    expect(repo.insertNewDraft).not.toHaveBeenCalled();
    const lastUpdate = repo.updateLifecycle.mock.calls.at(-1)![2];
    expect(lastUpdate.status).toBe('failed');
    expect(lastUpdate.error_code).toBe('EXTRACTION_INVALID');
  });

  it('throws when no extractionService is wired (default is NotImplemented)', async () => {
    const repo = makeRepo();
    const svc = new SocialImportService(repo);
    await expect(svc.extract('user-a', 'imp-1')).rejects.toBeInstanceOf(ExtractionFailedError);
    const lastUpdate = repo.updateLifecycle.mock.calls.at(-1)![2];
    expect(lastUpdate.status).toBe('failed');
  });
});
