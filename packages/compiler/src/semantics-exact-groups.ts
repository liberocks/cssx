import { EXACT_INTERACTION_GROUPS } from './exact-interaction-groups';
import { EXACT_LAYOUT_GROUPS } from './exact-layout-groups';
import { EXACT_MOTION_GROUPS } from './exact-motion-groups';
import { EXACT_PAINT_GROUPS } from './exact-paint-groups';
import { EXACT_TYPOGRAPHY_GROUPS } from './exact-typography-groups';

/** Semantic group data for an exactly matched utility. */
export interface GroupDefinition {
  /** Primary semantic write group. */
  readonly group: string;
  /** Optional groups that this utility clears. */
  readonly conflicts?: readonly string[];
}

/** Exact utility-to-group table composed from focused semantic families. */
export const EXACT_GROUPS: Readonly<Record<string, GroupDefinition>> = {
  ...EXACT_LAYOUT_GROUPS,
  ...EXACT_PAINT_GROUPS,
  ...EXACT_MOTION_GROUPS,
  ...EXACT_TYPOGRAPHY_GROUPS,
  ...EXACT_INTERACTION_GROUPS,
};
