import { apiPost } from '@/lib/api';
import { fetchWeekProposal } from '../weekProposal';

// V11-01 E4b: the proposal is read for the signed-in account and checked before it is shown.
const OWNER = '00000000-0000-4000-8000-000000000001';
jest.mock('@/lib/api', () => ({ apiPost: jest.fn(), ApiError: class extends Error {
  status: number; code?: string;
  constructor(message: string, options: { status: number; code?: string }) { super(message); this.status = options.status; this.code = options.code; }
} }));
const request = { week_start: '2026-11-30', slots: [{ date: '2026-12-01', meal_type: 'dinner' as const }] };
const proposal = { proposal_id: 'b'.repeat(32), week_start: '2026-11-30', calculated_at: '2026-11-30T09:00:00.000Z', expires_at: '2026-11-30T09:30:00.000Z',
  menu_version: 'a'.repeat(32), context_revision: 1, profile_version: 3, slots: [{ date: '2026-12-01', meal_type: 'dinner', status: 'empty', cause: 'POOL_EXHAUSTED' }] };
beforeEach(() => jest.clearAllMocks());

test('a valid request is sent for its owner; the answer is checked', async () => {
  jest.mocked(apiPost).mockResolvedValueOnce(proposal);
  const controller = new AbortController();
  await expect(fetchWeekProposal(OWNER, request, controller.signal)).resolves.toEqual(proposal);
  expect(apiPost).toHaveBeenCalledWith('/v1/menus/week-proposal', request, { expectedUserId: OWNER, signal: controller.signal });
});

test.each([
  ['a malformed answer', { ...proposal, proposal_id: 'x' }],
  ['another week', { ...proposal, week_start: '2026-12-07' }],
])('%s is refused, never shown', async (_label, answer) => {
  jest.mocked(apiPost).mockResolvedValueOnce(answer);
  await expect(fetchWeekProposal(OWNER, request)).rejects.toMatchObject({ code: 'INVALID_WEEK_PROPOSAL', status: 503 });
});

test('a request the contract refuses is never sent, and says so in words', async () => {
  await expect(fetchWeekProposal(OWNER, { ...request, slots: [] })).rejects.toMatchObject({ status: 400, code: 'INVALID_WEEK_PROPOSAL_REQUEST',
    message: 'Ces réglages ne peuvent pas être envoyés : vérifie-les, puis propose à nouveau.' });
  expect(apiPost).not.toHaveBeenCalled();
});
