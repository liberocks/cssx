import type { CssxTheme } from './theme';
import { resolveDimensionValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/** CSS properties written by inset and positional utilities. */
const POSITION_SPACING_PROPERTIES: Readonly<Record<string, readonly string[]>> = {
  top: ['top'],
  right: ['right'],
  bottom: ['bottom'],
  left: ['left'],
  inset: ['inset'],
  'inset-x': ['left', 'right'],
  'inset-y': ['top', 'bottom'],
  'inset-s': ['inset-inline-start'],
  'inset-e': ['inset-inline-end'],
  'inset-bs': ['inset-block-start'],
  'inset-be': ['inset-block-end'],
};

/**
 * Resolves inset and physical position utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the candidate is negated.
 * @param theme Active resolved theme.
 * @returns Position declarations, or null when this utility belongs elsewhere.
 */
export function compilePositionSpacingUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration[] | null {
  const match = /^(inset-x|inset-y|inset-s|inset-e|inset-bs|inset-be|inset|top|right|bottom|left)-(.+)$/.exec(utility);
  if (!match) {
    return null;
  }
  const value = resolveDimensionValue(match[2]!, negative, theme, 'inset');
  if (!value) {
    return null;
  }
  return POSITION_SPACING_PROPERTIES[match[1]!]!.map((property) => ({ property, value }));
}
