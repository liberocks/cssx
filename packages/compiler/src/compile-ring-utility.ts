import { resolveUtilityColor } from './resolve-utility-color';
import type { CssxTheme } from './theme';
import { CSSX_SHADOW_SINK } from './utility-effect-sinks';
import { resolveBorderWidthValue, resolveOpacityModifier, splitColorModifier } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles ring width, offset, and color utilities using shared shadow channels.
 *
 * @param utility Utility name without variants.
 * @param theme Active resolved theme.
 * @returns Ring declarations, or null when unsupported.
 */
export function compileRingUtility(utility: string, theme: CssxTheme): UtilityDeclaration[] | null {
  const ringOffset = /^ring-offset-(.+)$/.exec(utility);
  if (ringOffset) {
    const raw = ringOffset[1]!;
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

  const width = utility === 'ring' ? '1px' : resolveBorderWidthValue(/^ring-(.+)$/.exec(utility)?.[1] ?? '');
  if (width) {
    return [
      { property: '--cssx-ring-width', value: width, semanticGroup: 'ring-width' },
      {
        property: '--cssx-ring-shadow',
        value:
          '0 0 0 calc(var(--cssx-ring-width) + var(--cssx-ring-offset-width, 0px)) var(--cssx-ring-color, currentColor)',
        semanticGroup: 'ring-width',
      },
      { property: 'box-shadow', value: CSSX_SHADOW_SINK, semanticGroup: 'ring-width' },
    ];
  }

  const match = /^ring-(.+)$/.exec(utility);
  if (!match) {
    return null;
  }
  const modifier = splitColorModifier(match[1]!);
  const color = resolveUtilityColor(modifier.value, theme);
  if (!color) {
    return null;
  }
  const opacity = modifier.opacity === undefined ? null : resolveOpacityModifier(modifier.opacity);
  if (modifier.opacity !== undefined && opacity === null) {
    return null;
  }
  return [
    {
      property: '--cssx-ring-color',
      value: opacity === null ? color : `color-mix(in srgb, ${color} ${opacity}%, transparent)`,
      semanticGroup: 'ring-color',
    },
  ];
}
