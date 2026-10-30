import { createClassNameAllocator } from '@cssxio/compiler';
import { watch, type FSWatcher } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';

import { compileNextMdx } from '../adapters/next-mdx';
import { canonicalPathSync } from '../core/canonical-path';
import type { CssxPluginOptions } from '../core/options';
import { effectiveClassNameOptions } from '../core/options';
import { stableModuleFileName } from '../core/stable-module-file-name';
import type { CssxSourceModule } from '../native/stylesheet';
import { withClassNameManifest } from '../native/with-class-name-manifest';
import { findProjectSourceFiles, isIgnoredProjectSourcePath } from './find-project-source-files';
import { scanNativeStaticSxModule } from './native-static-sx';
import { transformCssxModule } from './transform';

/**
 * Collects CSSX source metadata directly from a project tree.
 *
 * Source-addressed classes make this safe across independent webpack processes:
 * every process derives the same composite selector from the same project-relative
 * file name and source location.
 *
 * @param root Project root to scan.
 * @param options CSSX transform options.
 * @returns CSSX metadata for every source file that imports the CSSX runtime.
 */
export async function scanProjectCssxSourceModules(
  root: string,
  options: CssxPluginOptions,
): Promise<readonly CssxSourceModule[]> {
  const canonicalRoot = canonicalPathSync(root);
  const files = await findProjectSourceFiles(
    canonicalRoot,
    options.sourceRoots?.map((path) => canonicalPathSync(resolve(canonicalRoot, path))),
  );
  const transformOptions = { ...options };
  delete transformOptions.coordination;
  delete transformOptions.manifestPath;
  delete transformOptions.classNameAllocator;
  const collect = async (allocator: import('@cssxio/compiler').ClassNameAllocator) => {
    const modules: CssxSourceModule[] = [];
    for (const fileName of files) {
      const source = await readFile(fileName, 'utf8');
      const isMdx = /\.(?:md|mdx)$/i.test(fileName);
      if (isMdx && !source.includes(options.importSource ?? '@cssxio/cssx')) {
        continue;
      }
      const code = isMdx ? await compileNextMdx(source, canonicalRoot, options.mdx) : source;
      const stable = options.stableClassNames || options.naming === 'source';
      const stableFileName = stable
        ? stableModuleFileName(canonicalRoot, fileName, options.mode === 'development')
        : undefined;
      if (!isMdx && !/\.(?:astro|vue)$/i.test(fileName)) {
        const nativeScan = await scanNativeStaticSxModule(
          code,
          fileName,
          canonicalRoot,
          options,
          allocator,
          stableFileName ?? fileName,
        );
        if (nativeScan.handled) {
          if (nativeScan.module) {
            modules.push(nativeScan.module);
          }
          continue;
        }
      }
      const transformed = await transformCssxModule(
        code,
        isMdx ? `${fileName}.tsx` : fileName,
        {
          ...transformOptions,
          classNameAllocator: allocator,
          stableClassNames: stable,
          ...(stable ? { stableClassNameFileName: stableFileName } : {}),
        },
        undefined,
        { compileCss: false },
      );
      if (!transformed) {
        continue;
      }
      modules.push({
        id: fileName,
        candidates: transformed.candidates,
        composites: transformed.composites,
        atomicClasses: transformed.atomicClasses,
        origins: transformed.origins,
      });
    }
    return modules;
  };
  if (options.coordination === 'manifest') {
    return withClassNameManifest(options.manifestPath!, effectiveClassNameOptions(options), collect);
  }
  const key = projectScanKey(canonicalRoot, options);
  const state = getOrCreateProjectScanState(root, options);
  const pending = projectScanInFlight.get(key);
  if (pending) {
    await pending;
    return scanProjectCssxSourceModules(root, options);
  }
  const scan = (async () => {
    const seen = new Set<string>();
    for (const fileName of files) {
      let info;
      try {
        info = await stat(fileName, { bigint: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
        state.signatures.delete(fileName);
        state.modules.delete(fileName);
        continue;
      }
      const signature = `${info.dev}:${info.ino}:${info.size}:${info.mtimeNs}:${info.ctimeNs}`;
      if (state.signatures.get(fileName) === signature) {
        seen.add(fileName);
        continue;
      }
      let source: string;
      try {
        source = await readFile(fileName, 'utf8');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
        state.signatures.delete(fileName);
        state.modules.delete(fileName);
        continue;
      }
      seen.add(fileName);
      const isMdx = /\.(?:md|mdx)$/i.test(fileName);
      const hasCssx = source.includes(options.importSource ?? '@cssxio/cssx');
      if (isMdx && !hasCssx) {
        state.modules.delete(fileName);
        state.signatures.set(fileName, signature);
        continue;
      }
      const code = isMdx ? await compileNextMdx(source, canonicalRoot, options.mdx) : source;
      const stable = options.stableClassNames || options.naming === 'source';
      const stableFileName = stable
        ? stableModuleFileName(canonicalRoot, fileName, options.mode === 'development')
        : undefined;
      if (!isMdx && !/\.(?:astro|vue)$/i.test(fileName)) {
        const nativeScan = await scanNativeStaticSxModule(
          code,
          fileName,
          canonicalRoot,
          options,
          state.allocator,
          stableFileName ?? fileName,
        );
        if (nativeScan.handled) {
          if (nativeScan.module) {
            state.modules.set(fileName, nativeScan.module);
          } else {
            state.modules.delete(fileName);
          }
          state.signatures.set(fileName, signature);
          continue;
        }
      }
      const transformed = await transformCssxModule(
        code,
        isMdx ? `${fileName}.tsx` : fileName,
        {
          ...transformOptions,
          classNameAllocator: state.allocator,
          stableClassNames: stable,
          ...(stable ? { stableClassNameFileName: stableFileName } : {}),
        },
        undefined,
        { compileCss: false },
      );
      if (transformed) {
        state.modules.set(fileName, {
          id: fileName,
          candidates: transformed.candidates,
          composites: transformed.composites,
          atomicClasses: transformed.atomicClasses,
          origins: transformed.origins,
        });
      } else {
        state.modules.delete(fileName);
      }
      state.signatures.set(fileName, signature);
    }
    for (const fileName of state.signatures.keys()) {
      if (!seen.has(fileName)) {
        state.signatures.delete(fileName);
        state.modules.delete(fileName);
      }
    }
    return [...state.modules.values()].sort((left, right) => left.id.localeCompare(right.id));
  })();
  projectScanInFlight.set(key, scan);
  try {
    return await scan;
  } finally {
    projectScanInFlight.delete(key);
  }
}

/** Returns the allocator shared by project scans and per-module development transforms. */
export function getProjectScanClassNameAllocator(
  root: string,
  options: CssxPluginOptions,
): import('@cssxio/compiler').ClassNameAllocator {
  return getOrCreateProjectScanState(root, options).allocator;
}

/** Updates one cached source record from the transform already run by a bundler. */
export async function updateProjectScanModule(
  root: string,
  fileName: string,
  options: CssxPluginOptions,
  transformed: import('./transform-cssx-module').TransformResult | null,
  sourceText?: string,
): Promise<boolean> {
  if (options.coordination === 'manifest') {
    return false;
  }
  const key = projectScanKey(root, options);
  const pending = projectScanInFlight.get(key);
  if (pending) {
    await pending;
  }
  const state = projectScanCache.get(key);
  if (!state) {
    return false;
  }
  const canonicalFileName = canonicalPathSync(fileName);
  let signature: string;
  try {
    const info = await stat(canonicalFileName, { bigint: true });
    if (sourceText !== undefined && (await readFile(canonicalFileName, 'utf8')) !== sourceText) {
      return false;
    }
    signature = `${info.dev}:${info.ino}:${info.size}:${info.mtimeNs}:${info.ctimeNs}`;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      const state = projectScanCache.get(key);
      state?.signatures.delete(canonicalFileName);
      return state?.modules.delete(canonicalFileName) ?? false;
    }
    throw error;
  }
  const previous = state.modules.has(canonicalFileName);
  if (transformed) {
    state.modules.set(canonicalFileName, {
      id: canonicalFileName,
      candidates: transformed.candidates,
      composites: transformed.composites,
      atomicClasses: transformed.atomicClasses,
      origins: transformed.origins,
    });
  } else {
    state.modules.delete(canonicalFileName);
  }
  state.signatures.set(canonicalFileName, signature);
  return previous || transformed !== null;
}

/** Returns the cached project metadata without rescanning source files. */
export function getCachedProjectScanSourceModules(
  root: string,
  options: CssxPluginOptions,
): readonly CssxSourceModule[] | undefined {
  const state = projectScanCache.get(projectScanKey(root, options));
  return state ? [...state.modules.values()].sort((left, right) => left.id.localeCompare(right.id)) : undefined;
}

/** Marks a project metadata snapshot as owned by an active development coordinator. */
export function retainProjectScan(root: string, options: CssxPluginOptions): void {
  activeProjectScans.add(projectScanKey(root, options));
}

/** Releases cached metadata and any optional watcher for a stopped coordinator. */
export function releaseProjectScan(root: string, options: CssxPluginOptions): void {
  const key = projectScanKey(root, options);
  activeProjectScans.delete(key);
  projectScanWatchers.get(key)?.stop();
  projectScanCache.delete(key);
}

/** Builds a stable in-process cache key from project and transform settings. */
function projectScanKey(root: string, options: CssxPluginOptions): string {
  const transformOptions = { ...options };
  delete transformOptions.coordination;
  delete transformOptions.manifestPath;
  delete transformOptions.classNameAllocator;
  return `${canonicalPathSync(root)}\u0000${JSON.stringify(transformOptions)}`;
}

/** Creates or returns the cached project state for one transform configuration. */
function getOrCreateProjectScanState(root: string, options: CssxPluginOptions) {
  const key = projectScanKey(root, options);
  let state = projectScanCache.get(key);
  if (!state) {
    state = {
      allocator: options.classNameAllocator ?? createClassNameAllocator(effectiveClassNameOptions(options)),
      modules: new Map<string, CssxSourceModule>(),
      signatures: new Map<string, string>(),
    };
    projectScanCache.set(key, state);
    pruneInactiveProjectScans(key);
  }
  return state;
}

/** Drops old, unwatched snapshots while keeping active development projects intact. */
function pruneInactiveProjectScans(preserveKey: string): void {
  if (projectScanCache.size <= MAX_INACTIVE_PROJECT_SCANS) {
    return;
  }
  for (const key of projectScanCache.keys()) {
    if (projectScanCache.size <= MAX_INACTIVE_PROJECT_SCANS) {
      return;
    }
    if (key !== preserveKey && !activeProjectScans.has(key) && !projectScanWatchers.has(key)) {
      projectScanCache.delete(key);
    }
  }
}

/** Metadata and file signatures retained for each in-memory project scan. */
const projectScanCache = new Map<
  string,
  {
    readonly allocator: import('@cssxio/compiler').ClassNameAllocator;
    readonly modules: Map<string, CssxSourceModule>;
    readonly signatures: Map<string, string>;
  }
>();

/** In-flight scan by project and transform options to avoid duplicate work. */
const projectScanInFlight = new Map<string, Promise<readonly CssxSourceModule[]>>();
/** Project snapshots held by live development coordinators. */
const activeProjectScans = new Set<string>();
/** Maximum number of inactive project snapshots retained after tools reconfigure. */
const MAX_INACTIVE_PROJECT_SCANS = 8;
/** Maximum distinct paths retained between one watcher flush and the next. */
const MAX_PENDING_SOURCE_CHANGES = 256;
/** Maximum project-directory watchers retained across active CSSX coordinators. */
const MAX_PROJECT_SOURCE_WATCHERS = 16;
/** Active watcher handles shared by all project scan coordinators in this process. */
let activeProjectSourceWatchers = 0;
/**
 *
 */
const PROJECT_SOURCE_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.cjs',
  '.cjsx',
  '.cts',
  '.ctsx',
  '.mjs',
  '.mjsx',
  '.mts',
  '.mtsx',
  '.astro',
  '.md',
  '.mdx',
]);

