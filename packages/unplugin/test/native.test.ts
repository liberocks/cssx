import { describe, expect, it } from 'vitest';
import { configureCompilationAsset, storeCompilationData, type NativeCompiler } from '../src/native';

interface TestCompilation {
  modules: { buildInfo?: Record<string, unknown>; resource?: string }[];
  hooks: { processAssets: { tapPromise(_options: unknown, handler: () => Promise<void>): void } };
  getAsset(): unknown;
  emitAsset(fileName: string): void;
}

describe('native bundler helpers', () => {
  it('stores metadata only for native module transforms', () => {
    const module: { buildInfo?: Record<string, unknown> } = {};
    storeCompilationData({}, { candidates: { 'p-4': 'x' } }, 'cssx');
    expect(module.buildInfo).toBeUndefined();

    storeCompilationData(
      {
        getNativeBuildContext: () => ({ framework: 'webpack', loaderContext: { _module: module } }),
      },
      { candidates: { 'p-4': 'x' } },
      'cssx',
    );
    expect(module.buildInfo).toEqual({ cssx: { candidates: { 'p-4': 'x' } } });
  });

  it('skips empty stylesheets and rejects occupied native asset names', async () => {
    let processAssets: (() => Promise<void>) | undefined;
    const emitted: string[] = [];
    const compilation: TestCompilation = {
      modules: [],
      hooks: {
        processAssets: {
          tapPromise: (_options: unknown, handler: () => Promise<void>) => {
            processAssets = handler;
          },
        },
      },
      getAsset: () => undefined,
      emitAsset: (fileName: string) => emitted.push(fileName),
    };
    const compiler = createCompiler(compilation);
    configureCompilationAsset(compiler, 'cssx.css', async () => undefined, undefined, true, 'cssx');
    await processAssets?.();
    expect(emitted).toEqual([]);

    compilation.modules.push({ buildInfo: { cssx: { id: 'entry.ts', candidates: { 'p-4': 'x' }, origins: {} } } });
    compilation.getAsset = () => ({});
    await expect(processAssets?.()).rejects.toThrow('asset collision');
  });

  it('uses transformed data when a host does not retain loader metadata', async () => {
    let processAssets: (() => Promise<void>) | undefined;
    const emitted: string[] = [];
    const compilation: TestCompilation = {
      modules: [{}],
      hooks: {
        processAssets: {
          tapPromise: (_options: unknown, handler: () => Promise<void>) => {
            processAssets = handler;
          },
        },
      },
      getAsset: () => undefined,
      emitAsset: (fileName: string) => emitted.push(fileName),
    };
    configureCompilationAsset(
      createCompiler(compilation),
      'cssx.css',
      async () => undefined,
      undefined,
      true,
      'cssx',
      new Map([['/project/entry.ts', { id: '/project/entry.ts', candidates: { 'p-4': 'x' }, origins: {} }]]),
    );

    await processAssets?.();

    expect(emitted).toEqual(['cssx.css', 'cssx.css.map']);
  });

  it('omits a native CSS source map when disabled', async () => {
    let processAssets: (() => Promise<void>) | undefined;
    const emitted: string[] = [];
    const compilation: TestCompilation = {
      modules: [{ buildInfo: { cssx: { id: 'entry.ts', candidates: { 'p-4': 'x' }, origins: {} } } }],
      hooks: {
        processAssets: {
          tapPromise: (_options: unknown, handler: () => Promise<void>) => {
            processAssets = handler;
          },
        },
      },
      getAsset: () => undefined,
      emitAsset: (fileName: string) => emitted.push(fileName),
    };

    configureCompilationAsset(createCompiler(compilation), 'cssx.css', async () => undefined, undefined, false, 'cssx');
    await processAssets?.();

    expect(emitted).toEqual(['cssx.css']);
  });
});

function createCompiler(compilation: TestCompilation): NativeCompiler {
  return {
    webpack: {
      Compilation: { PROCESS_ASSETS_STAGE_ADDITIONS: 0 },
      sources: { RawSource: class RawSource {} },
    },
    hooks: {
      thisCompilation: {
        tap: (_name, handler) => handler(compilation),
      },
    },
  };
}
