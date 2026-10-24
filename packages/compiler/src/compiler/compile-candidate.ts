import { compileAtomizedCandidate } from '../atoms/compile-atomized-candidate';
import type { CompiledUtility } from '../utilities/registry/utility-recipe-types';
import type { CompileCandidateOptions } from './compile-candidate-options';
import { compileFallbackCandidate } from './compile-fallback-candidate';
import { compileSingleClassCandidate } from './compile-single-class-candidate';

/**
 * Routes one utility through its fallback, single-class, or atomized renderer.
 *
 * @param options Candidate data and rendering dependencies.
 * @returns Ordered CSS entries for the candidate.
 */
export function compileCandidate(options: CompileCandidateOptions): readonly CompiledUtility[] {
  if (options.fallbackCss !== undefined) {
    return compileFallbackCandidate({ ...options, fallbackCss: options.fallbackCss });
  }
  if (options.classNames.length === 1) {
    return compileSingleClassCandidate(options);
  }
  return compileAtomizedCandidate(options);
}
