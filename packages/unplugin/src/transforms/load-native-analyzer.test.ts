import { afterEach, describe, expect, it, vi } from 'vitest';

import type { NativeCssxAnalyzer } from './native-static-sx';

const nativeAnalyzer: NativeCssxAnalyzer = { findCssxCalls: () => [] };

describe('loadNativeAnalyzer', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('loads and caches the optional packaged addon', async () => {
    const { loadNativeAnalyzer } = await importFreshLoader();
    const requirePackage = { resolve: vi.fn(() => '/optional/compiler-native.node') };
    const dlopen = vi.fn((module: NodeJS.Module & { exports: NativeCssxAnalyzer }) => {
      module.exports = nativeAnalyzer;
    });

    expect(loadNativeAnalyzer(requirePackage, dlopen)).toBe(nativeAnalyzer);
    expect(loadNativeAnalyzer(requirePackage, dlopen)).toBe(nativeAnalyzer);
    expect(requirePackage.resolve).toHaveBeenCalledTimes(1);
    expect(dlopen).toHaveBeenCalledTimes(1);
  });

  it('prefers the configured binary over the packaged addon', async () => {
    const { loadNativeAnalyzer } = await importFreshLoader();
    vi.stubEnv('CSSX_NATIVE_COMPILER_PATH', '/custom/cssx-native.node');
    const requirePackage = { resolve: vi.fn(() => '/optional/compiler-native.node') };
    const dlopen = vi.fn((module: NodeJS.Module & { exports: NativeCssxAnalyzer }, path: string) => {
      if (path !== '/custom/cssx-native.node') {
        throw new Error('configured addon was not preferred');
      }
      module.exports = nativeAnalyzer;
    });

    expect(loadNativeAnalyzer(requirePackage, dlopen)).toBe(nativeAnalyzer);
    expect(dlopen).toHaveBeenCalledTimes(1);
  });

  it('loads the configured binary when the optional package is absent', async () => {
    const { loadNativeAnalyzer } = await importFreshLoader();
    vi.stubEnv('CSSX_NATIVE_COMPILER_PATH', '/custom/cssx-native.node');
    const requirePackage = {
      resolve: vi.fn(() => {
        throw new Error('not installed');
      }),
    };
    const dlopen = vi.fn((module: NodeJS.Module & { exports: NativeCssxAnalyzer }, path: string) => {
      if (path !== '/custom/cssx-native.node') {
        throw new Error('not the configured addon');
      }
      module.exports = nativeAnalyzer;
    });

    expect(loadNativeAnalyzer(requirePackage, dlopen)).toBe(nativeAnalyzer);
    expect(dlopen).toHaveBeenCalledTimes(1);
  });

  it('caches an unavailable addon after trying all platform paths', async () => {
    const { loadNativeAnalyzer } = await importFreshLoader();
    vi.stubEnv('CSSX_NATIVE_COMPILER_PATH', '');
    const requirePackage = {
      resolve: vi.fn(() => {
        throw new Error('not installed');
      }),
    };
    const dlopen = vi.fn(() => {
      throw new Error('unavailable');
    });

    expect(loadNativeAnalyzer(requirePackage, dlopen)).toBeUndefined();
    expect(loadNativeAnalyzer(requirePackage, dlopen)).toBeUndefined();
    expect(dlopen).toHaveBeenCalledTimes(6);
  });

  it('respects the native compiler disable switch', async () => {
    const { loadNativeAnalyzer } = await importFreshLoader();
    vi.stubEnv('CSSX_DISABLE_NATIVE_COMPILER', '1');
    const requirePackage = { resolve: vi.fn() };
    const dlopen = vi.fn();

    expect(loadNativeAnalyzer(requirePackage, dlopen)).toBeUndefined();
    expect(requirePackage.resolve).not.toHaveBeenCalled();
    expect(dlopen).not.toHaveBeenCalled();
  });
});

async function importFreshLoader(): Promise<typeof import('./load-native-analyzer')> {
  vi.resetModules();
  return import('./load-native-analyzer');
}
