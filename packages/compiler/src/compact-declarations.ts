import type { UtilityDeclaration } from './utility-types';

/** Compressed exact declarations that share one CSS property. */
export type CompactDescriptorGroup = readonly [property: string, entries: string];

/**
 * Expands compact exact declaration data into normal declaration records.
 *
 * @param groups Compressed property and entry groups.
 * @returns Exact declarations keyed by utility name.
 */
export function compactDeclarations(
  groups: readonly CompactDescriptorGroup[],
): Readonly<Record<string, readonly UtilityDeclaration[]>> {
  return Object.fromEntries(
    groups.flatMap(([property, entries]) =>
      entries.split(';').map((entry) => {
        const separator = entry.indexOf('=');
        return [entry.slice(0, separator), [{ property, value: entry.slice(separator + 1) }]];
      }),
    ),
  );
}
