import { compileScrollbarColorUtility } from '../../compiler/compile-scrollbar-color-utility';
import type { CssxTheme } from '../../theme/theme';
import type { UtilityDeclaration } from '../registry/utility-types';
import { compileLogicalInsetUtility } from '../spacing/compile-logical-inset-utility';
import { compileScrollSpacingUtility } from '../spacing/compile-scroll-spacing-utility';
import { compileSvgStrokeWidthUtility } from '../svg/compile-svg-stroke-width-utility';
import { compileAspectUtility } from './compile-aspect-utility';
import { compileCoreLayoutExactUtility } from './compile-core-layout-exact-utility';
import { compileCursorUtility } from './compile-cursor-utility';
import { compileGridFlowUtility } from './compile-grid-flow-utility';
import { compileOverflowUtility } from './compile-overflow-utility';

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
