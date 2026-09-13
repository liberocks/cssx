import { SHORTHAND_WRITE_SETS } from './shorthand-write-sets';
import type { UtilityConflictRecord } from './utility-conflict-record';

/** Semantic data reused by every atom with a known emitted property. */
export const ATOM_SEMANTIC_SLOTS: Readonly<Record<string, Omit<UtilityConflictRecord, 'scope'>>> = {
  padding: { group: 'p', conflicts: ['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl'] },
  'padding-left': { group: 'pl', conflicts: ['pl'] },
  'padding-right': { group: 'pr', conflicts: ['pr'] },
  'padding-top': { group: 'pt', conflicts: ['pt'] },
  'padding-bottom': { group: 'pb', conflicts: ['pb'] },
  margin: { group: 'm', conflicts: ['m', 'mx', 'my', 'mt', 'mr', 'mb', 'ml'] },
  'margin-left': { group: 'ml', conflicts: ['ml'] },
  'margin-right': { group: 'mr', conflicts: ['mr'] },
  'margin-top': { group: 'mt', conflicts: ['mt'] },
  'margin-bottom': { group: 'mb', conflicts: ['mb'] },
  'border-width': {
    group: 'border-width',
    conflicts: ['border-width', 'border-x', 'border-y', 'border-top', 'border-right', 'border-bottom', 'border-left'],
  },
  'border-top-width': { group: 'border-top', conflicts: ['border-top'] },
  'border-right-width': { group: 'border-right', conflicts: ['border-right'] },
  'border-bottom-width': { group: 'border-bottom', conflicts: ['border-bottom'] },
  'border-left-width': { group: 'border-left', conflicts: ['border-left'] },
  'border-color': { group: 'border-color', conflicts: ['border-color'] },
  '--cssx-translate-x': { group: 'translate-x', conflicts: ['translate-x'] },
  '--cssx-translate-y': { group: 'translate-y', conflicts: ['translate-y'] },
  '--cssx-scale-x': { group: 'scale-x', conflicts: ['scale-x'] },
  '--cssx-scale-y': { group: 'scale-y', conflicts: ['scale-y'] },
  '--cssx-skew-x': { group: 'skew-x', conflicts: ['skew-x'] },
  '--cssx-skew-y': { group: 'skew-y', conflicts: ['skew-y'] },
};

/** Semantic data for shorthand declarations and their independently writable parts. */
export const SHORTHAND_SEMANTIC_SLOTS: Readonly<Record<string, Omit<UtilityConflictRecord, 'scope'>>> =
  Object.fromEntries(
    Object.entries(SHORTHAND_WRITE_SETS).flatMap(([shorthand, components]) => [
      [shorthand, { group: shorthand, conflicts: [shorthand, ...components] }],
      ...components.map((property) => [property, { group: property, conflicts: [property] }]),
    ]),
  );

/**
 * Finds the conflict record for one atom, preferring explicit semantic metadata.
 *
 * Atomization can split a shorthand utility into independent properties. This
 * function preserves the exact reset behavior for those properties so runtime
 * composition matches the CSS cascade instead of treating every atom as a whole.
 *
 * @param atom Declaration atom to classify.
 * @param fallback Candidate-level semantic record.
 * @returns Semantic record used by the compiled runtime style.
 */
export function atomSemantics(
  atom: readonly {
    readonly property: string;
    readonly semanticGroup?: string;
    readonly semanticConflicts?: readonly string[];
  }[],
  fallback: UtilityConflictRecord,
): UtilityConflictRecord {
  const semanticGroup = atom[0]!.semanticGroup;
  if (semanticGroup) {
    return { scope: fallback.scope, group: semanticGroup, conflicts: atom[0]!.semanticConflicts ?? [semanticGroup] };
  }
  const property = atom[0]!.property;
  const slot = ATOM_SEMANTIC_SLOTS[property] ?? SHORTHAND_SEMANTIC_SLOTS[property];
  return slot ? { scope: fallback.scope, ...slot } : { scope: fallback.scope, group: property, conflicts: [property] };
}
