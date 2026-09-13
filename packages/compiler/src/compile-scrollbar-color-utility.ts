import type { CssxTheme } from './theme';
import { resolveColorValue, resolveOpacityModifier, splitColorModifier } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves scrollbar thumb and track colors, including opacity modifiers.
 *
 * @param utility Utility name without variants.
 * @param theme Active resolved theme.
 * @returns Scrollbar declarations, or null when unsupported.
 */
export function compileScrollbarColorUtility(utility: string, theme: CssxTheme): UtilityDeclaration[] | null {
  const scrollbarColor = /^scrollbar-(thumb|track)-(.+)$/.exec(utility);
  if (!scrollbarColor) {
    return null;
  }
  const part = scrollbarColor[1]!;
  const modifier = splitColorModifier(scrollbarColor[2]!);
  const resolved = resolveColorValue(modifier.value, theme);
  if (!resolved) {
    return null;
  }
  const opacity = modifier.opacity === undefined ? null : resolveOpacityModifier(modifier.opacity);
  if (modifier.opacity !== undefined && opacity === null) {
    return null;
  }
  const value = opacity === null ? resolved : `color-mix(in srgb, ${resolved} ${opacity}%, transparent)`;
  const semanticGroup = `scrollbar-${part}`;
  return [
    { property: `--cssx-scrollbar-${part}`, value, semanticGroup },
    {
      property: 'scrollbar-color',
      value: 'var(--cssx-scrollbar-thumb, #0000) var(--cssx-scrollbar-track, #0000)',
      semanticGroup,
    },
  ];
}
