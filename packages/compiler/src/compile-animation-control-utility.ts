import { arbitraryValue } from './arbitrary-value';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves animation iteration, direction, fill, play-state, and composition controls.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the candidate is negated.
 * @returns The control declaration, or null when another recipe applies.
 */
export function compileAnimationControlUtility(utility: string, negative: boolean): UtilityDeclaration | null {
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
