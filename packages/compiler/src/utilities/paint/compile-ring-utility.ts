import type { CssxTheme } from '../../theme/theme';
import type { UtilityDeclaration } from '../registry/utility-types';
import { compileRingColorUtility } from './compile-ring-color-utility';
import { compileRingOffsetUtility } from './compile-ring-offset-utility';
import { compileRingWidthUtility } from './compile-ring-width-utility';

/**
 * Compiles ring width, offset, and color utilities using shared shadow channels.
 *
 * @param utility Utility name without variants.
 * @param theme Active resolved theme.
 * @returns Ring declarations, or null when unsupported.
 */
export function compileRingUtility(utility: string, theme: CssxTheme): UtilityDeclaration[] | null {
  return (
    compileRingOffsetUtility(utility, theme) ??
    compileRingWidthUtility(utility) ??
    compileRingColorUtility(utility, theme)
  );
}
