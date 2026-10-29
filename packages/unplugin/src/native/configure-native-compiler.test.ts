import { createClassNameAllocator } from '@cssxio/compiler';
import { beforeEach, expect, it, vi } from 'vitest';

import type { CssxPluginOptions } from '../core/options';
import { RULES_METADATA_KEY, type ModuleCssxData } from '../transforms/module-cssx-data';
import { configureNativeCompiler } from './configure-native-compiler';
import type { NativeBuildState } from './native-build-state';
import type { NativeCompiler } from './native-types';
import type { CssxSourceModule } from './stylesheet-types';

const mocks = vi.hoisted(() => ({
  configureCompilationAsset: vi.fn(),
  compileCssxStylesheet: vi.fn().mockResolvedValue({ css: '.ddevelopment{}' }),
  cssWithSourceMapComment: vi.fn((stylesheet: { readonly css: string }) => stylesheet.css),
  getCachedProjectScanSourceModules: vi.fn<() => readonly CssxSourceModule[] | undefined>(() => undefined),
  nativeBuildState: vi.fn(),
  publishNextDevelopmentStylesheet: vi.fn(),
  scanProjectCssxSourceModules: vi.fn(),
  startDevelopmentCoordinator: vi.fn(),
  startNextDevelopmentServer: vi.fn(() => ({ port: 45679, token: 'native-test' })),
  stopNextDevelopmentServer: vi.fn(),
}));

vi.mock('../core/configure-compilation-asset', () => ({ configureCompilationAsset: mocks.configureCompilationAsset }));
vi.mock('../native/stylesheet', () => ({
  compileCssxStylesheet: mocks.compileCssxStylesheet,
  cssWithSourceMapComment: mocks.cssWithSourceMapComment,
}));
vi.mock('./native-build-state', () => ({ nativeBuildState: mocks.nativeBuildState }));
vi.mock('../transforms/project-scan', () => ({
  getCachedProjectScanSourceModules: mocks.getCachedProjectScanSourceModules,
  scanProjectCssxSourceModules: mocks.scanProjectCssxSourceModules,
}));
vi.mock('../adapters/development-coordinator', () => ({
  startDevelopmentCoordinator: mocks.startDevelopmentCoordinator,
}));
vi.mock('../adapters/next-development-server', () => ({
  publishNextDevelopmentStylesheet: mocks.publishNextDevelopmentStylesheet,
  startNextDevelopmentServer: mocks.startNextDevelopmentServer,
  stopNextDevelopmentServer: mocks.stopNextDevelopmentServer,
}));

/** Provides native compiler state without running a bundler lifecycle. */
function configureState(): {
  readonly compiler: NativeCompiler;
  readonly transformedDataById: Map<string, ModuleCssxData>;
} {
  const transformedDataById = new Map<string, ModuleCssxData>();
  mocks.nativeBuildState.mockReturnValue({
    classNameAllocator: createClassNameAllocator(),
    transformedDataById,
  } as NativeBuildState);
  return { compiler: { context: '/project' } as unknown as NativeCompiler, transformedDataById };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCachedProjectScanSourceModules.mockReturnValue(undefined);
});

it('passes shared compiler state and stable-name project scanning to the asset hook', async () => {
  const { compiler, transformedDataById } = configureState();
  const options: CssxPluginOptions = {
    layer: 'components',
    darkMode: 'class',
    preflight: false,
    stableClassNames: true,
  };
  const getTheme = vi.fn(async () => 'theme-css');
  const projectModules = [{ id: '/project/App.tsx' }];
  mocks.scanProjectCssxSourceModules.mockResolvedValue(projectModules);

  configureNativeCompiler({ compiler, options, cssFileName: 'styles.css', sourceMap: true, getTheme });

  expect(mocks.nativeBuildState).toHaveBeenCalledWith('/project', options);
  const configureArguments = mocks.configureCompilationAsset.mock.calls[0] as unknown[];
  expect(configureArguments.slice(0, 5)).toEqual([compiler, 'styles.css', getTheme, 'components', true]);
  expect(configureArguments[5]).toBe(RULES_METADATA_KEY);
  expect(configureArguments[6]).toBe(transformedDataById);
  expect(configureArguments.slice(7, 9)).toEqual(['class', false]);
  const projectSourceData = configureArguments[9] as () => Promise<unknown>;
  await expect(projectSourceData()).resolves.toEqual(projectModules);
  expect(mocks.scanProjectCssxSourceModules).toHaveBeenCalledWith('/project', options);
});

