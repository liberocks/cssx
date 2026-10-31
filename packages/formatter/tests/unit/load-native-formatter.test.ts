import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  loadNativeFormatter,
  nativeFormatterInternals,
  type NativeCssxFormatter,
} from '../../src/load-native-formatter';

const nativeFormatter: NativeCssxFormatter = {
  findCssxFormattingLiterals: () => [],
};

beforeEach(() => {
  nativeFormatterInternals.reset();
  vi.stubEnv('CSSX_DISABLE_NATIVE_COMPILER', '');
  vi.stubEnv('CSSX_NATIVE_COMPILER_PATH', '');
});

afterEach(() => {
  nativeFormatterInternals.reset();
  vi.unstubAllEnvs();
});

describe('loadNativeFormatter', () => {
  it('honors the native compiler disable flag', () => {
    vi.stubEnv('CSSX_DISABLE_NATIVE_COMPILER', '1');
    const requirePackage = vi.fn();

    expect(loadNativeFormatter(requirePackage)).toBeUndefined();
    expect(requirePackage).not.toHaveBeenCalled();
  });

  it('uses the default package resolvers when none are configured', () => {
    const formatter = loadNativeFormatter();

    expect(formatter === undefined || nativeFormatterInternals.isNativeCssxFormatter(formatter)).toBe(true);
  });

  it('loads a configured native binary before resolving the optional package', () => {
    vi.stubEnv('CSSX_NATIVE_COMPILER_PATH', '/tmp/cssx-compiler.node');
    const requirePackage = vi.fn();
    const dlopen = vi.fn((binding: NodeJS.Module & { exports: NativeCssxFormatter }) => {
      binding.exports = nativeFormatter;
    });

    expect(loadNativeFormatter(requirePackage, dlopen)).toBe(nativeFormatter);
    expect(dlopen).toHaveBeenCalledWith(
      expect.objectContaining({ exports: nativeFormatter }),
      '/tmp/cssx-compiler.node',
    );
    expect(requirePackage).not.toHaveBeenCalled();
  });

  it('falls through to package resolution when a configured binary cannot load', () => {
    vi.stubEnv('CSSX_NATIVE_COMPILER_PATH', '/tmp/missing.node');
    const firstResolver = vi.fn(() => null);
    const secondResolver = vi.fn(() => nativeFormatter);
    const dlopen = vi.fn(() => {
      throw new Error('missing addon');
    });

    expect(loadNativeFormatter(firstResolver, dlopen, secondResolver)).toBe(nativeFormatter);
    expect(firstResolver).toHaveBeenCalledWith('@cssxio/compiler-native');
    expect(secondResolver).toHaveBeenCalledWith('@cssxio/compiler-native');
  });

  it('falls through when the configured binary exports an unsupported shape', () => {
    vi.stubEnv('CSSX_NATIVE_COMPILER_PATH', '/tmp/old.node');
    const secondResolver = vi.fn(() => nativeFormatter);
    const dlopen = vi.fn((binding: NodeJS.Module & { exports: NativeCssxFormatter }) => {
      binding.exports = {} as NativeCssxFormatter;
    });

    expect(loadNativeFormatter(() => null, dlopen, secondResolver)).toBe(nativeFormatter);
  });

  it('returns undefined and caches a missing optional package', () => {
    const firstResolver = vi.fn(() => {
      throw new Error('not installed');
    });
    const secondResolver = vi.fn(() => {
      throw new Error('not installed');
    });

    expect(loadNativeFormatter(firstResolver, undefined, secondResolver)).toBeUndefined();
    expect(loadNativeFormatter(firstResolver, undefined, secondResolver)).toBeUndefined();
    expect(firstResolver).toHaveBeenCalledTimes(1);
    expect(secondResolver).toHaveBeenCalledTimes(1);
  });

  it('validates the native API shape', () => {
    expect(nativeFormatterInternals.isNativeCssxFormatter(nativeFormatter)).toBe(true);
    expect(nativeFormatterInternals.isNativeCssxFormatter(null)).toBe(false);
    expect(nativeFormatterInternals.isNativeCssxFormatter({})).toBe(false);
    expect(nativeFormatterInternals.isNativeCssxFormatter({ findCssxFormattingLiterals: 1 })).toBe(false);
  });
});
