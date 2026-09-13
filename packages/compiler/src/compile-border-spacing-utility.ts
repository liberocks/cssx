import type { CssxTheme } from './theme';
import { resolveSpacingValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles shared and axis-specific border-spacing utilities.
 *
 * @param utility Utility name without variants or a leading negative marker.
 * @param negative Whether the utility uses a negative spacing value.
 * @param theme Active resolved theme.
 * @returns Border-spacing declarations, or null when the utility is unsupported.
 */
export function compileBorderSpacingUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration | UtilityDeclaration[] | null {
  const match = /^border-spacing(?:-(x|y))?-(.+)$/.exec(utility);
  if (!match) {
    return null;
  }

  const axis = match[1];
  const value = resolveSpacingValue(match[2]!, negative, theme);
  if (!value) {
    return null;
  }
  if (!axis) {
    return { property: 'border-spacing', value };
  }

  const variable = `--cssx-border-spacing-${axis}`;
  return [
    { property: variable, value, semanticGroup: `border-spacing-${axis}` },
    {
      property: 'border-spacing',
      value: 'var(--cssx-border-spacing-x, 0) var(--cssx-border-spacing-y, 0)',
      semanticGroup: `border-spacing-${axis}`,
    },
  ];
}
