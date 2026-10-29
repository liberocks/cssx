import { resolve } from 'node:path';

import { startDevelopmentCoordinator } from '../adapters/development-coordinator';
import {
  publishNextDevelopmentStylesheet,
  startNextDevelopmentServer,
  stopNextDevelopmentServer,
} from '../adapters/next-development-server';
import { configureCompilationAsset } from '../core/configure-compilation-asset';
import { developmentPluginOptions, isDevelopmentMode, type CssxPluginOptions } from '../core/options';
import { RULES_METADATA_KEY } from '../transforms/module-cssx-data';
import { moduleId } from '../transforms/module-id';
import { getCachedProjectScanSourceModules, scanProjectCssxSourceModules } from '../transforms/project-scan';
import type { NativeCompiler } from './native';
import { nativeBuildState } from './native-build-state';
import { compileCssxStylesheet, cssWithSourceMapComment } from './stylesheet';

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
  const development = isDevelopmentMode(options, {
    watchMode: compiler.watchMode,
    bundlerMode: compiler.options?.mode,
  });
  const compilationOptions = development ? developmentPluginOptions(options) : options;
  let coordinatorStartup: Promise<() => void> | undefined;
  if (development) {
    let compilationRuns = 0;
    compiler.hooks?.watchRun?.tap('@cssxio/unplugin', (watchingCompiler) => {
      compilationRuns++;
      for (const fileName of watchingCompiler.removedFiles ?? []) {
        sharedNativeState.transformedDataById.delete(moduleId(fileName));
      }
      if (process.env.NODE_ENV === 'test' || coordinatorStartup) {
        return;
      }
      const styleSheetFile = resolve(compiler.context, '.cssx/native.css');
      const developmentHmr = startNextDevelopmentServer(compiler.context, styleSheetFile);
      sharedNativeState.developmentHmr = developmentHmr;
      coordinatorStartup = startDevelopmentCoordinator(
        compiler.context,
        styleSheetFile,
        compilationOptions,
        developmentHmr,
      );
      let notifyRevision = 0;
      let notifyPending: Promise<void> | undefined;
      sharedNativeState.notifyDevelopmentStylesheet = () => {
        if (compilationRuns <= 1 || sharedNativeState.developmentHmr !== developmentHmr) {
          return Promise.resolve();
        }
        notifyRevision++;
        if (!notifyPending) {
          notifyPending = new Promise<void>((resolveNotify) => setImmediate(resolveNotify))
            .then(async () => {
              let publishedRevision = -1;
              do {
                publishedRevision = notifyRevision;
                const sourceData = getCachedProjectScanSourceModules(compiler.context, compilationOptions);
                const stylesheet = await compileCssxStylesheet(
                  sourceData ?? [...sharedNativeState.transformedDataById.values()],
                  await getTheme(),
                  compilationOptions.layer,
                  sourceMap,
                  compilationOptions.darkMode,
                  compilationOptions.preflight,
                );
                const css = cssWithSourceMapComment(stylesheet, 'generated.css');
                if (
                  sharedNativeState.developmentHmr === developmentHmr &&
                  sharedNativeState.developmentStylesheet !== css
                ) {
                  await publishNextDevelopmentStylesheet(developmentHmr, css);
                  sharedNativeState.developmentStylesheet = css;
                }
              } while (publishedRevision !== notifyRevision);
            })
            .catch((error: unknown) => {
              console.warn(
                `CSSX: native development stylesheet update failed: ${error instanceof Error ? error.message : String(error)}`,
              );
            })
            .finally(() => {
              notifyPending = undefined;
            });
        }
        return notifyPending;
      };
      void coordinatorStartup.catch((error: unknown) => {
        console.warn(`CSSX: native development coordinator failed: ${String(error)}`);
      });
    });
  }
  if (development) {
    compiler.hooks?.watchClose?.tap('@cssxio/unplugin', () => {
      void coordinatorStartup?.then(
        (stop) => {
          stop();
          stopNextDevelopmentServer(compiler.context);
          sharedNativeState.developmentHmr = undefined;
          sharedNativeState.developmentStylesheet = undefined;
        },
        () => {
          stopNextDevelopmentServer(compiler.context);
          sharedNativeState.developmentHmr = undefined;
          sharedNativeState.developmentStylesheet = undefined;
        },
      );
      sharedNativeState.notifyDevelopmentStylesheet = undefined;
    });
  }
  configureCompilationAsset(
    compiler,
    cssFileName,
    getTheme,
    compilationOptions.layer,
    sourceMap,
    RULES_METADATA_KEY,
    sharedNativeState.transformedDataById,
    compilationOptions.darkMode,
    compilationOptions.preflight,
    !development && (options.stableClassNames || options.naming === 'source' || options.coordination === 'manifest')
      ? () => scanProjectCssxSourceModules(compiler.context, options)
      : undefined,
    compilationOptions,
  );
}
