import type { FileState } from './plugin-types';

/** Retains each generated composite or fallback atom referenced by a class string. */
export function markEmittedClassNames(classNames: string, state: FileState): void {
  for (const className of classNames.split(/\s+/).filter(Boolean)) {
    if (state.composites.has(className)) {
      state.liveComposites.add(className);
    } else {
      state.liveFallbackClasses.add(className);
    }
  }
}
