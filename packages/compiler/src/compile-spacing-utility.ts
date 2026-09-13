import type { CssxTheme } from './theme';
import { resolveDimensionValue, resolveSpacingValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles spacing, gap, inset, and positional utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @param theme Active resolved theme.
 * @returns Spacing declarations, or null when unsupported.
 */
export function compileSpacingUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration | UtilityDeclaration[] | null {
  const match =
    /^(px|py|pt|pr|pb|pl|ps|pe|pbs|pbe|p|mx|my|mt|mr|mb|ml|ms|me|mbs|mbe|m|gap-x|gap-y|gap|inset-x|inset-y|inset-s|inset-e|inset-bs|inset-be|inset|top|right|bottom|left)-(.+)$/.exec(
      utility,
    );
  if (!match) {
    return null;
  }
  const prefix = match[1]!;
  const rawValue = match[2]!;
  const positional = prefix.startsWith('inset') || ['top', 'right', 'bottom', 'left'].includes(prefix);
  const value = positional
    ? resolveDimensionValue(rawValue, negative, theme, 'inset')
    : rawValue === 'auto' && prefix.startsWith('m') && !negative
      ? 'auto'
      : resolveSpacingValue(rawValue, negative, theme);
  if (!value) {
    return null;
  }
  const properties: Readonly<Record<string, readonly string[]>> = {
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
  const targets = properties[prefix];
  return targets!.map((property) => ({ property, value }));
}
