import type { CompiledStyle, StyleInput } from './types';

/**
 * Checks whether a style input was created by the CSSX compiler.
 *
 * @param input Candidate non-array style input.
 * @returns Whether the input has the CSSX compiled-style marker.
 */
export function isCompiledStyle(input: Exclude<StyleInput, readonly StyleInput[]>): input is CompiledStyle {
  return (
    typeof input === 'object' &&
    input !== null &&
    input.$$css === 2 &&
    typeof input.c === 'string' &&
    Array.isArray(input._)
  );
}
