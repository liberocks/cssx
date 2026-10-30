import { afterEach, describe, expect, it, vi } from 'vitest';

import type { NativeCssxAnalyzer } from './native-static-sx';

const nativeAnalyzer: NativeCssxAnalyzer = { findCssxCalls: () => [] };

describe('loadNativeAnalyzer', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('loads and caches the optional packaged addon', async () => {
    const { loadNativeAnalyzer } = await importFreshLoader();
    const requirePackage = vi.fn(() => nativeAnalyzer);
    const moduleRequire = vi.fn(() => {
      throw new Error('app package resolver succeeded first');
    });
    const dlopen = vi.fn();

    expect(loadNativeAnalyzer(requirePackage, dlopen, moduleRequire)).toBe(nativeAnalyzer);
    expect(loadNativeAnalyzer(requirePackage, dlopen, moduleRequire)).toBe(nativeAnalyzer);
    expect(requirePackage).toHaveBeenCalledTimes(1);
    expect(requirePackage).toHaveBeenCalledWith('@cssxio/compiler-native');
    expect(moduleRequire).not.toHaveBeenCalled();
    expect(dlopen).not.toHaveBeenCalled();
  });

  it.each([undefined, null, 'not a native analyzer', {}, { findCssxCalls: null }])(
    'falls back when the optional package does not export an analyzer (%s)',
    async (packagedAnalyzer) => {
      const { loadNativeAnalyzer } = await importFreshLoader();
      vi.stubEnv('CSSX_NATIVE_COMPILER_PATH', '');
      const requirePackage = vi.fn(() => packagedAnalyzer);
      const moduleRequire = vi.fn(() => undefined);
      const dlopen = vi.fn(() => {
        throw new Error('no local native build');
      });

      expect(loadNativeAnalyzer(requirePackage, dlopen, moduleRequire)).toBeUndefined();
      expect(requirePackage).toHaveBeenCalledWith('@cssxio/compiler-native');
      expect(moduleRequire).toHaveBeenCalledWith('@cssxio/compiler-native');
      expect(dlopen).toHaveBeenCalledTimes(6);
    },
  );

  it('prefers the configured binary over the packaged addon', async () => {
    const { loadNativeAnalyzer } = await importFreshLoader();
    vi.stubEnv('CSSX_NATIVE_COMPILER_PATH', '/custom/cssx-native.node');
    const requirePackage = vi.fn(() => nativeAnalyzer);
    const moduleRequire = vi.fn(() => undefined);
    const dlopen = vi.fn((module: NodeJS.Module & { exports: NativeCssxAnalyzer }, path: string) => {
      if (path !== '/custom/cssx-native.node') {
        throw new Error('configured addon was not preferred');
      }
      module.exports = nativeAnalyzer;
    });

    expect(loadNativeAnalyzer(requirePackage, dlopen, moduleRequire)).toBe(nativeAnalyzer);
    expect(dlopen).toHaveBeenCalledTimes(1);
    expect(requirePackage).not.toHaveBeenCalled();
  });

  it('loads the configured binary when the optional package is absent', async () => {
    const { loadNativeAnalyzer } = await importFreshLoader();
    vi.stubEnv('CSSX_NATIVE_COMPILER_PATH', '/custom/cssx-native.node');
    const requirePackage = vi.fn(() => {
      throw new Error('not installed');
    });
    const moduleRequire = vi.fn(() => undefined);
    const dlopen = vi.fn((module: NodeJS.Module & { exports: NativeCssxAnalyzer }, path: string) => {
      if (path !== '/custom/cssx-native.node') {
        throw new Error('not the configured addon');
      }
      module.exports = nativeAnalyzer;
    });

    expect(loadNativeAnalyzer(requirePackage, dlopen, moduleRequire)).toBe(nativeAnalyzer);
    expect(dlopen).toHaveBeenCalledTimes(1);
  });

  it('caches an unavailable addon after trying all platform paths', async () => {
    const { loadNativeAnalyzer } = await importFreshLoader();
    vi.stubEnv('CSSX_NATIVE_COMPILER_PATH', '');
    const requirePackage = vi.fn(() => {
      throw new Error('not installed');
    });
    const moduleRequire = vi.fn(() => undefined);
    const dlopen = vi.fn(() => {
      throw new Error('unavailable');
    });

    expect(loadNativeAnalyzer(requirePackage, dlopen, moduleRequire)).toBeUndefined();
    expect(loadNativeAnalyzer(requirePackage, dlopen, moduleRequire)).toBeUndefined();
    expect(dlopen).toHaveBeenCalledTimes(6);
  });

  it('respects the native compiler disable switch', async () => {
    const { loadNativeAnalyzer } = await importFreshLoader();
    vi.stubEnv('CSSX_DISABLE_NATIVE_COMPILER', '1');
    const requirePackage = vi.fn();
    const dlopen = vi.fn();

    expect(loadNativeAnalyzer(requirePackage, dlopen, vi.fn())).toBeUndefined();
    expect(requirePackage).not.toHaveBeenCalled();
    expect(dlopen).not.toHaveBeenCalled();
  });

  it('resolves the optional addon from the unplugin module after the app resolver misses', async () => {
    const { loadNativeAnalyzer } = await importFreshLoader();
    const appRequire = vi.fn(() => {
      throw new Error('not in the app root');
    });
    const moduleRequire = vi.fn(() => nativeAnalyzer);
    const dlopen = vi.fn();

    expect(loadNativeAnalyzer(appRequire, dlopen, moduleRequire)).toBe(nativeAnalyzer);
    expect(appRequire).toHaveBeenCalledWith('@cssxio/compiler-native');
    expect(moduleRequire).toHaveBeenCalledWith('@cssxio/compiler-native');
    expect(dlopen).not.toHaveBeenCalled();
  });

  it('fails when the native-only benchmark cannot load the addon', async () => {
    const { loadNativeAnalyzer } = await importFreshLoader();
    vi.stubEnv('CSSX_NATIVE_COMPILER_PATH', '');
    vi.stubEnv('CSSX_REQUIRE_NATIVE_COMPILER', '1');
    const requirePackage = vi.fn(() => undefined);
    const moduleRequire = vi.fn(() => undefined);
    const dlopen = vi.fn(() => {
      throw new Error('unavailable');
    });

    expect(() => loadNativeAnalyzer(requirePackage, dlopen, moduleRequire)).toThrow('CSSX_REQUIRE_NATIVE_COMPILER=1');
  });
});

async function importFreshLoader(): Promise<typeof import('./load-native-analyzer')> {
  vi.resetModules();
  return import('./load-native-analyzer');
}
