import type { GroupDefinition } from './semantics-exact-groups';

/** Exact transform and transition behavior semantic groups. */
export const EXACT_MOTION_GROUPS: Readonly<Record<string, GroupDefinition>> = {
  transition: { group: 'transition-property' },
  transform: { group: 'transform' },
  'transform-none': { group: 'transform' },
  'transition-none': { group: 'transition-property' },
  'transition-normal': { group: 'transition-behavior' },
  'transition-discrete': { group: 'transition-behavior' },
};
