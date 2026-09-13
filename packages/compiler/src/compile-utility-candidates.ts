import { compileUtilityCandidate } from './compile-utility-candidate';
import type { CompileUtilityCandidateOptions } from './compile-utility-candidate';
import type { CompiledUtility } from './utility-recipe-types';

/** Inputs required to compile a deduplicated list of utility candidates. */
export interface CompileUtilityCandidatesOptions extends Omit<CompileUtilityCandidateOptions, 'candidate'> {
  /** Utility candidates to compile. */
  readonly candidates: readonly string[];
}

/** Per-candidate results consumed by the stylesheet assembly phase. */
export interface CompiledUtilityCandidates {
  /** Generated class names keyed by source candidate. */
  readonly classes: Readonly<Record<string, string>>;
  /** Compiled candidate rules before ordering and deduplication. */
  readonly compiled: CompiledUtility[];
  /** Keyframe names required by compiled recipes. */
  readonly requiredKeyframes: ReadonlySet<string>;
  /** Custom properties required by compiled recipes. */
  readonly requiredProperties: ReadonlySet<string>;
}

/**
 * Resolves and compiles each unique utility while collecting its shared resources.
 *
 * @param options Candidate and rendering inputs for this compilation phase.
 * @returns Generated class names, compiled rules, and shared CSS resources.
 */
export function compileUtilityCandidates(options: CompileUtilityCandidatesOptions): CompiledUtilityCandidates {
  const { candidates, ...candidateOptions } = options;
  const classes: Record<string, string> = Object.create(null) as Record<string, string>;
  const compiled: CompiledUtility[] = [];
  const requiredKeyframes = new Set<string>();
  const requiredProperties = new Set<string>();

  for (const candidate of [...new Set(candidates)]) {
    const result = compileUtilityCandidate({ ...candidateOptions, candidate });
    classes[candidate] = result.className;
    compiled.push(...result.compiled);
    for (const keyframe of result.requiredKeyframes) {
      requiredKeyframes.add(keyframe);
    }
    for (const property of result.requiredProperties) {
      requiredProperties.add(property);
    }
  }

  return { classes, compiled, requiredKeyframes, requiredProperties };
}
