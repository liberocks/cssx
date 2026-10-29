import { createClassNameAllocator } from '@cssxio/compiler';
import { createUnplugin } from 'unplugin';
import type { UnpluginFactory } from 'unplugin';

import type { ViteServerLike } from '../adapters/configure-vite-development-server';
import { createUniversalEsbuildHooks } from '../adapters/create-universal-esbuild-hooks';
import { createViteHotUpdateHandler } from '../adapters/create-vite-hot-update-handler';
import type { NextDevelopmentHmrConnection } from '../adapters/next-development-server';
import { configureNativeCompiler } from '../native/configure-native-compiler';
import type { NativeCompiler } from '../native/native';
import type { ModuleCssxData } from '../transforms/module-cssx-data';
import { createGenerateBundleHandler } from './create-generate-bundle-handler';
import {
  assertPluginOptions,
  developmentPluginOptions,
  effectiveClassNameOptions,
  isDevelopmentMode,
  loadTheme,
  moduleId,
  type CssxPluginOptions,
} from './options';

export {
  compileCssxStylesheet,
  type CssxCandidateOrigin,
  type CssxSourceModule,
  type CssxSourceMap,
  type CssxStylesheet,
} from '../native/stylesheet';
export type { CssxPluginOptions } from './options';
export { transformCssxModule, type IncomingSourceMap, type TransformResult } from '../transforms/transform';

/** Matches JavaScript, TypeScript, Astro, and Vue module IDs, with an optional query. */
const SCRIPT_ID = /\.(?:[cm]?[jt]sx?|astro|vue|md|mdx)(?:\?.*)?$/;

/**
 * Creates the CSSX adapter hooks consumed by Unplugin for one build tool.
 *
 * @param options CSSX adapter options.
 * @param meta Unplugin metadata that identifies the active build tool.
 * @returns The hooks and lifecycle handlers for that build tool.
 */
