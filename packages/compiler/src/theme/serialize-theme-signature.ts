import { resolveThemeValue } from './theme';
import type { CssxTheme } from './theme';

/**
 * Serializes resolved theme values into the class-name namespace.
 *
 * @param theme Parsed theme used for the signature.
 * @returns Stable theme signature for hashing.
 */
export function serializeThemeSignature(theme: CssxTheme): string {
  const outputSignature = theme.mode === 'inline' && !theme.prefix ? '' : `${theme.mode}:${theme.prefix}|`;
  const tokens = Object.keys(theme.tokens)
    .sort()
    .map((name) => `${name}:${resolveThemeValue(theme, name) ?? 'initial'}`)
    .join('|');
  const keyframes = Object.keys(theme.keyframes)
    .sort()
    .map((name) => `${name}:${theme.keyframes[name]!}`)
    .join('|');
  return `${outputSignature}${tokens}|${keyframes}`;
}
