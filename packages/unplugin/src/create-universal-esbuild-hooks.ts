import type { BuildOptions, PluginBuild } from 'esbuild';
import { Buffer } from 'node:buffer';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

import type { ModuleCssxData } from './module-cssx-data';
import { resolveCssFileName, resolveEsbuildAssetPath } from './options';
import type { CssxPluginOptions } from './options';
import { compileCssxStylesheet, cssWithSourceMapComment } from './stylesheet';

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
}

/**
 * Creates esbuild hooks that compile transformed CSSX modules into a CSS asset.
 *
 * @param configuration Adapter options, transformed modules, and theme loader.
 * @returns Esbuild lifecycle hooks and the current build working directory.
 */
export function createUniversalEsbuildHooks(configuration: CreateUniversalEsbuildHooksOptions): UniversalEsbuildHooks {
  const { options, cssFileName, sourceMap, dataById, getTheme } = configuration;
  let emittedEsbuildAsset: string | undefined;
  let workingDirectory = process.cwd();

  return {
    config(buildOptions) {
      buildOptions.metafile = true;
    },
    setup(build) {
      workingDirectory = build.initialOptions.absWorkingDir ?? process.cwd();
      build.onEnd(async (result) => {
        if (!result.metafile) {
          return;
        }
        const liveIds = new Set(Object.keys(result.metafile.inputs).map((id) => resolve(workingDirectory, id)));
        for (const id of dataById.keys()) {
          if (!liveIds.has(id)) {
            dataById.delete(id);
          }
        }

        const compiled = await compileCssxStylesheet(
          [...dataById.values()],
          await getTheme(),
          options.layer,
          sourceMap,
          options.darkMode,
          options.preflight,
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
          const existing = outputFiles.findIndex((file) => file.path === assetPath);
          if (existing !== -1) {
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
  };
}
