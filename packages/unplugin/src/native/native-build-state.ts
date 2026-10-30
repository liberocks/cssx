import type { ClassNameAllocator } from '@cssxio/compiler';

import type { NextDevelopmentHmrConnection } from '../adapters/next-development-server';
import type { CssxPluginOptions } from '../core/options';
import { developmentPluginOptions, effectiveClassNameOptions, productionClassNameOptions } from '../core/options';
import { createClassNameAllocator } from '../transforms/class-name-allocator';
import type { ModuleCssxData } from '../transforms/module-cssx-data';
import { nativeBuildStateKey } from './native-build-state-key';

/** CSSX state shared by native compiler instances in one project build. */
export interface NativeBuildState {
  /** Serial allocator shared so server and client transforms cannot collide. */
  readonly classNameAllocator: ClassNameAllocator;
  /** Deterministic content-hash allocator shared by development compiler workers. */
  readonly developmentClassNameAllocator: ClassNameAllocator;
  /** Module records merged into the public client stylesheet. */
  readonly transformedDataById: Map<string, ModuleCssxData>;
  /** Development-only CSS push connection shared by native compiler transforms. */
  developmentHmr?: NextDevelopmentHmrConnection;
  /** Last full development stylesheet published for this compiler instance. */
  developmentStylesheet?: string;
  /** Publishes the current metadata without waiting for final JavaScript assets. */
  notifyDevelopmentStylesheet?: () => Promise<void>;
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
    state = {
      classNameAllocator: options.classNameAllocator ?? createClassNameAllocator(productionClassNameOptions(options)),
      developmentClassNameAllocator:
        options.classNameAllocator ??
        createClassNameAllocator(effectiveClassNameOptions(developmentPluginOptions(options))),
      transformedDataById: new Map(),
    };
    nativeBuildStates.set(key, state);
  }
  return state;
}
