import { resolveUtilityColor } from './resolve-utility-color';
import type { CssxTheme } from './theme';
import { CSSX_SHADOW_SINK } from './utility-effect-sinks';
import { resolveBorderWidthValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves ring-offset width and color utilities.
 *
 * @param utility Utility name without variants.
 * @param theme Active resolved theme.
 * @returns Offset declarations, or null when another ring recipe applies.
 */
export function compileRingOffsetUtility(utility: string, theme: CssxTheme): UtilityDeclaration[] | null {
  const match = /^ring-offset-(.+)$/.exec(utility);
  if (!match) {
    return null;
  }
  const raw = match[1]!;
  const width = resolveBorderWidthValue(raw);
  if (width) {
    return [
      { property: '--cssx-ring-offset-width', value: width, semanticGroup: 'ring-offset-width' },
      {
        property: '--cssx-ring-offset-shadow',
        value: '0 0 0 var(--cssx-ring-offset-width) var(--cssx-ring-offset-color, #fff)',
        semanticGroup: 'ring-offset-width',
      },
      { property: 'box-shadow', value: CSSX_SHADOW_SINK, semanticGroup: 'ring-offset-width' },
    ];
  }
  const color = resolveUtilityColor(raw, theme);
  return color ? [{ property: '--cssx-ring-offset-color', value: color, semanticGroup: 'ring-offset-color' }] : null;
}
