import type { BuildOptions, PluginBuild } from 'esbuild';
import { Buffer } from 'node:buffer';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

import { resolveCssFileName, resolveEsbuildAssetPath } from '../core/options';
import { developmentPluginOptions } from '../core/options';
import type { CssxPluginOptions } from '../core/options';
import { compileCssxStylesheet, cssWithSourceMapComment } from '../native/stylesheet';
import type { ModuleCssxData } from '../transforms/module-cssx-data';
import { scanProjectCssxSourceModules } from '../transforms/project-scan';
import type { NextDevelopmentHmrConnection } from './next-development-server';

/** Configuration needed by the universal esbuild adapter hooks. */
export interface CreateUniversalEsbuildHooksOptions {
  /** CSSX plugin options used when compiling the final stylesheet. */
  readonly options: CssxPluginOptions;
  /** Output path template shared with the transform and Rollup adapters. */
  readonly cssFileName: string;
  /** Whether the compiled stylesheet should include source-map information. */
  readonly sourceMap: boolean;
  /** CSSX module data collected by the transform hook. */
  readonly dataById: Map<string, ModuleCssxData>;
  /** Loads the configured theme for the active build. */
  readonly getTheme: () => Promise<string | undefined>;
}

/** Esbuild lifecycle hooks and the active working-directory accessor. */
export interface UniversalEsbuildHooks {
  /** Enables metadata collection before esbuild starts the build. */
  readonly config: (buildOptions: BuildOptions) => void;
  /** Registers stylesheet generation after esbuild completes. */
  readonly setup: (build: PluginBuild) => void;
  /** Returns esbuild's configured working directory for module transforms. */
  readonly getWorkingDirectory: () => string;
  /** Returns the explicit development browser transport when active. */
  readonly getDevelopmentHmrConnection: () => Promise<NextDevelopmentHmrConnection | undefined>;
}

/**
 * Creates esbuild hooks that compile transformed CSSX modules into a CSS asset.
 *
 * @param configuration Adapter options, transformed modules, and theme loader.
 * @returns Esbuild lifecycle hooks and the current working directory accessor.
 */
export function createUniversalEsbuildHooks(configuration: CreateUniversalEsbuildHooksOptions): UniversalEsbuildHooks {
  const { options, cssFileName, sourceMap, dataById, getTheme } = configuration;
  let emittedEsbuildAsset: string | undefined;
  let workingDirectory = process.cwd();
  let developmentHmr: NextDevelopmentHmrConnection | undefined;
  let coordinatorStartup: Promise<() => void> | undefined;
  let developmentRuntimeStartup: Promise<void> | undefined;
  const development = options.mode === 'development';
  const compilationOptions = development ? developmentPluginOptions(options) : options;

  return {
    config(buildOptions) {
      buildOptions.metafile = true;
    },
    setup(build) {
      workingDirectory = build.initialOptions.absWorkingDir ?? process.cwd();
      if (development) {
        const stylesheetFile = resolve(workingDirectory, '.cssx/esbuild.css');
        developmentRuntimeStartup = import('@cssxio/unplugin/internal/development-runtime').then((runtime) => {
          developmentHmr = runtime.startNextDevelopmentServer(workingDirectory, stylesheetFile);
          coordinatorStartup = runtime.startDevelopmentCoordinator(
            workingDirectory,
            stylesheetFile,
            compilationOptions,
            developmentHmr,
          );
          void coordinatorStartup.catch((error: unknown) => {
            console.warn(`CSSX: esbuild development coordinator failed: ${String(error)}`);
          });
        });
        void developmentRuntimeStartup.catch((error: unknown) => {
          console.warn(`CSSX: esbuild development coordinator failed: ${String(error)}`);
        });
        build.onDispose(() => {
          void developmentRuntimeStartup?.then(
            async () => {
              await coordinatorStartup?.then(
                (stop) => stop(),
                () => undefined,
              );
              const { stopNextDevelopmentServer } = await import('@cssxio/unplugin/internal/development-runtime');
              stopNextDevelopmentServer(workingDirectory);
            },
            async () => {
              const { stopNextDevelopmentServer } = await import('@cssxio/unplugin/internal/development-runtime');
              stopNextDevelopmentServer(workingDirectory);
            },
          );
          developmentHmr = undefined;
        });
      }
      build.onEnd(async (result) => {
        if (result.errors?.length || !result.metafile) {
          return;
        }
        const liveIds = new Set(Object.keys(result.metafile.inputs).map((id) => resolve(workingDirectory, id)));
        for (const id of dataById.keys()) {
          if (!liveIds.has(id)) {
            dataById.delete(id);
          }
        }

        const sourceData =
          !development && options.coordination === 'manifest'
            ? await scanProjectCssxSourceModules(workingDirectory, options)
            : [...dataById.values()];
        const compiled = await compileCssxStylesheet(
          sourceData,
          await getTheme(),
          compilationOptions.layer,
          sourceMap,
          compilationOptions.darkMode,
          compilationOptions.preflight,
        );
        const assetPath = resolveEsbuildAssetPath(
          workingDirectory,
          build.initialOptions,
          resolveCssFileName(cssFileName, compiled.css),
        );
        if (!compiled.css) {
          if (emittedEsbuildAsset) {
            await unlink(emittedEsbuildAsset).catch(() => undefined);
          }
          emittedEsbuildAsset = undefined;
          return;
        }
        const css = cssWithSourceMapComment(compiled, basename(assetPath));
        if (build.initialOptions.write === false) {
          const outputFiles = result.outputFiles;
          if (!outputFiles) {
            return;
          }
          const output = { path: assetPath, contents: Buffer.from(css), hash: '', text: css };
          if (outputFiles.some((file) => file.path === assetPath)) {
            throw new Error(`CSSX CSS asset collision at "${assetPath}".`);
          }
          outputFiles.push(output);
          return;
        }

        await mkdir(dirname(assetPath), { recursive: true });
        await writeFile(assetPath, css);
        emittedEsbuildAsset = assetPath;
      });
    },
    getWorkingDirectory: () => workingDirectory,
    getDevelopmentHmrConnection: async () => {
      await developmentRuntimeStartup;
      return developmentHmr;
    },
  };
}
