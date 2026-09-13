import { create } from './create';
import { mergeStyles } from './merge-styles';
import type { NativeStyle, NativeSxInput } from './native-types';
import { visitStyles } from './visit-styles';

/**
 * Compiles inline utility strings and merges compiled React Native styles.
 *
 * @param inputs Utility strings or compiled conditional styles.
 * @returns A merged native style object.
 */
export function sx(...inputs: readonly NativeSxInput[]): NativeStyle {
  const styles: NativeStyle[] = [];
  for (const input of inputs) {
    if (typeof input === 'string') {
      styles.push(create({ value: input }).value.style);
    } else {
      visitStyles([input], styles);
    }
  }
  return mergeStyles(styles);
}
