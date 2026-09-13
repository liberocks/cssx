/** Vite module identity fields used during hot updates. */
export interface ViteHotUpdateModule {
  /** Resolved module identifier, when available. */
  readonly id?: string;
  /** Module graph URL, when available. */
  readonly url?: string;
}

/** Vite runner services needed to invalidate evaluated server modules. */
export interface ViteHotUpdateEnvironment {
  /** Optional module graph that collects modules invalidated by this update. */
  readonly moduleGraph?: {
    /** Adds a module to the update's invalidation set. */
    invalidateModule(
      module: ViteHotUpdateModule,
      invalidatedModules?: Set<ViteHotUpdateModule>,
      timestamp?: number,
      isHmr?: boolean,
    ): void;
  };
  /** Optional evaluated-module registry owned by Vite's server runner. */
  readonly runner?: {
    /** Runner module cache operations. */
    readonly evaluatedModules?: {
      /** Finds an evaluated module by resolved identifier. */
      getModuleById(id: string): unknown;
      /** Invalidates a module previously returned from the cache. */
      invalidateModule(module: unknown): void;
    };
  };
}

/**
 * Invalidates evaluated SSR modules after eager style metadata regeneration.
 *
 * @param environment Vite environment that owns the module graph and runner.
 * @param modules Modules whose CSS-only updates were handled eagerly.
 * @param timestamp HMR update timestamp.
 */
export function invalidateViteRunner(
  environment: ViteHotUpdateEnvironment,
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
