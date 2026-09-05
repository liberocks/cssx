import { describe, expect, it } from 'vitest';
import {
  configureCompilationAsset,
  mergeCssxSourceModules,
  storeCompilationData,
  type NativeCompiler,
} from '../src/native';

interface TestCompilation {
  modules: { buildInfo?: Record<string, unknown>; resource?: string }[];
  hooks: { processAssets: { tapPromise(_options: unknown, handler: () => Promise<void>): void } };
  getAsset(): unknown;
  emitAsset(fileName: string, source: unknown): void;
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

  it('merges sibling compiler data while preferring current compilation records', () => {
    expect(
      mergeCssxSourceModules(
        [{ id: '/project/client.tsx', candidates: { 'text-white': 'client-current' }, origins: {} }],
        [
          { id: '/project/server.tsx', candidates: { 'p-4': 'server' }, origins: {} },
          { id: '/project/client.tsx', candidates: { 'text-white': 'client-stale' }, origins: {} },
        ],
      ),
    ).toEqual([
      { id: '/project/server.tsx', candidates: { 'p-4': 'server' }, origins: {} },
      { id: '/project/client.tsx', candidates: { 'text-white': 'client-current' }, origins: {} },
    ]);
  });

  it('retains anonymous records from both native data sources', () => {
    expect(
      mergeCssxSourceModules(
        [{ id: '', candidates: { 'text-white': 'current' }, origins: {} }],
        [{ id: '', candidates: { 'p-4': 'sibling' }, origins: {} }],
      ),
    ).toEqual([
      { id: '', candidates: { 'p-4': 'sibling' }, origins: {} },
      { id: '', candidates: { 'text-white': 'current' }, origins: {} },
    ]);
  });

  it('emits server records retained outside the current native compilation', async () => {
    let processAssets: (() => Promise<void>) | undefined;
    let css = '';
    const compilation: TestCompilation = {
      modules: [
        {
          buildInfo: {
            cssx: { id: '/project/client.tsx', candidates: { 'text-white': 'client' }, origins: {} },
          },
        },
      ],
      hooks: {
        processAssets: {
          tapPromise: (_options: unknown, handler: () => Promise<void>) => {
            processAssets = handler;
          },
        },
      },
      getAsset: () => undefined,
      emitAsset: (_fileName: string, source: unknown) => {
        css = (source as { readonly source: string }).source;
      },
    };
    const compiler = createCompiler(compilation);
    configureCompilationAsset(
      compiler,
      'cssx.css',
      async () => undefined,
      undefined,
      false,
      'cssx',
      new Map([['/project/server.tsx', { id: '/project/server.tsx', candidates: { 'p-4': 'server' }, origins: {} }]]),
    );

    await processAssets?.();

    expect(css).toContain('.client');
    expect(css).toContain('.server');
  });

  it('uses complete project source data when stable classes cross compiler processes', async () => {
    let processAssets: (() => Promise<void>) | undefined;
    let css = '';
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
      emitAsset: (_fileName: string, source: unknown) => {
        css = (source as { readonly source: string }).source;
      },
    };
    configureCompilationAsset(
      createCompiler(compilation),
      'cssx.css',
      async () => undefined,
      undefined,
      false,
      'cssx',
      undefined,
      undefined,
      false,
      async () => [
        {
          id: '/project/server-component.tsx',
          candidates: { 'p-4': 'atom' },
          composites: { stable: ['atom'] },
          atomicClasses: [],
          origins: {},
        },
      ],
    );

    await processAssets?.();

    expect(css).toContain('.stable');
    expect(css).not.toContain('.atom');
  });

  it('leaves stylesheet emission to the public Next client compiler', () => {
    let registered = false;
    const compilation: TestCompilation = {
      modules: [],
      hooks: {
        processAssets: {
          tapPromise: () => {
            registered = true;
          },
        },
      },
      getAsset: () => undefined,
      emitAsset: () => {},
    };

    configureCompilationAsset(
      createCompiler(compilation, 'server'),
      'cssx.css',
      async () => undefined,
      undefined,
      false,
      'cssx',
    );

    expect(registered).toBe(false);

    configureCompilationAsset(
      { ...createCompiler(compilation), name: 'edge-server' },
      'cssx.css',
      async () => undefined,
      undefined,
      false,
      'cssx',
    );

    expect(registered).toBe(false);
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

function createCompiler(compilation: TestCompilation, name?: string): NativeCompiler {
  return {
    context: '/project',
    ...(name ? { options: { name } } : {}),
    webpack: {
      Compilation: { PROCESS_ASSETS_STAGE_ADDITIONS: 0 },
      sources: {
        RawSource: class RawSource {
          constructor(readonly source: string) {}
        },
      },
    },
    hooks: {
      thisCompilation: {
        tap: (_name, handler) => handler(compilation),
      },
    },
  };
}
