import {
  MenuShoppingPreviewRequestSchema, StockCommandSchema, WEEK_PROPOSAL_TTL_MINUTES, WeekProposalRequestSchema, WeekProposalSchema,
} from '@smart/shared';

// V11-01 E4a: the contract of a proposed week, shared by the Menus screen and, later, the assistant.
const RECIPE = { id: '11111111-1111-4111-8111-111111111111', source: 'recipes_catalog' as const };
const request = { week_start: '2026-11-30', slots: [{ date: '2026-12-01', meal_type: 'dinner' }, { date: '2026-12-02', meal_type: 'dinner' }] };

test('a request names empty slots of one week, at most 28, never twice', () => {
  expect(WeekProposalRequestSchema.safeParse(request).success).toBe(true);
  expect(WeekProposalRequestSchema.safeParse({ ...request, week_start: '2026-12-01' }).success).toBe(false);
  expect(WeekProposalRequestSchema.safeParse({ ...request, slots: [] }).success).toBe(false);
  // E4b: recomputing a proposal keeps every choice: only kept slots, nothing to fill.
  expect(WeekProposalRequestSchema.safeParse({ ...request, slots: [], keep: [{ date: '2026-12-03', meal_type: 'dinner', recipe: RECIPE, servings: 2 }] }).success).toBe(true);
  expect(WeekProposalRequestSchema.safeParse({ ...request, slots: [...request.slots, request.slots[0]] }).success).toBe(false);
  expect(WeekProposalRequestSchema.safeParse({ ...request, slots: [{ date: '2026-12-07', meal_type: 'dinner' }] }).success).toBe(false);
  // The 28 slots of the week of Monday 30 Nov.
  const days = ['2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06'];
  const week = days.flatMap(date => ['breakfast', 'lunch', 'dinner', 'snack'].map(meal_type => ({ date, meal_type })));
  expect(WeekProposalRequestSchema.safeParse({ ...request, slots: week }).success).toBe(true);
  expect(WeekProposalRequestSchema.safeParse({ ...request, user_id: 'someone' }).success).toBe(false);
});

test('constraints, kept slots and avoided recipes are bounded; a kept slot is not also asked for', () => {
  expect(WeekProposalRequestSchema.safeParse({ ...request, servings: 4,
    constraints: { timeLimitMinutes: 30, excludedIngredients: ['poisson'], dietaryFlag: 'vegetarien', goal: 'quick' },
    keep: [{ date: '2026-12-03', meal_type: 'dinner', recipe: RECIPE, servings: 4 }], avoid: [RECIPE] }).success).toBe(true);
  expect(WeekProposalRequestSchema.safeParse({ ...request, constraints: { excludedIngredients: Array.from({ length: 11 }, (_, i) => `x${i}`) } }).success).toBe(false);
  expect(WeekProposalRequestSchema.safeParse({ ...request, constraints: { proteinFamily: 'poisson' } }).success).toBe(false);
  expect(WeekProposalRequestSchema.safeParse({ ...request, keep: [{ ...request.slots[0], recipe: RECIPE, servings: 2 }] }).success).toBe(false);
  expect(WeekProposalRequestSchema.safeParse({ ...request, servings: 21 }).success).toBe(false);
});

test('a proposal names each slot, stored nowhere: an identity, an expiry and the versions it was computed on', () => {
  expect(WEEK_PROPOSAL_TTL_MINUTES).toBe(30);
  const proposal = {
    proposal_id: 'b'.repeat(32), week_start: '2026-11-30', calculated_at: '2026-11-25T10:00:00.000Z', expires_at: '2026-11-25T10:30:00.000Z',
    menu_version: 'a'.repeat(32), context_revision: 3, profile_version: 2,
    slots: [
      { date: '2026-12-01', meal_type: 'dinner', status: 'proposed', recipe: { reference: RECIPE, name: 'Curry', image_url: null, duration_minutes: 30, servings: 4 },
        reasons: ['Prête en 30 min.'], availability: 'to_buy', missing: [{ name: 'Coriandre', quantity: 1, unit: 'botte', status: 'to_buy' }] },
      { date: '2026-12-02', meal_type: 'dinner', status: 'empty', cause: 'POOL_EXHAUSTED' },
    ],
  };
  expect(WeekProposalSchema.safeParse(proposal).success).toBe(true);
  expect(WeekProposalSchema.safeParse({ ...proposal, slots: [{ ...proposal.slots[1], cause: 'UNKNOWN' }] }).success).toBe(false);
  expect(WeekProposalSchema.safeParse({ ...proposal, proposal_id: 'x' }).success).toBe(false);
});

test('the shopping preview may carry the proposed meals of the same week', () => {
  const proposal = [{ date: '2026-12-01', meal_type: 'dinner', recipe: RECIPE, servings: 4 }];
  expect(MenuShoppingPreviewRequestSchema.safeParse({ week_start: '2026-11-30' }).success).toBe(true);
  expect(MenuShoppingPreviewRequestSchema.safeParse({ week_start: '2026-11-30', proposal }).success).toBe(true);
  expect(MenuShoppingPreviewRequestSchema.safeParse({ week_start: '2026-11-30', proposal: [{ ...proposal[0], date: '2026-12-08' }] }).success).toBe(false);
  expect(MenuShoppingPreviewRequestSchema.safeParse({ week_start: '2026-11-30', proposal: [proposal[0], proposal[0]] }).success).toBe(false);
});

test('validating a proposal is an update_menu that names the profile and expiry it was computed with', () => {
  const command = { command_id: '22222222-2222-4222-8222-222222222222', command_type: 'update_menu', payload_version: 1,
    payload: { operations: [{ op: 'set', date: '2026-12-01', meal_type: 'dinner', recipe: RECIPE, servings: 4, expected_version: null }],
      proposal: { profile_version: 2, expires_at: '2026-11-25T10:30:00.000Z' } } };
  expect(StockCommandSchema.safeParse(command).success).toBe(true);
  expect(StockCommandSchema.safeParse({ ...command, payload: { ...command.payload, proposal: { profile_version: 2, expires_at: 'demain' } } }).success).toBe(false);
  expect(StockCommandSchema.safeParse({ ...command, payload: { operations: command.payload.operations } }).success).toBe(true);
});

test('an impossible calendar date is refused everywhere a slot is named', () => {
  // 2026-02-31 would read as 3 March: the slot would escape the check of taken slots.
  expect(WeekProposalRequestSchema.safeParse({ week_start: '2026-03-02', slots: [{ date: '2026-02-31', meal_type: 'dinner' }] }).success).toBe(false);
  expect(WeekProposalRequestSchema.safeParse({ week_start: '2026-03-02', slots: [{ date: '2026-03-03', meal_type: 'dinner' }],
    keep: [{ date: '2026-03-32', meal_type: 'lunch', recipe: RECIPE, servings: 2 }] }).success).toBe(false);
  expect(MenuShoppingPreviewRequestSchema.safeParse({ week_start: '2026-03-02', proposal: [{ date: '2026-02-31', meal_type: 'dinner', recipe: RECIPE, servings: 2 }] }).success).toBe(false);
});
