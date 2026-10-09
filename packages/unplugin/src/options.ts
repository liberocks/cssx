import type { ClassNameOptions, DarkMode, ReusabilityBudget } from '@cssxio/compiler';

import type { CssxNextMdxOptions } from './next-mdx';

export { assertPluginOptions } from './assert-plugin-options';
export { loadTheme } from './load-theme';
export { moduleId } from './module-id';
export { resolveCssFileName } from './resolve-css-file-name';
export { resolveEsbuildAssetPath } from './resolve-esbuild-asset-path';
export { stableId } from './stable-id';
export { viteCssPath } from './vite-css-path';

/** Resolves independently selected naming format onto compiler allocator options. */
export function effectiveClassNameOptions(options: CssxPluginOptions): ClassNameOptions {
  const variant = options.naming === 'hash' ? 'random' : options.naming === 'serial' ? 'serial' : undefined;
  if (variant && options.className?.variant && options.className.variant !== variant) {
    throw new Error(
      `CSSX naming: "${options.naming}" conflicts with className.variant: "${options.className.variant}".`,
    );
  }
  return { ...options.className, ...(variant ? { variant } : {}) };
}

/** Options for a CSSX bundler adapter. */
export interface CssxPluginOptions {
  /** Module specifier that identifies source files using the CSSX runtime. */
  readonly importSource?: string;
  /** Relative output path for extracted CSS. The default is `cssx.css`. */
  readonly cssFileName?: string;
  /** Whether to generate a CSS source map. The default is `true`. */
  readonly sourceMap?: boolean;
  /** CSSX `@theme` source applied while transforming and compiling CSS. */
  readonly theme?: string;
  /** Path to a CSSX `@theme` file. Cannot be used with `theme`. */
  readonly themeFile?: string;
  /** Optional CSS layer that wraps the generated CSS. */
  readonly layer?: string;
  /** Controls how aggressively static styles share generated class fragments. */
  readonly reusabilityBudget?: ReusabilityBudget;
  /** Options that control generated class names. */
  readonly className?: ClassNameOptions;
  /** Allocator shared across transforms in this process. Cannot be serialized. */
  readonly classNameAllocator?: import('@cssxio/compiler').ClassNameAllocator;
  /** Generated composite naming strategy. Defaults to allocated serial names. */
  readonly naming?: 'serial' | 'hash' | 'source';
  /** How independent compiler processes coordinate allocations. */
  readonly coordination?: 'memory' | 'manifest';
  /** Persisted allocator state path used by manifest coordination. */
  readonly manifestPath?: string;
  /** Serializable remark, rehype, and recma plugin names for Next.js MDX. */
  readonly mdx?: CssxNextMdxOptions;
  /** Additional project-relative or absolute source roots included by Next.js preparation. */
  readonly sourceRoots?: readonly string[];
  /** Writes an output diagnostic report; `true` prints the summary only. */
  readonly debug?: boolean | { readonly reportFile: string };
  /** Uses source-addressed composite class names across independent compiler processes. */
  readonly stableClassNames?: boolean;
  /** Activates `dark` variants with a media query, `[data-theme=dark]`, or a `.dark` class. */
  readonly darkMode?: DarkMode;
  /** Adds browser baseline rules before generated utilities. Defaults to `true`. */
  readonly preflight?: boolean;
}
