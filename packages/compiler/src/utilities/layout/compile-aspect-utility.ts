import { resolveDimensionValue } from '../../shared/resolve-dimension-value';
import type { CssxTheme } from '../../theme/theme';
import type { UtilityDeclaration } from '../registry/utility-types';
import { resolveArbitraryCssValue } from '../values/utility-resolvers';

/**
 * Resolves arbitrary aspect ratios and shared size utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the size value is negated.
 * @param theme Active resolved theme.
 * @returns One declaration or a width/height pair, or null when unsupported.
 */
export function compileAspectUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration | UtilityDeclaration[] | null {
  const aspect = /^aspect-(\[[^\]]+\])$/.exec(utility);
  if (aspect) {
    return { property: 'aspect-ratio', value: resolveArbitraryCssValue(aspect[1]!) };
  }
  const size = /^size-(.+)$/.exec(utility);
  if (!size) {
    return null;
  }
  const value = resolveDimensionValue(size[1]!, negative, theme, 'size');
  return value
    ? [
        { property: 'width', value },
        { property: 'height', value },
      ]
    : null;
}
