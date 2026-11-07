import { SocialImportService } from '../services/imports/SocialImportService';
import { computeLegacySourceHash, computeSourceHash } from '../services/imports/sourceHash';

describe('capture legacy source deduplication', () => {
  it('restores an archived saved import to its owned recipe receipt rather than extraction', async () => {
    const restored = { id: 'saved-import', status: 'saved', recipe_id: 'saved-recipe' };
    const repo = { findById: jest.fn().mockResolvedValue({ ...restored, status: 'archived' }),
      findSavedRecipeId: jest.fn().mockResolvedValue('saved-recipe'),
      updateLifecycle: jest.fn().mockResolvedValue(restored), patch: jest.fn() };
    expect(await new SocialImportService(repo as unknown as ConstructorParameters<typeof SocialImportService>[0]).patch('owner-a', 'saved-import', { status: 'captured' })).toBe(restored);
    expect(repo.updateLifecycle).toHaveBeenCalledWith('owner-a', 'saved-import', { status: 'saved', recipe_id: 'saved-recipe' });
    expect(repo.patch).not.toHaveBeenCalled();
  });

  it('returns a typed per-item quota refusal even when PostgREST returns a plain error object', async () => {
    const urls = ['https://example.com/recipe-a', 'https://example.com/recipe-b'];
    const repo = { findByHash: jest.fn().mockResolvedValue(null), insertCaptured: jest.fn()
      .mockResolvedValueOnce({ id: 'first', source_url: urls[0] })
      .mockRejectedValueOnce({ code: 'P0001', message: 'QUOTA_EXCEEDED' }) };
    const result = await new SocialImportService(repo as unknown as ConstructorParameters<typeof SocialImportService>[0]).bulkCapture('owner-a', urls);
    expect(result[0].result?.duplicate).toBe(false);
    expect(result[1].error).toMatchObject({ code: 'QUOTA_EXCEEDED', message: expect.stringContaining('25') });
  });

  it('reuses a historical receipt for the same canonical source without rewriting it', async () => {
    const url = 'https://youtube.com/watch?v=RecipeA';
    const legacy = { id: 'legacy', source_url: url, source_hash: computeLegacySourceHash(url) };
    const repo = { findByHash: jest.fn().mockImplementation((_owner, hash) => Promise.resolve(hash === legacy.source_hash ? legacy : null)),
      insertCaptured: jest.fn() };
    expect(await new SocialImportService(repo as unknown as ConstructorParameters<typeof SocialImportService>[0]).capture('owner-a', url)).toEqual({ import: legacy, duplicate: true });
    expect(repo.findByHash).toHaveBeenNthCalledWith(1, 'owner-a', computeSourceHash(url));
    expect(repo.insertCaptured).not.toHaveBeenCalled();
  });

  it('does not return another video merely because the old hash discarded its video id', async () => {
    const first = 'https://youtube.com/watch?v=RecipeA';
    const second = 'https://youtube.com/watch?v=RecipeB';
    const legacy = { id: 'legacy', source_url: first, source_hash: computeLegacySourceHash(first) };
    const captured = { id: 'new', source_url: second };
    const repo = { findByHash: jest.fn().mockImplementation((_owner, hash) => Promise.resolve(hash === legacy.source_hash ? legacy : null)),
      insertCaptured: jest.fn().mockResolvedValue(captured) };
    expect(await new SocialImportService(repo as unknown as ConstructorParameters<typeof SocialImportService>[0]).capture('owner-a', second)).toEqual({ import: captured, duplicate: false });
    expect(repo.insertCaptured).toHaveBeenCalledWith(expect.objectContaining({ sourceHash: computeSourceHash(second) }));
  });
});
