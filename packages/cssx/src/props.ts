import { collectStyleInputs } from './collect-style-inputs';
import { reduceCompiledUtilities } from './reduce-compiled-utilities';
import type { CompiledStyle, CompiledUtility, StyleInput } from './types';

/**
 * Merges compiled styles from left to right.
 *
 * @param inputs Compiled styles, raw class strings, or nested lists of them.
 * @returns An object with the final class name.
 */
export function props(...inputs: readonly StyleInput[]): { readonly className: string } {
  const parts: Array<string | CompiledStyle> = [];
  const records: CompiledUtility[] = [];
  const styleCount = collectStyleInputs(inputs, parts, records);
  if (styleCount === 1) {
    return {
      className: parts
        .map((part) => (typeof part === 'string' ? part : part.c))
        .filter(Boolean)
        .join(' '),
    };
  }
  const winners = new Set(
    reduceCompiledUtilities(records)
      .map((record) => record[0])
      .filter((className): className is string => className !== null),
  );
  const flattenedParts: Array<string | CompiledUtility> = [];
  for (const part of parts) {
    if (typeof part === 'string') {
      flattenedParts.push(part);
    } else {
      flattenedParts.push(...part._);
    }
  }
  const emitted = new Set<string>();
  return {
    className: flattenedParts
      .filter((part) => {
        if (typeof part === 'string') {
          return true;
        }
        if (part[0] === null || !winners.has(part[0]) || emitted.has(part[0])) {
          return false;
        }
        emitted.add(part[0]);
        return true;
      })
      .map((part) => (typeof part === 'string' ? part : part[0]))
      .join(' '),
  };
}
