import { SocialImportRepository } from '../services/imports/SocialImportRepository';

const input = { userId: 'owner-a', importId: 'import-a', draftJson: { title: 'Brouillon' }, expectedRevision: 3 };

describe('SocialImportRepository atomic revisions', () => {
  it('uses one revision-checked transaction and never clears a draft before that transaction', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: [{ user_id: 'owner-a', import_id: 'import-a', version: 4 }], error: null });
    const from = jest.fn();
    const repo = new SocialImportRepository({ rpc, from } as unknown as ConstructorParameters<typeof SocialImportRepository>[0]);
    expect((await repo.insertNewDraft(input)).version).toBe(4);
    expect(rpc).toHaveBeenCalledWith('replace_social_import_draft', expect.objectContaining({
      p_import_id: 'import-a', p_expected_revision: 3, p_draft_json: input.draftJson,
    }));
    expect(from).not.toHaveBeenCalled();
  });

  it('propagates a concurrent revision conflict without a second persistence path', async () => {
    const error = { message: 'REVISION_CONFLICT', code: 'P0001' };
    const rpc = jest.fn().mockResolvedValue({ data: null, error });
    const from = jest.fn();
    await expect(new SocialImportRepository({ rpc, from } as unknown as ConstructorParameters<typeof SocialImportRepository>[0]).insertNewDraft(input)).rejects.toBe(error);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(from).not.toHaveBeenCalled();
  });

  it('does not accept an empty or foreign receipt as an owned draft', async () => {
    for (const data of [null, [], { user_id: 'owner-b', import_id: 'import-a', version: 4 },
      { user_id: 'owner-a', import_id: 'import-b', version: 4 }]) {
      const rpc = jest.fn().mockResolvedValue({ data, error: null });
      await expect(new SocialImportRepository({ rpc } as unknown as ConstructorParameters<typeof SocialImportRepository>[0]).insertNewDraft(input)).rejects.toThrow();
    }
  });
});
