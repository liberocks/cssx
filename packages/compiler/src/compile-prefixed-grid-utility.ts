import { resolveArbitraryCssValue } from './utility-resolvers';
import type { UtilityDeclaration } from './utility-types';

/**
 * Compiles grid template, placement, and order utilities.
 *
 * @param utility Utility name without variants.
 * @param negative Whether a numeric order value is negated.
 * @returns Grid declaration, or null when unsupported.
 */
export function compilePrefixedGridUtility(utility: string, negative: boolean): UtilityDeclaration | null {
  const grid = /^grid-cols-(\d+|\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (grid) {
    const value = grid[1]!;
    return {
      property: 'grid-template-columns',
      value: /^\d+$/.test(value) ? `repeat(${value}, minmax(0, 1fr))` : resolveArbitraryCssValue(value),
    };
  }
  if (utility === 'grid-cols-subgrid') {
    return { property: 'grid-template-columns', value: 'subgrid' };
  }
  const gridRows = /^grid-rows-(\d+|\[[^\]]+\]|\(--[a-z0-9_-]+\))$/i.exec(utility);
  if (gridRows) {
    const value = gridRows[1]!;
    return {
      property: 'grid-template-rows',
      value: /^\d+$/.test(value) ? `repeat(${value}, minmax(0, 1fr))` : resolveArbitraryCssValue(value),
    };
  }
  if (utility === 'grid-rows-subgrid') {
    return { property: 'grid-template-rows', value: 'subgrid' };
  }
  const span = /^(col|row)-span-(\d+|full)$/.exec(utility);
  if (span) {
    return {
      property: span[1] === 'col' ? 'grid-column' : 'grid-row',
      value: span[2] === 'full' ? '1 / -1' : `span ${span[2]} / span ${span[2]}`,
    };
  }
  const gridLine = /^(col|row)-(start|end)-(\d+|auto)$/.exec(utility);
  if (gridLine) {
    return {
      property: `grid-${gridLine[1] === 'col' ? 'column' : 'row'}-${gridLine[2]}`,
      value: gridLine[3]!,
    };
  }
  const order = /^order-(first|last|none|\d+)$/.exec(utility);
  if (order) {
    const values: Readonly<Record<string, string>> = { first: '-9999', last: '9999', none: '0' };
    const value = values[order[1]!] ?? order[1]!;
    return {
      property: 'order',
      value: negative && value !== '0' ? (value.startsWith('-') ? value.slice(1) : `-${value}`) : value,
    };
  }
  return null;
}
