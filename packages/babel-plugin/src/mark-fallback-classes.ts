import type { FileState } from './plugin-types';

/** Marks atomic fallback classes for one compiled style that survives at runtime. */
export function markFallbackClasses(state: FileState, styleName: string, key: string): void {
  for (const record of state.styles.get(styleName)?.[key]?._ ?? []) {
    if (record[0]) {
      state.liveFallbackClasses.add(record[0]);
    }
  }
}
