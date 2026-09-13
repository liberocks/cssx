import type { ClassNameAllocator } from '@cssxio/compiler';
import { relative, resolve, sep } from 'node:path';

import { RULES_METADATA_KEY, type ModuleCssxData } from './module-cssx-data';
import { nativeBuildRoot } from './native-build-root';
import { nativeBuildState } from './native-build-state';
import { nativeStylesheetHmr } from './native-stylesheet-hmr';
import { moduleId, viteCssPath } from './options';
import type { CssxPluginOptions } from './options';
import { sourceMapFromContext } from './source-map-from-context';
import { storeCompilationData } from './store-compilation-data';
import { transformCssxModule } from './transform';

/** Minimal Rollup-compatible context needed while transforming one module. */
export interface TransformContextLike {
  /** Registers a file that should trigger a rebuild when changed. */
  addWatchFile?(file: string): void;
  /** Optional native compiler context exposed by webpack and Rspack loaders. */
  getNativeBuildContext?: (() => unknown) | undefined;
}

/** Captured adapter state required to transform a source module. */
export interface TransformHandlerOptions {
  /** Current build-tool framework. */
  readonly framework: string;
  /** CSSX adapter options. */
  readonly options: CssxPluginOptions;
  /** Allocator shared across transforms in this adapter instance. */
  readonly classNameAllocator: ClassNameAllocator;
  /** Rollup-compatible module records. */
  readonly rollupDataById: Map<string, ModuleCssxData>;
  /** Universal esbuild module records. */
  readonly esbuildDataById: Map<string, ModuleCssxData>;
  /** CSS asset name used by native HMR adapters. */
  readonly cssFileName: string;
  /** Reads the current esbuild working directory. */
  readonly getEsbuildWorkingDirectory: () => string;
  /** Notifies an active Vite server that its stylesheet changed. */
  readonly notifyViteStyles: (path: string) => void;
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
      rollupDataById,
      esbuildDataById,
      cssFileName,
      getEsbuildWorkingDirectory,
      notifyViteStyles,
    } = configuration;
    if (options.themeFile) {
      this.addWatchFile?.(resolve(options.themeFile));
    }
    const root = nativeBuildRoot(this);
    const sharedNativeState = root ? nativeBuildState(root, options) : undefined;
    const transformed = await transformCssxModule(
      code,
      id,
      {
        ...options,
        classNameAllocator: sharedNativeState?.classNameAllocator ?? classNameAllocator,
        ...(options.stableClassNames
          ? { stableClassNameFileName: relative(root ?? process.cwd(), moduleId(id)).replaceAll(sep, '/') }
          : {}),
      },
      sourceMapFromContext(this, id),
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
    // Astro transforms component scripts as query modules after the template.
    // They have no `sx()` calls and must not erase the template's collected CSS.
    if (transformed || normalizedId === id) {
      rollupDataById.set(normalizedId, data);
      esbuildDataById.set(resolve(getEsbuildWorkingDirectory(), normalizedId), data);
      sharedNativeState?.transformedDataById.set(normalizedId, data);
    }

    if (framework === 'vite') {
      notifyViteStyles(viteCssPath('/', cssFileName));
    }

    const transformedCode = transformed?.code ?? code;
    return {
      code:
        (framework === 'webpack' || framework === 'rspack') && transformed
          ? `${transformedCode}\n${nativeStylesheetHmr(cssFileName)}`
          : transformedCode,
      meta: { [RULES_METADATA_KEY]: data },
      ...(transformed?.map ? { map: transformed.map } : {}),
    };
  };
}
