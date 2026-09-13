import type { ClassNameOptions, DarkMode, ReusabilityBudget } from '@cssxio/compiler';

export { assertPluginOptions } from './assert-plugin-options';
export { loadTheme } from './load-theme';
export { moduleId } from './module-id';
export { resolveCssFileName } from './resolve-css-file-name';
export { resolveEsbuildAssetPath } from './resolve-esbuild-asset-path';
export { stableId } from './stable-id';
export { viteCssPath } from './vite-css-path';

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
  /** Uses source-addressed composite class names across independent compiler processes. */
  readonly stableClassNames?: boolean;
  /** Activates `dark` variants with a media query, `[data-theme=dark]`, or a `.dark` class. */
  readonly darkMode?: DarkMode;
  /** Adds browser baseline rules before generated utilities. Defaults to `true`. */
  readonly preflight?: boolean;
}
