/**
 * Unit tests for the PRP-220.19 count helpers on SocialImportRepository.
 * Stubs the Supabase chain since these methods only call the query
 * builder, never raw SQL.
 */
import { SocialImportRepository } from '../services/imports/SocialImportRepository';

interface QueryStub {
  select: jest.Mock;
  eq: jest.Mock;
  not: jest.Mock;
  // Final resolution helpers
  countResult?: { count: number; error: null } | { count: null; error: { message: string } };
  selectResult?: { data: Array<{ platform: string; status: string }>; error: null } | { data: null; error: { message: string } };
}

function makeClient(stub: QueryStub) {
  const chain: any = {
    select: stub.select,
    eq: stub.eq,
    not: stub.not,
    then: undefined,
  };
  return {
    from: jest.fn(() => chain),
  };
}

describe('SocialImportRepository counts (PRP-220.19)', () => {
  describe('countActive', () => {
    it('returns count from Supabase head=true query', async () => {
      const eq = jest.fn().mockReturnThis();
      const not = jest.fn().mockResolvedValue({ count: 7, error: null });
      const select = jest.fn().mockImplementation(function (this: any) {
        return { eq, not };
      });
      eq.mockImplementation(() => ({ eq, not }));
      const client = { from: jest.fn(() => ({ select })) } as any;
      const repo = new SocialImportRepository(client);
      const n = await repo.countActive('user-a');
      expect(n).toBe(7);
      expect(select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
      expect(not).toHaveBeenCalledWith('status', 'in', '(archived,saved)');
    });

    it('returns 0 when count is null', async () => {
      const eq = jest.fn().mockReturnThis();
      const not = jest.fn().mockResolvedValue({ count: null, error: null });
      const select = jest.fn(() => ({ eq, not }));
      eq.mockImplementation(() => ({ eq, not }));
      const repo = new SocialImportRepository({ from: () => ({ select }) } as any);
      expect(await repo.countActive('user-a')).toBe(0);
    });

    it('throws when Supabase returns an error', async () => {
      const eq = jest.fn().mockReturnThis();
      const not = jest.fn().mockResolvedValue({ count: null, error: { message: 'db down' } });
      const select = jest.fn(() => ({ eq, not }));
      eq.mockImplementation(() => ({ eq, not }));
      const repo = new SocialImportRepository({ from: () => ({ select }) } as any);
      await expect(repo.countActive('user-a')).rejects.toEqual({ message: 'db down' });
    });
  });

  describe('countByGroupings', () => {
    it('aggregates rows by platform and by status, computes active', async () => {
      const rows = [
        { platform: 'instagram', status: 'captured' },
        { platform: 'instagram', status: 'saved' },
        { platform: 'tiktok', status: 'needs_review' },
        { platform: 'youtube', status: 'archived' },
        { platform: 'instagram', status: 'draft_ready' },
      ];
      const eq = jest.fn().mockResolvedValue({ data: rows, error: null });
      const select = jest.fn(() => ({ eq }));
      const repo = new SocialImportRepository({ from: () => ({ select }) } as any);

      const out = await repo.countByGroupings('user-a');
      expect(out.total).toBe(5);
      // active = anything that isn't archived or saved
      expect(out.active).toBe(3);
      expect(out.byPlatform).toEqual({ instagram: 3, tiktok: 1, youtube: 1 });
      expect(out.byStatus).toEqual({
        captured: 1,
        saved: 1,
        needs_review: 1,
        archived: 1,
        draft_ready: 1,
      });
    });

    it('returns zeroed shape on empty data', async () => {
      const eq = jest.fn().mockResolvedValue({ data: [], error: null });
      const select = jest.fn(() => ({ eq }));
      const repo = new SocialImportRepository({ from: () => ({ select }) } as any);
      const out = await repo.countByGroupings('user-a');
      expect(out).toEqual({ total: 0, active: 0, byPlatform: {}, byStatus: {} });
    });
  });
});
