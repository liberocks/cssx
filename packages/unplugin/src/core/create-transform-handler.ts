import type { ClassNameAllocator } from '@cssxio/compiler';
import { resolve } from 'node:path';

import type { NextDevelopmentHmrConnection } from '../adapters/next-development-server';
import { nativeBuildRoot } from '../native/native-build-root';
import { nativeBuildState } from '../native/native-build-state';
import { withClassNameManifest } from '../native/with-class-name-manifest';
import { sourceMapFromContext } from '../source-map/source-map-from-context';
import { isIgnoredProjectSourcePath } from '../transforms/find-project-source-files';
import { hasCssxStyleData, RULES_METADATA_KEY, type ModuleCssxData } from '../transforms/module-cssx-data';
import { updateProjectScanModule } from '../transforms/project-scan';
import { transformCssxModule } from '../transforms/transform';
import { moduleId, stableId } from './options';
import { developmentPluginOptions, isDevelopmentMode, type CssxPluginOptions } from './options';
import { stableModuleFileName } from './stable-module-file-name';
import { storeCompilationData } from './store-compilation-data';

/** Minimal Rollup-compatible context needed while transforming one module. */
export interface TransformContextLike {
  /** Registers a file that should trigger a rebuild when changed. */
  addWatchFile?(file: string): void;
  /** Optional native compiler context exposed by webpack and Rspack loaders. */
  getNativeBuildContext?: (() => unknown) | undefined;
  /** Rollup exposes watch mode here for builds that do not set NODE_ENV. */
  readonly meta?: { readonly watchMode?: boolean };
  /** Avoids publishing a stylesheet during an eager adapter-side transform. */
  readonly skipViteStylesheetPush?: boolean;
  /** Avoids publishing a stylesheet during an eager Rollup-side transform. */
  readonly skipRollupStylesheetPush?: boolean;
}

/** Captured adapter state required to transform a source module. */
export interface TransformHandlerOptions {
  /** Current build-tool framework. */
  readonly framework: string;
  /** CSSX adapter options. */
  readonly options: CssxPluginOptions;
  /** Allocator shared across transforms in this adapter instance. */
  readonly classNameAllocator: ClassNameAllocator;
  /** Content-hash allocator shared by development transforms in this adapter instance. */
  readonly developmentClassNameAllocator?: ClassNameAllocator;
  /** Whether a Vite development server has configured this plugin instance. */
  readonly isViteDevServerActive?: () => boolean;
  /** Rollup-compatible module records. */
  readonly rollupDataById: Map<string, ModuleCssxData>;
  /** Universal esbuild module records. */
  readonly esbuildDataById: Map<string, ModuleCssxData>;
  /** CSS asset name used by native HMR adapters. */
  readonly cssFileName: string;
  /** Reads the current esbuild working directory. */
  readonly getEsbuildWorkingDirectory: () => string;
  /** Notifies an active Vite server that its stylesheet changed. */
  readonly notifyViteStyles: () => void | Promise<void>;
  /** Gets the Rollup development stylesheet transport after watch mode is detected. */
  readonly getDevelopmentHmrConnection?: () =>
    NextDevelopmentHmrConnection | undefined | Promise<NextDevelopmentHmrConnection | undefined>;
  /** Pushes stylesheet metadata after a Rollup development transform. */
  readonly notifyDevelopmentStyles?: () => void | Promise<void>;
}

/**
 * Creates a transform hook that compiles CSSX source and retains module metadata.
 *
 * @param configuration State captured by one unplugin factory instance.
 * @returns A transform handler compatible with Rollup and Vite hooks.
 */
