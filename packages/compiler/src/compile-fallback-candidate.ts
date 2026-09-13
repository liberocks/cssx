import { classSelectors } from './class-selectors';
import type { CompileCandidateOptions } from './compile-candidate-options';
import { cssOrder } from './css-order';
import { replaceFallbackSelector } from './replace-fallback-selector';
import type { CompiledUtility } from './utility-recipe-types';

/** Candidate data guaranteed to include pinned fallback CSS. */
export interface CompileFallbackCandidateOptions extends CompileCandidateOptions {
  /** Precomputed CSS for the candidate. */
  readonly fallbackCss: string;
}

/**
 * Renders a precomputed fallback rule against its generated class selector.
 *
 * @param options Candidate data containing fallback CSS.
 * @returns The single ordered fallback rule.
 * @throws {Error} If a fallback candidate was assigned anything other than one class.
 */
export function compileFallbackCandidate(options: CompileFallbackCandidateOptions): readonly CompiledUtility[] {
  const {
    candidateSource,
    classNames,
    atoms,
    candidate,
    semanticGroup,
    fallbackCss,
    selectorAliases,
    includedClasses,
  } = options;
  if (classNames.length !== 1) {
    throw new Error(`CSSX expected one generated class for fallback utility "${candidateSource}".`);
  }
  const className = classNames[0]!;
  const selectors = classSelectors(className, selectorAliases, includedClasses);
  return [
    {
      candidate: candidateSource,
      className,
      css: selectors.map((selector) => replaceFallbackSelector(fallbackCss, candidateSource, selector)).join(''),
      order: cssOrder(candidate, semanticGroup, atoms.flat()),
    },
  ];
}
