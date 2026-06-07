import { resolveThemeToken } from './theme';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';
import { resolveAngleValue, resolveScaleValue } from './utility-values';
import { resolveDimensionValue, resolveSpacingValue } from './utility-resolvers';

/**
 * Compiles width, height, and logical dimension utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @param theme Active resolved theme.
 * @returns Declaration, or null when the utility is not supported here.
 */
export function compileDimensionUtility(
  utility: string,
  negative: boolean,
  theme: CssxTheme,
): UtilityDeclaration | null {
  const match = /^(w|h|min-w|max-w|min-h|max-h|inline|min-inline|max-inline|block|min-block|max-block)-(.+)$/.exec(
    utility,
  );
  if (!match) {
    return null;
  }
  const prefix = match[1] ?? '';
  const value = resolveDimensionValue(match[2] ?? '', negative, theme, prefix);
  if (!value) {
    return null;
  }
  const properties: Readonly<Record<string, string>> = {
    w: 'width',
    h: 'height',
    'min-w': 'min-width',
    'max-w': 'max-width',
    'min-h': 'min-height',
    'max-h': 'max-height',
    inline: 'inline-size',
    'min-inline': 'min-inline-size',
    'max-inline': 'max-inline-size',
    block: 'block-size',
    'min-block': 'min-block-size',
    'max-block': 'max-block-size',
  };
  const property = properties[prefix];
  return property ? { property, value } : null;
}

/**
 * Compiles a validated arbitrary property utility.
 *
 * @param utility Bracketed property utility.
 * @returns CSS declaration from the property and value.
 */
export function compileArbitraryProperty(utility: string): UtilityDeclaration {
  const content = utility.slice(1, -1);
  const separator = content.indexOf(':');
  const property = content.slice(0, separator).trim();
  const value = content.slice(separator + 1).trim();
  if (!/^(--[a-z0-9_-]+|[a-z-]+)$/i.test(property) || !value || /[{};]/.test(value)) {
    throw new Error(`Invalid arbitrary CSSX utility "${utility}".`);
  }
  return { property, value };
}

/**
 * Compiles one animation utility value.
 *
 * @param name Animation value without the utility prefix.
 * @param theme Active resolved theme.
 * @returns Animation declaration, or null when the value is unknown.
 */
export function compileAnimationUtility(name: string, theme: CssxTheme): UtilityDeclaration | null {
  if (name === 'none') {
    return { property: 'animation', value: 'none' };
  }
  if (name.startsWith('[') && name.endsWith(']')) {
    return { property: 'animation', value: name.slice(1, -1) };
  }
  const value = resolveThemeToken(theme, `--animate-${name}`);
  return value ? { property: 'animation', value } : null;
}

/**
 * Compiles transform-channel utilities and their required sink declarations.
 *
 * @param utility Utility name without variants.
 * @param negative Whether the value is negated.
 * @param theme Active resolved theme.
 * @returns Transform declarations, or null when the utility is unsupported.
 */
