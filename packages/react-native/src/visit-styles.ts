import { isNativeStyleArray } from './is-native-style-array';
import type { NativeStyle, NativeStyleInput } from './native-types';

/**
 * Flattens compiled native style inputs into source-order style records.
 *
 * @param inputs Style inputs to visit.
 * @param output Mutable output array.
 * @returns Nothing after appending valid compiled styles.
 */
export function visitStyles(inputs: readonly NativeStyleInput[], output: NativeStyle[]): void {
  for (const input of inputs) {
    if (!input) {
      continue;
    }
    if (isNativeStyleArray(input)) {
      visitStyles(input, output);
      continue;
    }
    if (typeof input !== 'object' || input.$$cssx !== 3) {
      throw new Error('cssx.props() received an object that was not compiled by CSSX for React Native.');
    }
    output.push(input.style);
  }
}
