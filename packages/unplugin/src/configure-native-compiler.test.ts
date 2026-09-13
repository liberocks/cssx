import { createClassNameAllocator } from '@cssxio/compiler';
import { beforeEach, expect, it, vi } from 'vitest';

import { configureNativeCompiler } from './configure-native-compiler';
import { RULES_METADATA_KEY, type ModuleCssxData } from './module-cssx-data';
import type { NativeBuildState } from './native-build-state';
import type { NativeCompiler } from './native-types';
import type { CssxPluginOptions } from './options';

const mocks = vi.hoisted(() => ({
  configureCompilationAsset: vi.fn(),
  nativeBuildState: vi.fn(),
  scanProjectCssxSourceModules: vi.fn(),
}));

vi.mock('./configure-compilation-asset', () => ({ configureCompilationAsset: mocks.configureCompilationAsset }));
vi.mock('./native-build-state', () => ({ nativeBuildState: mocks.nativeBuildState }));
vi.mock('./project-scan', () => ({ scanProjectCssxSourceModules: mocks.scanProjectCssxSourceModules }));

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
