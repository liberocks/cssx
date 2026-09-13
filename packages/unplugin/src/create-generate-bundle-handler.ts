import { dataFromMetadata } from './data-from-metadata';
import type { ModuleCssxData } from './module-cssx-data';
import { moduleId, resolveCssFileName } from './options';
import type { CssxPluginOptions } from './options';
import { compileCssxStylesheet, cssSourceMap, cssWithSourceMapComment } from './stylesheet';
import type { CssxSourceModule } from './stylesheet-types';

/** Rollup-compatible context used to read metadata and emit final assets. */
export interface RollupLikeContext {
  /**
   * Returns module information, including metadata when it is available.
   *
   * @param id Source module ID.
   * @returns Module information or null when the module is absent.
   */
  getModuleInfo(id: string): { readonly meta?: unknown } | null;
  /**
   * Emits one asset into the current build output.
   *
   * @param asset CSS asset to emit.
   * @param asset.type Asset category.
   * @param asset.fileName Relative output file name.
   * @param asset.source CSS asset contents.
   * @returns The build tool's emitted-file reference.
   */
  emitFile(asset: { readonly type: 'asset'; readonly fileName: string; readonly source: string }): unknown;
}

/** One output item from a Rollup-compatible bundle. */
export interface RollupLikeOutput {
  /** Output item kind, such as `chunk` or `asset`. */
  readonly type: string;
  /** Source modules included by a chunk. */
  readonly modules?: Readonly<Record<string, unknown>>;
}

/** A Rollup-compatible output bundle indexed by output file name. */
export type RollupLikeBundle = Readonly<Record<string, RollupLikeOutput>>;

/** Configuration captured by a Rollup-compatible generateBundle handler. */
export interface GenerateBundleHandlerOptions {
  /** Current build-tool framework name. */
  readonly framework: string;
  /** CSSX adapter options. */
  readonly options: CssxPluginOptions;
  /** Relative stylesheet output template. */
  readonly cssFileName: string;
  /** Whether a source map should be generated. */
  readonly sourceMap: boolean;
  /** CSSX records gathered while transforming modules. */
  readonly rollupDataById: Map<string, ModuleCssxData>;
  /** Loads the active theme source. */
  readonly getTheme: () => Promise<string | undefined>;
}

/**
 * Creates the handler that compiles live bundle modules and emits final CSS assets.
 *
 * @param configuration Values captured for one adapter instance.
 * @returns A Rollup-compatible `generateBundle` hook.
 */
export function createGenerateBundleHandler(configuration: GenerateBundleHandlerOptions) {
  return async function (this: RollupLikeContext, _outputOptions: unknown, bundle: RollupLikeBundle): Promise<void> {
    const { framework, options, cssFileName, sourceMap, rollupDataById, getTheme } = configuration;
    const liveIds = new Set(
      Object.values(bundle)
        .flatMap((output) => (output.type === 'chunk' ? Object.keys(output.modules ?? {}) : []))
        .map(moduleId),
    );
    if (framework !== 'vite') {
      for (const id of rollupDataById.keys()) {
        if (!liveIds.has(id)) {
          rollupDataById.delete(id);
        }
      }
    }
    const data: CssxSourceModule[] =
      framework === 'vite'
        ? [...rollupDataById.values()]
        : [...liveIds].map((id) => {
            const metadata = dataFromMetadata(this.getModuleInfo(id)?.meta);
            return Object.keys(metadata.candidates).length > 0 ? metadata : (rollupDataById.get(id) ?? metadata);
          });
    const compiled = await compileCssxStylesheet(
      data,
      await getTheme(),
      options.layer,
      sourceMap,
      options.darkMode,
      options.preflight,
    );
    if (!compiled.css) {
      return;
    }
    const fileName = resolveCssFileName(cssFileName, compiled.css);
    if (Object.hasOwn(bundle, fileName)) {
      throw new Error(`CSSX CSS asset collision at "${fileName}".`);
    }
    this.emitFile({
      type: 'asset',
      fileName,
      source: cssWithSourceMapComment(compiled, fileName),
    });
    if (compiled.map) {
      const mapFileName = `${fileName}.map`;
      if (Object.hasOwn(bundle, mapFileName)) {
        throw new Error(`CSSX CSS map asset collision at "${mapFileName}".`);
      }
      this.emitFile({ type: 'asset', fileName: mapFileName, source: cssSourceMap(compiled.map, fileName) });
    }
  };
}
