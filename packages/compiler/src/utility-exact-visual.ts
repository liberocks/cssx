import { EXACT_BORDER_DECLARATIONS } from './utility-exact-border';
import { EXACT_CONTROL_DECLARATIONS } from './utility-exact-control';
import { EXACT_INTERACTION_DECLARATIONS } from './utility-exact-interaction';
import { EXACT_SCROLL_DECLARATIONS } from './utility-exact-scroll';
import { EXACT_SHADOW_DECLARATIONS } from './utility-exact-shadow';
import { EXACT_TEXT_FLOW_DECLARATIONS } from './utility-exact-text-flow';
import { EXACT_TRANSITION_DECLARATIONS } from './utility-exact-transition';
import type { UtilityDeclaration } from './utility-types';

/** Exact visual utility declarations that need no runtime value resolution. */
export const EXACT_VISUAL_DECLARATIONS: Readonly<Record<string, readonly UtilityDeclaration[]>> = {
  ...EXACT_INTERACTION_DECLARATIONS,
  ...EXACT_SCROLL_DECLARATIONS,
  ...EXACT_CONTROL_DECLARATIONS,
  ...EXACT_BORDER_DECLARATIONS,
  ...EXACT_SHADOW_DECLARATIONS,
  ...EXACT_TRANSITION_DECLARATIONS,
  ...EXACT_TEXT_FLOW_DECLARATIONS,
};
