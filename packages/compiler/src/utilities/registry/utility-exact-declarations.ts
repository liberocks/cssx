import { EXACT_LAYOUT_DECLARATIONS } from './utility-exact-layout';
import { EXACT_VISUAL_DECLARATIONS } from './utility-exact-visual';
import type { UtilityDeclaration } from './utility-types';

/** Complete exact-utility declaration table composed from layout and visual data. */
export const EXACT_DECLARATIONS: Readonly<Record<string, readonly UtilityDeclaration[]>> = {
  ...EXACT_LAYOUT_DECLARATIONS,
  ...EXACT_VISUAL_DECLARATIONS,
};
