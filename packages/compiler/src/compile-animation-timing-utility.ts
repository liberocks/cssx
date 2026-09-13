import { negateCssValue } from './negate-css-value';
import { resolveEasing } from './resolve-easing';
import { resolveTime } from './resolve-time';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves animation durations, delays, and easing functions.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the candidate is negated.
 * @param theme Active resolved theme.
 * @returns The timing declaration, or null when another recipe applies.
 */
export function compileAnimationTimingUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration | null {
  const time = /^animation-(duration|delay)-(.+)$/.exec(utility);
  if (time) {
    const kind = time[1]!;
    const raw = time[2]!;
    if (kind === 'duration' && raw === 'auto' && !negative) {
      return { property: 'animation-duration', value: 'auto' };
    }
    if (negative && kind === 'duration') {
      return null;
    }
    const value = resolveTime(raw, `--animation-${kind}-`, theme);
    return value ? { property: `animation-${kind}`, value: negative ? negateCssValue(value) : value } : null;
  }

  const easing = /^animation-ease-(.+)$/.exec(utility);
  if (!easing) {
    return null;
  }
  const value = resolveEasing(easing[1]!, theme, true);
  return !negative && value ? { property: 'animation-timing-function', value } : null;
}
