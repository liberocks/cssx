import type { CssxTheme } from './theme';
import { resolveArbitraryCssValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves named, arbitrary, and theme-defined animation names.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the candidate is negated.
 * @param theme Active resolved theme.
 * @returns The animation-name declaration, or null when another recipe applies.
 */
export function compileAnimationNameUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration | null {
  const match = /^animation-name-(.+)$/.exec(utility);
  if (!match || negative) {
    return null;
  }
  const raw = match[1]!;
  if (raw === 'none') {
    return { property: 'animation-name', value: 'none' };
  }
  if (raw.startsWith('[') && raw.endsWith(']')) {
    return { property: 'animation-name', value: resolveArbitraryCssValue(raw) };
  }
  return theme.keyframes[raw] ? { property: 'animation-name', value: raw } : null;
}
