import { compileArbitraryProperty } from './compile-arbitrary-property';
import { compileDivideUtility } from './compile-divide-utility';
import { compileOutlineUtility } from './compile-outline-utility';
import { compilePlaceholderUtility } from './compile-placeholder-utility';
import { compileSpaceUtility } from './compile-space-utility';
import type { CssxTheme } from './theme';
import { EXACT_DECLARATIONS } from './utility-exact-declarations';
import { compileContainerUtility, compileCoreLayoutUtility } from './utility-layout';
import { compilePrefixedUtility } from './utility-prefixed';
import type { UtilityDeclaration } from './utility-types';
import { compileFontSizeUtility } from './utility-typography';
import { cloneDeclarations } from './utility-values';

/**
 * Resolves one utility name through exact declarations and compiler families.
 *
 * @param utility Utility name without variants or modifiers.
 * @param negative Whether the candidate uses negative value syntax.
 * @param theme Active resolved theme.
 * @returns Mutable declarations for the utility.
 */
export function compileDeclarations(utility: string, negative: boolean, theme: CssxTheme): UtilityDeclaration[] {
  const fontSize = compileFontSizeUtility(utility, theme);
  if (fontSize) {
    return fontSize;
  }
  const exact = EXACT_DECLARATIONS[utility];
  if (exact) {
    return cloneDeclarations(exact);
  }
  if (utility.startsWith('[') && utility.endsWith(']')) {
    return [compileArbitraryProperty(utility)];
  }

  const space = compileSpaceUtility(utility, negative, theme);
  if (space) {
    return space;
  }
  const divide = compileDivideUtility(utility, theme);
  if (divide) {
    return divide;
  }
  const placeholder = compilePlaceholderUtility(utility, theme);
  if (placeholder) {
    return placeholder;
  }
  const outline = compileOutlineUtility(utility, negative, theme);
  if (outline) {
    return outline;
  }
  const container = compileContainerUtility(utility, theme);
  if (container) {
    return container;
  }
  const layout = compileCoreLayoutUtility(utility, negative, theme);
  if (layout) {
    return Array.isArray(layout) ? layout : [layout];
  }
  const declaration = compilePrefixedUtility(utility, negative, theme);
  if (!declaration) {
    throw new Error(`CSSX cannot compile utility "${negative ? '-' : ''}${utility}".`);
  }
  return Array.isArray(declaration) ? declaration : [declaration];
}
