import { compileAspectUtility } from './compile-aspect-utility';
import { compileCoreLayoutExactUtility } from './compile-core-layout-exact-utility';
import { compileCursorUtility } from './compile-cursor-utility';
import { compileGridFlowUtility } from './compile-grid-flow-utility';
import { compileLogicalInsetUtility } from './compile-logical-inset-utility';
import { compileOverflowUtility } from './compile-overflow-utility';
import { compileScrollSpacingUtility } from './compile-scroll-spacing-utility';
import { compileScrollbarColorUtility } from './compile-scrollbar-color-utility';
import { compileSvgStrokeWidthUtility } from './compile-svg-stroke-width-utility';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles core layout, scrolling, interaction, grid, and SVG utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @param theme Active resolved theme.
 * @returns Layout declarations, or null when unsupported.
 */
export function compileCoreLayoutUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration | UtilityDeclaration[] | null {
  return (
    compileCoreLayoutExactUtility(utility) ??
    compileOverflowUtility(utility) ??
    compileAspectUtility(utility, negative, theme) ??
    compileLogicalInsetUtility(utility, negative, theme) ??
    compileCursorUtility(utility) ??
    compileGridFlowUtility(utility) ??
    compileScrollSpacingUtility(utility, negative, theme) ??
    compileScrollbarColorUtility(utility, theme) ??
    compileSvgStrokeWidthUtility(utility)
  );
}
