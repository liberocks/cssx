import { markEmittedClassNames } from './mark-emitted-class-names';
import type { FileState } from './plugin-types';

/** Marks one composite class from a local style map as reachable. */
export function markStyleClass(state: FileState, styleName: string, key: string): void {
  const className = state.styleClasses.get(styleName)?.[key];
  if (className) {
    markEmittedClassNames(className, state);
  }
}
