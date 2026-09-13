import type { CssxTheme } from './theme';
import {
  resolveBorderWidthValue,
  resolveColorValue,
  resolveOpacityModifier,
  splitColorModifier,
} from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';
import { cloneDeclarations } from './utility-values';

/**
 * Compiles outline style, width, offset, and color utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @param theme Active resolved theme.
 * @returns Outline declarations, or null when unsupported.
 */
export function compileOutlineUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration[] | null {
  const exact: Readonly<Record<string, readonly UtilityDeclaration[]>> = {
    outline: [
      { property: 'outline-style', value: 'solid' },
      { property: 'outline-width', value: '1px' },
    ],
    'outline-none': [{ property: 'outline-style', value: 'none' }],
    'outline-hidden': [
      { property: 'outline', value: '2px solid transparent' },
      { property: 'outline-offset', value: '2px' },
    ],
    'outline-solid': [{ property: 'outline-style', value: 'solid' }],
    'outline-dashed': [{ property: 'outline-style', value: 'dashed' }],
    'outline-dotted': [{ property: 'outline-style', value: 'dotted' }],
    'outline-double': [{ property: 'outline-style', value: 'double' }],
  };
  const declaration = exact[utility];
  if (declaration) {
    return cloneDeclarations(declaration);
  }

  const offset = /^outline-offset-(.+)$/.exec(utility);
  if (offset) {
    const raw = offset[1]!;
    // Numbered outline offsets are literal pixels, not spacing units.
    const value = raw === '1' ? '1px' : resolveBorderWidthValue(raw);
    if (!value) {
      return null;
    }
    const offsetValue =
      negative && value !== '0'
        ? value.startsWith('var(') || value.startsWith('calc(')
          ? `calc(${value} * -1)`
          : `-${value}`
        : value;
    return [{ property: 'outline-offset', value: offsetValue }];
  }
  const width = /^outline-(0|1|2|4|8|\[[^\]]+\])$/.exec(utility);
  if (width) {
    const raw = width[1]!;
    return [
      { property: 'outline-width', value: raw.startsWith('[') ? raw.slice(1, -1) : `${raw}px`.replace('0px', '0') },
    ];
  }
  const color = /^outline-(.+)$/.exec(utility);
  if (!color) {
    return null;
  }
  const modifier = splitColorModifier(color[1]!);
  const resolved = resolveColorValue(modifier.value, theme);
  if (!resolved) {
    return null;
  }
  const opacity = modifier.opacity === undefined ? null : resolveOpacityModifier(modifier.opacity);
  if (modifier.opacity !== undefined && opacity === null) {
    return null;
  }
  return [
    {
      property: 'outline-color',
      value: opacity === null ? resolved : `color-mix(in srgb, ${resolved} ${opacity}%, transparent)`,
    },
  ];
}
