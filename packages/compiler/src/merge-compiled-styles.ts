import type { CompiledStyle } from './conflicts';
import { reducePackedUtilities } from './reduce-packed-utilities';

/**
 * Merges compiled styles from left to right.
 *
 * @param styles Compiled styles to merge.
 * @returns The final class string.
 */
export function mergeCompiledStyles(styles: readonly CompiledStyle[]): string {
  return reducePackedUtilities(styles.flatMap((style) => style._))
    .map((record) => record[0])
    .filter((className): className is string => className !== null)
    .join(' ');
}
