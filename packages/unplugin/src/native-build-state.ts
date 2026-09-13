import { createClassNameAllocator, type ClassNameAllocator } from '@cssxio/compiler';

import type { ModuleCssxData } from './module-cssx-data';
import { nativeBuildStateKey } from './native-build-state-key';
import type { CssxPluginOptions } from './options';

/** CSSX state shared by native compiler instances in one project build. */
export interface NativeBuildState {
  /** Serial allocator shared so server and client transforms cannot collide. */
  readonly classNameAllocator: ClassNameAllocator;
  /** Module records merged into the public client stylesheet. */
  readonly transformedDataById: Map<string, ModuleCssxData>;
}

/** Native state indexed by project root and equivalent plugin options. */
const nativeBuildStates = new Map<string, NativeBuildState>();

/**
 * Gets the state shared by sibling native compiler instances in one project build.
 *
 * @param root Project root.
 * @param options CSSX adapter options.
 * @returns Shared native build state.
 */
export function nativeBuildState(root: string, options: CssxPluginOptions): NativeBuildState {
  const key = nativeBuildStateKey(root, options);
  let state = nativeBuildStates.get(key);
  if (!state) {
    state = { classNameAllocator: createClassNameAllocator(), transformedDataById: new Map() };
    nativeBuildStates.set(key, state);
  }
  return state;
}
