import type { CssxTheme } from './theme';
import { flexValue, resolveArbitraryCssValue, resolveDimensionValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles flex-basis and flex shorthand utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the dimension is negated.
 * @param theme Active resolved theme.
 * @returns Flex declaration, or null when unsupported.
 */
export function compilePrefixedFlexUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration | null {
  const basis = /^basis-(.+)$/.exec(utility);
  if (basis) {
    const value = resolveDimensionValue(basis[1]!, negative, theme, 'basis');
    return value ? { property: 'flex-basis', value } : null;
  }
  const flex = /^flex-(\d+(?:\/\d+)?|\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (flex) {
    const raw = flex[1]!;
    const value = raw.startsWith('[') || raw.startsWith('(') ? resolveArbitraryCssValue(raw) : flexValue(raw);
    return value ? { property: 'flex', value } : null;
  }
  return null;
}
