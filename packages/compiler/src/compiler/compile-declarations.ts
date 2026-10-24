import type { CssxTheme } from '../theme/theme';
import { compileContainerUtility } from '../utilities/layout/compile-container-utility';
import { compileCoreLayoutUtility } from '../utilities/layout/compile-core-layout-utility';
import { compileOutlineUtility } from '../utilities/paint/compile-outline-utility';
import { EXACT_DECLARATIONS } from '../utilities/registry/utility-exact-declarations';
import type { UtilityDeclaration } from '../utilities/registry/utility-types';
import { compileDivideUtility } from '../utilities/spacing/compile-divide-utility';
import { compileSpaceUtility } from '../utilities/spacing/compile-space-utility';
import { compilePlaceholderUtility } from '../utilities/typography/compile-placeholder-utility';
import { compileFontSizeUtility } from '../utilities/typography/utility-typography';
import { cloneDeclarations } from '../utilities/values/utility-values';
import { compileArbitraryProperty } from './compile-arbitrary-property';
import { compilePrefixedUtility } from './compile-prefixed-utility';

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
