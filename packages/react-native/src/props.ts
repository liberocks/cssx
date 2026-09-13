import { mergeStyles } from './merge-styles';
import type { NativeStyle, NativeStyleInput } from './native-types';
import { visitStyles } from './visit-styles';

/**
 * Merges compiled React Native styles from left to right.
 *
 * @param inputs Compiled styles or nested conditional style lists.
 * @returns The merged React Native style prop.
 */
export function props(...inputs: readonly NativeStyleInput[]): { readonly style: NativeStyle } {
  const styles: NativeStyle[] = [];
  visitStyles(inputs, styles);
  return { style: mergeStyles(styles) };
}