it('omits project scanning when stable class names are disabled', () => {
  const { compiler, transformedDataById } = configureState();
  const options: CssxPluginOptions = { preflight: true };

  configureNativeCompiler({
    compiler,
    options,
    cssFileName: 'cssx.css',
    sourceMap: false,
    getTheme: async () => undefined,
  });

  const configureArguments = mocks.configureCompilationAsset.mock.calls[0] as unknown[];
  expect(configureArguments.slice(0, 5)).toEqual([compiler, 'cssx.css', expect.any(Function), undefined, false]);
  expect(configureArguments[5]).toBe(RULES_METADATA_KEY);
  expect(configureArguments[6]).toBe(transformedDataById);
  expect(configureArguments.slice(7, 9)).toEqual([undefined, true]);
  expect(configureArguments[9]).toBeUndefined();
  expect(mocks.scanProjectCssxSourceModules).not.toHaveBeenCalled();
});

it('uses development emission settings for a native development compiler without scanning the project', () => {
  const { compiler, transformedDataById } = configureState();
  const options: CssxPluginOptions = {
    coordination: 'manifest',
    manifestPath: '/project/classes.json',
    naming: 'serial',
    reusabilityBudget: 100,
  };

  configureNativeCompiler({
    compiler: { ...compiler, options: { mode: 'development' }, watchMode: true },
    options,
    cssFileName: 'cssx.css',
    sourceMap: false,
    getTheme: async () => undefined,
  });

  const configureArguments = mocks.configureCompilationAsset.mock.calls[0] as unknown[];
  expect(configureArguments[6]).toBe(transformedDataById);
  expect(configureArguments[9]).toBeUndefined();
  expect(configureArguments[10]).toMatchObject({
    mode: 'development',
    coordination: 'memory',
    naming: 'source',
    reusabilityBudget: 0,
    manifestPath: undefined,
  });
  expect(mocks.scanProjectCssxSourceModules).not.toHaveBeenCalled();
});

it('drops removed source records before watched native compilations emit their stylesheet', () => {
  const { compiler, transformedDataById } = configureState();
  transformedDataById.set('/project/Removed.tsx', {
    id: '/project/Removed.tsx',
    rules: [],
    candidates: { 'p-4': 's0x' },
    composites: {},
    origins: {},
    cssOnlySignature: '',
  });
  let onWatchRun: ((compiler: NativeCompiler) => void) | undefined;
  const watchedCompiler = {
    ...compiler,
    options: { mode: 'development' },
    hooks: {
      ...compiler.hooks,
      watchRun: { tap: (_name: string, callback: (compiler: NativeCompiler) => void) => (onWatchRun = callback) },
    },
  } as unknown as NativeCompiler;

  configureNativeCompiler({
    compiler: watchedCompiler,
    options: {},
    cssFileName: 'cssx.css',
    sourceMap: false,
    getTheme: async () => undefined,
  });
  onWatchRun?.({ ...watchedCompiler, removedFiles: new Set(['/project/Removed.tsx']) });

  expect(transformedDataById.has('/project/Removed.tsx')).toBe(false);
});

it('starts and stops the shared coordinator around a native development watch', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  const { compiler, transformedDataById } = configureState();
  const stopCoordinator = vi.fn();
  mocks.startDevelopmentCoordinator.mockResolvedValue(stopCoordinator);
  let onWatchRun: ((compiler: NativeCompiler) => void) | undefined;
  let onWatchClose: (() => void) | undefined;
  const watchedCompiler = {
    ...compiler,
    options: { mode: 'development' },
    watchMode: true,
    hooks: {
      watchRun: { tap: (_name: string, callback: (compiler: NativeCompiler) => void) => (onWatchRun = callback) },
      watchClose: { tap: (_name: string, callback: () => void) => (onWatchClose = callback) },
    },
  } as unknown as NativeCompiler;
  try {
    configureNativeCompiler({
      compiler: watchedCompiler,
      options: {},
      cssFileName: 'cssx.css',
      sourceMap: false,
      getTheme: async () => undefined,
    });
    transformedDataById.set('/project/Removed.tsx', {
      id: '/project/Removed.tsx',
      rules: [],
      candidates: {},
      composites: {},
      origins: {},
      cssOnlySignature: '',
    });
    onWatchRun?.({ ...watchedCompiler, removedFiles: new Set(['/project/Removed.tsx']) } as NativeCompiler);
    expect(transformedDataById.has('/project/Removed.tsx')).toBe(false);
    await vi.waitFor(() => expect(mocks.startDevelopmentCoordinator).toHaveBeenCalledOnce());
    onWatchRun?.(watchedCompiler);
    onWatchClose?.();
    await vi.waitFor(() => expect(stopCoordinator).toHaveBeenCalledOnce());
    expect(mocks.stopNextDevelopmentServer).toHaveBeenCalledWith('/project');
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
});

