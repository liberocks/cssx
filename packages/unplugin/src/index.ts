import { createClassNameAllocator, type CssxRule } from '@cssxio/compiler';
import { createUnplugin } from 'unplugin';
import type { UnpluginFactory } from 'unplugin';
import { Buffer } from 'node:buffer';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { configureCompilationAsset, storeCompilationData, type NativeCompiler } from './native';
import {
  assertPluginOptions,
  loadTheme,
  moduleId,
  resolveCssFileName,
  resolveEsbuildAssetPath,
  viteCssPath,
  type CssxPluginOptions,
} from './options';
import { compileCssxStylesheet, cssSourceMap, cssWithSourceMapComment, type CssxSourceModule } from './stylesheet';
import { sourceMapFromContext, transformCssxModule } from './transform';
import { sendViteStyles } from './vite-dev';

export {
  compileCssxStylesheet,
  type CssxCandidateOrigin,
  type CssxSourceModule,
  type CssxSourceMap,
  type CssxStylesheet,
} from './stylesheet';
export type { CssxPluginOptions } from './options';
export { transformCssxModule, type IncomingSourceMap, type TransformResult } from './transform';

/** Metadata key used to retain transformed CSSX data until assets are emitted. */
const RULES_METADATA_KEY = '@cssxio/unplugin/rules';
/** Matches JavaScript and TypeScript module IDs, with an optional query. */
const SCRIPT_ID = /\.[cm]?[jt]sx?(?:\?.*)?$/;

/** CSSX data collected for one transformed module. */
interface ModuleCssxData extends CssxSourceModule {
  /** Compiled CSS rules from the source module. */
  readonly rules: readonly CssxRule[];
  /** Signature used to distinguish declaration-only development changes. */
  readonly cssOnlySignature: string;
}

