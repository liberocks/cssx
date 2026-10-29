import type { ClassNameOptions, DarkMode, ReusabilityBudget } from '@cssxio/compiler';

import type { CssxNextMdxOptions } from '../adapters/next-mdx';

export { assertPluginOptions } from './assert-plugin-options';
export { loadTheme } from './load-theme';
export { moduleId } from '../transforms/module-id';
export { resolveCssFileName } from '../transforms/resolve-css-file-name';
export { resolveEsbuildAssetPath } from '../transforms/resolve-esbuild-asset-path';
export { stableId } from './stable-id';
export { viteCssPath } from '../adapters/vite-css-path';

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

/** Selects the unoptimized settings used for warm development transforms. */
export function developmentPluginOptions(options: CssxPluginOptions): CssxPluginOptions {
  return {
    ...options,
    mode: 'development',
    sourceMap: options.sourceMap ?? false,
    naming: 'source',
    stableClassNames: true,
    stableClassNameStrategy: 'module-order',
    reusabilityBudget: 0,
    className: { ...options.className, variant: 'random' },
    classNameAllocator: undefined,
    coordination: 'memory',
    manifestPath: undefined,
  };
}

/** Resolves an explicit mode before inferring development from the active build. */
export function isDevelopmentMode(
  options: CssxPluginOptions,
  signals: { readonly watchMode?: boolean; readonly bundlerMode?: string; readonly viteDevServer?: boolean } = {},
): boolean {
  if (options.mode !== undefined) {
    return options.mode === 'development';
  }
  return (
    process.env.NODE_ENV === 'development' ||
    signals.watchMode === true ||
    signals.bundlerMode === 'development' ||
    signals.viteDevServer === true
  );
}

/** Options for a CSSX bundler adapter. */
export interface CssxPluginOptions {
  /** Selects development HMR output or optimized production output explicitly. */
  readonly mode?: 'development' | 'production';
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
  /** Selects development composite identities independent of utility literal lengths. */
  readonly stableClassNameStrategy?: 'source-location' | 'module-order';
  /** Activates `dark` variants with a media query, `[data-theme=dark]`, or a `.dark` class. */
  readonly darkMode?: DarkMode;
  /** Adds browser baseline rules before generated utilities. Defaults to `true`. */
  readonly preflight?: boolean;
}