it('coalesces native loader metadata into an immediate stylesheet push after the initial build', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  const { compiler, transformedDataById } = configureState();
  const connection = { port: 45679, token: 'native-test' };
  const stopCoordinator = vi.fn();
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  mocks.startDevelopmentCoordinator.mockResolvedValue(stopCoordinator);
  const cachedModule = {
    id: '/project/Cached.tsx',
    candidates: { 'p-2': 'd-cached' },
    composites: {},
    atomicClasses: [],
    origins: {},
  };
  const changedModule = {
    id: '/project/Changed.tsx',
    candidates: { 'p-8': 'd-changed' },
    composites: {},
    atomicClasses: [],
    origins: {},
  };
  mocks.getCachedProjectScanSourceModules.mockReturnValue([cachedModule, changedModule]);
  let onWatchRun: ((compiler: NativeCompiler) => void) | undefined;
  let onWatchClose: (() => void) | undefined;
  const watchedCompiler = {
    ...compiler,
    options: { mode: 'development' },
    watchMode: true,
    hooks: {
      watchRun: { tap: (_name: string, callback: (compiler: NativeCompiler) => void) => (onWatchRun = callback) },
      watchClose: { tap: (_name: string, callback: () => void) => (onWatchClose = callback) },
    },
  } as unknown as NativeCompiler;
  try {
    configureNativeCompiler({
      compiler: watchedCompiler,
      options: { preflight: false, sourceMap: false },
      cssFileName: 'cssx.css',
      sourceMap: false,
      getTheme: async () => undefined,
    });
    onWatchRun?.(watchedCompiler);
    const notify = (mocks.nativeBuildState.mock.results[0]?.value as NativeBuildState).notifyDevelopmentStylesheet!;
    await notify();
    onWatchRun?.(watchedCompiler);
    transformedDataById.set('/project/Changed.tsx', {
      id: '/project/Changed.tsx',
      rules: [],
      candidates: { 'p-8': 'd-changed' },
      composites: {},
      origins: {},
      cssOnlySignature: '',
    });

    await Promise.all([notify(), notify()]);

    expect(mocks.getCachedProjectScanSourceModules).toHaveBeenCalledWith(
      '/project',
      expect.objectContaining({ mode: 'development', preflight: false }),
    );
    expect(mocks.compileCssxStylesheet).toHaveBeenCalledWith(
      expect.arrayContaining([cachedModule, changedModule]),
      undefined,
      undefined,
      false,
      undefined,
      false,
    );
    expect(mocks.publishNextDevelopmentStylesheet).toHaveBeenCalledOnce();
    expect(mocks.publishNextDevelopmentStylesheet).toHaveBeenCalledWith(connection, '.ddevelopment{}');
    expect((mocks.nativeBuildState.mock.results[0]?.value as NativeBuildState).developmentStylesheet).toBe(
      '.ddevelopment{}',
    );

    mocks.getCachedProjectScanSourceModules.mockReturnValue(undefined);
    await notify();
    expect(mocks.compileCssxStylesheet).toHaveBeenLastCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: '/project/Changed.tsx' })]),
      undefined,
      undefined,
      false,
      undefined,
      false,
    );
    mocks.compileCssxStylesheet.mockRejectedValueOnce(new Error('native stylesheet failed'));
    await notify();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('native stylesheet failed'));
    mocks.compileCssxStylesheet.mockRejectedValueOnce('native stylesheet failed with a string');
    await notify();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('native stylesheet failed with a string'));

    onWatchClose?.();
    await vi.waitFor(() => expect(stopCoordinator).toHaveBeenCalledOnce());
  } finally {
    warning.mockRestore();
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
});

it('stops the development server when coordinator startup fails', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  const { compiler } = configureState();
  mocks.startDevelopmentCoordinator.mockRejectedValue(new Error('startup failed'));
  let onWatchRun: ((compiler: NativeCompiler) => void) | undefined;
  let onWatchClose: (() => void) | undefined;
  const watchedCompiler = {
    ...compiler,
    options: { mode: 'development' },
    watchMode: true,
    hooks: {
      watchRun: { tap: (_name: string, callback: (compiler: NativeCompiler) => void) => (onWatchRun = callback) },
      watchClose: { tap: (_name: string, callback: () => void) => (onWatchClose = callback) },
    },
  } as unknown as NativeCompiler;
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  try {
    configureNativeCompiler({
      compiler: watchedCompiler,
      options: {},
      cssFileName: 'cssx.css',
      sourceMap: false,
      getTheme: async () => undefined,
    });
    onWatchRun?.(watchedCompiler);
    await vi.waitFor(() => expect(warning).toHaveBeenCalledWith(expect.stringContaining('startup failed')));
    onWatchClose?.();
    await vi.waitFor(() => expect(mocks.stopNextDevelopmentServer).toHaveBeenCalledWith('/project'));
  } finally {
    warning.mockRestore();
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
});
