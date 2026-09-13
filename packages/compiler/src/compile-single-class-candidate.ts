import { applyVariants } from './apply-variants';
import { classSelectors } from './class-selectors';
import type { CompileCandidateOptions } from './compile-candidate-options';
import { cssOrder } from './css-order';
import type { CompiledUtility } from './utility-recipe-types';

/**
 * Renders all declaration atoms under one generated class selector.
 *
 * @param options Candidate data assigned a single generated class.
 * @returns The ordered rule for the generated class.
 */
export function compileSingleClassCandidate(options: CompileCandidateOptions): readonly CompiledUtility[] {
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
  const declarations = atoms.length === 1 ? atoms[0]! : atoms.flat();
  const className = classNames[0]!;
  const selectors = classSelectors(className, selectorAliases, includedClasses);
  return [
    {
      candidate: candidateSource,
      className,
      css: applyVariants(selectors, declarations, candidate.variants, theme, variantOptions),
      order: cssOrder(candidate, semanticGroup, declarations),
    },
  ];
}
