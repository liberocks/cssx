import { createClassNameAllocator } from '@cssxio/compiler';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { tryTransformNativeStaticSxModule } from './try-transform-native-static-sx';

const mocks = vi.hoisted(() => ({ scanNative: vi.fn() }));

vi.mock('./native-static-sx', () => ({ scanNativeStaticSxModule: mocks.scanNative }));

const source = "import { sx } from '@cssxio/cssx'; export const value = sx('p-4');";
const module = {
  id: '/project/component.tsx',
  candidates: { 'p-4': 's1x' },
  composites: { d1x: ['s1x'] },
  atomicClasses: [],
  origins: {},
};
const options = {
  mode: 'development' as const,
  stableClassNames: true,
  stableClassNameStrategy: 'module-order' as const,
  sourceMap: false,
};
const transformOptions = { compileCss: false };

afterEach(() => {
  mocks.scanNative.mockReset();
});

describe('tryTransformNativeStaticSxModule', () => {
  it('returns rewritten code and metadata from the native scanner', async () => {
    mocks.scanNative.mockResolvedValueOnce({
      handled: true,
      module,
      transformedCode: `import { sx } from '@cssxio/cssx'; export const value = "d1x";`,
    });

    await expect(
      tryTransformNativeStaticSxModule(source, module.id, module.id, options, undefined, transformOptions),
    ).resolves.toEqual({
      code: `import { sx } from '@cssxio/cssx'; export const value = "d1x";`,
      rules: [],
      candidates: module.candidates,
      composites: module.composites,
      atomicClasses: [],
      origins: {},
      cssOnlySignature: '',
    });
    expect(mocks.scanNative).toHaveBeenCalledWith(
      source,
      module.id,
      process.cwd(),
      options,
      expect.anything(),
      module.id,
    );
  });

  it('supplies empty metadata fields when a scanner returns only a module id', async () => {
    mocks.scanNative.mockResolvedValueOnce({
      handled: true,
      module: { id: module.id },
      transformedCode: 'export const value = "";',
    });

    await expect(
      tryTransformNativeStaticSxModule(source, module.id, module.id, options, undefined, transformOptions),
    ).resolves.toEqual({
      code: 'export const value = "";',
      rules: [],
      candidates: {},
      composites: {},
      atomicClasses: [],
      origins: {},
      cssOnlySignature: '',
    });
  });

  it('uses provided allocator and stable filename when configured', async () => {
    const classNameAllocator = createClassNameAllocator({ variant: 'random' });
    const stableFileName = 'src/component.tsx';
    mocks.scanNative.mockResolvedValueOnce({ handled: true, module, transformedCode: 'export const value = "d1x";' });

    await expect(
      tryTransformNativeStaticSxModule(
        source,
        module.id,
        module.id,
        { ...options, classNameAllocator, stableClassNameFileName: stableFileName },
        undefined,
        transformOptions,
      ),
    ).resolves.toMatchObject({ code: 'export const value = "d1x";' });
    expect(mocks.scanNative).toHaveBeenCalledWith(
      source,
      module.id,
      process.cwd(),
      { ...options, classNameAllocator, stableClassNameFileName: stableFileName },
      classNameAllocator,
      stableFileName,
    );
  });

  it('does not use the native path when source maps or production settings are active', async () => {
    const inputSourceMap = { version: 3 as const, sources: ['input.tsx'], names: [], mappings: 'AAAA', file: 'out.js' };
    const cases = [
      [{ ...options, mode: 'production' as const }, undefined, transformOptions],
      [{ ...options, stableClassNames: false }, undefined, transformOptions],
      [{ ...options, stableClassNameStrategy: 'source-location' as const }, undefined, transformOptions],
      [{ ...options, sourceMap: true }, undefined, transformOptions],
      [options, inputSourceMap, transformOptions],
      [options, undefined, {}],
    ] as const;

    for (const [candidateOptions, sourceMap, candidateTransformOptions] of cases) {
      await expect(
        tryTransformNativeStaticSxModule(
          source,
          module.id,
          module.id,
          candidateOptions,
          sourceMap,
          candidateTransformOptions,
        ),
      ).resolves.toBeNull();
    }
    expect(mocks.scanNative).not.toHaveBeenCalled();
  });

  it('falls back when the native scanner cannot fully transform the module', async () => {
    const results = [{ handled: false }, { handled: true }, { handled: true, module }];
    for (const result of results) {
      mocks.scanNative.mockResolvedValueOnce(result);
      await expect(
        tryTransformNativeStaticSxModule(source, module.id, module.id, options, undefined, transformOptions),
      ).resolves.toBeNull();
    }
  });
});
