import { compileAnimationControlUtility } from './compile-animation-control-utility';
import { compileAnimationNameUtility } from './compile-animation-name-utility';
import { compileAnimationTimingUtility } from './compile-animation-timing-utility';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves animation name, timing, iteration, direction, fill, and state utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the candidate is negated.
 * @param theme Active resolved theme.
 * @returns The animation longhand declaration, or null when unsupported.
 */
export function compileAnimationLonghandUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration | null {
  return (
    compileAnimationNameUtility(utility, negative, theme) ??
    compileAnimationTimingUtility(utility, negative, theme) ??
    compileAnimationControlUtility(utility, negative)
  );
}
