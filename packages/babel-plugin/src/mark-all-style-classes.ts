import { markEmittedClassNames } from './mark-emitted-class-names';
import type { FileState } from './plugin-types';

/** Marks every composite class from a local style map as reachable. */
export function markAllStyleClasses(state: FileState, styleName: string): void {
  for (const className of Object.values(state.styleClasses.get(styleName)!)) {
    markEmittedClassNames(className, state);
  }
}
