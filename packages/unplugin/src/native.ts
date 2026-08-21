import { compileCssxStylesheet, cssSourceMap, cssWithSourceMapComment, type CssxSourceModule } from './stylesheet';
import { resolveCssFileName } from './options';

/** A native bundler module that can store CSSX build metadata. */
interface ModuleWithCssxRules {
  /** Mutable metadata collected while the module is transformed. */
  buildInfo?: Record<string, unknown>;
  /** Resolved source path when the bundler exposes one. */
  resource?: string;
}

/** The compilation methods used to collect modules and emit CSS assets. */
interface CompilationLike {
  /** Modules included in the current compilation. */
  readonly modules: Iterable<ModuleWithCssxRules>;
  /** Lifecycle hooks used to add final build assets. */
  readonly hooks: {
    /** Hook that runs while compilation assets are processed. */
    readonly processAssets: {
      /**
       * Registers asynchronous work at a compilation asset stage.
       *
       * @param options Plugin name and build lifecycle stage.
       * @param options.name Plugin name shown by the build tool.
       * @param options.stage Build lifecycle stage for the callback.
       * @param callback Asynchronous asset generation work.
       * @returns Nothing after the callback is registered.
       */
      tapPromise(options: { readonly name: string; readonly stage: number }, callback: () => Promise<void>): void;
    };
  };
  /**
   * Returns an existing asset when the bundler supports asset lookup.
   *
   * @param fileName Output asset file name.
   * @returns The existing asset, or undefined when it does not exist.
   */
  getAsset?(fileName: string): unknown;
  /**
   * Adds an asset to the compilation output.
   *
   * @param fileName Output asset file name.
   * @param source Asset source object.
   * @returns Nothing after the asset is added.
   */
  emitAsset(fileName: string, source: unknown): void;
}

/** Native compiler API shared by webpack and Rspack adapters. */
export interface NativeCompiler {
  /** Bundler constructors, asset stage constants, and source constructors. */
  readonly webpack: {
    /** Compilation constants used to select a build lifecycle stage. */
    readonly Compilation: { readonly PROCESS_ASSETS_STAGE_ADDITIONS: number };
    /** Source constructors used for emitted asset contents. */
    readonly sources: { readonly RawSource: new (source: string) => unknown };
  };
  /** Compiler lifecycle hooks. */
  readonly hooks: {
    /** Hook that creates each native bundler compilation. */
    readonly thisCompilation: {
      /**
       * Registers work for every compilation.
       *
       * @param name Plugin name used by the compiler.
       * @param callback Function called with the new compilation.
       * @returns Nothing after the callback is registered.
       */
      tap(name: string, callback: (compilation: CompilationLike) => void): void;
    };
  };
}

/**
 * Stores source metadata on native bundler modules for final asset aggregation.
 *
 * @param context Transform context that may provide native bundler details.
 * @param context.getNativeBuildContext Optional function that returns native build details.
 * @param data CSSX data collected from the transformed source module.
 * @param metadataKey Key used to retain the data on the module.
 * @returns Nothing when the context is not a native bundler context.
 */
export function storeCompilationData(
  context: { getNativeBuildContext?: (() => unknown) | undefined },
  data: unknown,
  metadataKey: string,
): void {
  const native = context.getNativeBuildContext?.() as
    | { readonly framework: 'webpack' | 'rspack'; readonly loaderContext?: { readonly _module?: ModuleWithCssxRules } }
    | undefined;
  if (!native || (native.framework !== 'webpack' && native.framework !== 'rspack')) {
    return;
  }
  const module = native.loaderContext?._module;
  if (!module) {
    return;
  }
  const buildInfo = module.buildInfo ?? (module.buildInfo = {});
  buildInfo[metadataKey] = data;
}

/**
 * Emits the final stylesheet and source map through a native compiler lifecycle.
 *
 * @param compiler Native compiler that owns the compilation lifecycle.
 * @param cssFileName Relative CSS output path template.
 * @param getTheme Function that loads the current theme before CSS compilation.
 * @param layer Optional CSS layer that wraps generated CSS.
 * @param sourceMap Whether to generate a CSS source map.
 * @param metadataKey Key used to read transformed module data.
 * @returns Nothing after registering the compilation asset handler.
 */
export function configureCompilationAsset(
  compiler: NativeCompiler,
  cssFileName: string,
  getTheme: () => Promise<string | undefined>,
  layer: string | undefined,
  sourceMap: boolean,
  metadataKey: string,
  transformedDataById?: ReadonlyMap<string, CssxSourceModule>,
): void {
  compiler.hooks.thisCompilation.tap('@cssxio/unplugin', (compilation) => {
    compilation.hooks.processAssets.tapPromise(
      {
        name: '@cssxio/unplugin',
        stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
      },
      async () => {
        const sourceData = [...compilation.modules].map((module) =>
          sourceDataFromModule(module, metadataKey, transformedDataById),
        );
        const compiled = await compileCssxStylesheet(
          sourceData.some((data) => Object.keys(data.candidates).length > 0)
            ? sourceData
            : [...(transformedDataById?.values() ?? [])],
          await getTheme(),
          layer,
          sourceMap,
        );
        if (!compiled.css) {
          return;
        }
        const finalCssFileName = resolveCssFileName(cssFileName, compiled.css);
        if (compilation.getAsset?.(finalCssFileName)) {
          throw new Error(`CSSX CSS asset collision at "${finalCssFileName}".`);
        }
        compilation.emitAsset(
          finalCssFileName,
          new compiler.webpack.sources.RawSource(cssWithSourceMapComment(compiled, finalCssFileName)),
        );
        if (compiled.map) {
          const mapFileName = `${finalCssFileName}.map`;
          if (compilation.getAsset?.(mapFileName)) {
            throw new Error(`CSSX CSS map asset collision at "${mapFileName}".`);
          }
          compilation.emitAsset(
            mapFileName,
            new compiler.webpack.sources.RawSource(cssSourceMap(compiled.map, finalCssFileName)),
          );
        }
      },
    );
  });
}

/**
 * Reads CSSX source data stored on one native bundler module.
 *
 * @param module Native bundler module to read.
 * @param metadataKey Key used to store CSSX metadata.
 * @returns Valid source data or an empty record when no valid data exists.
 */
function sourceDataFromModule(
  module: ModuleWithCssxRules,
  metadataKey: string,
  transformedDataById: ReadonlyMap<string, CssxSourceModule> | undefined,
): CssxSourceModule {
  const value = module.buildInfo?.[metadataKey];
  if (!value || typeof value !== 'object') {
    return (
      transformedDataById?.get(module.resource?.split('?', 1)[0] ?? '') ?? {
        id: '',
        candidates: {},
        composites: {},
        origins: {},
      }
    );
  }
  const { id, candidates, composites, atomicClasses, origins } = value as Partial<CssxSourceModule>;
  return {
    id: typeof id === 'string' ? id : '',
    candidates: candidates && typeof candidates === 'object' ? candidates : {},
    composites: composites && typeof composites === 'object' ? composites : {},
    ...(Array.isArray(atomicClasses) ? { atomicClasses } : {}),
    origins: origins && typeof origins === 'object' ? origins : {},
  };
}
