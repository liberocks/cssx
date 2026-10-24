import type { FileState } from '../state/plugin-types';
import { markEmittedClassNames } from './mark-emitted-class-names';

/** Marks one composite class from a local style map as reachable. */
export function markStyleClass(state: FileState, styleName: string, key: string): void {
  const className = state.styleClasses.get(styleName)?.[key];
  if (className) {
    markEmittedClassNames(className, state);
  }
}
