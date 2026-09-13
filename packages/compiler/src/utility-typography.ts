import { resolveLineHeight } from './resolve-line-height';
import { resolveThemeToken } from './theme';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles font-size utilities from the active `--text-*` theme namespace.
 * A paired `--text-<name>--line-height` token is emitted whenever present.
 *
 * @param utility Utility name without variants.
 * @param theme Active resolved theme.
 * @returns Font-size declarations, or null when unsupported.
 */
export function compileFontSizeUtility(utility: string, theme: CssxTheme): UtilityDeclaration[] | null {
  const match = /^text-([^/\[\]()]+)(?:\/(.+))?$/.exec(utility);
  if (!match) {
    return null;
  }
  const name = match[1]!;
  const size = resolveThemeToken(theme, `--text-${name}`);
  if (!size) {
    return null;
  }
  const declarations: UtilityDeclaration[] = [{ property: 'font-size', value: size }];
  const lineHeight = match[2]
    ? resolveLineHeight(match[2]!, theme)
    : resolveThemeToken(theme, `--text-${name}--line-height`);
  if (lineHeight) {
    declarations.push({ property: 'line-height', value: lineHeight });
  }
  const letterSpacing = resolveThemeToken(theme, `--text-${name}--letter-spacing`);
  if (letterSpacing) {
    declarations.push({ property: 'letter-spacing', value: letterSpacing });
  }
  const fontWeight = resolveThemeToken(theme, `--text-${name}--font-weight`);
  if (fontWeight) {
    declarations.push({ property: 'font-weight', value: fontWeight });
  }
  return declarations;
}
