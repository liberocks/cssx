import { arbitraryValue } from './arbitrary-value';
import { resolveThemeToken } from './theme';
import type { CssxTheme } from './theme';

/** Built-in timing functions shared by transitions and animations. */
const EASINGS: Readonly<Record<string, string>> = {
  linear: 'linear',
  in: 'cubic-bezier(.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, .2, 1)',
  'in-out': 'cubic-bezier(.4, 0, .2, 1)',
};

/**
 * Resolves a built-in, arbitrary, or theme-backed easing value.
 *
 * @param raw Easing segment from the utility name.
 * @param theme Active resolved theme.
 * @param animation Resolves animation-specific easing tokens when true.
 * @returns Resolved easing, or null when unsupported.
 */
export function resolveEasing(raw: string, theme: CssxTheme, animation = false): string | null {
  const arbitrary = arbitraryValue(raw);
  return (
    EASINGS[raw] ??
    arbitrary ??
    resolveThemeToken(theme, `--ease-${raw}`) ??
    (animation ? resolveThemeToken(theme, `--animation-ease-${raw}`) : undefined) ??
    null
  );
}