/** Rollup-compatible context used to read metadata and emit final assets. */
interface RollupLikeContext {
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
interface RollupLikeOutput {
  /** Output item kind, such as `chunk` or `asset`. */
  readonly type: string;
  /** Source modules included by a chunk. */
  readonly modules?: Readonly<Record<string, unknown>>;
}

/** A Rollup-compatible output bundle indexed by output file name. */
type RollupLikeBundle = Readonly<Record<string, RollupLikeOutput>>;

/** Development server API used to serve and refresh the in-memory stylesheet. */
interface ViteServerLike {
  /** Server configuration used to determine the base URL. */
  readonly config: { readonly base?: string };
  /** Optional file watcher used to remove deleted modules. */
  readonly watcher?: {
    /**
     * Registers a listener for a watched file event.
     *
     * @param event Watched file event name.
     * @param listener Function called with the deleted file path.
     * @returns The watcher registration result.
     */
    on(event: 'unlink', listener: (path: string) => void): unknown;
  };
  /** Middleware stack that serves the development stylesheet and source map. */
  readonly middlewares: {
    /**
     * Adds one development server middleware handler.
     *
     * @param handler Function that serves the CSSX stylesheet or continues the request.
     * @returns Nothing after the handler is registered.
     */
    use(
      handler: (
        request: { readonly url?: string },
        response: { setHeader(name: string, value: string): void; end(body?: string): void },
        next: () => void,
      ) => void,
    ): void;
  };
  /** WebSocket transport used to request stylesheet-link refreshes. */
  readonly ws: {
    /** Sends a native Vite stylesheet update. */
    send(payload: {
      /** Marks this as a standard Vite update. */
      readonly type: 'update';
      /** CSS asset update handled by Vite's built-in client. */
      readonly updates: readonly {
        readonly type: 'css-update';
        readonly path: string;
        readonly acceptedPath: string;
        readonly timestamp: number;
      }[];
    }): void;
  };
}

/** The Vite module details needed to suppress an SSR-only page reload. */
interface ViteHotUpdateModule {
  readonly id?: string;
  readonly url?: string;
}

/** Vite environment services used to refresh transformed SSR CSSX modules. */
interface ViteHotUpdatePluginContext {
  readonly environment?: {
    readonly name?: string;
    readonly moduleGraph?: {
      invalidateModule(
        module: ViteHotUpdateModule,
        invalidatedModules?: Set<ViteHotUpdateModule>,
        timestamp?: number,
        isHmr?: boolean,
      ): void;
    };
    readonly runner?: {
      readonly evaluatedModules?: {
        getModuleById(id: string): unknown;
        invalidateModule(module: unknown): void;
      };
    };
    transformRequest(url: string): Promise<unknown>;
  };
}

/** Invalidates evaluated SSR modules after eager style metadata regeneration. */
function invalidateViteRunner(
  environment: NonNullable<ViteHotUpdatePluginContext['environment']>,
  modules: readonly ViteHotUpdateModule[],
  timestamp: number,
): void {
  const invalidated = new Set<ViteHotUpdateModule>();
  for (const module of modules) {
    environment.moduleGraph?.invalidateModule(module, invalidated, timestamp, true);
  }
  for (const module of invalidated) {
    if (!module.id) {
      continue;
    }
    const evaluated = environment.runner?.evaluatedModules?.getModuleById(module.id);
    if (evaluated) {
      environment.runner?.evaluatedModules?.invalidateModule(evaluated);
    }
  }
}

/**
 * Reads CSSX module data from build metadata.
 *
 * @param metadata Build metadata to inspect.
 * @returns Valid module data or an empty data record.
 */
function dataFromMetadata(metadata: unknown): ModuleCssxData {
  if (!metadata || typeof metadata !== 'object') {
    return { id: '', rules: [], candidates: {}, composites: {}, origins: {}, cssOnlySignature: '' };
  }
  return dataFromValue((metadata as Record<string, unknown>)[RULES_METADATA_KEY]);
}

/**
 * Validates a value read from build metadata as CSSX module data.
 *
 * @param value Metadata value to validate.
 * @returns Valid module data or an empty data record.
 */
function dataFromValue(value: unknown): ModuleCssxData {
  if (!value || typeof value !== 'object') {
    return { id: '', rules: [], candidates: {}, composites: {}, origins: {}, cssOnlySignature: '' };
  }
  const { id, rules, candidates, composites, atomicClasses, origins, cssOnlySignature } =
    value as Partial<ModuleCssxData>;
  return {
    id: typeof id === 'string' ? id : '',
    rules: Array.isArray(rules) ? rules : [],
    candidates: candidates && typeof candidates === 'object' ? candidates : {},
    composites: composites && typeof composites === 'object' ? composites : {},
    ...(Array.isArray(atomicClasses) ? { atomicClasses } : {}),
    origins: origins && typeof origins === 'object' ? origins : {},
    cssOnlySignature: typeof cssOnlySignature === 'string' ? cssOnlySignature : '',
  };
}

/**
 * Low-level factory used by Unplugin to create a CSSX adapter for one build tool.
 *
 * @param options CSSX adapter options.
 * @param meta Unplugin metadata that identifies the active build tool.
 * @returns The hooks and lifecycle handlers for that build tool.
 */
export const unpluginFactory: UnpluginFactory<CssxPluginOptions | undefined> = (options = {}, meta) => {
  assertPluginOptions(options);
  /** Relative CSS output path template used by this adapter instance. */
  const cssFileName = options.cssFileName ?? 'cssx.css';
  /** Whether the generated stylesheet includes a CSS source map. */
  const sourceMap = options.sourceMap ?? true;
  /** Transformed module data retained for Rollup-compatible output generation. */
  const rollupDataById = new Map<string, ModuleCssxData>();
  /** Serial namespace shared by every module transformed by this adapter instance. */
  const classNameAllocator = createClassNameAllocator();
  /** Transformed module data retained for the universal esbuild adapter. */
  const esbuildDataById = new Map<string, ModuleCssxData>();
  /** CSS asset written by the universal esbuild adapter in the previous build. */
  let emittedEsbuildAsset: string | undefined;
  /** Working directory used to normalize universal esbuild module IDs. */
  let esbuildWorkingDirectory = process.cwd();
  /** Active Vite development server, available after server configuration. */
  let viteServer: ViteServerLike | undefined;
  /**
   * Loads the current inline or file-based theme before CSS is compiled.
   *
   * @returns A promise for the configured theme source, or undefined.
   */
  const getTheme = (): Promise<string | undefined> => loadTheme(options);
  /**
   * Collects data from live output modules and emits the production stylesheet.
   *
   * @param _outputOptions Build output options, which CSSX does not need.
   * @param bundle Output bundle used to identify modules that remain in the build.
   * @returns Nothing after CSS and its optional source map are emitted.
   */
  const generateBundle = async function (
    this: RollupLikeContext,
    _outputOptions: unknown,
    bundle: RollupLikeBundle,
  ): Promise<void> {
    const liveIds = new Set(
      Object.values(bundle)
        .flatMap((output) => (output.type === 'chunk' ? Object.keys(output.modules ?? {}) : []))
        .map(moduleId),
    );
    if (meta.framework !== 'vite') {
      for (const id of rollupDataById.keys()) {
        if (!liveIds.has(id)) {
          rollupDataById.delete(id);
        }
      }
    }
    const data =
      meta.framework === 'vite'
        ? [...rollupDataById.values()]
        : [...liveIds].map((id) => {
            const metadata = dataFromMetadata(this.getModuleInfo(id)?.meta);
            return Object.keys(metadata.candidates).length > 0 ? metadata : (rollupDataById.get(id) ?? metadata);
          });
    const compiled = await compileCssxStylesheet(data, await getTheme(), options.layer, sourceMap);
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

  return {
    name: '@cssxio/unplugin',
    enforce: 'pre',
    transform: {
      filter: { id: SCRIPT_ID },
      async handler(code, id) {
        if (options.themeFile) {
          this.addWatchFile?.(resolve(process.cwd(), options.themeFile));
        }
        const transformed = await transformCssxModule(
          code,
          id,
          {
            ...options,
            classNameAllocator,
          },
          sourceMapFromContext(this, id),
        );
        const data = {
          id: moduleId(id),
          rules: transformed?.rules ?? [],
          candidates: transformed?.candidates ?? {},
          composites: transformed?.composites ?? {},
          atomicClasses: transformed?.atomicClasses ?? [],
          origins: transformed?.origins ?? {},
          cssOnlySignature: transformed?.cssOnlySignature ?? '',
        };
        storeCompilationData(this, data, RULES_METADATA_KEY);
        rollupDataById.set(moduleId(id), data);

        if (meta.framework === 'vite' && viteServer) {
          sendViteStyles(viteServer, viteCssPath('/', cssFileName));
        }

        esbuildDataById.set(resolve(esbuildWorkingDirectory, id.split('?', 1)[0] ?? id), data);

        const transformedCode = transformed?.code ?? code;
        return {
          code:
            (meta.framework === 'webpack' || meta.framework === 'rspack') && transformed
              ? `${transformedCode}\n${nativeStylesheetHmr(cssFileName)}`
              : transformedCode,
          meta: { [RULES_METADATA_KEY]: data },
          ...(transformed?.map ? { map: transformed.map } : {}),
        };
      },
    },
    watchChange(id, change) {
      if (change.event === 'delete') {
        rollupDataById.delete(moduleId(id));
      }
    },
    rollup: { generateBundle },
    vite: {
      generateBundle,
      configureServer(server: ViteServerLike) {
        viteServer = server;
        const cssPath = viteCssPath(server.config.base, cssFileName);
        const hmrPath = viteCssPath('/', cssFileName);
        server.watcher?.on('unlink', (path) => {
          rollupDataById.delete(moduleId(path));
          sendViteStyles(server, hmrPath);
        });
        server.middlewares.use((request, response, next) => {
          const pathname = request.url?.split('?', 1)[0];
          if (pathname !== cssPath && (pathname !== `${cssPath}.map` || !sourceMap)) {
            return next();
          }
          void getTheme()
            .then((theme) => compileCssxStylesheet([...rollupDataById.values()], theme, options.layer, sourceMap))
            .then((compiled) => {
              if (pathname === `${cssPath}.map`) {
                response.setHeader('Content-Type', 'application/json; charset=utf-8');
                response.setHeader('Cache-Control', 'no-store');
                response.end(compiled.map ? cssSourceMap(compiled.map, cssFileName) : '');
                return;
              }
              response.setHeader('Content-Type', 'text/css; charset=utf-8');
              response.setHeader('Cache-Control', 'no-store');
              response.end(cssWithSourceMapComment(compiled, cssFileName));
            })
            .catch((error: unknown) => {
              response.setHeader('Content-Type', 'text/plain; charset=utf-8');
              response.end(error instanceof Error ? error.message : 'Unable to compile CSSX development stylesheet.');
            });
        });
      },
      hotUpdate: {
        order: 'pre',
        async handler(this: any, context: any): Promise<any> {
          const environment = this.environment;
