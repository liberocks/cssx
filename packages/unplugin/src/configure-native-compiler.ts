import { configureCompilationAsset } from './configure-compilation-asset';
import { RULES_METADATA_KEY } from './module-cssx-data';
import type { NativeCompiler } from './native';
import { nativeBuildState } from './native-build-state';
import type { CssxPluginOptions } from './options';
import { scanProjectCssxSourceModules } from './project-scan';

/** Inputs needed to connect one native compiler to the shared CSSX asset pipeline. */
export interface ConfigureNativeCompilerOptions {
  /** Webpack- or Rspack-compatible compiler instance. */
  readonly compiler: NativeCompiler;
  /** Options shared with this native adapter instance. */
  readonly options: CssxPluginOptions;
  /** Relative CSS output path template. */
  readonly cssFileName: string;
  /** Whether to generate a CSS source map. */
  readonly sourceMap: boolean;
  /** Loads the current theme before CSS is compiled. */
  readonly getTheme: () => Promise<string | undefined>;
}

/**
 * Connects a Webpack or Rspack compiler to the common stylesheet emitter.
 *
 * @param input Compiler, adapter settings, output path, and theme loader.
 * @param input.compiler Webpack- or Rspack-compatible compiler instance.
 * @param input.options Options shared with this native adapter instance.
 * @param input.cssFileName Relative CSS output path template.
 * @param input.sourceMap Whether to generate a CSS source map.
 * @param input.getTheme Loads the current theme before CSS is compiled.
 * @returns Nothing. Registers the native compilation asset hook.
 */
export function configureNativeCompiler({
  compiler,
  options,
  cssFileName,
  sourceMap,
  getTheme,
}: ConfigureNativeCompilerOptions): void {
  const sharedNativeState = nativeBuildState(compiler.context, options);
  configureCompilationAsset(
    compiler,
    cssFileName,
    getTheme,
    options.layer,
    sourceMap,
    RULES_METADATA_KEY,
    sharedNativeState.transformedDataById,
    options.darkMode,
    options.preflight,
    options.stableClassNames ? () => scanProjectCssxSourceModules(compiler.context, options) : undefined,
  );
}
