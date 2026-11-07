/** Manual pilot only. A source connector requires a separately qualified release. */
export const discoveryConfig = Object.freeze({
  version: 1 as const,
  mode: 'manual' as const,
  enabled: process.env.RECIPE_DISCOVERY_ENABLED !== 'false',
  automaticCollectionEnabled: false as const,
  paidProviderCallsEnabled: false as const,
  paidProviderBudgetUsd: 0 as const,
  selectionLimit: 5 as const,
  maxCreators: 30 as const,
  maxItems: 2000 as const,
  timezone: 'Europe/Paris' as const,
});
