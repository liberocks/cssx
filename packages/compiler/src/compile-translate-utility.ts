import type { CssxTheme } from './theme';
import { resolveDimensionValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles axis-specific and shared translation utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @param theme Active resolved theme.
 * @returns Translation declarations, or null when unsupported.
 */
export function compileTranslateUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration[] | null {
  const translate = /^(translate-x|translate-y|translate-z)-(.+)$/.exec(utility);
  if (translate) {
    const axis = `--cssx-${translate[1]}`;
    const value = resolveDimensionValue(translate[2]!, negative, theme, 'translate');
    if (!value) {
      return null;
    }
    return [
      { property: axis, value },
      {
        property: 'translate',
        value: 'var(--cssx-translate-x, 0) var(--cssx-translate-y, 0) var(--cssx-translate-z, 0)',
      },
    ];
  }
  const translateBoth = /^translate-(.+)$/.exec(utility);
  if (translateBoth) {
    const value = resolveDimensionValue(translateBoth[1]!, negative, theme, 'translate');
    return value
      ? [
          { property: '--cssx-translate-x', value },
          { property: '--cssx-translate-y', value },
          {
            property: 'translate',
            value: 'var(--cssx-translate-x, 0) var(--cssx-translate-y, 0) var(--cssx-translate-z, 0)',
          },
        ]
      : null;
  }
  return null;
}
