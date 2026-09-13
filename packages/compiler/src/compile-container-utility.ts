import { resolveThemeValue } from './theme';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles the responsive container utility from theme breakpoints.
 *
 * @param utility Utility name without variants.
 * @param theme Active resolved theme.
 * @returns Container declarations, or null when it is not the container utility.
 */
export function compileContainerUtility(utility: string, theme: CssxTheme): UtilityDeclaration[] | null {
  if (utility !== 'container') {
    return null;
  }
  const breakpoints = ['sm', 'md', 'lg', 'xl', '2xl'];
  const declarations: UtilityDeclaration[] = [{ property: 'width', value: '100%', semanticGroup: 'container' }];
  for (const breakpoint of breakpoints) {
    const value = resolveThemeValue(theme, `--breakpoint-${breakpoint}`);
    if (value) {
      declarations.push({
        property: 'max-width',
        value,
        atRule: `@media (width >= ${value})`,
        semanticGroup: 'container',
      });
    }
  }
  return declarations;
}
