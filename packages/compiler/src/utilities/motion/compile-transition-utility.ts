import { negateCssValue } from '../../shared/negate-css-value';
import { resolveEasing } from '../../shared/resolve-easing';
import { resolveTime } from '../../shared/resolve-time';
import { transitionDeclarations } from '../../shared/transition-declarations';
import type { CssxTheme } from '../../theme/theme';
import type { UtilityDeclaration } from '../registry/utility-types';
import { resolveArbitraryCssValue } from '../values/utility-resolvers';

/** Transition properties enabled by common multi-property utilities. */
const TRANSITION_PROPERTIES: Readonly<Record<string, string>> = {
  'transition-transform-opacity': 'transform, translate, scale, rotate, opacity',
  'transition-filter': 'filter, -webkit-backdrop-filter, backdrop-filter',
  'transition-size': 'width, height, inline-size, block-size',
};

/**
 * Resolves transition-property, duration, delay, and easing utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the candidate is negated.
 * @param theme Active resolved theme.
 * @returns Transition declarations, or null when unsupported.
 */
export function compileTransitionUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration | UtilityDeclaration[] | null {
  const properties = TRANSITION_PROPERTIES[utility];
  if (properties) {
    return transitionDeclarations(properties);
  }
  const arbitrary = /^transition-(\[[\s\S]+\])$/.exec(utility);
  if (arbitrary) {
    return transitionDeclarations(resolveArbitraryCssValue(arbitrary[1]!));
  }
  const time = /^(duration|delay)-(.+)$/.exec(utility);
  if (time) {
    const kind = time[1]!;
    if (negative && kind === 'duration') {
      return null;
    }
    const value = resolveTime(time[2]!, `--${kind}-`, theme);
    return value ? { property: `transition-${kind}`, value: negative ? negateCssValue(value) : value } : null;
  }
  const easing = /^ease-(.+)$/.exec(utility);
  if (!easing) {
    return null;
  }
  const value = resolveEasing(easing[1]!, theme);
  return !negative && value ? { property: 'transition-timing-function', value } : null;
}
