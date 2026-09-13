import { createClassNameAllocator } from '@cssxio/compiler';
import { createUnplugin } from 'unplugin';
import type { UnpluginFactory } from 'unplugin';

import { configureViteDevelopmentServer } from './configure-vite-development-server';
import type { ViteServerLike } from './configure-vite-development-server';
import { createGenerateBundleHandler } from './create-generate-bundle-handler';
import { createTransformHandler } from './create-transform-handler';
import { createUniversalEsbuildHooks } from './create-universal-esbuild-hooks';
import { createViteHotUpdateHandler } from './create-vite-hot-update-handler';
import { RULES_METADATA_KEY, type ModuleCssxData } from './module-cssx-data';
import { configureCompilationAsset, type NativeCompiler } from './native';
import { nativeBuildState } from './native-build-state';
import { assertPluginOptions, loadTheme, moduleId, type CssxPluginOptions } from './options';
import { scanProjectCssxSourceModules } from './project-scan';
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

/** Matches JavaScript, TypeScript, Astro, and Vue module IDs, with an optional query. */
const SCRIPT_ID = /\.(?:[cm]?[jt]sx?|astro|vue)(?:\?.*)?$/;

/**
 * Creates the CSSX adapter hooks consumed by Unplugin for one build tool.
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
  /** Active Vite development server, available after server configuration. */
  let viteServer: ViteServerLike | undefined;
  /**
   * Loads the current inline or file-based theme before CSS is compiled.
   *
   * @returns A promise for the configured theme source, or undefined.
   */
  const getTheme = (): Promise<string | undefined> => loadTheme(options);
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

  return {
    name: '@cssxio/unplugin',
    enforce: 'pre',
    transform: {
      filter: { id: SCRIPT_ID },
      handler: createTransformHandler({
        framework: meta.framework,
        options,
        classNameAllocator,
        rollupDataById,
        esbuildDataById,
        cssFileName,
        getEsbuildWorkingDirectory: esbuildHooks.getWorkingDirectory,
        notifyViteStyles: (path) => {
          if (viteServer) {
            sendViteStyles(viteServer, path);
          }
        },
      }),
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
        configureViteDevelopmentServer(server, {
          cssFileName,
          sourceMap,
          options,
          rollupDataById,
          getTheme,
        });
      },
      hotUpdate: {
        order: 'pre',
        handler: createViteHotUpdateHandler(rollupDataById),
      },
    },
    ...(meta.framework === 'webpack'
      ? {
          webpack(compiler) {
            const sharedNativeState = nativeBuildState(compiler.context, options);
            configureCompilationAsset(
              compiler as unknown as NativeCompiler,
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
          },
        }
      : {}),
    ...(meta.framework === 'rspack'
      ? {
          rspack(compiler) {
            const sharedNativeState = nativeBuildState(compiler.context, options);
            configureCompilationAsset(
              compiler as unknown as NativeCompiler,
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
export { default as esbuild } from './esbuild';

export default unplugin;
