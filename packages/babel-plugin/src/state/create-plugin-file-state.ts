import { createClassNameAllocator } from '@cssxio/compiler';

import type { CssxPluginOptions, FileState } from './plugin-types';

/**
 * Creates isolated bookkeeping for one transformed source module.
 *
 * @param options Plugin options that may provide a shared class allocator.
 * @returns Fresh maps and sets with the configured class-name allocator.
 */
export function createPluginFileState(options: CssxPluginOptions): FileState {
  return {
    classNameAllocator: options.classNameAllocator ?? createClassNameAllocator(options.className),
    styles: new Map(),
    styleCandidates: new Map(),
    styleClasses: new Map(),
    classes: new Map(),
    candidateOrigins: new Map(),
    liveCandidates: new Set(),
    composites: new Map(),
    liveComposites: new Set(),
    liveFallbackClasses: new Set(),
    cssRanges: [],
  };
}
