import type { ReusableGroup } from './reusability';

/**
 * Selects positive-value groups without exceeding the configured atom coverage.
 *
 * @param groups Reusable groups that may be selected.
 * @param totalAtomOccurrences Total winning atom occurrences across all styles.
 * @param budget Coverage budget as a number from 0 through 100 or `'auto'`.
 * @returns Groups selected under the coverage budget.
 */
export function selectReusableGroups(
  groups: readonly ReusableGroup[],
  totalAtomOccurrences: number,
  budget: number | 'auto',
): readonly ReusableGroup[] {
  const eligible = groups.filter(
    (group) => group.score > 0 || (group.atomicClasses.length === 1 && group.compositionIndexes.length >= 3),
  );
  if (budget === 'auto') {
    return eligible;
  }
  const limit = Math.floor((totalAtomOccurrences * budget) / 100);
  const selected: ReusableGroup[] = [];
  let coverage = 0;
  for (const group of eligible) {
    if (coverage + group.coverage > limit) {
      continue;
    }
    selected.push(group);
    coverage += group.coverage;
  }
  return selected;
}
