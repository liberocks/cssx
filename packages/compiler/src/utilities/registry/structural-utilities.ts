/** Structural markers used by relationship variants without emitting declarations. */
export const STRUCTURAL_UTILITY_GROUPS = {
  group: 'structural-group',
  peer: 'structural-peer',
} as const;

/** Structural conflict group to source class, used to keep markers out of CSS aliases. */
export const STRUCTURAL_UTILITY_NAMES = {
  'structural-group': 'group',
  'structural-peer': 'peer',
} as const;
