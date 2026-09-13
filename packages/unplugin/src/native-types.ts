import type { CssxSourceModule } from './stylesheet-types';

/** A native bundler module that can store CSSX build metadata. */
export interface ModuleWithCssxRules {
  /** Mutable metadata collected while the module is transformed. */
  buildInfo?: Record<string, unknown>;
  /** Resolved source path when the bundler exposes one. */
  resource?: string;
}

/** The compilation methods used to collect modules and emit CSS assets. */
export interface CompilationLike {
  /** Modules included in the current compilation. */
  readonly modules: Iterable<ModuleWithCssxRules>;
  /** Lifecycle hooks used to add final build assets. */
  readonly hooks: {
    /** Hook that runs while compilation assets are processed. */
    readonly processAssets: {
      /**
       * Registers asynchronous work at a compilation asset stage.
       *
       * @param options Plugin name and build lifecycle stage.
       * @param options.name Plugin name shown by the build tool.
       * @param options.stage Build lifecycle stage for the callback.
       * @param callback Asynchronous asset generation work.
       * @returns Nothing after the callback is registered.
       */
      tapPromise(options: { readonly name: string; readonly stage: number }, callback: () => Promise<void>): void;
    };
  };
  /**
   * Returns an existing asset when the bundler supports asset lookup.
   *
   * @param fileName Output asset file name.
   * @returns The existing asset, or undefined when it does not exist.
   */
  getAsset?(fileName: string): unknown;
  /**
   * Adds an asset to the compilation output.
   *
   * @param fileName Output asset file name.
   * @param source Asset source object.
   * @returns Nothing after the asset is added.
   */
  emitAsset(fileName: string, source: unknown): void;
}

/** Native compiler API shared by webpack and Rspack adapters. */
export interface NativeCompiler {
  /** Compiler name when a multi-compiler build exposes one. */
  readonly name?: string;
  /** Root directory of the native compilation. */
  readonly context: string;
  /** Native compiler options when the root directory is nested there. */
  readonly options?: { readonly context?: string; readonly name?: string };
  /** Bundler constructors, asset stage constants, and source constructors. */
  readonly webpack: {
    /** Compilation constants used to select a build lifecycle stage. */
    readonly Compilation: { readonly PROCESS_ASSETS_STAGE_ADDITIONS: number };
    /** Source constructors used for emitted asset contents. */
    readonly sources: { readonly RawSource: new (source: string) => unknown };
  };
  /** Compiler lifecycle hooks. */
  readonly hooks: {
    /** Hook that creates each native bundler compilation. */
    readonly thisCompilation: {
      /**
       * Registers work for every compilation.
       *
       * @param name Plugin name used by the compiler.
       * @param callback Function called with the new compilation.
       * @returns Nothing after the callback is registered.
       */
      tap(name: string, callback: (compilation: CompilationLike) => void): void;
    };
  };
}

/** Metadata shape stored on a native module after a CSSX transform. */
export type StoredCssxSourceModule = Partial<CssxSourceModule>;
