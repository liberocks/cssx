import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';
import { resolveBorderWidthValue, resolveOpacityModifier, splitColorModifier } from './utility-resolvers';
import { resolveUtilityColor } from './utility-paint';

/** Shared box-shadow value that combines shadow, ring offset, and ring channels. */
const CSSX_SHADOW_SINK =
  'var(--cssx-shadow, 0 0 #0000), var(--cssx-ring-offset-shadow, 0 0 #0000), var(--cssx-ring-shadow, 0 0 #0000)';
/** Shared filter value that combines all standard filter channels. */
const CSSX_FILTER_SINK =
  'var(--cssx-filter-blur,) var(--cssx-filter-brightness,) var(--cssx-filter-contrast,) var(--cssx-filter-drop-shadow,) var(--cssx-filter-grayscale,) var(--cssx-filter-hue-rotate,) var(--cssx-filter-invert,) var(--cssx-filter-saturate,) var(--cssx-filter-sepia,)';
/** Shared backdrop-filter value that combines all backdrop filter channels. */
const CSSX_BACKDROP_FILTER_SINK =
  'var(--cssx-backdrop-blur,) var(--cssx-backdrop-brightness,) var(--cssx-backdrop-contrast,) var(--cssx-backdrop-grayscale,) var(--cssx-backdrop-hue-rotate,) var(--cssx-backdrop-invert,) var(--cssx-backdrop-opacity,) var(--cssx-backdrop-saturate,) var(--cssx-backdrop-sepia,)';

/**
 * Compiles standard filter utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @returns Filter declarations, or null when unsupported.
 */
export function compileFilterUtility(utility: string, negative: boolean): UtilityDeclaration[] | null {
  return compileFilterFamily(utility, negative, 'filter', '--cssx-filter-', '', CSSX_FILTER_SINK, false);
}

/**
 * Compiles backdrop filter utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @returns Backdrop filter declarations, or null when unsupported.
 */
export function compileBackdropFilterUtility(utility: string, negative: boolean): UtilityDeclaration[] | null {
  if (!utility.startsWith('backdrop-')) {
    return null;
  }
  return compileFilterFamily(
    utility.slice('backdrop-'.length),
    negative,
    'backdrop-filter',
    '--cssx-backdrop-',
    'backdrop-',
    CSSX_BACKDROP_FILTER_SINK,
    true,
  );
}

/**
 * Compiles one configurable filter family from independent CSS channels.
 *
 * @param utility Utility name to compile.
 * @param negative Whether the value is negated.
 * @param property Target CSS filter property.
 * @param variablePrefix Prefix for channel custom properties.
 * @param semanticPrefix Prefix for semantic groups.
 * @param sink Combined filter value.
 * @param includesOpacity Whether this family supports opacity.
 * @returns Filter declarations, or null when unsupported.
 */
export function compileFilterFamily(
  utility: string,
  negative: boolean,
  property: 'filter' | 'backdrop-filter',
  variablePrefix: string,
  semanticPrefix: string,
  sink: string,
  includesOpacity: boolean,
): UtilityDeclaration[] | null {
  const none = `${semanticPrefix}filter-none`;
  const channels = [
    'filter-none',
    'blur',
    'brightness',
    'contrast',
    'drop-shadow',
    'grayscale',
    'hue-rotate',
    'invert',
    'opacity',
    'saturate',
    'sepia',
  ].map((channel) => `${semanticPrefix}${channel}`);
  if (utility === 'filter-none') {
    return filterNoneDeclarations(property, none, channels);
  }
  const definitions: Readonly<Record<string, Readonly<Record<string, string>>>> = {
    blur: { none: '0', xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px', '2xl': '40px', '3xl': '64px' },
    brightness: {
      '0': '0',
      '50': '.5',
      '75': '.75',
      '90': '.9',
      '95': '.95',
      '100': '1',
      '105': '1.05',
      '110': '1.1',
      '125': '1.25',
      '150': '1.5',
      '200': '2',
    },
    contrast: { '0': '0', '50': '.5', '75': '.75', '100': '1', '125': '1.25', '150': '1.5', '200': '2' },
    grayscale: { '0': '0', DEFAULT: '1' },
    invert: { '0': '0', DEFAULT: '1' },
    saturate: { '0': '0', '50': '.5', '100': '1', '150': '1.5', '200': '2' },
    sepia: { '0': '0', DEFAULT: '1' },
    opacity: {
      '0': '0',
      '5': '.05',
      '10': '.1',
      '15': '.15',
      '20': '.2',
      '25': '.25',
      '30': '.3',
      '40': '.4',
      '50': '.5',
      '60': '.6',
      '70': '.7',
      '75': '.75',
      '80': '.8',
      '90': '.9',
      '95': '.95',
      '100': '1',
    },
  };
  const simple = /^(blur|brightness|contrast|grayscale|invert|saturate|sepia|opacity)(?:-(.+))?$/.exec(utility);
  if (simple) {
    const family = simple[1] ?? '';
    if (family === 'opacity' && !includesOpacity) {
      return null;
    }
    const raw = simple[2] ?? 'DEFAULT';
    const arbitrary = raw.startsWith('[') && raw.endsWith(']') ? raw.slice(1, -1) : null;
    const value = arbitrary ?? definitions[family]?.[raw];
    if (!value) {
      return null;
    }
    const functionValue = family === 'blur' ? `blur(${value})` : `${family}(${value})`;
    return filterDeclarations(property, variablePrefix, semanticPrefix, sink, family, functionValue);
  }

  const hue = /^hue-rotate-(.+)$/.exec(utility);
  if (hue) {
    const raw = hue[1] ?? '';
    const value =
      raw.startsWith('[') && raw.endsWith(']')
        ? raw.slice(1, -1)
        : /^\d+$/.test(raw)
          ? `${negative ? '-' : ''}${raw}deg`
          : null;
    return value
      ? filterDeclarations(property, variablePrefix, semanticPrefix, sink, 'hue-rotate', `hue-rotate(${value})`)
      : null;
  }

  const dropShadow = /^drop-shadow(?:-(.+))?$/.exec(utility);
  if (dropShadow) {
    const raw = dropShadow[1] ?? 'DEFAULT';
    const values: Readonly<Record<string, string>> = {
      DEFAULT: '0 1px 2px rgb(0 0 0 / .1)',
      none: '0 0 #0000',
      xs: '0 1px 1px rgb(0 0 0 / .05)',
      sm: '0 1px 2px rgb(0 0 0 / .15)',
      md: '0 3px 3px rgb(0 0 0 / .12)',
      lg: '0 4px 4px rgb(0 0 0 / .15)',
      xl: '0 9px 7px rgb(0 0 0 / .1)',
      '2xl': '0 25px 25px rgb(0 0 0 / .15)',
    };
    const value = raw.startsWith('[') && raw.endsWith(']') ? raw.slice(1, -1) : values[raw];
    return property === 'filter' && value
      ? filterDeclarations(property, variablePrefix, semanticPrefix, sink, 'drop-shadow', `drop-shadow(${value})`)
      : null;
  }
