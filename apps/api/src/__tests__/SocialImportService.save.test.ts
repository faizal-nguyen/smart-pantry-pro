import { SocialImportService } from '../services/imports/SocialImportService';
import {
  ImportInvalidStateError,
  ImportNotFoundError,
  NoDraftAvailableError,
  SaveFailedError,
} from '../services/imports/importErrors';
import { ImportReviewError } from '../services/imports/ImportReview';

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
  servings: 2,
  prepTimeMinutes: 5,
  cookTimeMinutes: 10,
  tags: [],
  source: {
    platform: 'instagram',
    sourceUrl: 'https://www.instagram.com/reel/abc/',
    importedAt: new Date().toISOString(),
    extractionMethod: 'transcript',
  },
  confidence: 0.85,
  extractionWarnings: [],
});

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    findById: jest.fn().mockResolvedValue(baseRow()),
    findSavedRecipeId: jest.fn().mockResolvedValue(null),
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
  } as unknown as jest.Mocked<ConstructorParameters<typeof SocialImportService>[0]>;
}

const fakeClient = {} as Parameters<SocialImportService['save']>[0];

describe('SocialImportService.save (PRP-220.11)', () => {
  it('requires reading the source even when an extraction claims a complete transcript', async () => {
    const saveImpl = jest.fn();
    await expect(new SocialImportService(makeRepo(), { saveImportedDraftAsRecipe: saveImpl })
      .save(fakeClient, 'user-a', 'imp-1')).rejects.toMatchObject({ code: 'SOURCE_REVIEW_REQUIRED' });
    expect(saveImpl).not.toHaveBeenCalled();
  });

  it('still reports incomplete culinary content after a metadata source was reviewed', async () => {
    const draft = { ...validDraft(), ingredients: [], instructions: [], source: { ...validDraft().source, extractionMethod: 'metadata' } };
    const repo = makeRepo({ findCurrentDraft: jest.fn().mockResolvedValue({ version: 1, draft_json: draft }) });
    await expect(new SocialImportService(repo).save(fakeClient, 'user-a', 'imp-1', { sourceReviewed: true }))
      .rejects.toMatchObject({ code: 'RECIPE_INCOMPLETE' });
  });

  it('shows a manually edited dietary substitution and requires its confirmation', async () => {
    const original = { ...validDraft(), ingredients: [{ name: 'porc hache', quantity: 200, unit: 'g' }] };
    const edited = { ...original, ingredients: [{ name: 'poulet hache', quantity: 200, unit: 'g' }] };
    const repo = makeRepo({ findCurrentDraft: jest.fn().mockResolvedValue({ version: 1, draft_json: original }) });
    const saveImpl = jest.fn().mockResolvedValue('rec-manual-adaptation');
    const service = new SocialImportService(repo, { saveImportedDraftAsRecipe: saveImpl });
    const review = await service.review('user-a', 'imp-1', { draft: edited, expectedRevision: 1, sourceReviewed: true });
    expect(review.adaptations).toEqual([{ path: 'ingredients.0.name', from: 'porc hache', to: 'poulet hache' }]);
    await expect(service.save(fakeClient, 'user-a', 'imp-1', { draft: edited, expectedRevision: 1, sourceReviewed: true }))
      .rejects.toMatchObject({ code: 'ADAPTATIONS_REVIEW_REQUIRED' });
    expect(saveImpl).not.toHaveBeenCalled();
    await service.save(fakeClient, 'user-a', 'imp-1', { draft: edited, expectedRevision: 1, sourceReviewed: true, acknowledgeAdaptations: true });
    expect(saveImpl.mock.calls[0][3].adaptations).toEqual(review.adaptations);
  });

  it('maps a direct database dietary refusal to a correctable review error', async () => {
    const saveImpl = jest.fn().mockRejectedValue(new Error('save_imported_recipe failed: DIETARY_REVIEW_REQUIRED'));
    await expect(new SocialImportService(makeRepo(), { saveImportedDraftAsRecipe: saveImpl })
      .save(fakeClient, 'user-a', 'imp-1', { sourceReviewed: true }))
      .rejects.toMatchObject({ code: 'DIETARY_REVIEW_REQUIRED', status: 422 });
  });

  it('reconciles a lost response without editing or saving another recipe, even with a stale revision', async () => {
    const repo = makeRepo({ findSavedRecipeId: jest.fn().mockResolvedValue('rec-42') });
    const saveImpl = jest.fn();
    const result = await new SocialImportService(repo, { saveImportedDraftAsRecipe: saveImpl })
      .save(fakeClient, 'user-a', 'imp-1', { draft: validDraft(), expectedRevision: 999 });
    expect(result).toMatchObject({ recipeId: 'rec-42', reconciled: true });
    expect(saveImpl).not.toHaveBeenCalled();
    expect(repo.insertNewDraft).not.toHaveBeenCalled();
    expect(repo.updateLifecycle).toHaveBeenCalledWith('user-a', 'imp-1', { status: 'saved', recipe_id: 'rec-42' });
  });

  it('rejects stale edits before any recipe or draft write', async () => {
    const repo = makeRepo();
    const saveImpl = jest.fn();
    const service = new SocialImportService(repo, { saveImportedDraftAsRecipe: saveImpl });
    await expect(service.save(fakeClient, 'user-a', 'imp-1', { draft: validDraft(), expectedRevision: 2 }))
      .rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    await expect(service.save(fakeClient, 'user-a', 'imp-1', { draft: validDraft() }))
      .rejects.toBeInstanceOf(ImportReviewError);
    expect(saveImpl).not.toHaveBeenCalled();
    expect(repo.insertNewDraft).not.toHaveBeenCalled();
  });

  it('keeps source, author, thumbnail and extraction receipt when the client tries to forge them', async () => {
    const repo = makeRepo();
    const saveImpl = jest.fn().mockResolvedValue('rec-source');
    const edited = { ...validDraft(), title: 'Mon nom', imageUrl: 'https://evil.example/image.png',
      confidence: 1, source: { ...validDraft().source, sourceUrl: 'https://evil.example/recipe', authorName: 'Fake' } };
    await new SocialImportService(repo, { saveImportedDraftAsRecipe: saveImpl })
      .save(fakeClient, 'user-a', 'imp-1', { draft: edited, expectedRevision: 1, sourceReviewed: true });
    expect(saveImpl.mock.calls[0][2]).toMatchObject({ title: 'Mon nom', source: {
      sourceUrl: 'https://www.instagram.com/reel/abc/', extractionMethod: 'transcript',
    }, confidence: 0.85 });
    expect(saveImpl.mock.calls[0][2].source.authorName).toBeUndefined();
    expect(saveImpl.mock.calls[0][2].imageUrl).toBeUndefined();
    expect(saveImpl.mock.calls[0][3].editProvenance.edited_fields).toEqual(['title']);
  });

  it('keeps metadata-only content as an inspiration until the source is explicitly reviewed', async () => {
    const draft = { ...validDraft(), source: { ...validDraft().source, extractionMethod: 'oembed' } };
    const repo = makeRepo({ findCurrentDraft: jest.fn().mockResolvedValue({ version: 1, draft_json: draft }) });
    const saveImpl = jest.fn().mockResolvedValue('rec-reviewed');
    const service = new SocialImportService(repo, { saveImportedDraftAsRecipe: saveImpl });
    await expect(service.save(fakeClient, 'user-a', 'imp-1')).rejects.toMatchObject({ code: 'SOURCE_REVIEW_REQUIRED' });
    expect(saveImpl).not.toHaveBeenCalled();
    expect((await service.save(fakeClient, 'user-a', 'imp-1', { sourceReviewed: true })).recipeId).toBe('rec-reviewed');
  });

  it('requires acknowledgement of unknown quantities and preserves their absence in the saved draft', async () => {
    const draft = { ...validDraft(), ingredients: [{ name: 'pates', unit: 'g' }] };
    const repo = makeRepo({ findCurrentDraft: jest.fn().mockResolvedValue({ version: 1, draft_json: draft }) });
    const saveImpl = jest.fn().mockResolvedValue('rec-unknown');
    const service = new SocialImportService(repo, { saveImportedDraftAsRecipe: saveImpl });
    await expect(service.save(fakeClient, 'user-a', 'imp-1', { sourceReviewed: true })).rejects.toMatchObject({ code: 'UNKNOWN_FIELDS_REVIEW_REQUIRED' });
    await service.save(fakeClient, 'user-a', 'imp-1', { acknowledgeUnknowns: true, sourceReviewed: true });
    expect(saveImpl.mock.calls[0][2].ingredients[0].quantity).toBeUndefined();
  });

  it('never turns an empty inspiration into a recipe, even after source and unknown acknowledgement', async () => {
    const draft = { ...validDraft(), ingredients: [], instructions: [] };
    const repo = makeRepo({ findCurrentDraft: jest.fn().mockResolvedValue({ version: 1, draft_json: draft }) });
    const saveImpl = jest.fn();
    await expect(new SocialImportService(repo, { saveImportedDraftAsRecipe: saveImpl })
      .save(fakeClient, 'user-a', 'imp-1', { sourceReviewed: true, acknowledgeUnknowns: true }))
      .rejects.toMatchObject({ code: 'RECIPE_INCOMPLETE' });
    expect(saveImpl).not.toHaveBeenCalled();
  });

  it('previews dietary adaptations without writes, then requires explicit confirmation to save them', async () => {
    const draft = { ...validDraft(), ingredients: [{ name: 'pork belly', quantity: 200, unit: 'g' }] };
    const repo = makeRepo({ findCurrentDraft: jest.fn().mockResolvedValue({ version: 1, draft_json: draft }) });
    const saveImpl = jest.fn().mockResolvedValue('rec-adapted');
    const service = new SocialImportService(repo, { saveImportedDraftAsRecipe: saveImpl });
    const review = await service.review('user-a', 'imp-1', { draft, expectedRevision: 1, sourceReviewed: true });
    expect(review.adaptations).toEqual(expect.arrayContaining([expect.objectContaining({ from: 'pork belly', to: 'boeuf gras' })]));
    expect(repo.insertNewDraft).not.toHaveBeenCalled();
    await expect(service.save(fakeClient, 'user-a', 'imp-1', { sourceReviewed: true })).rejects.toMatchObject({ code: 'ADAPTATIONS_REVIEW_REQUIRED' });
    await service.save(fakeClient, 'user-a', 'imp-1', { acknowledgeAdaptations: true, sourceReviewed: true });
    expect(saveImpl.mock.calls[0][2].ingredients[0].name).toBe('boeuf gras');
  });

  it('throws ImportNotFoundError when import does not exist', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const svc = new SocialImportService(repo, {
      saveImportedDraftAsRecipe: jest.fn().mockResolvedValue('rec-1'),
    });
    await expect(svc.save(fakeClient, 'user-a', 'imp-1', { sourceReviewed: true })).rejects.toBeInstanceOf(ImportNotFoundError);
  });

  it('does not fabricate a saved receipt when its owned recipe is missing', async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(baseRow({ status: 'saved' })),
    });
    const svc = new SocialImportService(repo, {
      saveImportedDraftAsRecipe: jest.fn(),
    });
    await expect(svc.save(fakeClient, 'user-a', 'imp-1', { sourceReviewed: true })).rejects.toMatchObject({ code: 'SAVE_RECEIPT_MISSING' });
  });

  it('throws ImportInvalidStateError when status is archived', async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(baseRow({ status: 'archived' })),
    });
    const svc = new SocialImportService(repo, {
      saveImportedDraftAsRecipe: jest.fn(),
    });
    await expect(svc.save(fakeClient, 'user-a', 'imp-1', { sourceReviewed: true })).rejects.toBeInstanceOf(ImportInvalidStateError);
  });

  it('throws NoDraftAvailableError when no body draft and no current draft on disk', async () => {
    const repo = makeRepo({
      findCurrentDraft: jest.fn().mockResolvedValue(null),
    });
    const svc = new SocialImportService(repo, {
      saveImportedDraftAsRecipe: jest.fn().mockResolvedValue('rec-1'),
    });
    await expect(svc.save(fakeClient, 'user-a', 'imp-1', { sourceReviewed: true })).rejects.toBeInstanceOf(NoDraftAvailableError);
  });

  it('happy path with stored draft: persists recipe + flips status to saved', async () => {
    const repo = makeRepo();
    const saveImpl = jest.fn().mockResolvedValue('rec-42');
    const svc = new SocialImportService(repo, { saveImportedDraftAsRecipe: saveImpl });

    const result = await svc.save(fakeClient, 'user-a', 'imp-1', { sourceReviewed: true });

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

    await svc.save(fakeClient, 'user-a', 'imp-1', { draft: editedDraft, expectedRevision: 1, sourceReviewed: true });

    expect(repo.insertNewDraft).not.toHaveBeenCalled();
    expect(saveImpl.mock.calls[0][3]).toMatchObject({ expectedRevision: 1, draftEdited: true });
    expect(saveImpl.mock.calls[0][2].title).toBe('Edited title');
  });

  it('rejects an invalid body draft with SaveFailedError', async () => {
    const repo = makeRepo();
    const svc = new SocialImportService(repo, {
      saveImportedDraftAsRecipe: jest.fn().mockResolvedValue('rec-1'),
    });
    await expect(
      svc.save(fakeClient, 'user-a', 'imp-1', { draft: { title: '' }, expectedRevision: 1, sourceReviewed: true })
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
    await expect(svc.save(fakeClient, 'user-a', 'imp-1', { sourceReviewed: true })).rejects.toBeInstanceOf(SaveFailedError);
  });

  it('surfaces SaveFailedError when the persistor throws', async () => {
    const repo = makeRepo();
    const svc = new SocialImportService(repo, {
      saveImportedDraftAsRecipe: jest.fn().mockRejectedValue(new Error('db down')),
    });
    await expect(svc.save(fakeClient, 'user-a', 'imp-1', { sourceReviewed: true })).rejects.toBeInstanceOf(SaveFailedError);
    // Status remains unchanged: we don't update to "saved" on failure.
    expect(repo.updateLifecycle).not.toHaveBeenCalled();
  });

  it('throws when no saveImportedDraftAsRecipe is wired (default is NotImplemented)', async () => {
    const repo = makeRepo();
    const svc = new SocialImportService(repo);
    await expect(svc.save(fakeClient, 'user-a', 'imp-1', { sourceReviewed: true })).rejects.toBeInstanceOf(SaveFailedError);
  });

  // ===== PRP-239 PR1b §7.4 — sanitizer is on the save path ===============
  describe('recipe policy sanitization', () => {
    function makeChainableClient(initialFacets: Record<string, unknown> = {}) {
      const state = {
        recipe_facets: initialFacets,
        updates: [] as Array<Record<string, unknown>>,
      };
      const builder: any = {
        select: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        single: jest.fn(() => Promise.resolve({ data: { recipe_facets: state.recipe_facets }, error: null })),
        update: jest.fn((payload: Record<string, unknown>) => {
          state.updates.push(payload);
          return builder;
        }),
      };
      const client = {
        from: jest.fn(() => builder),
      };
      return { client, state, builder };
    }

    const draftWithViolations = () => ({
      title: 'Test Korean Stew',
      ingredients: [
        { name: 'pork belly', quantity: 200, unit: 'g' },
        { name: 'mirin', quantity: 30, unit: 'ml', notes: 'sauce' },
      ],
      instructions: [{ step: 1, description: 'cuire' }],
      servings: 2,
      cookTimeMinutes: 10,
      tags: [],
      source: {
        platform: 'instagram',
        sourceUrl: 'https://www.instagram.com/reel/xyz/',
        importedAt: new Date().toISOString(),
        extractionMethod: 'transcript',
      },
      confidence: 0.85,
      extractionWarnings: [],
    });

    it('sanitizes the stored draft before persistence — pork belly + mirin → no porc/alcool', async () => {
      const repo = makeRepo({
        findCurrentDraft: jest.fn().mockResolvedValue({
          id: 'draft-violations',
          import_id: 'imp-1',
          user_id: 'user-a',
          draft_json: draftWithViolations(),
          version: 1,
          is_current: true,
          source_extraction_method: 'ai_inference',
          ai_model: null,
          ai_input_tokens: null,
          ai_output_tokens: null,
          cost_usd_estimate: null,
          created_at: '2026-05-21T00:00:00.000Z',
        }),
      });
      const saveImpl = jest.fn().mockResolvedValue('rec-pol-1');
      const { client } = makeChainableClient();
      const svc = new SocialImportService(repo, { saveImportedDraftAsRecipe: saveImpl });

      await svc.save(client as unknown as Parameters<SocialImportService['save']>[0], 'user-a', 'imp-1', { acknowledgeAdaptations: true, sourceReviewed: true });

      const passedDraft = saveImpl.mock.calls[0][2];
      const ingredientNames = passedDraft.ingredients.map((i: { name: string }) => i.name);
      // No porc / no alcool left in either name field.
      for (const n of ingredientNames) {
        expect(n.toLowerCase()).not.toMatch(/\bpork\b|\bporc\b|\bmirin\b|\bsake\b|\bvin\b/);
      }
      // Substitutions landed.
      expect(ingredientNames).toContain('boeuf gras');
      expect(ingredientNames.some((n: string) => n.includes('vinaigre de riz'))).toBe(true);
    });

    it('persists the sanitized draft as a new revision (audit trail)', async () => {
      const repo = makeRepo({
        findCurrentDraft: jest.fn().mockResolvedValue({
          id: 'draft-violations',
          import_id: 'imp-1',
          user_id: 'user-a',
          draft_json: draftWithViolations(),
          version: 1,
          is_current: true,
          source_extraction_method: 'ai_inference',
          ai_model: null,
          ai_input_tokens: null,
          ai_output_tokens: null,
          cost_usd_estimate: null,
          created_at: '2026-05-21T00:00:00.000Z',
        }),
      });
      const { client } = makeChainableClient();
      const saveImpl = jest.fn().mockResolvedValue('rec-pol-2');
      const svc = new SocialImportService(repo, { saveImportedDraftAsRecipe: saveImpl });

      await svc.save(client as unknown as Parameters<SocialImportService['save']>[0], 'user-a', 'imp-1', { acknowledgeAdaptations: true, sourceReviewed: true });

      expect(repo.insertNewDraft).not.toHaveBeenCalled();
      expect(saveImpl.mock.calls[0][3]).toMatchObject({ draftEdited: true, expectedRevision: 1, sourceReviewed: true });
      const ingredients: Array<{ name: string }> = saveImpl.mock.calls[0][2].ingredients;
      expect(ingredients.find((i) => i.name === 'pork belly')).toBeUndefined();
      expect(ingredients.find((i) => i.name === 'boeuf gras')).toBeDefined();
    });

    it('tags the saved recipe with quality_flags', async () => {
      const repo = makeRepo({
        findCurrentDraft: jest.fn().mockResolvedValue({
          id: 'draft-violations',
          import_id: 'imp-1',
          user_id: 'user-a',
          draft_json: draftWithViolations(),
          version: 1,
          is_current: true,
          source_extraction_method: 'ai_inference',
          ai_model: null,
          ai_input_tokens: null,
          ai_output_tokens: null,
          cost_usd_estimate: null,
          created_at: '2026-05-21T00:00:00.000Z',
        }),
      });
      const { client, state } = makeChainableClient({});
      const svc = new SocialImportService(repo, {
        saveImportedDraftAsRecipe: jest.fn().mockResolvedValue('rec-pol-3'),
      });

      await svc.save(client as unknown as Parameters<SocialImportService['save']>[0], 'user-a', 'imp-1', { acknowledgeAdaptations: true, sourceReviewed: true });

      expect(state.updates).toHaveLength(1);
      const update = state.updates[0] as { recipe_facets: { quality_flags: string[] } };
      expect(update.recipe_facets.quality_flags).toEqual(
        expect.arrayContaining(['porc_substituted', 'alcohol_removed']),
      );
    });

    it('does not persist a sanitized revision when the draft is already clean', async () => {
      const repo = makeRepo();
      const { client } = makeChainableClient();
      const svc = new SocialImportService(repo, {
        saveImportedDraftAsRecipe: jest.fn().mockResolvedValue('rec-clean'),
      });

      await svc.save(client as unknown as Parameters<SocialImportService['save']>[0], 'user-a', 'imp-1', { acknowledgeAdaptations: true, sourceReviewed: true });

      // validDraft() has only `pates` — no violation → no extra revision.
      expect(repo.insertNewDraft).not.toHaveBeenCalled();
    });

    it('does not tag the recipe when there are no quality flags', async () => {
      const repo = makeRepo();
      const { client, state } = makeChainableClient();
      const svc = new SocialImportService(repo, {
        saveImportedDraftAsRecipe: jest.fn().mockResolvedValue('rec-clean-tag'),
      });

      await svc.save(client as unknown as Parameters<SocialImportService['save']>[0], 'user-a', 'imp-1', { acknowledgeAdaptations: true, sourceReviewed: true });

      expect(state.updates).toHaveLength(0);
    });
  });
});
