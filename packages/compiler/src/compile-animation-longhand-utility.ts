import { arbitraryValue } from './arbitrary-value';
import { negateCssValue } from './negate-css-value';
import { resolveEasing } from './resolve-easing';
import { resolveTime } from './resolve-time';
import type { CssxTheme } from './theme';
import { resolveArbitraryCssValue } from './utility-resolvers';
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
  const name = /^animation-name-(.+)$/.exec(utility);
  if (name) {
    const raw = name[1]!;
    if (negative) {
      return null;
    }
    if (raw === 'none') {
      return { property: 'animation-name', value: 'none' };
    }
    if (raw.startsWith('[') && raw.endsWith(']')) {
      return { property: 'animation-name', value: resolveArbitraryCssValue(raw) };
    }
    return theme.keyframes[raw] ? { property: 'animation-name', value: raw } : null;
  }

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
  if (easing) {
    const value = resolveEasing(easing[1]!, theme, true);
    return !negative && value ? { property: 'animation-timing-function', value } : null;
  }
  const iterations = /^animation-iterations-(.+)$/.exec(utility);
  if (iterations) {
    const raw = iterations[1]!;
    const value = raw === 'infinite' || /^\d+(?:\.\d+)?$/.test(raw) ? raw : arbitraryValue(raw);
    return !negative && value ? { property: 'animation-iteration-count', value } : null;
  }
  const direction = /^animation-direction-(normal|reverse|alternate|alternate-reverse)$/.exec(utility);
  if (direction) {
    return !negative ? { property: 'animation-direction', value: direction[1]! } : null;
  }
  const fill = /^animation-fill-(none|forwards|backwards|both)$/.exec(utility);
  if (fill) {
    return !negative ? { property: 'animation-fill-mode', value: fill[1]! } : null;
  }
  const playState = /^animation-(running|paused)$/.exec(utility);
  if (playState) {
    return !negative ? { property: 'animation-play-state', value: playState[1]! } : null;
  }
  const composition = /^animation-composition-(replace|add|accumulate)$/.exec(utility);
  return composition && !negative ? { property: 'animation-composition', value: composition[1]! } : null;
}
