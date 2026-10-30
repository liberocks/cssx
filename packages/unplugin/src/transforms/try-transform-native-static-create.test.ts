import { createClassNameAllocator } from '@cssxio/compiler';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { NativeCssxCall } from './native-static-sx';
import { tryTransformNativeStaticCreateModule } from './try-transform-native-static-create';

const source =
  "import { create, props } from '@cssxio/cssx'; const styles = create({ root: 'p-4' }); export const value = props(styles.root);";
const createStart = source.indexOf('create(');
const propsStart = source.indexOf('props(');
const calls: NativeCssxCall[] = [
  {
    entryPoint: 'create',
    start: createStart,
    end: source.indexOf(');', createStart) + 1,
    startUtf16: createStart,
    endUtf16: source.indexOf(');', createStart) + 1,
    line: 1,
    column: 0,
    staticSx: false,
    staticCreate: true,
    staticProps: false,
    fastTransformSafe: true,
    utilities: [],
    styles: [{ name: 'root', utilities: 'p-4' }],
    styleNames: [],
  },
  {
    entryPoint: 'props',
    start: propsStart,
    end: source.indexOf(');', propsStart) + 1,
    startUtf16: propsStart,
    endUtf16: source.indexOf(');', propsStart) + 1,
    line: 1,
    column: 0,
    staticSx: false,
    staticCreate: false,
    staticProps: true,
    fastTransformSafe: true,
    utilities: [],
    styles: [],
    styleNames: ['root'],
  },
];
const native = { findCssxCalls: vi.fn(() => calls) };
const baseOptions = { mode: 'production' as const, sourceMap: false };
const transformOptions = {};

afterEach(() => vi.clearAllMocks());

describe('tryTransformNativeStaticCreateModule', () => {
  it('uses the production native transform and generates JavaScript source maps', async () => {
    const allocator = createClassNameAllocator();
    const result = await tryTransformNativeStaticCreateModule(
      source,
      '/project/page.tsx',
      '/project/page.tsx',
      { ...baseOptions, classNameAllocator: allocator },
      undefined,
      transformOptions,
      native,
    );

    expect(result?.code).toContain('className');
    expect(result?.map).toMatchObject({ version: 3, sources: ['/project/page.tsx'] });
    expect(native.findCssxCalls).toHaveBeenCalledWith(source, '/project/page.tsx', '@cssxio/cssx');
  });

  it('keeps JavaScript source maps independent from CSS source-map settings', async () => {
    const result = await tryTransformNativeStaticCreateModule(
      source,
      '/project/page.tsx',
      '/project/page.tsx',
      { ...baseOptions, sourceMap: true },
      undefined,
      transformOptions,
      native,
    );

    expect(result?.map).toMatchObject({ version: 3, sources: ['/project/page.tsx'] });
  });

  it('uses its own allocator when no shared allocator was supplied', async () => {
    await expect(
      tryTransformNativeStaticCreateModule(
        source,
        '/project/page.tsx',
        '/project/page.tsx',
        baseOptions,
        undefined,
        transformOptions,
        native,
      ),
    ).resolves.toMatchObject({ code: expect.stringContaining('className') });
  });

  it('leaves Vue-extracted blocks on the Babel transform path', async () => {
    await expect(
      tryTransformNativeStaticCreateModule(
        source,
        '/project/App.vue.cssx-vue-script.ts',
        '/project/App.vue.cssx-vue-script.ts',
        baseOptions,
        undefined,
        transformOptions,
        native,
      ),
    ).resolves.toBeNull();
    expect(native.findCssxCalls).not.toHaveBeenCalled();
  });

  it('skips development, source-mapped, stable-name, and metadata-only transforms', async () => {
    const inputMap = { version: 3 as const, file: 'page.js', sources: ['page.tsx'], names: [], mappings: '' };
    const cases = [
      [{ mode: 'development' as const, sourceMap: false }, undefined, transformOptions],
      [{ ...baseOptions, stableClassNames: true }, undefined, transformOptions],
      [baseOptions, inputMap, transformOptions],
      [baseOptions, undefined, { compileCss: false }],
      [baseOptions, undefined, transformOptions, 'export const value = true;'],
    ] as const;
    for (const [options, sourceMap, execution, code] of cases) {
      await expect(
        tryTransformNativeStaticCreateModule(
          code ?? source,
          '/project/page.tsx',
          '/project/page.tsx',
          options,
          sourceMap,
          execution,
          native,
        ),
      ).resolves.toBeNull();
    }
    expect(native.findCssxCalls).not.toHaveBeenCalled();
  });

  it('falls back when the addon is absent, analysis fails, or the source cannot be folded', async () => {
    await expect(
      tryTransformNativeStaticCreateModule(
        source,
        '/project/page.tsx',
        '/project/page.tsx',
        baseOptions,
        undefined,
        transformOptions,
        null,
      ),
    ).resolves.toBeNull();
    const throwing = {
      findCssxCalls: () => {
        throw new Error('parse failed');
      },
    };
    await expect(
      tryTransformNativeStaticCreateModule(
        source,
        '/project/page.tsx',
        '/project/page.tsx',
        baseOptions,
        undefined,
        transformOptions,
        throwing,
      ),
    ).resolves.toBeNull();
    const unsupported = { findCssxCalls: () => [{ ...calls[0]!, fastTransformSafe: false }, calls[1]!] };
    await expect(
      tryTransformNativeStaticCreateModule(
        source,
        '/project/page.tsx',
        '/project/page.tsx',
        baseOptions,
        undefined,
        transformOptions,
        unsupported,
      ),
    ).resolves.toBeNull();
  });
});
