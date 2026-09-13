import type { ParsedCandidate } from './candidate';
import { classSelectors } from './class-selectors';
import { cssOrder } from './css-order';
import { replaceFallbackSelector } from './replace-fallback-selector';
import type { CssxTheme } from './theme';
import type { CompiledUtility } from './utility-recipe-types';
import type { UtilityDeclaration } from './utility-types';
import { applyVariants } from './utility-variants';
import type { VariantOptions } from './utility-variants';

/**
 * Compiles one candidate into one rule or atomized rules for supplied classes.
 *
 * @param candidateSource Source utility candidate.
 * @param classNames Generated classes assigned to the candidate.
 * @param theme Active resolved theme.
 * @param atoms Declaration atoms to render.
 * @param candidate Parsed utility candidate.
 * @param semanticGroup Semantic group written by the candidate.
 * @param fallbackCss Pinned fallback CSS, when one applies.
 * @param selectorAliases Composite classes that need separate selectors.
 * @param includedClasses Classes kept in the output, or undefined for all.
 * @param variantOptions Options that affect variant rendering.
 * @returns Ordered CSS entries for the candidate.
 */
export function compileCandidate(
  candidateSource: string,
  classNames: readonly string[],
  theme: CssxTheme,
  atoms: readonly (readonly UtilityDeclaration[])[],
  candidate: ParsedCandidate,
  semanticGroup: string,
  fallbackCss: string | undefined,
  selectorAliases: Readonly<Record<string, readonly string[]>>,
  includedClasses: ReadonlySet<string> | undefined,
  variantOptions: VariantOptions,
): readonly CompiledUtility[] {
  if (fallbackCss !== undefined) {
    if (classNames.length !== 1) {
      throw new Error(`CSSX expected one generated class for fallback utility "${candidateSource}".`);
    }
    const selectors = classSelectors(classNames[0]!, selectorAliases, includedClasses);
    return [
      {
        candidate: candidateSource,
        className: classNames[0]!,
        css: selectors.map((selector) => replaceFallbackSelector(fallbackCss, candidateSource, selector)).join(''),
        order: cssOrder(candidate, semanticGroup, atoms.flat()),
      },
    ];
  }
  if (classNames.length === 1) {
    const declarations = atoms.length === 1 ? atoms[0]! : atoms.flat();
    const generatedClass = classNames[0]!;
    const selectors = classSelectors(generatedClass, selectorAliases, includedClasses);
    return [
      {
        candidate: candidateSource,
        className: generatedClass,
        css: applyVariants(selectors, declarations, candidate.variants, theme, variantOptions),
        order: cssOrder(candidate, semanticGroup, declarations),
      },
    ];
  }
  if (classNames.length !== atoms.length) {
    throw new Error(`CSSX expected ${atoms.length} generated classes for utility "${candidateSource}".`);
  }
  return atoms
    .map((declarations, index) => {
      const className = classNames[index]!;
      const selectors = classSelectors(className, selectorAliases, includedClasses);
      if (selectors.length === 0) {
        return null;
      }
      return {
        candidate: candidateSource,
        className,
        css: applyVariants(selectors, declarations, candidate.variants, theme, variantOptions),
        order: `${cssOrder(candidate, semanticGroup, declarations)}\u0000${index}`,
      };
    })
    .filter((entry): entry is CompiledUtility => entry !== null);
}
