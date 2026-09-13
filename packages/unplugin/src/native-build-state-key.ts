import type { CssxPluginOptions } from './options';

/**
 * Creates a stable key for native compiler state shared by equivalent plugin instances.
 *
 * @param root Project root.
 * @param options CSSX adapter options.
 * @returns Stable native compiler state key.
 */
export function nativeBuildStateKey(root: string, options: CssxPluginOptions): string {
  return `${root}\u0000${JSON.stringify(options)}`;
}
