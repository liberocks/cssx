import type { CssxTheme } from './theme';
import { resolveSpacingValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles sibling spacing utilities with a shared reverse channel.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @param theme Active resolved theme.
 * @returns Scoped sibling declarations, or null when unsupported.
 */
export function compileSpaceUtility(utility: string, negative: boolean, theme: CssxTheme): UtilityDeclaration[] | null {
  const match = /^space-(x|y)-(.+)$/.exec(utility);
  if (!match) {
    return null;
  }
  const axis = match[1]!;
  const rawValue = match[2]!;
  const selectorSuffix = ' > :not(:last-child)';
  const semanticGroup = rawValue === 'reverse' ? `space-${axis}-reverse` : `space-${axis}`;
  const reverseProperty = `--cssx-space-${axis}-reverse`;
  if (rawValue === 'reverse') {
    return [{ property: reverseProperty, value: '1', selectorSuffix, semanticGroup }];
  }
  const value = resolveSpacingValue(rawValue, negative, theme);
  if (!value) {
    return null;
  }
  const [start, end] = axis === 'x' ? ['margin-left', 'margin-right'] : ['margin-top', 'margin-bottom'];
  return [
    { property: reverseProperty, value: '0', selectorSuffix, semanticGroup },
    { property: start, value: `calc(${value} * calc(1 - var(${reverseProperty})))`, selectorSuffix, semanticGroup },
    { property: end, value: `calc(${value} * var(${reverseProperty}))`, selectorSuffix, semanticGroup },
  ];
}
