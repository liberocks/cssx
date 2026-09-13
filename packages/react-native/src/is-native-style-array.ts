import type { NativeStyleInput } from './native-types';

/**
 * Checks whether a native style input is a nested input list.
 *
 * @param input Candidate style input.
 * @returns Whether the input is a nested style list.
 */
export function isNativeStyleArray(input: NativeStyleInput): input is readonly NativeStyleInput[] {
  return Array.isArray(input);
}
