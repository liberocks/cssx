import { resolveTime } from './resolve-time';
import { staggerDelay } from './stagger-delay';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves transition, animation, and indexed stagger utility declarations.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the candidate is negated.
 * @param theme Active resolved theme.
 * @returns The stagger declaration, or null when unsupported.
 */
export function compileStaggerUtility(utility: string, negative: boolean, theme: CssxTheme): UtilityDeclaration | null {
  if (utility === 'delay-stagger' || utility === 'animation-delay-stagger') {
    if (negative) {
      return null;
    }
    return {
      property: utility === 'delay-stagger' ? 'transition-delay' : 'animation-delay',
      value: staggerDelay(),
    };
  }
  const stagger = /^stagger-(?!index-|count-)(.+)$/.exec(utility);
  if (stagger) {
    if (negative) {
      return null;
    }
    const raw = stagger[1]!;
    if (raw === 'reverse') {
      return { property: '--cssx-stagger-reverse', value: '1' };
    }
    const value = resolveTime(raw, '--stagger-', theme);
    return value ? { property: '--cssx-stagger', value } : null;
  }
  const integer = /^stagger-(index|count)-(\d+|\[\d+\])$/.exec(utility);
  if (!integer || negative) {
    return null;
  }
  return {
    property: `--cssx-stagger-${integer[1]}`,
    value: integer[2]!.replaceAll(/[\[\]]/g, ''),
  };
}
