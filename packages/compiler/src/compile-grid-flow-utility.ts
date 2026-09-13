import type { UtilityDeclaration } from './utility-types';

/**
 * Resolves grid auto-flow and automatic row/column track utilities.
 *
 * @param utility Utility name without variants.
 * @returns The grid declaration, or null when unsupported.
 */
export function compileGridFlowUtility(utility: string): UtilityDeclaration | null {
  const gridFlow = /^grid-flow-(row|col|row-dense|col-dense)$/.exec(utility);
  if (gridFlow) {
    return { property: 'grid-auto-flow', value: gridFlow[1]!.replace('-', ' ') };
  }
  const autoTracks = /^auto-(cols|rows)-(auto|min|max|fr)$/.exec(utility);
  if (!autoTracks) {
    return null;
  }
  const values: Readonly<Record<string, string>> = {
    auto: 'auto',
    min: 'min-content',
    max: 'max-content',
    fr: 'minmax(0, 1fr)',
  };
  return {
    property: autoTracks[1] === 'cols' ? 'grid-auto-columns' : 'grid-auto-rows',
    value: values[autoTracks[2]!]!,
  };
}
