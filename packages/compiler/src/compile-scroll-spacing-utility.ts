import { resolveSpacingValue } from './resolve-spacing-value';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';

/** Physical and logical CSS properties written by each scroll spacing prefix. */
const SCROLL_SPACING_PROPERTIES: Readonly<Record<string, readonly string[]>> = {
  m: ['scroll-margin'],
  mx: ['scroll-margin-left', 'scroll-margin-right'],
  my: ['scroll-margin-top', 'scroll-margin-bottom'],
  mt: ['scroll-margin-top'],
  mr: ['scroll-margin-right'],
  mb: ['scroll-margin-bottom'],
  ml: ['scroll-margin-left'],
  ms: ['scroll-margin-inline-start'],
  me: ['scroll-margin-inline-end'],
  mbs: ['scroll-margin-block-start'],
  mbe: ['scroll-margin-block-end'],
  p: ['scroll-padding'],
  px: ['scroll-padding-left', 'scroll-padding-right'],
  py: ['scroll-padding-top', 'scroll-padding-bottom'],
  pt: ['scroll-padding-top'],
  pr: ['scroll-padding-right'],
  pb: ['scroll-padding-bottom'],
  pl: ['scroll-padding-left'],
  ps: ['scroll-padding-inline-start'],
  pe: ['scroll-padding-inline-end'],
  pbs: ['scroll-padding-block-start'],
  pbe: ['scroll-padding-block-end'],
};

/**
 * Resolves scroll margin and padding utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the spacing is negated.
 * @param theme Active resolved theme.
 * @returns The scroll declarations, or null when unsupported.
 */
export function compileScrollSpacingUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration[] | null {
  const scroll = /^scroll-(mx|my|mt|mr|mb|ml|ms|me|mbs|mbe|m|px|py|pt|pr|pb|pl|ps|pe|pbs|pbe|p)-(.+)$/.exec(utility);
  if (!scroll) {
    return null;
  }
  const value = resolveSpacingValue(scroll[2]!, negative, theme);
  if (!value) {
    return null;
  }
  return SCROLL_SPACING_PROPERTIES[scroll[1]!]!.map((property) => ({ property, value }));
}
