import { describe, expect, it } from 'vitest';
import { serializeCss } from '@cssxio/compiler';
import { unpluginFactory } from '../src/index';
import { pluginFor, source, transformRequired } from './transform-helpers';

describe('CSSX unplugin transform', () => {
  it('uses source-addressed class names outside native compiler contexts', async () => {
    const plugin = unpluginFactory({ stableClassNames: true }, { framework: 'vite', versions: {} } as never) as any;
    const transformed = await plugin.transform.handler(source, '/project/styles.ts');

    expect(transformed.code).toMatch(/c: "[a-z0-9]+"/);
  });

  it('emits the default Tailwind-compatible baseline for an empty final graph', async () => {
    const plugin = pluginFor('vite');
    const emitted: unknown[] = [];
    await plugin.rollup.generateBundle.call(
      {
        emitFile(asset: unknown) {
          emitted.push(asset);
        },
        getModuleInfo() {
          return null;
        },
      },
      {},
      { 'entry.js': { type: 'chunk', modules: {} } },
    );

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({
      fileName: 'cssx.css',
      source: expect.stringContaining('box-sizing:border-box'),
    });
  });

  it('does not emit a Rollup or Vite asset for an empty graph when preflight is disabled', async () => {
    const plugin = pluginFor('vite', { preflight: false });
    const emitted: unknown[] = [];
    await plugin.rollup.generateBundle.call(
      {
        emitFile(asset: unknown) {
          emitted.push(asset);
        },
        getModuleInfo() {
          return null;
        },
      },
      {},
      { 'entry.js': { type: 'chunk', modules: {} } },
    );

    expect(emitted).toEqual([]);
  });

  it('fails deterministically when a final Rollup asset name is already occupied', async () => {
    const plugin = pluginFor('vite');
    const transformed = await plugin.transform.handler(source, '/project/styles.ts');
    await expect(
      plugin.rollup.generateBundle.call(
        {
          emitFile() {},
          getModuleInfo(id: string) {
            return id === '/project/styles.ts' ? { meta: transformed.meta } : null;
          },
        },
        {},
        {
          'entry.js': { type: 'chunk', modules: { '/project/styles.ts': {} } },
          'cssx.css': { type: 'asset' },
        },
      ),
    ).rejects.toThrow('CSS asset collision');
  });

  it('applies CSSX theme overrides and resolves final asset hashes after aggregation', async () => {
    const themed = await transformRequired(
      `import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'p-5 bg-brand' });`,
      '/project/theme.ts',
      { theme: '@theme { --spacing: 2px; --color-brand: #123456; }' },
    );
    expect(serializeCss(themed.rules)).toContain('padding:calc(2px * 5)');
    expect(serializeCss(themed.rules)).toContain('background-color:#123456');

    const plugin = unpluginFactory({ cssFileName: 'assets/cssx.[hash].css' }, {
      framework: 'vite',
      versions: {},
    } as never) as any;
    const transformed = await plugin.transform.handler(source, '/project/styles.ts');
    const emitted: any[] = [];
    await plugin.rollup.generateBundle.call(
      {
        emitFile(asset: unknown) {
          emitted.push(asset);
        },
        getModuleInfo(id: string) {
          return id === '/project/styles.ts' ? { meta: transformed.meta } : null;
        },
      },
      {},
      { 'entry.js': { type: 'chunk', modules: { '/project/styles.ts': {} } } },
    );
    expect(emitted[0]?.fileName).toMatch(/^assets\/cssx\.[a-z0-9]+\.css$/);
  });

  it('wraps transformed and final extracted CSS in an optional cascade layer', async () => {
    const transformed = await transformRequired(source, '/project/layer.ts', { layer: 'cssx' });
    expect(serializeCss(transformed.rules)).toMatch(/^@layer cssx\{/);

    const plugin = unpluginFactory({ layer: 'cssx' }, { framework: 'vite', versions: {} } as never) as any;
    await plugin.transform.handler(source, '/project/layer.ts');
    const emitted: any[] = [];
    await plugin.vite.generateBundle.call(
      {
        emitFile(asset: unknown) {
          emitted.push(asset);
        },
        getModuleInfo() {
          return null;
        },
      },
      {},
      { 'entry.js': { type: 'chunk', modules: {} } },
    );

    expect(emitted[0]?.source).toMatch(/^@layer cssx\{/);
  });

  it('keeps Astro template styles when its virtual client script has no CSSX calls', async () => {
    const plugin = unpluginFactory({}, { framework: 'vite', versions: {} } as never) as any;
    await plugin.transform.handler(
      `---\nimport { sx } from '@cssxio/cssx';\n---\n<button class={sx('min-h-11 border')}><script>console.log('client')</script></button>`,
      '/project/ThemeToggle.astro',
    );
    await plugin.transform.handler("console.log('client')", '/project/ThemeToggle.astro?astro&type=script&index=0');
    const emitted: any[] = [];

    await plugin.vite.generateBundle.call(
      {
        emitFile(asset: unknown) {
          emitted.push(asset);
        },
        getModuleInfo() {
          return null;
        },
      },
      {},
      { 'entry.js': { type: 'chunk', modules: {} } },
    );

    expect(emitted[0]?.source).toContain('min-height:calc(0.25rem * 11)');
  });

  it('rejects unsafe asset paths and ambiguous theme configuration', () => {
    expect(() => unpluginFactory({ cssFileName: '../cssx.css' }, { framework: 'vite', versions: {} } as never)).toThrow(
      'must not escape',
    );
    expect(() =>
      unpluginFactory({ cssFileName: '/tmp/cssx.css' }, { framework: 'vite', versions: {} } as never),
    ).toThrow('relative path');
    expect(() => unpluginFactory({ cssFileName: 'cssx.txt' }, { framework: 'vite', versions: {} } as never)).toThrow(
      'end in .css',
    );
    expect(() =>
      unpluginFactory({ theme: '@theme {}', themeFile: 'theme.css' }, { framework: 'vite', versions: {} } as never),
    ).toThrow('either theme or themeFile');
    expect(() => unpluginFactory({ layer: 'cssx;body' }, { framework: 'vite', versions: {} } as never)).toThrow(
      'valid CSS layer identifier',
    );
  });

  it('registers a file-backed theme as a watch dependency', async () => {
    const plugin = unpluginFactory({ themeFile: 'theme.css' }, { framework: 'vite', versions: {} } as never) as any;
    const watched: string[] = [];
    await plugin.transform.handler.call(
      {
        addWatchFile(path: string) {
          watched.push(path);
        },
      },
      'export const noCssx = true;',
      '/project/empty.ts',
    );
    expect(watched).toEqual([`${process.cwd()}/theme.css`]);
  });

  it.each(['webpack', 'rspack'] as const)('collects active %s compilation module rules', async (framework) => {
    const plugin = pluginFor(framework);
    let compilationCallback: ((compilation: any) => void) | undefined;
    plugin[framework]({
      webpack: {
        Compilation: { PROCESS_ASSETS_STAGE_ADDITIONS: -100 },
        sources: {
          RawSource: class {
            constructor(readonly source: string) {}
          },
        },
      },
      hooks: {
        thisCompilation: {
          tap(_name: string, callback: (compilation: any) => void) {
            compilationCallback = callback;
          },
        },
      },
    });

    const module = { buildInfo: {} };
    await plugin.transform.handler.call(
      {
        getNativeBuildContext() {
          return { framework, loaderContext: { _module: module } };
        },
      },
      source,
      '/project/styles.ts',
    );

    let processAssets: (() => Promise<void>) | undefined;
    const emitted: any[] = [];
    compilationCallback?.({
      modules: [module],
      hooks: {
        processAssets: {
          tapPromise(_options: unknown, callback: () => Promise<void>) {
            processAssets = callback;
          },
        },
      },
      emitAsset(name: string, asset: unknown) {
        emitted.push({ name, asset });
      },
    });
    await processAssets?.();

    expect(emitted).toHaveLength(2);
    expect(emitted[0].name).toBe('cssx.css');
    expect(emitted[0].asset.source).toContain('background-color:oklch(63.71% 0.237 25.331)');
    expect(emitted[1].name).toBe('cssx.css.map');
  });

  it('prunes esbuild rules using the metafile and returns CSS for write: false', async () => {
    const plugin = pluginFor('esbuild', { preflight: false });
    const build: any = {
      initialOptions: { absWorkingDir: '/project', outdir: 'dist', write: false },
      onEnd(callback: (result: any) => Promise<void>) {
        this.end = callback;
      },
    };
    plugin.esbuild.config(build.initialOptions);
    await plugin.esbuild.setup(build);
    await plugin.transform.handler(source, '/project/styles.ts');

    const firstResult = { metafile: { inputs: { 'styles.ts': {} } }, outputFiles: [] };
    await build.end(firstResult);
    expect(build.initialOptions.metafile).toBe(true);
    expect(firstResult.outputFiles).toHaveLength(1);
    expect(firstResult.outputFiles[0]).toMatchObject({
      path: '/project/dist/cssx.css',
      text: expect.stringContaining('padding:calc(0.25rem * 5)'),
    });

    const secondResult = { metafile: { inputs: {} }, outputFiles: [] };
    await build.end(secondResult);
    expect(secondResult.outputFiles).toEqual([]);
  });
});
