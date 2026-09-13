import { applyVariants } from './apply-variants';
import { classSelectors } from './class-selectors';
import type { CompileCandidateOptions } from './compile-candidate-options';
import { cssOrder } from './css-order';
import type { CompiledUtility } from './utility-recipe-types';

/**
 * Renders declaration atoms under one generated class per atom.
 *
 * @param options Candidate data assigned an atomic class list.
 * @returns Ordered rules for atoms whose selectors remain included.
 * @throws {Error} If the class and atom counts do not match.
 */
export function compileAtomizedCandidate(options: CompileCandidateOptions): readonly CompiledUtility[] {
  const {
    candidateSource,
    classNames,
    theme,
    atoms,
    candidate,
    semanticGroup,
    selectorAliases,
    includedClasses,
    variantOptions,
  } = options;
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