export function createTransformHandler(configuration: TransformHandlerOptions) {
  return async function (this: TransformContextLike, code: string, id: string) {
    const {
      framework,
      options,
      classNameAllocator,
      developmentClassNameAllocator,
      isViteDevServerActive,
      rollupDataById,
      esbuildDataById,
      cssFileName,
      getEsbuildWorkingDirectory,
      notifyViteStyles,
      getDevelopmentHmrConnection,
      notifyDevelopmentStyles,
    } = configuration;
    if (
      isIgnoredProjectSourcePath(
        moduleId(id),
        options.sourceRoots?.map((path) => resolve(path)),
      )
    ) {
      return null;
    }
    if (options.themeFile) {
      this.addWatchFile?.(resolve(options.themeFile));
    }
    const nativeCompiler = this.getNativeBuildContext?.() as
      | { readonly compiler?: { readonly options?: { readonly mode?: string }; readonly watchMode?: boolean } }
      | undefined;
    const development = isDevelopmentMode(options, {
      watchMode: this.meta?.watchMode ?? nativeCompiler?.compiler?.watchMode,
      bundlerMode: nativeCompiler?.compiler?.options?.mode,
      viteDevServer: framework === 'vite' && isViteDevServerActive?.(),
    });
    const root = nativeBuildRoot(this);
    const projectRoot = root ?? (framework === 'rollup' && this.meta?.watchMode ? process.cwd() : undefined);
    const sharedNativeState = root ? nativeBuildState(root, options) : undefined;
    const developmentHmr =
      development && (framework === 'rollup' || framework === 'esbuild')
        ? await getDevelopmentHmrConnection?.()
        : development
          ? sharedNativeState?.developmentHmr
          : undefined;
    const transformConfiguration = development ? developmentPluginOptions(options) : options;
    const className = transformConfiguration.className;
    const transformOptions = {
      ...transformConfiguration,
      className: {
        ...className,
        ...(!development && options.naming === 'hash' ? { variant: 'random' as const } : {}),
        ...(!development && options.naming === 'serial' ? { variant: 'serial' as const } : {}),
      },
      stableClassNames: development || options.stableClassNames || options.naming === 'source',
      classNameAllocator: development
        ? (sharedNativeState?.developmentClassNameAllocator ?? developmentClassNameAllocator ?? classNameAllocator)
        : (sharedNativeState?.classNameAllocator ?? classNameAllocator),
      ...(development || options.stableClassNames || options.naming === 'source'
        ? { stableClassNameFileName: stableModuleFileName(projectRoot ?? process.cwd(), moduleId(id), development) }
        : {}),
    };
    const compilerOptions = { ...transformOptions };
    delete compilerOptions.coordination;
    delete compilerOptions.manifestPath;
    const transformed =
      !development && options.coordination === 'manifest'
        ? await withClassNameManifest(options.manifestPath!, compilerOptions.className!, (allocator) =>
            transformCssxModule(
              code,
              id,
              { ...compilerOptions, classNameAllocator: allocator },
              sourceMapFromContext(this, id),
            ),
          )
        : await transformCssxModule(
            code,
            id,
            transformOptions,
            sourceMapFromContext(this, id),
            development ? { compileCss: false } : {},
          );
    const data: ModuleCssxData = {
      id: moduleId(id),
      rules: transformed?.rules ?? [],
      candidates: transformed?.candidates ?? {},
      composites: transformed?.composites ?? {},
      atomicClasses: transformed?.atomicClasses ?? [],
      origins: transformed?.origins ?? {},
      cssOnlySignature: transformed?.cssOnlySignature ?? '',
    };
    storeCompilationData(this, data, RULES_METADATA_KEY);
    const normalizedId = moduleId(id);
    const previousRollupData = rollupDataById.get(normalizedId);
    const previousNativeData = sharedNativeState?.transformedDataById.get(normalizedId);
    // Astro transforms component scripts as query modules after the template.
    // They have no `sx()` calls and must not erase the template's collected CSS.
    if (transformed || normalizedId === id) {
      rollupDataById.set(normalizedId, data);
      esbuildDataById.set(resolve(getEsbuildWorkingDirectory(), normalizedId), data);
      sharedNativeState?.transformedDataById.set(normalizedId, data);
    }

    const previousDevelopmentData = framework === 'rollup' ? previousRollupData : previousNativeData;
    if (
      development &&
      (framework === 'webpack' || framework === 'rspack' || (framework === 'rollup' && this.meta?.watchMode)) &&
      (transformed || (previousDevelopmentData !== undefined && hasCssxStyleData(previousDevelopmentData)))
    ) {
      if (projectRoot) {
        await updateProjectScanModule(projectRoot, normalizedId, developmentPluginOptions(options), transformed, code);
      }
      if (framework !== 'rollup') {
        await sharedNativeState?.notifyDevelopmentStylesheet?.();
      }
    }
    if (
      development &&
      (framework === 'rollup' || framework === 'esbuild') &&
      !this.skipRollupStylesheetPush &&
      (transformed || (previousRollupData !== undefined && hasCssxStyleData(previousRollupData)))
    ) {
      await notifyDevelopmentStyles?.();
    }

    if (framework === 'vite' && development && !this.skipViteStylesheetPush) {
      await notifyViteStyles();
    }

    const transformedCode = transformed?.code ?? code;
    let nativeHmrRuntime: string | undefined;
    let rollupHmrRuntime: string | undefined;
    let viteHmrRuntime: string | undefined;
    if (development && transformed) {
      const runtime = await import('@cssxio/unplugin/internal/development-runtime');
      nativeHmrRuntime =
        framework === 'webpack' || framework === 'rspack'
          ? runtime.nativeStylesheetHmr(
              cssFileName,
              stableId(
                JSON.stringify({
                  candidates: transformed.candidates,
                  composites: transformed.composites,
                  atomicClasses: transformed.atomicClasses,
                }),
              ),
              developmentHmr,
            )
          : undefined;
      rollupHmrRuntime =
        (framework === 'rollup' || framework === 'esbuild') && developmentHmr
          ? runtime.nextDevelopmentStylesheetHmr(developmentHmr, cssFileName)
          : undefined;
      viteHmrRuntime = framework === 'vite' ? runtime.viteDevelopmentStylesheetHmr(cssFileName) : undefined;
    }
    return {
      code: [transformedCode, nativeHmrRuntime, viteHmrRuntime, rollupHmrRuntime].filter(Boolean).join('\n'),
      meta: { [RULES_METADATA_KEY]: data },
      ...(transformed?.map ? { map: transformed.map } : {}),
    };
  };
}
