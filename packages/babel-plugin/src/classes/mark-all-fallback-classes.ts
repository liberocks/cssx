import type { FileState } from '../state/plugin-types';
import { markFallbackClasses } from './mark-fallback-classes';

/** Marks atomic fallback classes for every surviving style in one map. */
export function markAllFallbackClasses(state: FileState, styleName: string): void {
  for (const key of Object.keys(state.styles.get(styleName)!)) {
    markFallbackClasses(state, styleName, key);
  }
}
