import { compileStyleRecords, parseTheme, splitCandidateList, validateUtilityCandidate } from '@cssxio/compiler';
import type { ReusabilityBudget } from '@cssxio/compiler';

import { atomicClassesForStyle } from '../classes/atomic-classes-for-style';
import { markEmittedClassNames } from '../classes/mark-emitted-class-names';
import { stableCompositeName } from '../classes/stable-composite-name';
import { structuralClassesForStyle } from '../classes/structural-classes-for-style';
import type { FileState } from '../state/plugin-types';
import { recordCandidateOrigin } from '../state/record-candidate-origin';

/** Context needed to compile and track one static `sx()` source string. */
export interface CompileSxStringContext {
  /** CSS theme source used by the compiler. */
  readonly theme?: string;
  /** Reusability policy for generated class records. */
  readonly reusabilityBudget?: ReusabilityBudget;
  /** Whether composite class names should be based on source identity. */
  readonly stableClassNames?: boolean;
  /** Selects stable identities independent of utility literal lengths. */
  readonly stableClassNameStrategy?: 'source-location' | 'module-order';
  /** Stable file identity used for development composite names. */
  readonly fileName: string;
  /** Stable identity for this `sx()` call when development uses module-order naming. */
  readonly stableClassNameIdentity?: string;
  /** Stable identity sequence for static segments in a dynamic `sx()` call. */
  readonly stableClassNameSegment?: { value: number };
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
  const compilerOptions = {
    theme: context.theme,
    classNameAllocator: context.state.classNameAllocator,
    reusabilityBudget: context.reusabilityBudget,
  };
  let candidates = source;
  let unknown: readonly string[] = [];
  let result;
  try {
    result = compileStyleRecords({ inline: source }, compilerOptions);
  } catch (error) {
    if (!isUnknownUtilityError(error)) {
      const message = error instanceof Error ? error.message : 'Unable to compile CSSX sx() utilities.';
      throw new Error(message);
    }
    const tokens = splitCandidateList(source);
    const recognized: string[] = [];
    const unexpected: string[] = [];
    const theme = parseTheme(context.theme);
    for (const token of tokens) {
      try {
        validateUtilityCandidate(token, theme);
        recognized.push(token);
      } catch {
        unexpected.push(token);
      }
    }
    if (unexpected.length === 0) {
      throw new Error(error.message);
    }
    candidates = recognized.join(' ');
    unknown = unexpected;
    result = recognized.length > 0 ? compileStyleRecords({ inline: candidates }, compilerOptions) : undefined;
    for (const utility of unknown) {
      context.state.diagnostics.push({
        utility,
        line: location ? location.line - 1 : 0,
        column: location ? location.column + 1 : 0,
      });
    }
  }
  if (!result) {
    return unknown.join(' ');
  }
  const compositeClassName = context.stableClassNames
    ? context.stableClassNameIdentity
      ? stableCompositeName(
          context.fileName,
          undefined,
          `${context.stableClassNameIdentity}:segment:${context.stableClassNameSegment!.value++}`,
        )
      : stableCompositeName(context.fileName, location, 'sx')
    : result.classNames.inline!;
  const className = context.stableClassNames
    ? [compositeClassName, ...structuralClassesForStyle(result.styles.inline!), ...unknown].filter(Boolean).join(' ')
    : [compositeClassName, ...unknown].filter(Boolean).join(' ');
  for (const [candidate, candidateClassName] of Object.entries(result.classes)) {
    context.state.classes.set(candidate, candidateClassName);
    context.state.liveCandidates.add(candidate);
    recordCandidateOrigin(context.state, candidate, location);
  }
  for (const [compositeClassName, atomicClasses] of Object.entries(result.composites)) {
    context.state.composites.set(compositeClassName, atomicClasses);
  }
  if (context.stableClassNames) {
    context.state.composites.set(compositeClassName, atomicClassesForStyle(result.styles.inline!));
  }
  markEmittedClassNames(className, context.state);
  return className;
}

/** Whether a failure means an individual sx token cannot produce CSS. */
function isUnknownUtilityError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    /cannot (?:classify|compile) utility|does not support variant|Invalid utility/.test(error.message)
  );
}
