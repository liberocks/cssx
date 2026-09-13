import { resolveDimensionValue } from './resolve-dimension-value';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves logical inline start and end inset utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @param theme Active resolved theme.
 * @returns The logical inset declaration, or null when unsupported.
 */
export function compileLogicalInsetUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration | null {
  const logicalInset = /^(start|end)-(.+)$/.exec(utility);
  if (!logicalInset) {
    return null;
  }
  const value = resolveDimensionValue(logicalInset[2]!, negative, theme, logicalInset[1]!);
  if (!value) {
    return null;
  }
  return { property: logicalInset[1] === 'start' ? 'inset-inline-start' : 'inset-inline-end', value };
}
