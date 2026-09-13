import type { CssxTheme } from './theme';
import { resolveSpacingValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/** CSS properties written by padding, margin, and gap utilities. */
const BOX_SPACING_PROPERTIES: Readonly<Record<string, readonly string[]>> = {
  p: ['padding'],
  px: ['padding-left', 'padding-right'],
  py: ['padding-top', 'padding-bottom'],
  pt: ['padding-top'],
  pr: ['padding-right'],
  pb: ['padding-bottom'],
  pl: ['padding-left'],
  ps: ['padding-inline-start'],
  pe: ['padding-inline-end'],
  pbs: ['padding-block-start'],
  pbe: ['padding-block-end'],
  m: ['margin'],
  mx: ['margin-left', 'margin-right'],
  my: ['margin-top', 'margin-bottom'],
  mt: ['margin-top'],
  mr: ['margin-right'],
  mb: ['margin-bottom'],
  ml: ['margin-left'],
  ms: ['margin-inline-start'],
  me: ['margin-inline-end'],
  mbs: ['margin-block-start'],
  mbe: ['margin-block-end'],
  gap: ['gap'],
  'gap-x': ['column-gap'],
  'gap-y': ['row-gap'],
};

/**
 * Resolves padding, margin, and gap utilities from the spacing scale.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the candidate is negated.
 * @param theme Active resolved theme.
 * @returns Spacing declarations, or null when this utility belongs elsewhere.
 */
export function compileBoxSpacingUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration[] | null {
  const match = /^(px|py|pt|pr|pb|pl|ps|pe|pbs|pbe|p|mx|my|mt|mr|mb|ml|ms|me|mbs|mbe|m|gap-x|gap-y|gap)-(.+)$/.exec(
    utility,
  );
  if (!match) {
    return null;
  }
  const prefix = match[1]!;
  const rawValue = match[2]!;
  const value =
    rawValue === 'auto' && prefix.startsWith('m') && !negative
      ? 'auto'
      : resolveSpacingValue(rawValue, negative, theme);
  if (!value) {
    return null;
  }
  return BOX_SPACING_PROPERTIES[prefix]!.map((property) => ({ property, value }));
}
