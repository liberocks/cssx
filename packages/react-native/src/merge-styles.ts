import type { NativeStyle, NativeStyleValue, NativeTransform } from './native-types';

/**
 * Merges native styles from left to right while appending transform channels.
 *
 * @param styles Native style records to merge.
 * @returns A single merged native style record.
 */
export function mergeStyles(styles: readonly NativeStyle[]): NativeStyle {
  const output: Record<string, NativeStyleValue> = {};
  for (const style of styles) {
    for (const [property, value] of Object.entries(style)) {
      if (property === 'transform' && Array.isArray(output.transform) && Array.isArray(value)) {
        output.transform = [...output.transform, ...value] as readonly NativeTransform[];
      } else {
        output[property] = value;
      }
    }
  }
  return output;
}
