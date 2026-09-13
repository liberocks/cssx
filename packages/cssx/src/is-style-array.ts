import type { StyleInput } from './types';

/**
 * Checks whether a style input is a nested list of style inputs.
 *
 * @param input Candidate style input.
 * @returns Whether the input is a nested style list.
 */
export function isStyleArray(input: StyleInput): input is readonly StyleInput[] {
  return Array.isArray(input);
}
