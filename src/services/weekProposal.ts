/**
 * V11-01 E4b — the proposed week, read from the API (POST /v1/menus/week-proposal, E4a): nothing is
 * written; the request is checked before it is sent and the answer before it is shown.
 */
import { WeekProposalRequestSchema, WeekProposalSchema, type WeekProposal, type WeekProposalRequest } from '@smart/shared';
import { ApiError, apiPost } from '@/lib/api';

export async function fetchWeekProposal(owner: string, input: WeekProposalRequest, signal?: AbortSignal): Promise<WeekProposal> {
  const parsed = WeekProposalRequestSchema.safeParse(input);
  // Never a raw validation dump on screen: the request is refused in words, before it is sent.
  if (!parsed.success) throw new ApiError('Ces réglages ne peuvent pas être envoyés : vérifie-les, puis propose à nouveau.', { status: 400, code: 'INVALID_WEEK_PROPOSAL_REQUEST' });
  const request = parsed.data;
  const result = await apiPost<unknown>('/v1/menus/week-proposal', request, { expectedUserId: owner, signal });
  const checked = WeekProposalSchema.safeParse(result);
  if (!checked.success || checked.data.week_start !== request.week_start) {
    throw new ApiError('La proposition reçue ne correspond pas à cette semaine. Réessaie.', { status: 503, code: 'INVALID_WEEK_PROPOSAL' });
  }
  return checked.data;
}
