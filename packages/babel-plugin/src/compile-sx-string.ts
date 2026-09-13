import { compileStyleRecords } from '@cssxio/compiler';
import type { ReusabilityBudget } from '@cssxio/compiler';
import { atomicClassesForStyle } from './atomic-classes-for-style';
import { markEmittedClassNames } from './mark-emitted-class-names';
import type { FileState } from './plugin-types';
import { recordCandidateOrigin } from './record-candidate-origin';
import { stableCompositeName } from './stable-composite-name';

/** Context needed to compile and track one static `sx()` source string. */
export interface CompileSxStringContext {
  /** CSS theme source used by the compiler. */
  readonly theme?: string;
  /** Reusability policy for generated class records. */
  readonly reusabilityBudget?: ReusabilityBudget;
  /** Whether composite class names should be based on source identity. */
  readonly stableClassNames?: boolean;
  /** Stable file identity used for development composite names. */
  readonly fileName: string;
  /** Per-module CSSX metadata being accumulated. */
  readonly state: FileState;
}

/**
 * Compiles one static `sx()` utility string and records its reachable metadata.
 *
 * @param source Static utility string to compile.
 * @param context Theme, naming, and per-module metadata context.
 * @param location Start location of the source string, with one-based line and zero-based column.
 * @param location.line One-based source line.
 * @param location.column Zero-based source column.
 * @returns The compiled class names separated by spaces, or an empty string for blank input.
 */
export function compileSxString(
  source: string,
  context: CompileSxStringContext,
  location?: { readonly line: number; readonly column: number },
): string {
  if (!source.trim()) {
    return '';
  }
  let result;
  try {
    result = compileStyleRecords(
      { inline: source },
      {
        theme: context.theme,
        classNameAllocator: context.state.classNameAllocator,
        reusabilityBudget: context.reusabilityBudget,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to compile CSSX sx() utilities.';
    throw new Error(message);
  }
  const className = context.stableClassNames
    ? stableCompositeName(context.fileName, location, 'sx')
    : result.classNames.inline!;
  for (const [candidate, candidateClassName] of Object.entries(result.classes)) {
    context.state.classes.set(candidate, candidateClassName);
    context.state.liveCandidates.add(candidate);
    recordCandidateOrigin(context.state, candidate, location);
  }
  for (const [compositeClassName, atomicClasses] of Object.entries(result.composites)) {
    context.state.composites.set(compositeClassName, atomicClasses);
  }
  if (context.stableClassNames) {
    context.state.composites.set(className, atomicClassesForStyle(result.styles.inline!));
  }
  markEmittedClassNames(className, context.state);
  return className!;
}
