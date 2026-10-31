import type { CompiledStyle } from '@cssxio/compiler';

/** Returns structural marker classes that must be preserved without CSS aliases. */
export function structuralClassesForStyle(style: CompiledStyle): readonly string[] {
  return [
    ...new Set(
      style._.filter((record) => record[2].startsWith('structural-'))
        .map((record) => record[0])
        .filter((className): className is string => !!className),
    ),
  ];
}
