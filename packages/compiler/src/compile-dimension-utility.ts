import { DIMENSION_PROPERTY_BY_PREFIX } from './dimension-property-by-prefix';
import type { CssxTheme } from './theme';
import { resolveDimensionValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles width, height, and logical dimension utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @param theme Active resolved theme.
 * @returns Declaration, or null when the utility is not supported here.
 */
export function compileDimensionUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration | null {
  const match = /^(w|h|min-w|max-w|min-h|max-h|inline|min-inline|max-inline|block|min-block|max-block)-(.+)$/.exec(
    utility,
  );
  if (!match) {
    return null;
  }
  const prefix = match[1]!;
  const value = resolveDimensionValue(match[2]!, negative, theme, prefix);
  if (!value) {
    return null;
  }
  const property = DIMENSION_PROPERTY_BY_PREFIX[prefix];
  return { property: property!, value };
}
