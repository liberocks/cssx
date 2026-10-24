import type { CompiledStyle } from '@cssxio/compiler';

/** Extracts every winning atom from one compiled style for an alias selector. */
export function atomicClassesForStyle(style: CompiledStyle): readonly string[] {
  return [...new Set(style._.map((record) => record[0]).filter((className): className is string => !!className))];
}
