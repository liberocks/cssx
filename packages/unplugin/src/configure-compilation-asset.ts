import type { DarkMode } from '@cssxio/compiler';

import { mergeCssxSourceModules } from './merge-cssx-source-modules';
import type { NativeCompiler } from './native-types';
import { resolveCssFileName } from './options';
import { sourceDataFromModule } from './source-data-from-module';
import { compileCssxStylesheet, cssSourceMap, cssWithSourceMapComment } from './stylesheet';
import type { CssxSourceModule } from './stylesheet-types';

/**
 * Emits the final stylesheet and source map through a native compiler lifecycle.
 *
 * @param compiler Native compiler that owns the compilation lifecycle.
 * @param cssFileName Relative CSS output path template.
 * @param getTheme Function that loads the current theme before CSS compilation.
 * @param layer Optional CSS layer that wraps generated CSS.
 * @param sourceMap Whether to generate a CSS source map.
 * @param metadataKey Key used to read transformed module data.
 * @param transformedDataById Transformed source data retained outside native loader metadata.
 * @param darkMode Controls how the `dark` variant is activated.
 * @param preflight Whether to add the browser baseline before utility rules.
 * @param projectSourceData Optional complete project scan used to recover cross-process records.
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
  darkMode?: DarkMode,
  preflight = true,
  projectSourceData?: (() => Promise<readonly CssxSourceModule[]>) | undefined,
): void {
  // Next writes server compiler assets beneath `.next/server`, where browsers
  // cannot load them. Its client compiler emits the public stylesheet, using
  // the shared transformed records to include server component rules.
  const compilerName = compiler.name ?? compiler.options?.name;
  if (compilerName === 'server' || compilerName === 'edge-server') {
    return;
  }
  compiler.hooks.thisCompilation.tap('@cssxio/unplugin', (compilation) => {
    compilation.hooks.processAssets.tapPromise(
      {
        name: '@cssxio/unplugin',
        stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
      },
      async () => {
        const sourceData = projectSourceData
          ? await projectSourceData()
          : mergeCssxSourceModules(
              [...compilation.modules]
                .map((module) => sourceDataFromModule(module, metadataKey))
                .filter((data): data is CssxSourceModule => data !== undefined),
              transformedDataById?.values() ?? [],
            );
        const compiled = await compileCssxStylesheet(
          sourceData,
          await getTheme(),
          layer,
          sourceMap,
          darkMode,
          preflight,
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