export const unpluginFactory: UnpluginFactory<CssxPluginOptions | undefined> = (options = {}, meta) => {
  assertPluginOptions(options);
  if (options.classNameAllocator && options.className) {
    throw new Error('CSSX classNameAllocator owns naming. Omit className when supplying a custom allocator.');
  }
  /** Relative CSS output path template used by this adapter instance. */
  const cssFileName = options.cssFileName ?? 'cssx.css';
  /** Whether the generated stylesheet includes a CSS source map. */
  const sourceMap = options.sourceMap ?? true;
  /** Transformed module data retained for Rollup-compatible output generation. */
  const rollupDataById = new Map<string, ModuleCssxData>();
  /** Serial namespace shared by every module transformed by this adapter instance. */
  const classNameAllocator = options.classNameAllocator ?? createClassNameAllocator(effectiveClassNameOptions(options));
  /** Deterministic utility selectors shared by development transforms. */
  const developmentClassNameAllocator =
    options.classNameAllocator ??
    createClassNameAllocator(effectiveClassNameOptions(developmentPluginOptions(options)));
  /** Transformed module data retained for the universal esbuild adapter. */
  const esbuildDataById = new Map<string, ModuleCssxData>();
  /** Active Vite development transport, source watcher, and prepared updates. */
  let viteDevelopmentRuntime:
    | {
        delete: (id: string) => void;
        isActive: () => boolean;
        isPrepared: (id: string, source: string) => boolean;
        notifyStyles: () => Promise<void>;
        onTransformed: (id: string) => void;
        updateCssOnlySource: (id: string) => Promise<void>;
      }
    | undefined;
  /** Transform hook signature, imported as a type to keep its implementation lazy. */
  type TransformHandler = ReturnType<typeof import('./create-transform-handler').createTransformHandler>;
  /** Result shape returned by the lazy transform implementation. */
  type TransformHandlerOutput = Awaited<ReturnType<TransformHandler>>;
  /** Lazy transform implementation kept out of the public adapter entry chunk. */
  let transformHandlerStartup: Promise<TransformHandler> | undefined;
  /** Lazy Rollup watch runtime, loaded only for development watch builds. */
  let rollupRuntimeStartup:
    | Promise<{
        buildStart: () => void;
        buildEnd: () => void;
        closeWatcher: () => Promise<void>;
        getConnection: () => NextDevelopmentHmrConnection | undefined;
        delete: (id: string) => Promise<void>;
        onTransformed: (id: string) => void;
        updateCssOnlySource: (id: string) => Promise<void>;
        takePrepared: (
          id: string,
          source: string,
        ) => {
          readonly handled: boolean;
          readonly result?: TransformHandlerOutput;
        };
        notifyStyles: () => Promise<void>;
      }>
    | undefined;
  /** Root used to resolve Vite's configured theme path. */
  let themeRoot = process.cwd();
  /** Vite distinguishes its watch server from a production build during config resolution. */
  let viteCommand: 'build' | 'serve' | undefined;
  /**
   * Loads the current inline or file-based theme before CSS is compiled.
   *
   * @returns A promise for the configured theme source, or undefined.
   */
  const getTheme = (): Promise<string | undefined> => loadTheme(options, themeRoot);
  const esbuildHooks = createUniversalEsbuildHooks({
    options,
    cssFileName,
    sourceMap,
    dataById: esbuildDataById,
    getTheme,
  });
  const generateBundle = createGenerateBundleHandler({
    framework: meta.framework,
    options,
    cssFileName,
    sourceMap,
    rollupDataById,
    getTheme,
  });
  const notifyViteStyles = () => viteDevelopmentRuntime?.notifyStyles() ?? Promise.resolve();
  const notifyRollupStyles = () => rollupRuntimeStartup?.then((runtime) => runtime.notifyStyles()) ?? Promise.resolve();
  const getTransformHandler = () => {
    transformHandlerStartup ??= import('@cssxio/unplugin/internal/transform-runtime').then(
      ({ createTransformHandler }) =>
        createTransformHandler({
          framework: meta.framework,
          options,
          classNameAllocator,
          developmentClassNameAllocator,
          isViteDevServerActive: () => viteDevelopmentRuntime?.isActive() ?? false,
          rollupDataById,
          esbuildDataById,
          cssFileName,
          getEsbuildWorkingDirectory: esbuildHooks.getWorkingDirectory,
          notifyViteStyles,
          notifyDevelopmentStyles: notifyRollupStyles,
          getDevelopmentHmrConnection:
            meta.framework === 'esbuild'
              ? esbuildHooks.getDevelopmentHmrConnection
              : () => rollupRuntimeStartup?.then((runtime) => runtime.getConnection()),
        }),
    );
    return transformHandlerStartup;
  };
  return {
    name: '@cssxio/unplugin',
    enforce: 'pre',
    transform: {
      filter: { id: SCRIPT_ID },
      handler: async function (code, id) {
        const transform = await getTransformHandler();
        const watchMode = (this as typeof this & { readonly meta?: { readonly watchMode?: boolean } }).meta?.watchMode;
        if (meta.framework === 'rollup' && watchMode && rollupRuntimeStartup) {
          const runtime = await rollupRuntimeStartup;
          const prepared = runtime.takePrepared(id, code);
          if (prepared.handled) {
            runtime.onTransformed(id);
            return prepared.result;
          }
        }
        const prepared = viteDevelopmentRuntime?.isPrepared(id, code) ?? false;
        const result = await transform.call({ ...this, skipViteStylesheetPush: prepared }, code, id);
        if (meta.framework === 'vite') {
          viteDevelopmentRuntime?.onTransformed(id);
        } else if (meta.framework === 'rollup' && watchMode && rollupRuntimeStartup) {
          const runtime = await rollupRuntimeStartup;
          runtime.onTransformed(id);
        }
        return result;
      },
    },
    async watchChange(id, change) {
      const normalizedId = moduleId(id);
      if (change.event === 'delete') {
        rollupDataById.delete(normalizedId);
        viteDevelopmentRuntime?.delete(normalizedId);
        await rollupRuntimeStartup?.then((runtime) => runtime.delete(normalizedId));
        await notifyRollupStyles();
        return;
      }
      if (meta.framework === 'rollup' && rollupRuntimeStartup && change.event === 'update' && SCRIPT_ID.test(id)) {
        await rollupRuntimeStartup.then((runtime) => runtime.updateCssOnlySource(id));
        return;
      }
      if (
        meta.framework !== 'vite' ||
        !viteDevelopmentRuntime?.isActive() ||
        change.event !== 'update' ||
        !SCRIPT_ID.test(id)
      ) {
        return;
      }
      await viteDevelopmentRuntime.updateCssOnlySource(id);
    },
    rollup: {
      generateBundle,
      buildStart() {
        const watchMode = this.meta.watchMode;
        if (isDevelopmentMode(options, { watchMode }) && watchMode && !rollupRuntimeStartup) {
          rollupRuntimeStartup = import('@cssxio/unplugin/internal/development-runtime').then((runtime) => {
            return runtime.createRollupDevelopmentRuntime({
              cssFileName,
              root: process.cwd(),
              dataById: rollupDataById,
              getTheme,
              options,
              sourceMap,
              transformSource: (source: string, id: string): Promise<TransformHandlerOutput> =>
                getTransformHandler().then((transform) =>
                  transform.call({ meta: { watchMode: true }, skipRollupStylesheetPush: true }, source, id),
                ),
            });
          });
        }
        if (watchMode && rollupRuntimeStartup) {
          void rollupRuntimeStartup
            .then((runtime) => runtime.buildStart())
            .catch((error: unknown) => {
              console.warn(`CSSX: Rollup development coordinator failed: ${String(error)}`);
            });
        }
      },
      async buildEnd() {
        await rollupRuntimeStartup?.then((runtime) => runtime.buildEnd());
      },
      async closeWatcher() {
        await rollupRuntimeStartup?.then(
          (runtime) => runtime.closeWatcher(),
          () => undefined,
        );
        rollupRuntimeStartup = undefined;
      },
    },
    vite: {
      generateBundle,
      configResolved(config: { readonly command: 'build' | 'serve'; readonly root?: string }) {
        viteCommand = config.command;
        themeRoot = config.root ?? themeRoot;
      },
      async configureServer(server: ViteServerLike) {
        if (viteCommand === 'build' || options.mode === 'production' || process.env.NODE_ENV === 'production') {
          return;
        }
        const { createViteDevelopmentRuntime } = await import('@cssxio/unplugin/internal/development-runtime');
        themeRoot = server.config.root ?? process.cwd();
        viteDevelopmentRuntime = createViteDevelopmentRuntime(
          server,
          {
            cssFileName,
            root: themeRoot,
            sourceMap,
            options: developmentPluginOptions(options),
            rollupDataById,
            getTheme,
          },
          rollupDataById,
          (source, id) =>
            getTransformHandler().then((transform) =>
              transform.call({ meta: { watchMode: true }, skipViteStylesheetPush: true }, source, id),
            ),
        );
      },
      hotUpdate: {
        order: 'pre',
        handler: createViteHotUpdateHandler(
          rollupDataById,
          (id, source) => viteDevelopmentRuntime?.isPrepared(id, source) ?? false,
        ),
      },
    },
    ...(meta.framework === 'webpack'
      ? {
          webpack(compiler) {
            configureNativeCompiler({
              compiler: compiler as unknown as NativeCompiler,
              options,
              cssFileName,
              sourceMap,
              getTheme,
            });
          },
        }
      : {}),
    ...(meta.framework === 'rspack'
      ? {
          rspack(compiler) {
            configureNativeCompiler({
              compiler: compiler as unknown as NativeCompiler,
              options,
              cssFileName,
              sourceMap,
              getTheme,
            });
          },
        }
      : {}),
    ...(meta.framework === 'esbuild'
      ? {
          esbuild: { config: esbuildHooks.config, setup: esbuildHooks.setup },
        }
      : {}),
  };
};

/** Universal adapter instance that exposes factories for every supported build tool. */
export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory);

/**
 * Callable factory that creates the CSSX adapter for Vite.
 *
 * @param options CSSX adapter options.
 * @returns The Vite plugin.
 */
export const vite = unplugin.vite;
/**
 * Callable factory that creates the CSSX adapter for Rollup.
 *
 * @param options CSSX adapter options.
 * @returns The Rollup plugin.
 */
export const rollup = unplugin.rollup;
/**
 * Callable factory that creates the CSSX adapter for webpack.
 *
 * @param options CSSX adapter options.
 * @returns The webpack plugin.
 */
export const webpack = unplugin.webpack;
/**
 * Callable factory that creates the CSSX adapter for Rspack.
 *
 * @param options CSSX adapter options.
 * @returns The Rspack plugin.
 */
export const rspack = unplugin.rspack;
/** Callable factory that creates the CSSX adapter for esbuild. */
export { default as esbuild } from '../adapters/esbuild';

export default unplugin;