/** Watches source directories after their initial metadata scan. */
export async function watchProjectCssxSourceModules(
  root: string,
  options: CssxPluginOptions,
  onUpdate: (modules: readonly CssxSourceModule[]) => void | Promise<void>,
  isHandledByBundler: (path: string) => boolean = () => false,
): Promise<() => void> {
  const projectRoot = canonicalPathSync(root);
  const key = projectScanKey(projectRoot, options);
  const existing = projectScanWatchers.get(key);
  if (existing) {
    return Promise.resolve(existing.stop);
  }
  const initialScan = projectScanInFlight.get(key);
  if (initialScan) {
    await initialScan;
  }

  const additionalRoots = options.sourceRoots?.map((path) => resolve(projectRoot, path)) ?? [];
  const watchers = new Map<string, FSWatcher>();
  const changedPaths = new Set<string>();
  let changedDuringScan = false;
  let fullScanPending = false;
  let timer: NodeJS.Timeout | undefined;
  let stopped = false;
  let flushing = false;
  let watcherLimitWarned = false;
  let watcherErrorWarned = false;
  const queueChangedPath = (path: string) => {
    if (fullScanPending || changedPaths.has(path)) {
      return;
    }
    if (changedPaths.size >= MAX_PENDING_SOURCE_CHANGES) {
      changedPaths.clear();
      fullScanPending = true;
      return;
    }
    changedPaths.add(path);
    if (projectScanInFlight.has(key)) {
      changedDuringScan = true;
    }
  };
  const schedule = (delay = 0) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = undefined;
      void flush();
    }, delay);
  };
  const reconcileDirectories = async () => {
    const directories = await findProjectSourceDirectories(
      projectRoot,
      additionalRoots,
      [...(projectScanCache.get(key)?.modules.values() ?? [])],
      options.themeFile ? resolve(projectRoot, options.themeFile) : undefined,
    );
    if (stopped) {
      return;
    }
    const active = new Set(directories);
    for (const [directory, watcher] of watchers) {
      if (!active.has(directory)) {
        watcher.close();
        watchers.delete(directory);
        activeProjectSourceWatchers--;
      }
    }
    for (const directory of directories) {
      if (watchers.has(directory)) {
        continue;
      }
      if (activeProjectSourceWatchers >= MAX_PROJECT_SOURCE_WATCHERS) {
        if (!watcherLimitWarned) {
          watcherLimitWarned = true;
          console.warn(`CSSX: development source watcher reached the ${MAX_PROJECT_SOURCE_WATCHERS}-directory limit.`);
        }
        continue;
      }
      let watcher: FSWatcher;
      try {
        watcher = watch(directory, (_event, fileName) => {
          if (stopped) {
            return;
          }
          if (fileName === null) {
            fullScanPending = true;
            schedule(8);
            return;
          }
          const changedPath = resolve(directory, fileName.toString());
          if (isIgnoredProjectSourcePath(changedPath, additionalRoots) || isHandledByBundler(changedPath)) {
            return;
          }
          if (
            extname(changedPath) === '.css' &&
            canonicalPathSync(changedPath) === canonicalPathSync(resolve(projectRoot, options.themeFile ?? ''))
          ) {
            queueChangedPath(changedPath);
            schedule();
            return;
          }
          const extension = extname(changedPath);
          if (_event === 'rename' && extension === '') {
            fullScanPending = true;
          } else if (isProjectSourceExtension(extension)) {
            queueChangedPath(changedPath);
          } else {
            return;
          }
          const knownSourcePath = projectScanCache.get(key)?.signatures.has(canonicalPathSync(changedPath)) ?? false;
          schedule(_event === 'rename' && !knownSourcePath ? 8 : 0);
        });
      } catch (error) {
        if (!watcherErrorWarned) {
          watcherErrorWarned = true;
          console.warn(
            `CSSX: development source watcher could not watch ${directory}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
        continue;
      }
      watcher.on('error', (error: NodeJS.ErrnoException) => {
        if (watchers.get(directory) !== watcher) {
          return;
        }
        watchers.delete(directory);
        activeProjectSourceWatchers--;
        watcher.close();
        console.warn(`CSSX: development source watcher stopped for ${directory}: ${error.message}`);
      });
      watcher.unref();
      watchers.set(directory, watcher);
      activeProjectSourceWatchers++;
    }
  };
  const flush = async () => {
    if (stopped || flushing) {
      return;
    }
    flushing = true;
    const paths = [...changedPaths];
    const fullScan = fullScanPending;
    const changedWhileScanPending = changedDuringScan;
    changedPaths.clear();
    fullScanPending = false;
    changedDuringScan = false;
    try {
      if (fullScan) {
        const modules = await scanProjectCssxSourceModules(projectRoot, options);
        if (stopped) {
          projectScanCache.delete(key);
          return;
        }
        await reconcileDirectories();
        if (!stopped) {
          await onUpdate(modules);
        }
      } else {
        let updated = changedWhileScanPending;
        for (const changedPath of paths) {
          if (
            options.themeFile &&
            canonicalPathSync(changedPath) === canonicalPathSync(resolve(projectRoot, options.themeFile))
          ) {
            updated = true;
          } else {
            updated = (await updateProjectScanSourceFile(projectRoot, changedPath, options)) || updated;
          }
        }
        if (updated && !stopped) {
          const modules = getCachedProjectScanSourceModules(projectRoot, options)!;
          await onUpdate(modules);
        }
      }
    } catch (error) {
      if (!stopped) {
        console.warn(
          `CSSX: development source update failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } finally {
      flushing = false;
      if ((fullScanPending || changedPaths.size > 0) && !timer) {
        schedule();
      }
    }
  };
  const stop = () => {
    stopped = true;
    if (timer) {
      clearTimeout(timer);
    }
    changedPaths.clear();
    fullScanPending = false;
    changedDuringScan = false;
    for (const watcher of watchers.values()) {
      watcher.close();
      activeProjectSourceWatchers--;
    }
    watchers.clear();
    projectScanWatchers.delete(key);
    projectScanCache.delete(key);
  };
  projectScanWatchers.set(key, { stop });
  await reconcileDirectories().catch((error: unknown) => {
    console.warn(
      `CSSX: development source watcher could not start: ${error instanceof Error ? error.message : String(error)}`,
    );
  });
  return stop;
}

/** Transforms one changed source file into cached metadata without a project scan. */
async function updateProjectScanSourceFile(
  root: string,
  fileName: string,
  options: CssxPluginOptions,
): Promise<boolean> {
  const absoluteFileName = canonicalPathSync(fileName);
  const key = projectScanKey(root, options);
  const priorState = projectScanCache.get(key);
  const priorSignature = priorState?.signatures.get(absoluteFileName);
  const wasPreviouslyPresent = priorState?.modules.has(absoluteFileName) ?? false;
  const pending = projectScanInFlight.get(key);
  if (pending) {
    await pending;
  }
  const state = projectScanCache.get(key);
  if (!state) {
    return false;
  }
  const previous = state.modules.has(absoluteFileName);
  try {
    const info = await stat(absoluteFileName, { bigint: true });
    const signature = `${info.dev}:${info.ino}:${info.size}:${info.mtimeNs}:${info.ctimeNs}`;
    if (state.signatures.get(absoluteFileName) === signature) {
      return priorSignature !== signature;
    }
    const source = await readFile(absoluteFileName, 'utf8');
    const isMdx = /\.(?:md|mdx)$/i.test(absoluteFileName);
    if (isMdx && !source.includes(options.importSource ?? '@cssxio/cssx')) {
      state.modules.delete(absoluteFileName);
      state.signatures.set(absoluteFileName, signature);
      return previous;
    }
    const code = isMdx ? await compileNextMdx(source, root, options.mdx) : source;
    const stable = options.stableClassNames || options.naming === 'source';
    const stableFileName = stable
      ? stableModuleFileName(root, absoluteFileName, options.mode === 'development')
      : undefined;
    if (!isMdx && !/\.(?:astro|vue)$/i.test(absoluteFileName)) {
      const nativeScan = await scanNativeStaticSxModule(
        code,
        absoluteFileName,
        root,
        options,
        state.allocator,
        stableFileName ?? absoluteFileName,
      );
      if (nativeScan.handled) {
        if (nativeScan.module) {
          state.modules.set(absoluteFileName, nativeScan.module);
        } else {
          state.modules.delete(absoluteFileName);
        }
        state.signatures.set(absoluteFileName, signature);
        return previous || nativeScan.module !== undefined;
      }
    }
    const transformOptions = { ...options };
    delete transformOptions.coordination;
    delete transformOptions.manifestPath;
    delete transformOptions.classNameAllocator;
    const transformed = await transformCssxModule(
      code,
      isMdx ? `${absoluteFileName}.tsx` : absoluteFileName,
      {
        ...transformOptions,
        classNameAllocator: state.allocator,
        stableClassNames: stable,
        ...(stable ? { stableClassNameFileName: stableFileName } : {}),
      },
      undefined,
      { compileCss: false },
    );
    if (transformed) {
      state.modules.set(absoluteFileName, {
        id: absoluteFileName,
        candidates: transformed.candidates,
        composites: transformed.composites,
        atomicClasses: transformed.atomicClasses,
        origins: transformed.origins,
      });
    } else {
      state.modules.delete(absoluteFileName);
    }
    state.signatures.set(absoluteFileName, signature);
    return previous || transformed !== null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      state.signatures.delete(absoluteFileName);
      state.modules.delete(absoluteFileName);
      return previous || wasPreviouslyPresent;
    }
    throw error;
  }
}

/** Directories covered by the source watcher, with generated trees pruned. */
async function findProjectSourceDirectories(
  root: string,
  additionalRoots: readonly string[],
  modules: readonly CssxSourceModule[],
  themeFile?: string,
): Promise<string[]> {
  const directories = new Set([
    root,
    ...additionalRoots,
    ...modules.map((module) => dirname(module.id)),
    ...(themeFile ? [dirname(themeFile)] : []),
  ]);
  const watched: string[] = [];
  for (const directory of directories) {
    const normalized = resolve(directory);
    if (isIgnoredProjectSourcePath(normalized, additionalRoots)) {
      continue;
    }
    try {
      await readdir(normalized);
      watched.push(normalized);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        continue;
      }
      throw error;
    }
  }
  return watched;
}

/** Source extensions recognized by the project scan. */
function isProjectSourceExtension(extension: string): boolean {
  return PROJECT_SOURCE_EXTENSIONS.has(extension);
}

/** Watchers keyed by the same configuration as the module metadata cache. */
const projectScanWatchers = new Map<string, { readonly stop: () => void }>();
