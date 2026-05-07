import { SocialImportService } from '../services/imports/SocialImportService';
import {
  ImportInvalidStateError,
  ImportNotFoundError,
  NoDraftAvailableError,
  SaveFailedError,
} from '../services/imports/importErrors';

const baseRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'imp-1',
  user_id: 'user-a',
  platform: 'instagram',
  source_url: 'https://www.instagram.com/reel/abc/',
  canonical_url: 'https://instagram.com/reel/abc',
  source_hash: 'h',
  status: 'draft_ready',
  title: 'Pates carbonara',
  author_name: 'Chef',
  author_handle: null,
  thumbnail_url: null,
  metadata: {},
  error_code: null,
  error_message: null,
  confidence: 0.85,
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
    findCurrentDraft: jest.fn().mockResolvedValue({
      id: 'draft-1',
      import_id: 'imp-1',
      user_id: 'user-a',
      draft_json: validDraft(),
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
      Promise.resolve(baseRow({ status: fields.status, recipe_id: fields.recipe_id }))
    ),
    insertNewDraft: jest.fn(),
    transitionToExtracting: jest.fn(),
    list: jest.fn(),
    insertCaptured: jest.fn(),
    findByHash: jest.fn(),
    patch: jest.fn(),
    ...overrides,
  } as any;
}

const fakeClient = {} as any;

describe('SocialImportService.save (PRP-220.11)', () => {
  it('throws ImportNotFoundError when import does not exist', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const svc = new SocialImportService(repo, {
      saveImportedDraftAsRecipe: jest.fn().mockResolvedValue('rec-1'),
    });
    await expect(svc.save(fakeClient, 'user-a', 'imp-1')).rejects.toBeInstanceOf(ImportNotFoundError);
  });

  it('throws ImportInvalidStateError when status is already saved', async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(baseRow({ status: 'saved' })),
    });
    const svc = new SocialImportService(repo, {
      saveImportedDraftAsRecipe: jest.fn(),
    });
    await expect(svc.save(fakeClient, 'user-a', 'imp-1')).rejects.toBeInstanceOf(ImportInvalidStateError);
  });

  it('throws ImportInvalidStateError when status is archived', async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(baseRow({ status: 'archived' })),
    });
    const svc = new SocialImportService(repo, {
      saveImportedDraftAsRecipe: jest.fn(),
    });
    await expect(svc.save(fakeClient, 'user-a', 'imp-1')).rejects.toBeInstanceOf(ImportInvalidStateError);
  });

  it('throws NoDraftAvailableError when no body draft and no current draft on disk', async () => {
    const repo = makeRepo({
      findCurrentDraft: jest.fn().mockResolvedValue(null),
    });
    const svc = new SocialImportService(repo, {
      saveImportedDraftAsRecipe: jest.fn().mockResolvedValue('rec-1'),
    });
    await expect(svc.save(fakeClient, 'user-a', 'imp-1')).rejects.toBeInstanceOf(NoDraftAvailableError);
  });

  it('happy path with stored draft: persists recipe + flips status to saved', async () => {
    const repo = makeRepo();
    const saveImpl = jest.fn().mockResolvedValue('rec-42');
    const svc = new SocialImportService(repo, { saveImportedDraftAsRecipe: saveImpl });

    const result = await svc.save(fakeClient, 'user-a', 'imp-1');

    expect(saveImpl).toHaveBeenCalledTimes(1);
    expect(saveImpl.mock.calls[0][1]).toBe('user-a');
    expect(saveImpl.mock.calls[0][3]).toMatchObject({ importId: 'imp-1' });
    expect(repo.updateLifecycle).toHaveBeenCalledWith('user-a', 'imp-1', expect.objectContaining({
      status: 'saved',
      recipe_id: 'rec-42',
    }));
    expect(result.recipeId).toBe('rec-42');
    expect(result.import.status).toBe('saved');
  });

  it('uses the body draft when supplied and persists it as a new version', async () => {
    const repo = makeRepo();
    const editedDraft = { ...validDraft(), title: 'Edited title' };
    const saveImpl = jest.fn().mockResolvedValue('rec-99');
    const svc = new SocialImportService(repo, { saveImportedDraftAsRecipe: saveImpl });

    await svc.save(fakeClient, 'user-a', 'imp-1', { draft: editedDraft });

    expect(repo.insertNewDraft).toHaveBeenCalledWith(
      expect.objectContaining({ importId: 'imp-1', userId: 'user-a' })
    );
    expect(saveImpl.mock.calls[0][2].title).toBe('Edited title');
  });

  it('rejects an invalid body draft with SaveFailedError', async () => {
    const repo = makeRepo();
    const svc = new SocialImportService(repo, {
      saveImportedDraftAsRecipe: jest.fn().mockResolvedValue('rec-1'),
    });
    await expect(
      svc.save(fakeClient, 'user-a', 'imp-1', { draft: { title: '' } })
    ).rejects.toBeInstanceOf(SaveFailedError);
    expect(repo.updateLifecycle).not.toHaveBeenCalled();
  });

  it('rejects a stored draft that fails revalidation', async () => {
    const repo = makeRepo({
      findCurrentDraft: jest.fn().mockResolvedValue({
        id: 'd1',
        import_id: 'imp-1',
        user_id: 'user-a',
        draft_json: { title: '' /* invalid */ },
        version: 1,
        is_current: true,
        source_extraction_method: null,
        ai_model: null,
        ai_input_tokens: null,
        ai_output_tokens: null,
        cost_usd_estimate: null,
        created_at: '2026-05-07T00:00:00.000Z',
      }),
    });
    const svc = new SocialImportService(repo, {
      saveImportedDraftAsRecipe: jest.fn().mockResolvedValue('rec-1'),
    });
    await expect(svc.save(fakeClient, 'user-a', 'imp-1')).rejects.toBeInstanceOf(SaveFailedError);
  });

  it('surfaces SaveFailedError when the persistor throws', async () => {
    const repo = makeRepo();
    const svc = new SocialImportService(repo, {
      saveImportedDraftAsRecipe: jest.fn().mockRejectedValue(new Error('db down')),
    });
    await expect(svc.save(fakeClient, 'user-a', 'imp-1')).rejects.toBeInstanceOf(SaveFailedError);
    // Status remains unchanged: we don't update to "saved" on failure.
    expect(repo.updateLifecycle).not.toHaveBeenCalled();
  });

  it('throws when no saveImportedDraftAsRecipe is wired (default is NotImplemented)', async () => {
    const repo = makeRepo();
    const svc = new SocialImportService(repo);
    await expect(svc.save(fakeClient, 'user-a', 'imp-1')).rejects.toBeInstanceOf(SaveFailedError);
  });
});
