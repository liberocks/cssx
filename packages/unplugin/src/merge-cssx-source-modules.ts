import type { CssxSourceModule } from './stylesheet-types';

/**
 * Combines current compilation metadata with transformed records from sibling native compilers.
 *
 * @param sourceData Records attached to modules in the current compilation.
 * @param transformedData Records retained while every native compiler transforms modules.
 * @returns One record per module, preferring current compilation metadata for duplicate IDs.
 */
export function mergeCssxSourceModules(
  sourceData: readonly CssxSourceModule[],
  transformedData: Iterable<CssxSourceModule>,
): CssxSourceModule[] {
  const dataById = new Map<string, CssxSourceModule>();
  const anonymousData: CssxSourceModule[] = [];
  for (const data of transformedData) {
    if (data.id) {
      dataById.set(data.id, data);
    } else {
      anonymousData.push(data);
    }
  }
  for (const data of sourceData) {
    if (data.id) {
      dataById.set(data.id, data);
    } else {
      anonymousData.push(data);
    }
  }
  return [...dataById.values(), ...anonymousData];
}
